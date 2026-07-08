#!/usr/bin/env python3
"""
Eco-Counter monthly snapshot — **delegates to the Node builder** so parsing stays
identical to `src/lib/services/eco-counter/eco-counter-processor.js` (same as Vivacity
having a Python driver that matches app logic).

Prerequisite: Node 18+ (global `fetch`).

Usage (repo root):
  ECO_COUNTER_API=... python3 scripts/fetch_eco_counter_monthly_snapshot.py
  ECO_COUNTER_API=... python3 scripts/fetch_eco_counter_monthly_snapshot.py -- --concurrency 6 --pause-ms 400

Any args after `--` are passed through to:
  node scripts/build-eco-counter-monthly-snapshot.mjs
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    if not os.environ.get("ECO_COUNTER_API"):
        print("Missing ECO_COUNTER_API in the environment.", file=sys.stderr)
        sys.exit(1)

    argv = sys.argv[1:]
    if argv and argv[0] == "--":
        argv = argv[1:]

    script = ROOT / "scripts" / "build-eco-counter-monthly-snapshot.mjs"
    cmd = ["node", str(script), *argv]
    print("[fetch_eco_counter_monthly_snapshot]", " ".join(cmd), flush=True)
    raise SystemExit(subprocess.call(cmd, cwd=str(ROOT)))


if __name__ == "__main__":
    main()
