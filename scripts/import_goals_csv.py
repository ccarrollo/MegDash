"""Import monthly goals from Goals tab CSV (Month, AS Goal, PS Goal columns)."""
import csv
import json
import sys
from pathlib import Path
from typing import Optional

import requests

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def load_env(path: Path) -> dict:
    data: dict[str, str] = {}
    if not path.exists():
        return data
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip().strip('"').strip("'")
    return data


def parse_money(value: Optional[str]) -> float:
    if not value:
        return 0.0
    v = str(value).strip().replace("$", "").replace(",", "")
    try:
        return float(v)
    except ValueError:
        return 0.0


def main():
    if len(sys.argv) < 3:
        print(
            "Usage: python scripts/import_goals_csv.py path/to/Goals.csv 2026",
        )
        return 1

    path = Path(sys.argv[1])
    year = int(sys.argv[2])
    if not path.exists():
        print(f"File not found: {path}")
        return 1

    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase env in .env.local")
        return 1

    rest = f"{url}/rest/v1"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    rows = list(csv.DictReader(path.open(encoding="utf-8-sig")))
    upserted = 0
    for row in rows:
        month_label = (row.get("Month") or row.get("F") or "").strip()
        if not month_label:
            continue
        m = MONTHS.get(month_label.lower()[:3])
        if not m:
            continue

        accel = parse_money(
            row.get("AS Goal") or row.get("G") or row.get("Accel Goal"),
        )
        physio = parse_money(
            row.get("PS Goal") or row.get("H") or row.get("Physio Goal"),
        )
        if accel == 0 and physio == 0:
            total = parse_money(row.get("3PP Goal") or row.get("I"))
            if total > 0:
                accel = total

        unit_total = int(round(accel + physio))
        payload = {
            "period_year": year,
            "period_month": m,
            "accel_goal": accel,
            "physio_goal": physio,
            "unit_goal": unit_total,
        }
        resp = requests.post(
            f"{rest}/monthly_goals?on_conflict=period_year,period_month",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json=payload,
            timeout=30,
        )
        if resp.status_code < 400:
            upserted += 1
        else:
            print(f"{month_label}: {resp.status_code} {resp.text[:200]}")

    print(json.dumps({"ok": True, "upserted": upserted, "year": year}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
