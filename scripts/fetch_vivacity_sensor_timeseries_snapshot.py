#!/usr/bin/env python3
"""
Build static/data/vivacity-sensor-timeseries-snapshot.json with verbose logging.

Vivacity often 504s on nginx when one request combines many countlines × long 24h ranges.
This script uses: **one countline per HTTP request** and **short UTC date windows** (default 60d),
then merges + aggregates the same way as the JS app.

Prerequisite:
  VIVACITY_API=... npm run export:vivacity-manifest

Usage (repo root):
  VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py
  VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py --max-days 45 --pause-ms 1000
  VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py --only-sensor 2158

  Fill gaps without re-fetching everyone (~2h full run):
  VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py --merge-missing
  VIVACITY_API=... python3 scripts/fetch_vivacity_sensor_timeseries_snapshot.py --only-sensor 9714 --merge-existing
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "static/data/vivacity-sensor-manifest.json"
OUT_PATH = ROOT / "static/data/vivacity-sensor-timeseries-snapshot.json"
COUNTS_BASE = "https://api.vivacitylabs.com/countline/counts"
# Match JS `vivacity-counts-classes.js`: limit `/countline/counts` to walk + cycle keys only.
VIVACITY_COUNTS_CLASSES_QUERY = "classes=pedestrian&classes=cyclist"


def log(msg: str, *args: Any) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
    print(f"[{ts}Z]", msg, *args, sep=" ", flush=True)


def with_vivacity_counts_classes(url: str) -> str:
    if "classes=pedestrian" in url:
        return url
    return f"{url}&{VIVACITY_COUNTS_CLASSES_QUERY}"


def fmt_vivacity_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def utc_day_start(d: datetime) -> datetime:
    d = d.astimezone(timezone.utc)
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def merge_countline_response_objects(parts: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for p in parts:
        if isinstance(p, dict):
            out.update(p)
    return out


def aggregate_vivacity_data(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Port of vivacity-countline-utils aggregateVivacityData (flat totals per from)."""
    if not data or not isinstance(data, dict):
        return []
    keys = [k for k in data.keys() if isinstance(data[k], list)]
    if not keys:
        return []
    first_key = keys[0]
    first_series = data[first_key]
    if not isinstance(first_series, list):
        return []

    base_keys = (
        "pedestrian",
        "cyclist",
        "car",
        "bus",
        "agricultural_vehicle",
        "cargo_bicycle",
        "dog",
        "electric_hackney_cab",
        "emergency_car",
    )

    aggregated: list[dict[str, Any]] = []
    for time_entry in first_series:
        entry: dict[str, Any] = {
            "from": time_entry.get("from"),
            "to": time_entry.get("to"),
        }
        for bk in base_keys:
            entry[bk] = 0

        for clid in keys:
            rows = data[clid]
            if not isinstance(rows, list):
                continue
            matching = None
            for e in rows:
                if isinstance(e, dict) and e.get("from") == time_entry.get("from"):
                    matching = e
                    break
            if not matching:
                continue
            for direction in ("clockwise", "anti_clockwise"):
                d = matching.get(direction)
                if not isinstance(d, dict):
                    continue
                for vehicle_type, count in d.items():
                    c = int(count or 0)
                    if vehicle_type in entry:
                        entry[vehicle_type] = int(entry[vehicle_type]) + c
                    else:
                        entry[vehicle_type] = int(entry.get(vehicle_type, 0)) + c
        aggregated.append(entry)
    return aggregated


def merge_rows_by_from(a: list[dict], b: list[dict]) -> list[dict]:
    m: dict[str, dict] = {}
    for r in a:
        if isinstance(r, dict) and r.get("from"):
            m[str(r["from"])] = r
    for r in b:
        if isinstance(r, dict) and r.get("from"):
            m[str(r["from"])] = r
    return sorted(m.values(), key=lambda x: str(x.get("from", "")))


def iter_time_windows(
    from_day: datetime, to_day: datetime, max_days: int
) -> list[tuple[datetime, datetime]]:
    """Half-open [from, to) in UTC days: each window is at most max_days long, ending at to_day."""
    out: list[tuple[datetime, datetime]] = []
    cur = from_day
    to_day = utc_day_start(to_day)
    while cur < to_day:
        nxt = min(cur + timedelta(days=max_days), to_day)
        out.append((cur, nxt))
        cur = nxt
    return out


def vivacity_get_json(
    url: str,
    api_key: str,
    timeout: int,
    label: str,
) -> dict[str, Any]:
    t0 = time.perf_counter()
    log(f"{label} → request", f"url_len={len(url)}")
    log(f"{label} → url_tail", url[-140:] if len(url) > 140 else url)
    req = Request(
        url,
        headers={"Accept": "application/json", "x-vivacity-api-key": api_key},
        method="GET",
    )
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            dt = time.perf_counter() - t0
            status = resp.getcode()
            log(
                f"{label} ← response",
                f"status={status}",
                f"bytes={len(raw)}",
                f"{dt:.2f}s",
            )
            text = raw.decode("utf-8", errors="replace")
            # Vivacity sometimes returns 204 + empty body when there is no data for this
            # countline/window (e.g. inactive hardware or before go-live). Not a 504.
            if status == 204 or not text.strip():
                log(
                    f"{label} ← no JSON body",
                    f"status={status}",
                    "treating as empty counts for this window",
                )
                return {}
            if len(text) > 5000:
                log(f"{label} ← body preview (500 chars)", text[:500].replace("\n", " "))
            return json.loads(text)
    except HTTPError as e:
        dt = time.perf_counter() - t0
        body = e.read()[:1200] if e.fp else b""
        log(
            f"{label} ← HTTPError",
            f"code={e.code}",
            f"{dt:.2f}s",
            f"body[:400]={body[:400]!r}",
        )
        raise
    except URLError as e:
        dt = time.perf_counter() - t0
        log(f"{label} ← URLError", repr(e), f"{dt:.2f}s")
        raise


def fetch_one_countline_daily_windows(
    countline_id: str,
    from_day: datetime,
    to_day: datetime,
    api_key: str,
    max_days: int,
    pause_s: float,
    timeout: int,
    label: str,
) -> list[dict]:
    """Fetch 24h buckets for a single countline across short time windows; merge rows."""
    windows = iter_time_windows(from_day, to_day, max_days)
    log(
        f"{label} countline={countline_id}",
        f"windows={len(windows)}",
        f"max_days={max_days}",
        f"range={fmt_vivacity_utc(from_day)}..{fmt_vivacity_utc(to_day)}",
    )
    merged_rows: list[dict] = []
    for wi, (w_from, w_to) in enumerate(windows):
        if w_from >= w_to:
            continue
        from_iso = fmt_vivacity_utc(w_from)
        to_iso = fmt_vivacity_utc(w_to)
        url = with_vivacity_counts_classes(
            f"{COUNTS_BASE}?countline_ids={countline_id}&from={from_iso}&to={to_iso}&time_bucket=24h"
        )
        sub = f"{label} w{wi + 1}/{len(windows)}"
        try:
            part = vivacity_get_json(url, api_key, timeout, sub)
        except Exception:
            log(
                sub,
                "FAILED — if HTTP 504, try smaller --max-days or higher --pause-ms",
            )
            raise
        # API returns { "<id>": [ rows ] }
        rows = None
        if isinstance(part, dict):
            rows = part.get(countline_id) or part.get(str(countline_id))
        if not isinstance(rows, list):
            log(sub, "unexpected shape keys=", list(part.keys())[:8] if isinstance(part, dict) else type(part))
            rows = []
        log(sub, f"rows_in_window={len(rows)}")
        merged_rows = merge_rows_by_from(merged_rows, rows)
        if wi < len(windows) - 1 and pause_s > 0:
            time.sleep(pause_s)
    log(f"{label} countline={countline_id} done total_rows={len(merged_rows)}")
    return merged_rows


def build_sensor_merged_raw(
    sensor_id: str,
    countline_ids: list[str],
    from_day: datetime,
    to_day: datetime,
    api_key: str,
    max_days: int,
    pause_s: float,
    timeout: int,
) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    log("=== sensor", sensor_id, f"countlines={len(countline_ids)}", "===")
    for i, clid in enumerate(countline_ids):
        label = f"sensor={sensor_id} cl{i + 1}/{len(countline_ids)}"
        rows = fetch_one_countline_daily_windows(
            clid, from_day, to_day, api_key, max_days, pause_s, timeout, label
        )
        merged[clid] = rows
    return merged


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-days", type=int, default=60, help="Max days per Vivacity 24h request (smaller = fewer 504s)")
    ap.add_argument("--pause-ms", type=int, default=800, help="Sleep between window requests for one countline")
    ap.add_argument("--timeout", type=int, default=300, help="Per-request socket timeout (seconds)")
    ap.add_argument("--only-sensor", type=str, default="", help="Process a single sensor_id only")
    ap.add_argument(
        "--merge-existing",
        action="store_true",
        help="Load current snapshot first; with --only-sensor, keep all other sensors (do not wipe the file).",
    )
    ap.add_argument(
        "--merge-missing",
        action="store_true",
        help="Load current snapshot if present; fetch only manifest sensors missing from that file.",
    )
    ap.add_argument(
        "--daily-span-days",
        type=int,
        default=365,
        help="Total calendar days of history to request ending at UTC today 00:00",
    )
    args = ap.parse_args()

    if args.merge_existing and not args.only_sensor and not args.merge_missing:
        log(
            "ERROR",
            "--merge-existing only works with --only-sensor, or use --merge-missing alone.",
        )
        return 1

    api_key = os.environ.get("VIVACITY_API")
    if not api_key:
        log("ERROR", "Set VIVACITY_API in the environment.")
        return 1

    pause_s = max(0, args.pause_ms) / 1000.0

    if not MANIFEST_PATH.is_file():
        log("ERROR", "Missing manifest:", str(MANIFEST_PATH), "— run: npm run export:vivacity-manifest")
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    sensors = manifest.get("sensors") or []
    log("manifest", MANIFEST_PATH, f"sensors={len(sensors)}", f"exportedAt={manifest.get('exportedAt')}")

    to_day = utc_day_start(datetime.now(timezone.utc))
    from_day = to_day - timedelta(days=args.daily_span_days)
    log(
        "date_range",
        f"from={fmt_vivacity_utc(from_day)}",
        f"to={fmt_vivacity_utc(to_day)}",
        f"span_days={args.daily_span_days}",
        f"window_max_days={args.max_days}",
        f"pause_s={pause_s}",
    )

    out_sensors: dict[str, Any] = {}
    only = (args.only_sensor or "").strip()

    if args.merge_missing and OUT_PATH.is_file():
        prev = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        out_sensors = dict(prev.get("sensors") or {})
        log("merge-missing", "loaded baseline", str(OUT_PATH), f"sensor_keys={len(out_sensors)}")
    elif args.merge_existing and OUT_PATH.is_file():
        prev = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        out_sensors = dict(prev.get("sensors") or {})
        log("merge-existing", "loaded baseline", str(OUT_PATH), f"sensor_keys={len(out_sensors)}")

    for ent in sensors:
        sid = str(ent.get("sensor_id", ""))
        if not sid:
            continue
        if only and sid != only:
            continue
        if args.merge_missing and sid in out_sensors:
            log("skip (already in snapshot)", sid)
            continue
        ids = [str(x) for x in (ent.get("countline_ids") or []) if str(x).strip()]
        if not ids:
            log("skip sensor", sid, "(no countline_ids)")
            continue
        try:
            t0 = time.perf_counter()
            raw_merged = build_sensor_merged_raw(
                sid, ids, from_day, to_day, api_key, args.max_days, pause_s, args.timeout
            )
            daily_aggregated = aggregate_vivacity_data(raw_merged)
            dt = time.perf_counter() - t0
            log(
                "sensor OK",
                sid,
                f"aggregated_rows={len(daily_aggregated)}",
                f"elapsed={dt:.1f}s",
            )
            out_sensors[sid] = {"countlineIds": ids, "dailyAggregated": daily_aggregated}
        except Exception as e:
            log("sensor FAILED", sid, repr(e))

    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "sensors": out_sensors,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload), encoding="utf-8")
    log("WROTE", str(OUT_PATH), f"sensor_keys={len(out_sensors)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
