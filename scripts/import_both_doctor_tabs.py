"""Import Relationships + Prospecting tabs from Meg AI Dash (merge — keeps existing doctors)."""
from __future__ import annotations

import csv
import io
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"
SHEET_ID = "1u-SqTWPbBajgFI5x775w5pnWUCaGfNRxpd6NS-N5qt4"


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


def download_tab(sheet: str) -> str:
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq"
        f"?tqx=out:csv&sheet={quote(sheet)}"
    )
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return resp.text


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
    if len(v) == 10 and v[4] == "-" and v[7] == "-":
        return v
    parts = v.split("/")
    if len(parts) == 3:
        try:
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
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


def looks_like_street(value: str) -> bool:
    v = value.strip()
    if not v:
        return False
    if re.search(r"\d{5}", v):
        return True
    if re.search(r"\b(st|ste|suite|rd|dr|blvd|ave|hwy|parkway)\b", v, re.I):
        return True
    if re.search(r"\d+\s+\w", v):
        return True
    return False


def map_relationships(csv_text: str) -> list[dict]:
    rows = list(csv.DictReader(io.StringIO(csv_text)))
    out = []
    for i, r in enumerate(rows):
        if not any((v or "").strip() for v in r.values()):
            continue
        fac = (r.get("Facility") or "").strip() or "Unknown facility"
        doc = (r.get("Doctor Name") or "").strip() or f"Unknown doctor {i + 1}"
        loc = (r.get("Location") or "").strip() or None
        addr = (r.get("Address") or "").strip()
        if not addr:
            addr = f"{fac}, {loc}, TX" if loc else f"{fac}, TX"
        out.append(
            {
                "facility": fac,
                "doctor": doc,
                "address": addr,
                "location": loc,
                "status": (r.get("Status") or "").strip() or "2. Introduced",
                "primary_focus": (r.get("Primary Focus") or "").strip() or None,
                "interaction_notes": (r.get("Interaction Notes") or "").strip() or None,
                "lunch_date": parse_date_or_none(r.get("Lunch Date") or ""),
                "lunch_order": (r.get("Lunch Order") or "").strip() or None,
                "lunch_notes": (r.get("Lunch Notes") or "").strip() or None,
            }
        )
    return out


def map_prospecting_targets(csv_text: str) -> list[dict]:
    rows = list(csv.reader(io.StringIO(csv_text)))
    out = []
    for row in rows:
        cells = [c.strip() for c in row] + [""] * 10
        if not any(cells):
            continue
        c0, c1, c2, c4, status = cells[0], cells[1], cells[2], cells[4], cells[7]
        if "if i don't" in c0.lower():
            continue
        is_target = "8. Target" in status
        is_ref = c0.startswith("Dr.") or c0 in {"Smedley", "Halloran again"}
        if not is_target and not is_ref:
            continue

        if is_target:
            fac, doc, loc = c0, c1, c2
            if looks_like_street(c4):
                addr = c4
            elif loc:
                addr = f"{fac}, {loc}, TX"
            else:
                addr = f"{fac}, TX"
            notes = None
            focus = c4 if not looks_like_street(c4) else None
        else:
            fac, doc = "Unknown facility", c0
            loc = None
            focus = None
            notes = " · ".join(x for x in [c1, c4] if x) or None
            addr = c4 if c4 else "Address needed — update on doctor profile"

        out.append(
            {
                "facility": fac,
                "doctor": doc,
                "address": addr,
                "location": loc,
                "status": "8. Target",
                "primary_focus": focus,
                "interaction_notes": notes,
                "lunch_date": None,
                "lunch_order": None,
                "lunch_notes": None,
            }
        )
    return out


def dedupe(rows: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in rows:
        key = (r["facility"].lower(), r["doctor"].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def api(method, url, key, payload=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    resp = requests.request(method, url, headers=headers, json=payload, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"{method} {url} -> {resp.status_code} {resp.text[:300]}")
    return resp.json() if resp.text.strip() else None


def main():
    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Missing Supabase env in .env.local")
        return 1

    rest = f"{url}/rest/v1"
    print("Downloading Relationships...")
    rel = map_relationships(download_tab("Relationships"))
    print("Downloading Prospecting tab...")
    pros = map_prospecting_targets(download_tab("Prospecting"))
    rows = dedupe(rel + pros)
    print(f"Sheet rows (merged, deduped): {len(rows)} ({len(rel)} relationships + {len(pros)} prospecting targets)")

    facility_ids: dict[str, str] = {}
    inserted = 0
    skipped = 0

    for row in rows:
        fkey = f"{row['facility']}::{row['address']}".lower()
        if fkey not in facility_ids:
            lookup = api(
                "GET",
                f"{rest}/facilities?select=id&name=eq.{quote(row['facility'])}&address=eq.{quote(row['address'])}",
                key,
            )
            if lookup:
                facility_ids[fkey] = lookup[0]["id"]
            else:
                zone = zone_from_text(f"{row.get('location') or ''} {row['address']}")
                created = api(
                    "POST",
                    f"{rest}/facilities",
                    key,
                    [
                        {
                            "name": row["facility"],
                            "address": row["address"],
                            "location_label": row.get("location"),
                            "zone": zone,
                        }
                    ],
                )
                facility_ids[fkey] = created[0]["id"]

        fid = facility_ids[fkey]
        existing = api(
            "GET",
            f"{rest}/doctors?select=id&facility_id=eq.{fid}&name=eq.{quote(row['doctor'])}",
            key,
        )
        if existing:
            skipped += 1
            continue

        api(
            "POST",
            f"{rest}/doctors",
            key,
            [
                {
                    "facility_id": fid,
                    "name": row["doctor"],
                    "primary_focus": row.get("primary_focus"),
                    "status": row["status"],
                    "interaction_notes": row.get("interaction_notes"),
                    "lunch_scheduled": bool(row.get("lunch_date")),
                    "lunch_date": row.get("lunch_date"),
                }
            ],
        )
        inserted += 1

    total = api("GET", f"{rest}/doctors?select=id", key)
    print(
        json.dumps(
            {
                "ok": True,
                "merged_rows": len(rows),
                "doctors_inserted": inserted,
                "doctors_skipped_existing": skipped,
                "doctors_in_db_now": len(total),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
