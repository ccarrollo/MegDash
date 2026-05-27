"""Seed monthly sales goals (edit TARGETS to match Meg's Goals tab)."""
import json
import os
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"

# Edit these to match the Goals tab in Meg Dashboard.xlsx
TARGETS = [
    {"label": "Bone stim units (month)", "target_units": 12, "actual_units": 0},
    {"label": "Revenue goal ($)", "target_units": None, "target_revenue": 50000, "actual_revenue": 0},
]


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


def main():
    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase env in .env.local")
        return 1

    year = int(os.environ.get("GOAL_YEAR", "2026"))
    month = int(os.environ.get("GOAL_MONTH", "5"))
    rest = f"{url}/rest/v1/sales_goals"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    for row in TARGETS:
        payload = {
            "period_year": year,
            "period_month": month,
            "label": row["label"],
            "target_units": row.get("target_units"),
            "actual_units": row.get("actual_units", 0),
            "target_revenue": row.get("target_revenue"),
            "actual_revenue": row.get("actual_revenue", 0),
        }
        r = requests.post(rest, headers=headers, json=payload, timeout=30)
        if r.status_code >= 400:
            print(f"Failed: {r.status_code} {r.text[:300]}")
            return 1

    print(json.dumps({"ok": True, "year": year, "month": month, "count": len(TARGETS)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
