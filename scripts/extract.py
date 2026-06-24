#!/usr/bin/env python3
"""
SHIFTED — seed extractor.

Reads the two Google-Forms exports (Stash BKK budtender applications + employee
information) and transforms them into clean JSON mapped to the SHIFTED schema.

- Masks government ID numbers; drops ID-document photo links (PDPA hygiene).
- Converts Excel serial dates to ISO; parses free-text salaries to min/max.
- Output goes to scripts/seed-data/ (gitignored — contains personal data).

Usage:
    python3 scripts/extract.py \
        --applicants "/path/to/Stash BKK - Budtender Application Form (Responses) (1).xlsx" \
        --employees  "/path/to/Employee information (Responses) (1).xlsx"

Defaults point at the files in ~/Downloads.
"""
import argparse
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, timedelta

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
HOME = os.path.expanduser("~")
OUT_DIR = os.path.join(os.path.dirname(__file__), "seed-data")

DEFAULT_APPLICANTS = os.path.join(
    HOME, "Downloads", "Stash BKK - Budtender Application Form (Responses) (1).xlsx"
)
DEFAULT_EMPLOYEES = os.path.join(
    HOME, "Downloads", "Employee information (Responses) (1).xlsx"
)


# --------------------------------------------------------------------------- #
# xlsx reader (stdlib only)
# --------------------------------------------------------------------------- #
def _col_to_idx(ref: str) -> int:
    s = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for c in s:
        n = n * 26 + (ord(c) - 64)
    return n - 1


def read_sheet(path: str) -> list[list[str]]:
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        r = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in r.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    sheet = sorted(
        n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)
    )[0]
    root = ET.fromstring(z.read(sheet))
    rows = []
    for row in root.iter(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            idx = _col_to_idx(c.get("r"))
            t = c.get("t")
            v = c.find(f"{NS}v")
            val = ""
            if v is not None:
                val = shared[int(v.text)] if t == "s" else (v.text or "")
            cells[idx] = val
        maxc = max(cells) if cells else -1
        rows.append([cells.get(i, "") for i in range(maxc + 1)])
    return rows


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
EXCEL_EPOCH = date(1899, 12, 30)  # Excel's day 0 (accounts for 1900 leap bug)


def excel_date(val: str):
    try:
        n = float(val)
    except (TypeError, ValueError):
        return None
    if n <= 0 or n > 80000:
        return None
    try:
        return (EXCEL_EPOCH + timedelta(days=int(n))).isoformat()
    except OverflowError:
        return None


def clean(s) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip())


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_email(s: str):
    s = clean(s).lower()
    return s if EMAIL_RE.match(s) else None


def parse_salary(s: str):
    """Return (min, max, raw) in THB/month. Best-effort from messy free text."""
    raw = clean(s)
    nums = [int(x.replace(",", "")) for x in re.findall(r"\d[\d,]*", raw)]
    nums = [n for n in nums if n >= 3000]  # drop daily-wage / typo outliers
    if not nums:
        return None, None, raw
    return min(nums), max(nums), raw


def split_multi(s: str) -> list[str]:
    return [clean(x) for x in str(s or "").split(",") if clean(x)]


def mask_id(s: str) -> str:
    """Keep only a non-identifying hint that an ID was on file."""
    return "on-file" if clean(s) else ""


# --------------------------------------------------------------------------- #
# Current Stash BKK staff (everyone else in these files is FORMER staff).
# (fragment of full name, nickname, current display name if changed)
# --------------------------------------------------------------------------- #
CURRENT_STAFF = [
    ("Chit Eaindray", "Andrea", None),
    ("Cho Thu Htet", "Iris", None),
    ("Thura Phyo Wai", "Thura", None),
    ("LinThantMinTun", "Michael", None),
    ("Kyaw Zin", "Michael", "Max"),  # Kyaw Zin now goes by Max
    ("Phue Myat", "Jue jue", None),
    ("Si Thu Thway", "Ryan", None),
    ("Thazin Than Soe", "Mera", None),
    ("Tanaphat Chantakornkit", "Fluke", None),
    ("Korawit Jarat", "Yoyo", None),
]


def _normfull(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


def current_staff_match(full_name: str):
    """Return {nickname, new_name} if this person is current staff, else None."""
    fn = _normfull(full_name)
    for frag, nick, new_name in CURRENT_STAFF:
        if _normfull(frag) in fn:
            return {"nickname": nick, "new_name": new_name}
    return None


def nationality_to_languages(nat: str) -> list[str]:
    n = clean(nat).lower()
    if "myanmar" in n or "burm" in n:
        return ["Burmese"]
    if "thai" in n:
        return ["Thai"]
    return []


# --------------------------------------------------------------------------- #
# transforms
# --------------------------------------------------------------------------- #
def transform_applicants(path: str) -> list[dict]:
    rows = read_sheet(path)
    data = rows[1:]
    out = []
    for r in data:

        def g(i):
            return clean(r[i]) if i < len(r) else ""

        full_name = g(4)
        if not full_name:
            continue  # skip empty/trailing rows

        email = valid_email(g(3)) or valid_email(g(1))
        smin, smax, sraw = parse_salary(g(15))
        langs = nationality_to_languages(g(7))
        if clean(g(31)).lower() == "yes" and "English" not in langs:
            langs.append("English")

        # Skills from the "comfortable with" multi-select + cannabis knowledge.
        skills = []
        for item in split_multi(g(32)):
            low = item.lower()
            if "cash" in low:
                skills.append("Cash handling")
            elif "inventory" in low:
                skills.append("Inventory")
            elif "cctv" in low:
                skills.append("CCTV monitoring")
            elif "inspection" in low:
                skills.append("Compliance checks")
        if clean(g(23)).lower() == "yes":
            skills.append("Cannabis experience")
        skills = list(dict.fromkeys(skills))  # dedupe, keep order

        start_iso = excel_date(g(14))
        eng_level = g(29)
        eng_rate = clean(g(30)).replace(".0", "")

        bio_parts = []
        if g(38):
            bio_parts.append(f"Why Stash: {g(38)}")
        if g(37):
            bio_parts.append(f"In 3 words: {g(37)}")
        if g(19):
            bio_parts.append(f"Most recent: {g(19)}")

        cover_parts = [
            f"Branch: {g(12)}" if g(12) else "",
            f"Expected salary: {sraw}" if sraw else "",
            f"English: {eng_level} ({eng_rate}/5)" if eng_level else "",
            f"Cannabis experience: {g(24)}" if g(24) else "",
            f"What makes me different: {g(39)}" if g(39) else "",
        ]
        cover_note = " | ".join(p for p in cover_parts if p)[:1500]

        cur = current_staff_match(full_name)  # hired → now current staff

        out.append(
            {
                "source": "budtender_application",
                "full_name": full_name,
                "nickname": g(5),
                "email": email,
                "phone": g(9),
                "line_id": g(8),
                "dob": excel_date(g(6)),
                "nationality": g(7),
                "location": "Bangkok",
                "headline": f"Budtender — {eng_level} English"
                if eng_level
                else "Budtender",
                "bio": " ".join(bio_parts)[:1500],
                "languages": langs,
                "skills": skills,
                "availability": f"From {start_iso}" if start_iso else "",
                "open_to_work": cur is None,  # current staff aren't job-seeking
                "branch": g(12),
                "expected_salary_min": smin,
                "expected_salary_max": smax,
                "cover_note": cover_note,
                "id_document": mask_id(g(17)),
                "current_staff": cur is not None,
                "application_status": "hired" if cur else "applied",
            }
        )
    return out


def transform_employees(path: str) -> list[dict]:
    rows = read_sheet(path)
    data = rows[1:]
    out = []
    for r in data:

        def g(i):
            return clean(r[i]) if i < len(r) else ""

        full_name = g(1)
        if not full_name:
            continue

        education = g(10)
        bio = f"Education: {education}" if education else ""

        cur = current_staff_match(full_name)
        is_current = cur is not None

        out.append(
            {
                "source": "employee",
                "full_name": full_name,
                "nickname": g(2),
                "email": valid_email(g(7)),
                "phone": g(5),
                "line_id": g(6),
                "dob": excel_date(g(3)),
                "location": "Bangkok",
                "headline": "Stash BKK team member"
                if is_current
                else "Former Stash BKK team · open to work",
                "bio": bio,
                "languages": [],
                "skills": [],
                "availability": "",
                # Former staff are ex-employees and may be job-seeking; current aren't.
                "open_to_work": not is_current,
                "employment_status": "current" if is_current else "former",
                "id_number": mask_id(g(4)),  # masked — never store the real number
            }
        )
    return out


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--applicants", default=DEFAULT_APPLICANTS)
    ap.add_argument("--employees", default=DEFAULT_EMPLOYEES)
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    employer = {
        "company_name": "Stash BKK",
        "slug": "stash-bkk",
        "industry": "cannabis",
        "location": "Bangkok",
        "description": (
            "Premium cannabis dispensary in Bangkok. Compliance-first, "
            "hospitality-driven retail across multiple branches (Onnut, Ari, "
            "Chinatown)."
        ),
        "business_registered": True,
        "salary_transparency": True,
        "verification": "verified",
        # Login email for the Stash BKK account (owner). Override with
        # STASH_EMPLOYER_EMAIL when extracting if it changes.
        "email": os.environ.get("STASH_EMPLOYER_EMAIL", "boyasapiens@gmail.com"),
    }

    job = {
        "title": "Budtender",
        "industry": "cannabis",
        "location": "Bangkok",
        "employment_type": "full_time",
        "shift_work": True,
        "salary_min": 14000,
        "salary_max": 18000,
        "salary_period": "month",
        "languages_required": ["Thai", "English"],
        "experience_required": 0,
        "status": "published",
        "description": (
            "Join Stash BKK as a budtender. You'll guide customers, ensure "
            "prescription compliance, handle cash and inventory accurately, and "
            "deliver premium hospitality. Cannabis product knowledge (Indica / "
            "Sativa / Hybrid) and English communication are a plus."
        ),
    }

    applicants = transform_applicants(args.applicants)
    employees = transform_employees(args.employees)

    # Current Stash BKK staff, collected across both files and deduped by name.
    staff_by_name: dict[str, dict] = {}
    for rec in employees + applicants:
        cur = current_staff_match(rec["full_name"])
        if not cur:
            continue
        key = _normfull(rec["full_name"])
        display = rec["full_name"]
        if cur["new_name"]:
            display = f"{rec['full_name']} ({cur['new_name']})"
        staff_by_name.setdefault(
            key,
            {
                "full_name": display,
                "nickname": cur["new_name"] or cur["nickname"],
                "role_title": "Budtender" if rec["source"] == "budtender_application" else None,
            },
        )
    stash_staff = list(staff_by_name.values())

    json.dump(employer, open(os.path.join(OUT_DIR, "employer.json"), "w"), indent=2, ensure_ascii=False)
    json.dump(job, open(os.path.join(OUT_DIR, "job.json"), "w"), indent=2, ensure_ascii=False)
    json.dump(applicants, open(os.path.join(OUT_DIR, "applicants.json"), "w"), indent=2, ensure_ascii=False)
    json.dump(employees, open(os.path.join(OUT_DIR, "employees.json"), "w"), indent=2, ensure_ascii=False)
    json.dump(stash_staff, open(os.path.join(OUT_DIR, "stash-staff.json"), "w"), indent=2, ensure_ascii=False)

    former = sum(1 for e in employees if e["employment_status"] == "former")
    hired = sum(1 for a in applicants if a["current_staff"])
    print(f"✓ employer.json   — Stash BKK (verified)")
    print(f"✓ job.json        — Budtender (published)")
    print(f"✓ applicants.json — {len(applicants)} applications ({hired} hired → current staff)")
    print(f"✓ employees.json  — {len(employees)} people ({former} former / {len(employees)-former} current)")
    print(f"✓ stash-staff.json — {len(stash_staff)} current Stash BKK staff (Team)")
    for s in stash_staff:
        print(f"    • {s['full_name']}  ({s['nickname']})")
    print(f"  → {OUT_DIR}")


if __name__ == "__main__":
    main()
