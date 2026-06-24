#!/usr/bin/env python3
"""
SHIFTED — Greenstead seed extractor.

Parses Greenstead Co., Ltd. salary-acknowledgement payslips (.docx, Thai) into:
  • greenstead-employer.json — the employer
  • greenstead-staff.json     — one staff record per employee (deduped by name,
                                keeping the most recent payslip period/salary)

Pass the .docx files (or a directory) as arguments; defaults to the extracted
files in /tmp/gs_extract.

Usage:
    python3 scripts/extract_greenstead.py /tmp/gs_extract/*.docx
"""
import glob
import json
import os
import re
import sys
import zipfile

OUT_DIR = os.path.join(os.path.dirname(__file__), "seed-data")

# Thai month name → number
THAI_MONTHS = {
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4,
    "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
    "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
}


def doc_text(path: str) -> str:
    """Flatten a .docx body to plain text. These payslips contain malformed,
    nested <w:t> runs, so we strip *all* tags rather than match runs."""
    import html

    z = zipfile.ZipFile(path)
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    text = re.sub(r"<[^>]+>", "", xml)  # drop every tag
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def parse_payslip(path: str) -> dict:
    t = doc_text(path)

    # Employee name: follows "ชื่อพนักงาน"
    name = ""
    m = re.search(r"ชื่อพนักงาน\s*(.+?)\s*(?:รายละเอียด|$)", t)
    if m:
        name = m.group(1).strip()

    # Net salary: number before "บาท" after "รวมสุทธิ"
    salary = None
    m = re.search(r"รวมสุทธิ\s*([\d,]+)\s*บาท", t)
    if m:
        salary = int(m.group(1).replace(",", ""))

    # Period: "เดือน <month> / <BE year>"
    period = None
    m = re.search(r"เดือน\s*([฀-๿]+)\s*/\s*(\d{4})", t)
    if m and m.group(1) in THAI_MONTHS:
        be_year = int(m.group(2))
        period = f"{be_year - 543:04d}-{THAI_MONTHS[m.group(1)]:02d}"

    return {"full_name": name, "net_salary": salary, "period": period}


def main():
    args = sys.argv[1:]
    paths = []
    for a in args:
        paths.extend(glob.glob(a))
    if not paths:
        paths = glob.glob("/tmp/gs_extract/*.docx")
    if not paths:
        print("No .docx files found. Pass payslip paths as arguments.")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    employer = {
        "company_name": "Greenstead Co., Ltd.",
        "company_name_th": "บริษัท กรีนสเต็ด จำกัด",
        "slug": "greenstead",
        "industry": "other",
        "location": "Bangkok",
        "description": (
            "Greenstead Company Limited — Bangkok (73 Soi Ramintra 2)."
        ),
        "website": "https://greenstead-th.com",
        "business_registered": True,
        "salary_transparency": True,
        "verification": "verified",
        "email": "nisarat@greenstead-th.com",
    }

    # Dedupe staff by name, keep most recent period.
    by_name: dict[str, dict] = {}
    for p in sorted(paths):
        rec = parse_payslip(p)
        if not rec["full_name"]:
            continue
        prev = by_name.get(rec["full_name"])
        if prev is None or (rec["period"] or "") > (prev["period"] or ""):
            by_name[rec["full_name"]] = rec
    staff = list(by_name.values())

    json.dump(employer, open(os.path.join(OUT_DIR, "greenstead-employer.json"), "w"),
              indent=2, ensure_ascii=False)
    json.dump(staff, open(os.path.join(OUT_DIR, "greenstead-staff.json"), "w"),
              indent=2, ensure_ascii=False)

    print(f"✓ greenstead-employer.json — {employer['company_name']} (verified)")
    print(f"✓ greenstead-staff.json    — {len(staff)} staff records")
    for s in staff:
        sal = f"{s['net_salary']:,}" if s["net_salary"] is not None else "?"
        print(f"    • {s['full_name']}  ({s['period']}, net {sal} THB)")
    print(f"  → {OUT_DIR}")


if __name__ == "__main__":
    main()
