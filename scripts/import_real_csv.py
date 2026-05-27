import csv
import json
import os
import sys
from pathlib import Path
from urllib.parse import quote_plus

import requests


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
CSV_FILE = ROOT / "prospecting-real-upload.csv"


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


def bool_or_none(value: str):
    v = (value or "").strip().lower()
    if not v:
        return None
    if v in {"yes", "y", "true", "1", "scheduled"}:
        return True
    if v in {"no", "n", "false", "0"}:
        return False
    return None


def parse_date_or_none(value: str):
    v = (value or "").strip()
    if not v:
        return None
    # already ISO
    if len(v) == 10 and v[4] == "-" and v[7] == "-":
        return v
    # m/d/yyyy or m/d/yy
    parts = v.split("/")
    if len(parts) == 3:
        try:
            month = int(parts[0])
            day = int(parts[1])
            year = int(parts[2])
            if year < 100:
                year += 2000
            return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            return None
    return None


def zone_from_text(text: str) -> str:
    t = text.lower()
    if any(x in t for x in ["waco", "temple", "killeen", "harker heights", "clifton", "hamilton", "gatesville"]):
        return "waco_central"
    if any(x in t for x in ["cuero", "fredericksburg", "kerrville", "llano", "marble falls"]):
        return "west_rural"
    if any(x in t for x in ["bastrop", "lockhart", "bertram"]):
        return "east"
    if any(x in t for x in ["san marcos", "kyle", "new braunfels", "wimberley", "buda"]):
        return "south_i35"
    if any(x in t for x in ["cedar park", "round rock", "georgetown", "leander", "dripping springs", "bee cave", "spicewood", "pflugerville"]):
        return "north_nw"
    if "austin" in t:
        return "austin_core"
    return "unknown"


def api_request(method: str, url: str, key: str, payload=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    resp = requests.request(method, url, headers=headers, json=payload, timeout=30)
    if resp.status_code >= 400:
        raise RuntimeError(f"{method} {url} failed: {resp.status_code} {resp.text[:500]}")
    if not resp.text.strip():
        return None
    return resp.json()


def main():
    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        return 1
    if not CSV_FILE.exists():
        print(f"CSV not found: {CSV_FILE}")
        return 1

    rest = f"{url}/rest/v1"
    rows = list(csv.DictReader(CSV_FILE.read_text(encoding="utf-8").splitlines()))
    rows = [r for r in rows if r.get("Facility") and r.get("Doctor Name") and r.get("Address")]
    if not rows:
        print("No valid rows in CSV.")
        return 1

    # Clear existing data (same behavior as app import)
    sentinel = "00000000-0000-0000-0000-000000000000"
    for table in ["notes", "lunches", "visits", "doctors", "facilities"]:
        api_request("DELETE", f"{rest}/{table}?id=neq.{sentinel}", key)

    facility_ids: dict[str, str] = {}
    inserted_doctors = 0
    inserted_lunches = 0
    inserted_notes = 0

    for row in rows:
        facility = row["Facility"].strip()
        address = row["Address"].strip()
        fkey = f"{facility}::{address}".lower()

        if fkey not in facility_ids:
            zone = zone_from_text(f"{row.get('Location', '')} {address}")
            payload = {
                "name": facility,
                "address": address,
                "location_label": row.get("Location") or None,
                "zone": zone,
                "office_vibe": row.get('Office "Vibe"') or None,
            }
            created = api_request(
                "POST",
                f"{rest}/facilities",
                key,
                [payload],
            )
            # fetch inserted id
            lookup = api_request(
                "GET",
                f"{rest}/facilities?select=id&name=eq.{quote_plus(facility)}&address=eq.{quote_plus(address)}",
                key,
            )
            if not lookup:
                raise RuntimeError(f"Failed to lookup facility id: {facility}")
            facility_ids[fkey] = lookup[0]["id"]

        facility_id = facility_ids[fkey]
        doctor_payload = {
            "facility_id": facility_id,
            "name": row["Doctor Name"].strip(),
            "primary_focus": (row.get("Primary Focus") or "").strip() or None,
            "status": (row.get("Status") or "").strip() or "2. Introduced",
            "priority": (row.get("Priority") or "").strip() or "Medium",
            "decision_makers": (row.get("Decision Makers") or "").strip() or None,
            "other_names": (row.get("Other Names To Know") or "").strip() or None,
            "lunch_scheduled": bool_or_none(row.get("Lunch?") or "") or False,
            "lunch_date": parse_date_or_none(row.get("Lunch Date") or ""),
            "front_desk_in": bool_or_none(row.get("Front Desk In?") or ""),
            "marketing_kit": bool_or_none(row.get("Office Marketing Kit?") or ""),
            "follow_up_date": parse_date_or_none(row.get("Follow-up Date") or ""),
            "order_history": (row.get("History") or "").strip() or None,
            "front_desk_notes": (row.get("Front Desk Notes") or "").strip() or None,
            "competitor_notes": (row.get("Competitor Notes") or "").strip() or None,
            "follow_up_lunch": (row.get("Follow Up Lunch?") or "").strip() or None,
            "interaction_notes": (row.get("Interaction Notes") or "").strip() or None,
        }
        api_request("POST", f"{rest}/doctors", key, [doctor_payload])
        inserted_doctors += 1

        doctor_lookup = api_request(
            "GET",
            f"{rest}/doctors?select=id&name=eq.{quote_plus(doctor_payload['name'])}&facility_id=eq.{quote_plus(facility_id)}&order=created_at.desc&limit=1",
            key,
        )
        if not doctor_lookup:
            continue
        doctor_id = doctor_lookup[0]["id"]

        lunch_date = parse_date_or_none(row.get("Lunch Date") or "")
        if lunch_date:
            lunch_payload = {
                "doctor_id": doctor_id,
                "facility_id": facility_id,
                "lunch_date": lunch_date,
                "lunch_order": (row.get("Lunch Order") or "").strip() or None,
                "food_notes": (row.get("Lunch Notes") or "").strip() or None,
                "interaction_notes": (row.get("Interaction Notes") or "").strip() or None,
                "status": "scheduled",
            }
            api_request("POST", f"{rest}/lunches", key, [lunch_payload])
            inserted_lunches += 1

        note_categories = [
            ("Interaction Notes", "interaction"),
            ("Other Notes", "other"),
            ("Front Desk Notes", "front_desk"),
            ("Competitor Notes", "competitor"),
        ]
        for note_col, category in note_categories:
            body = (row.get(note_col) or "").strip()
            if not body:
                continue
            api_request(
                "POST",
                f"{rest}/notes",
                key,
                [{"doctor_id": doctor_id, "body": body, "category": category}],
            )
            inserted_notes += 1

    print(
        json.dumps(
            {
                "ok": True,
                "facilities": len(facility_ids),
                "doctors": inserted_doctors,
                "lunches": inserted_lunches,
                "notes": inserted_notes,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
