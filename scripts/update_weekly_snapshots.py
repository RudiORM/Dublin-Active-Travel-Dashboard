#!/usr/bin/env python3
"""
Incremental weekly Eco + Vivacity snapshot update.

Same logic as notebooks/weekly_snapshot_incremental.ipynb:
reads existing JSON, fetches from the file\'s latest weekKey through today,
merges, trims the YoY window, writes static/data/*-weekly-snapshot.json.

Usage (from repo root):
  python3 scripts/update_weekly_snapshots.py

Requires env / .env: ECO_COUNTER_API, VIVACITY_API
Also needs Node for: scripts/export-vivacity-sensor-manifest.mjs
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import requests

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# Eco rate limits — keep serial
ECO_CONCURRENCY = 1
ECO_PAUSE_S = 1.5
ECO_429_MAX_RETRIES = 6
ECO_429_BACKOFF_S = 30

VIVACITY_WINDOW_MAX_DAYS = 60
VIVACITY_PAUSE_S = 0.8
VIVACITY_TIMEOUT_S = 300
REFRESH_VIVACITY_MANIFEST = True

# Always re-fetch the last stored week (it may have been incomplete when written).
REFETCH_LAST_STORED_WEEK = True

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA = REPO_ROOT / "static" / "data"
ECO_OUT = DATA / "eco-counter-weekly-snapshot.json"
VIVACITY_OUT = DATA / "vivacity-weekly-snapshot.json"
VIVACITY_MANIFEST = DATA / "vivacity-sensor-manifest.json"

ECO_COUNTER_API = None
VIVACITY_API = None
ECO_HEADERS = {}

def utc_now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def monday_week_key(dt):
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    monday = dt - timedelta(days=dt.weekday())
    return monday.date().isoformat()


def parse_week_key(week_key):
    """YYYY-MM-DD Monday → aware UTC datetime at midnight."""
    d = datetime.fromisoformat(str(week_key)[:10])
    return d.replace(tzinfo=timezone.utc)


def fmt_eco_date(dt):
    return dt.strftime("%Y-%m-%d")


def fmt_vivacity_utc(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def utc_day_start(dt):
    dt = dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def snapshot_history_start(end=None):
    end = end or datetime.now(timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    first_of_current = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_completed = first_of_current - timedelta(days=1)
    last_completed_start = last_completed.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return last_completed_start.replace(year=last_completed_start.year - 1)


def snapshot_history_weeks(start, end):
    days = max(1, (end.date() - start.date()).days)
    return (days + 6) // 7


def snapshot_yoy_month_keys(end=None):
    start = snapshot_history_start(end)
    end = end or datetime.now(timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    first_of_current = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_completed = first_of_current - timedelta(days=1)
    last_completed_start = last_completed.replace(day=1)
    return start.strftime("%Y-%m"), last_completed_start.strftime("%Y-%m")


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")
    print(f"Wrote {path.relative_to(REPO_ROOT)} ({path.stat().st_size // 1024} KB)")


def load_json_if_exists(path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"Could not read {path.name}: {e}")
        return None


def existing_weekly(entity):
    if not isinstance(entity, dict):
        return []
    rows = entity.get("weekly") or []
    return rows if isinstance(rows, list) else []


def last_week_key(rows):
    keys = [r.get("weekKey") for r in (rows or []) if r.get("weekKey")]
    return max(keys) if keys else None


def max_week_key_in_entities(entities):
    lasts = []
    for ent in (entities or {}).values():
        wk = last_week_key(existing_weekly(ent))
        if wk:
            lasts.append(wk)
    return max(lasts) if lasts else None


def file_catchup_start(entities, history_start):
    """API fetch start from the latest weekKey anywhere in the existing JSON.

    Re-fetches that week (it may have been incomplete). Does **not** backfill
    per-site historical gaps — those stay as-is until a full rebuild.
    """
    wk = max_week_key_in_entities(entities)
    if not wk:
        return utc_day_start(history_start), True, None  # no usable file data
    start = parse_week_key(wk)
    if not REFETCH_LAST_STORED_WEEK:
        start = start + timedelta(days=7)
    hs = utc_day_start(history_start)
    if start < hs:
        start = hs
    return start, False, wk


def merge_weekly_rows(existing_rows, new_rows):
    by_key = {}
    for row in existing_rows or []:
        wk = row.get("weekKey")
        if wk:
            by_key[wk] = {
                "weekKey": wk,
                "pedestrian": int(row.get("pedestrian") or 0),
                "bike": int(row.get("bike") or 0),
            }
    for row in new_rows or []:
        wk = row.get("weekKey")
        if wk:
            by_key[wk] = {
                "weekKey": wk,
                "pedestrian": int(row.get("pedestrian") or 0),
                "bike": int(row.get("bike") or 0),
            }
    return [by_key[wk] for wk in sorted(by_key)]


def trim_weekly_rows(rows, history_start_monday_key):
    return [r for r in (rows or []) if r.get("weekKey") and r["weekKey"] >= history_start_monday_key]


def rollup_daily_to_weekly(daily_rows):
    buckets = defaultdict(lambda: {"pedestrian": 0, "bike": 0})
    for row in daily_rows:
        wk = monday_week_key(row["dateKey"])
        buckets[wk]["pedestrian"] += int(row.get("pedestrian") or 0)
        buckets[wk]["bike"] += int(row.get("bike") or 0)
    return [{"weekKey": wk, **buckets[wk]} for wk in sorted(buckets)]


def summarize_coverage(entities, label):
    """Print how far existing JSON data goes."""
    lasts = []
    for ent in entities.values():
        wk = last_week_key(existing_weekly(ent))
        if wk:
            lasts.append(wk)
    if not lasts:
        print(f"{label}: no existing weekly rows")
        return None, None
    print(f"{label}: {len(lasts)} entities with data; weekKeys {min(lasts)} → {max(lasts)}")
    return min(lasts), max(lasts)


def normalize_eco_travel_mode(raw):
    if raw is None:
        return None
    s = str(raw).lower()
    if s in ("pedestrian", "walker", "walking"):
        return "pedestrian"
    if s in ("bike", "bicycle", "cyclist"):
        return "bike"
    return None


def extract_eco_travel_mode_series(payload):
    out = []

    def push_series(tm_raw, data):
        mode = normalize_eco_travel_mode(tm_raw)
        if not mode or not isinstance(data, list) or not data:
            return
        out.append({"travelMode": mode, "data": data})

    def consume_flow_array(flows):
        if not isinstance(flows, list):
            return
        for flow in flows:
            if not isinstance(flow, dict):
                continue
            tm = flow.get("travelMode") or flow.get("travel_mode") or flow.get("mode") or flow.get("userType")
            data = flow.get("data") or flow.get("points") or flow.get("values") or flow.get("records") or flow.get("items") or flow.get("intervals")
            push_series(tm, data)

    if not payload:
        return out
    if isinstance(payload, list):
        if payload and isinstance(payload[0], dict) and isinstance(payload[0].get("data"), list):
            consume_flow_array(payload)
            if out:
                return out
        by_mode = defaultdict(list)
        for row in payload:
            if not isinstance(row, dict):
                continue
            tm = normalize_eco_travel_mode(row.get("travelMode") or row.get("travel_mode") or row.get("mode") or row.get("userType"))
            if tm:
                by_mode[tm].append(row)
        for tm, rows in by_mode.items():
            out.append({"travelMode": tm, "data": rows})
        return out
    if isinstance(payload, dict):
        for ped_key in ("pedestrian", "walker", "walking"):
            if isinstance(payload.get(ped_key), list) and payload[ped_key]:
                push_series(ped_key, payload[ped_key])
                break
        for bike_key in ("bike", "bicycle", "cyclist"):
            if isinstance(payload.get(bike_key), list) and payload[bike_key]:
                push_series(bike_key, payload[bike_key])
                break
        if out:
            return out
        for key in ("data", "content", "items", "flows", "series", "traffic"):
            block = payload.get(key)
            if isinstance(block, list):
                consume_flow_array(block)
                if out:
                    return out
        consume_flow_array(payload.get("flows"))
    return out


def eco_point_count(point):
    for k in ("counts", "count", "value", "total", "volume"):
        if point.get(k) is not None:
            try:
                return int(float(point[k]))
            except (TypeError, ValueError):
                pass
    traffic = point.get("traffic")
    if isinstance(traffic, dict):
        for k in ("counts", "value"):
            if traffic.get(k) is not None:
                try:
                    return int(float(traffic[k]))
                except (TypeError, ValueError):
                    pass
    return 0


def eco_point_date(point):
    for k in ("timestamp", "isoDate", "iso_date", "from", "startDate", "start", "date", "period"):
        if point.get(k):
            return str(point[k])
    return None


def weekly_rows_from_eco_payload(payload):
    series_list = extract_eco_travel_mode_series(payload)
    buckets = defaultdict(lambda: {"pedestrian": 0, "bike": 0})
    for series in series_list:
        mode = series["travelMode"]
        for point in series["data"]:
            date_str = eco_point_date(point)
            if not date_str:
                continue
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except ValueError:
                continue
            wk = monday_week_key(dt)
            buckets[wk][mode] += eco_point_count(point)
    return [{"weekKey": wk, **buckets[wk]} for wk in sorted(buckets)]


def eco_get(url):
    backoff = ECO_429_BACKOFF_S
    for attempt in range(ECO_429_MAX_RETRIES + 1):
        r = requests.get(url, headers=ECO_HEADERS, timeout=120)
        if r.status_code == 429:
            if attempt >= ECO_429_MAX_RETRIES:
                r.raise_for_status()
            print(f"  Eco 429 — waiting {backoff}s before retry {attempt + 1}/{ECO_429_MAX_RETRIES}")
            time.sleep(backoff)
            backoff *= 2
            continue
        r.raise_for_status()
        if ECO_PAUSE_S:
            time.sleep(ECO_PAUSE_S)
        return r.json()
    raise RuntimeError("eco_get: unreachable")


def eco_sites_list(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "content", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def fetch_eco_site_weekly(site_id, start_date, end_date):
    url = (
        "https://api.eco-counter.com/api/v2/history/traffic/aggregated?"
        + urlencode({
            "siteId": site_id,
            "include": "",
            "startDate": start_date,
            "endDate": end_date,
            "startTime": "00:00",
            "endTime": "00:00",
            "granularity": "P1W",
            "groupBy": "travelMode",
            "gapFilling": "false",
            "travelModes": ["pedestrian", "bike"],
        }, doseq=True)
    )
    try:
        payload = eco_get(url)
        return site_id, weekly_rows_from_eco_payload(payload), None
    except Exception as e:
        return site_id, [], str(e)



def run_eco():
    end = datetime.now(timezone.utc)
    history_start = snapshot_history_start(end)
    dd_history_start, dd_end = fmt_eco_date(history_start), fmt_eco_date(end)
    history_weeks = snapshot_history_weeks(history_start, end)
    yoy_prior_month, yoy_current_month = snapshot_yoy_month_keys(end)
    history_start_monday_key = monday_week_key(history_start)

    existing_eco = load_json_if_exists(ECO_OUT)
    existing_sites = (existing_eco or {}).get("sites") or {}
    summarize_coverage(existing_sites, "Eco existing")
    catchup_from, no_file_data, file_max_wk = file_catchup_start(existing_sites, history_start)

    sites_json = eco_get("https://api.eco-counter.com/api/v2/sites?page=1&pageSize=100&sortBy=id&orderBy=asc")
    traffic_url = (
        "https://api.eco-counter.com/api/v2/statistical/adt/by/site"
        "?dateRange=lastMonth&groupBy=siteAndTravelMode&travelModes=pedestrian&travelModes=bike"
    )
    traffic_json = None
    try:
        traffic_json = eco_get(traffic_url)
    except requests.HTTPError as e:
        print("ADT fetch failed:", e)

    site_meta = {}
    for site in eco_sites_list(sites_json):
        sid = site.get("id") or site.get("siteId")
        if sid is None:
            continue
        site_meta[int(sid)] = {
            "name": site.get("name") or f"Site {sid}",
            "travelModes": site.get("travelModes") or [],
        }

    if isinstance(traffic_json, list):
        for row in traffic_json:
            sid = row.get("siteId")
            if sid is None:
                continue
            tm = normalize_eco_travel_mode(row.get("travelMode"))
            if tm:
                site_meta.setdefault(int(sid), {"name": f"Site {sid}", "travelModes": []})
                if tm not in site_meta[int(sid)]["travelModes"]:
                    site_meta[int(sid)]["travelModes"].append(tm)

    site_ids = sorted(site_meta.keys())
    known_ids = {str(k) for k in existing_sites.keys()}
    new_ids = [sid for sid in site_ids if str(sid) not in known_ids]
    catchup_ids = [sid for sid in site_ids if str(sid) in known_ids]

    print(f"Eco sites: {len(site_ids)} ({len(catchup_ids)} catch-up, {len(new_ids)} brand-new)")
    print(f"File keeps YoY history {dd_history_start} → {dd_end} after trim ({history_weeks} weeks)")
    print(f"YoY months: {yoy_prior_month} vs {yoy_current_month}")
    if no_file_data:
        print(f"No usable existing weeks — FULL fetch for all sites from {dd_history_start}")
    else:
        print(f"API catch-up window: {fmt_eco_date(catchup_from)} → {dd_end} (from file max weekKey {file_max_wk})")
        if new_ids:
            print(f"Brand-new sites get full history: {new_ids}")

    eco_sites_out = {}
    errors = []
    done = 0
    catchup_count = 0
    full_count = 0

    with ThreadPoolExecutor(max_workers=ECO_CONCURRENCY) as pool:
        jobs = {}
        for sid in site_ids:
            is_new = str(sid) not in known_ids
            if no_file_data or is_new:
                fetch_from = utc_day_start(history_start)
                is_full = True
                full_count += 1
            else:
                fetch_from = catchup_from
                is_full = False
                catchup_count += 1
            jobs[pool.submit(fetch_eco_site_weekly, sid, fmt_eco_date(fetch_from), dd_end)] = (sid, fetch_from, is_full)

        for fut in as_completed(jobs):
            site_id, weekly_new, err = fut.result()
            _, fetch_from, is_full = jobs[fut]
            done += 1
            if err:
                errors.append((site_id, err))
            meta = site_meta.get(site_id, {})
            prev = existing_sites.get(str(site_id)) or existing_sites.get(site_id)
            weekly = weekly_new if is_full else merge_weekly_rows(existing_weekly(prev), weekly_new)
            weekly = trim_weekly_rows(weekly, history_start_monday_key)
            eco_sites_out[str(site_id)] = {
                "siteId": site_id,
                "name": meta.get("name", f"Site {site_id}"),
                "travelModes": meta.get("travelModes", []),
                "weekly": weekly,
            }
            if done % 5 == 0 or done == len(site_ids):
                print(f"Eco progress {done}/{len(site_ids)}")

    print(f"Eco fetches: {catchup_count} catch-up (~short window), {full_count} full-history")

    eco_payload = {
        "schemaVersion": 1,
        "granularity": "P1W",
        "generatedAtUtc": utc_now_iso(),
        "historyWeeks": history_weeks,
        "yoyCompareMonths": {"prior": yoy_prior_month, "current": yoy_current_month},
        "dateRange": {"startDate": dd_history_start, "endDate": dd_end},
        "siteCount": len(eco_sites_out),
        "sites": eco_sites_out,
    }
    write_json(ECO_OUT, eco_payload)
    if errors:
        print(f"Eco errors ({len(errors)}):", errors[:5])


VIVACITY_COUNTS_BASE = "https://api.vivacitylabs.com/countline/counts"
VIVACITY_COUNTS_CLASSES = "classes=pedestrian&classes=cyclist"


def vivacity_headers():
    return {"Accept": "application/json", "x-vivacity-api-key": VIVACITY_API}


def with_vivacity_classes(url):
    return url if "classes=pedestrian" in url else f"{url}&{VIVACITY_COUNTS_CLASSES}"


def iter_time_windows(from_day, to_day, max_days):
    out = []
    cur = from_day
    to_day = utc_day_start(to_day)
    while cur < to_day:
        nxt = min(cur + timedelta(days=max_days), to_day)
        out.append((cur, nxt))
        cur = nxt
    return out


def aggregate_vivacity_data(data):
    if not isinstance(data, dict):
        return []
    keys = [k for k in data if isinstance(data[k], list)]
    if not keys:
        return []
    first_series = data[keys[0]]
    aggregated = []
    for time_entry in first_series:
        entry = {"from": time_entry.get("from"), "to": time_entry.get("to"), "pedestrian": 0, "cyclist": 0}
        for clid in keys:
            rows = data[clid]
            if not isinstance(rows, list):
                continue
            matching = next((e for e in rows if isinstance(e, dict) and e.get("from") == time_entry.get("from")), None)
            if not matching:
                continue
            for direction in ("clockwise", "anti_clockwise"):
                d = matching.get(direction)
                if not isinstance(d, dict):
                    continue
                for vehicle_type, count in d.items():
                    if vehicle_type in entry:
                        entry[vehicle_type] += int(count or 0)
        aggregated.append(entry)
    return aggregated


def merge_rows_by_from(a, b):
    m = {}
    for r in a + b:
        if isinstance(r, dict) and r.get("from"):
            m[str(r["from"])] = r
    return sorted(m.values(), key=lambda x: str(x.get("from", "")))


def vivacity_daily_rows_to_weekly(aggregated_rows):
    daily = []
    for row in aggregated_rows:
        from_iso = row.get("from")
        if not from_iso:
            continue
        daily.append({
            "dateKey": from_iso,
            "pedestrian": int(row.get("pedestrian") or 0),
            "bike": int(row.get("cyclist") or 0),
        })
    return rollup_daily_to_weekly(daily)


def fetch_countline_daily_rows(countline_id, from_day, to_day):
    merged = []
    windows = iter_time_windows(from_day, to_day, VIVACITY_WINDOW_MAX_DAYS)
    for w_from, w_to in windows:
        url = with_vivacity_classes(
            f"{VIVACITY_COUNTS_BASE}?countline_ids={countline_id}"
            f"&from={fmt_vivacity_utc(w_from)}&to={fmt_vivacity_utc(w_to)}&time_bucket=24h"
        )
        r = requests.get(url, headers=vivacity_headers(), timeout=VIVACITY_TIMEOUT_S)
        if r.status_code == 204 or not r.text.strip():
            rows = []
        else:
            r.raise_for_status()
            part = r.json()
            rows = part.get(str(countline_id)) or part.get(countline_id) or []
            if not isinstance(rows, list):
                rows = []
        merged = merge_rows_by_from(merged, rows)
        if VIVACITY_PAUSE_S:
            time.sleep(VIVACITY_PAUSE_S)
    return merged


def fetch_sensor_weekly(sensor_id, countline_ids, from_day, to_day):
    merged_raw = {}
    for clid in countline_ids:
        merged_raw[clid] = fetch_countline_daily_rows(clid, from_day, to_day)
    aggregated = aggregate_vivacity_data(merged_raw)
    return vivacity_daily_rows_to_weekly(aggregated)



def run_vivacity():
    if not VIVACITY_API:
        print("Skipping Vivacity — no API key.")
    else:
        if REFRESH_VIVACITY_MANIFEST:
            print("Refreshing vivacity-sensor-manifest.json …")
            manifest_script = REPO_ROOT / "scripts" / "export-vivacity-sensor-manifest.mjs"
            subprocess.run(
                ["node", str(manifest_script)],
                cwd=REPO_ROOT,
                check=True,
                env=os.environ.copy(),
            )

        if not VIVACITY_MANIFEST.exists():
            print(f"Missing manifest at {VIVACITY_MANIFEST}")
        else:
            manifest = json.loads(VIVACITY_MANIFEST.read_text())
            sensors = manifest.get("sensors") or []

            v_end = utc_day_start(datetime.now(timezone.utc))
            v_history_start = utc_day_start(snapshot_history_start(v_end))
            history_weeks = snapshot_history_weeks(v_history_start, v_end)
            yoy_prior_month, yoy_current_month = snapshot_yoy_month_keys(v_end)
            history_start_monday_key = monday_week_key(v_history_start)

            existing = {}
            existing_payload = load_json_if_exists(VIVACITY_OUT)
            if existing_payload:
                existing = existing_payload.get("sensors") or {}
            summarize_coverage(existing, "Vivacity existing")
            catchup_from, no_file_data, file_max_wk = file_catchup_start(existing, v_history_start)

            vivacity_sensors_out = {}
            catchup_count = 0
            full_count = 0
            known_ids = set(existing.keys())

            print(f"Vivacity sensors: {len(sensors)}")
            print(f"File keeps YoY history {fmt_vivacity_utc(v_history_start)} → {fmt_vivacity_utc(v_end)} after trim ({history_weeks} weeks)")
            print(f"YoY months: {yoy_prior_month} vs {yoy_current_month}")
            if no_file_data:
                print(f"No usable existing weeks — FULL fetch for all sensors from {fmt_vivacity_utc(v_history_start)}")
            else:
                print(f"API catch-up window: {fmt_vivacity_utc(catchup_from)} → {fmt_vivacity_utc(v_end)} (from file max weekKey {file_max_wk})")

            for i, sensor in enumerate(sensors, 1):
                sid = str(sensor.get("sensor_id"))
                clids = [str(c) for c in (sensor.get("countline_ids") or [])]
                if not sid or not clids:
                    continue

                is_new = sid not in known_ids
                if no_file_data or is_new:
                    fetch_from = v_history_start
                    is_full = True
                    full_count += 1
                else:
                    fetch_from = catchup_from
                    is_full = False
                    catchup_count += 1

                print(f"[{i}/{len(sensors)}] sensor {sid} ({len(clids)} countlines) from {fmt_vivacity_utc(fetch_from)}{' (full)' if is_full else ''}")
                try:
                    weekly_new = fetch_sensor_weekly(sid, clids, fetch_from, v_end)
                    prev = existing.get(sid) or {}
                    weekly = weekly_new if is_full else merge_weekly_rows(existing_weekly(prev), weekly_new)
                    weekly = trim_weekly_rows(weekly, history_start_monday_key)
                    vivacity_sensors_out[sid] = {
                        "sensorId": sid,
                        "countlineIds": clids,
                        "weekly": weekly,
                    }
                except Exception as e:
                    print(f"  FAILED sensor {sid}: {e}")
                    prev = existing.get(sid) or {}
                    if existing_weekly(prev):
                        vivacity_sensors_out[sid] = {
                            "sensorId": sid,
                            "countlineIds": clids,
                            "weekly": trim_weekly_rows(existing_weekly(prev), history_start_monday_key),
                        }

            print(f"Vivacity fetches: {catchup_count} catch-up (~short window), {full_count} full-history")

            vivacity_payload = {
                "schemaVersion": 1,
                "granularity": "P1W",
                "generatedAtUtc": utc_now_iso(),
                "historyWeeks": history_weeks,
                "yoyCompareMonths": {"prior": yoy_prior_month, "current": yoy_current_month},
                "dateRange": {"from": fmt_vivacity_utc(v_history_start), "to": fmt_vivacity_utc(v_end)},
                "sensorCount": len(vivacity_sensors_out),
                "sensors": vivacity_sensors_out,
            }
            write_json(VIVACITY_OUT, vivacity_payload)


def main():
    global ECO_COUNTER_API, VIVACITY_API, ECO_HEADERS

    DATA.mkdir(parents=True, exist_ok=True)
    ECO_COUNTER_API = os.environ.get("ECO_COUNTER_API")
    VIVACITY_API = os.environ.get("VIVACITY_API")

    if not ECO_COUNTER_API:
        print("Set ECO_COUNTER_API in the environment or .env", file=sys.stderr)
        return 1
    if not VIVACITY_API:
        print("Warning: VIVACITY_API not set — Vivacity section will be skipped.")

    ECO_HEADERS = {"accept": "application/json", "X-API-KEY": ECO_COUNTER_API}

    print(f"Repo root: {REPO_ROOT}")
    print(
        f"Eco: {ECO_OUT.relative_to(REPO_ROOT)} "
        f"({'exists' if ECO_OUT.exists() else 'MISSING — will full-fetch'})"
    )
    print(
        f"Vivacity: {VIVACITY_OUT.relative_to(REPO_ROOT)} "
        f"({'exists' if VIVACITY_OUT.exists() else 'MISSING — will full-fetch'})"
    )

    run_eco()
    run_vivacity()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
