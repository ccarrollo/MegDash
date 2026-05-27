"""Import Sales tab CSV from Meg AI Dash into sales_records."""
import csv
import json
import sys
from pathlib import Path
from typing import Optional

import requests

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"


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


def parse_month(value: str, default_year: Optional[int] = None):
    v = (value or "").strip()
    if not v:
        return None, None
    months = {
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
    low = v.lower()[:3]
    if low in months and len(v) <= 4:
        from datetime import date

        year = default_year if default_year is not None else date.today().year
        return year, months[low]
    if "/" in v:
        parts = v.split("/")
        if len(parts) >= 2:
            try:
                month = int(parts[0])
                year = int(parts[1])
                if year < 100:
                    year += 2000
                return year, month
            except ValueError:
                return None, None
    if len(v) == 7 and v[4] == "-":
        y, m = v.split("-")
        return int(y), int(m)
    return None, None


def parse_money(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    v = str(value).strip().replace("$", "").replace(",", "")
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def parse_channel(row: dict) -> str:
    raw = (
        row.get("3PP or Wholesale")
        or row.get("Channel")
        or row.get("3PP")
        or ""
    ).strip()
    if raw.lower().startswith("wholesale"):
        return "wholesale"
    return "3pp"


def parse_date(value: Optional[str]) -> Optional[str]:
    if not value or not str(value).strip():
        return None
    return str(value).strip()


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/import_sales_csv.py path/to/Sales.csv [year]",
        )
        return 1

    path = Path(sys.argv[1])
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

    default_year = int(sys.argv[2]) if len(sys.argv) > 2 else None
    if default_year is None:
        from datetime import date

        default_year = date.today().year

    inserted = 0
    skipped = 0
    row_count = 0

    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, [])
        header_joined = ",".join(header).lower()
        index_layout = header and header[0].strip().lower() == "month" and (
            "my sales" not in header_joined
        )

        def process_row(
            *,
            month_label: str,
            status: str,
            doctor_name: str,
            patient: str,
            channel_raw: str,
            my_sales_val,
            actual_cost_val,
            product: Optional[str],
            insurance: Optional[str],
            affected_bone: Optional[str],
            notes: Optional[str],
            order_date: Optional[str],
            fitted_date: Optional[str],
        ):
            nonlocal inserted, skipped
            year, month = parse_month(month_label, default_year)
            if not year or not month:
                skipped += 1
                return
            status_norm = (status or "").strip().lower()
            if status_norm and status_norm != "paid":
                skipped += 1
                return
            if (channel_raw or "").strip().lower().startswith("wholesale"):
                skipped += 1
                return

            my_sales = parse_money(my_sales_val) if my_sales_val is not None else 0.0

            doctor_id = None
            if doctor_name:
                r = requests.get(
                    f"{rest}/doctors?select=id&name=ilike.{requests.utils.quote(doctor_name)}&limit=1",
                    headers=headers,
                    timeout=30,
                )
                if r.ok and r.json():
                    doctor_id = r.json()[0]["id"]

            payload = {
                "doctor_id": doctor_id,
                "patient_label": patient or None,
                "payment_year": year,
                "payment_month": month,
                "my_sales_amount": my_sales,
                "revenue": my_sales,
                "channel": "3pp",
                "actual_cost": parse_money(actual_cost_val),
                "product": product or None,
                "insurance": insurance or None,
                "affected_bone": affected_bone or None,
                "notes": notes or None,
                "order_date": order_date,
                "fitted_date": fitted_date,
            }
            resp = requests.post(
                f"{rest}/sales_records",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if resp.status_code < 400:
                inserted += 1
            else:
                print(resp.status_code, resp.text[:200])
                skipped += 1

        if index_layout:
            for values in reader:
                row_count += 1
                if len(values) < 12:
                    skipped += 1
                    continue
                process_row(
                    month_label=values[0],
                    status=values[1] if len(values) > 1 else "",
                    order_date=parse_date(values[2] if len(values) > 2 else None),
                    fitted_date=parse_date(values[3] if len(values) > 3 else None),
                    patient=values[5] if len(values) > 5 else "",
                    doctor_name=values[7] if len(values) > 7 else "",
                    channel_raw=values[8] if len(values) > 8 else "3pp",
                    insurance=values[9] if len(values) > 9 else None,
                    affected_bone=values[10] if len(values) > 10 else None,
                    product=values[11] if len(values) > 11 else None,
                    actual_cost_val=values[12] if len(values) > 12 else None,
                    my_sales_val=values[13] if len(values) > 13 else "0",
                    notes=values[-1] if values else None,
                )
        else:
            f.seek(0)
            for row in csv.DictReader(f):
                row_count += 1
                process_row(
                    month_label=(
                        row.get("Month")
                        or row.get("Payment Month")
                        or row.get("Payment Date")
                        or ""
                    ),
                    status=(row.get("Status") or "").strip().lower(),
                    doctor_name=(
                        row.get("Doctor") or row.get("Doctor Name") or ""
                    ).strip(),
                    patient=(
                        row.get("Name")
                        or row.get("Patient")
                        or row.get("Patient Name")
                        or ""
                    ).strip(),
                    channel_raw=(
                        row.get("3PP or Wholesale") or row.get("Channel") or "3pp"
                    ),
                    my_sales_val=(
                        row.get("My Sales $")
                        or row.get("My Sales")
                        or row.get("Revenue")
                    ),
                    actual_cost_val=row.get("Actual Cost") or row.get("Device Cost"),
                    product=row.get("Product"),
                    insurance=row.get("Insurance"),
                    affected_bone=row.get("Affected Bone"),
                    notes=row.get("Notes"),
                    order_date=parse_date(
                        row.get("Entered") or row.get("Order Date"),
                    ),
                    fitted_date=parse_date(
                        row.get("Fitting Date") or row.get("Fitted Date"),
                    ),
                )

    print(
        json.dumps(
            {
                "ok": True,
                "inserted": inserted,
                "skipped": skipped,
                "rows": row_count,
                "default_year": default_year,
            },
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
