"""Export core Supabase tables to timestamped CSV files."""
from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path
from typing import Dict, List

import requests

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
EXPORT_ROOT = ROOT / "exports"
TABLES = [
    "facilities",
    "doctors",
    "visits",
    "notes",
    "lunches",
    "daily_plan_settings",
    "daily_plan_manual_stops",
    "daily_plan_anchors",
    "daily_plan_stop_times",
    "inventory_items",
    "orders",
    "sales_goals",
    "monthly_goals",
    "sales_records",
    "coffee_roster",
    "coffee_deliveries",
    "coffee_month_goals",
]


def load_env(path: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def fetch_rows(rest_url: str, api_key: str, table: str) -> List[dict]:
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Range": "0-99999",
    }
    resp = requests.get(f"{rest_url}/{table}?select=*", headers=headers, timeout=120)
    if resp.status_code >= 400:
        raise RuntimeError(f"{table}: {resp.status_code} {resp.text[:200]}")
    data = resp.json()
    if not isinstance(data, list):
        raise RuntimeError(f"{table}: unexpected response")
    return data


def write_csv(path: Path, rows: List[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> int:
    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        return 1

    rest_url = f"{url}/rest/v1"
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = EXPORT_ROOT / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    for table in TABLES:
        try:
            rows = fetch_rows(rest_url, key, table)
        except Exception as exc:
            print(f"{table}: skipped ({exc})")
            continue
        out_path = out_dir / f"{table}.csv"
        write_csv(out_path, rows)
        print(f"{table}: {len(rows)} rows -> {out_path}")

    print(f"Export complete: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
