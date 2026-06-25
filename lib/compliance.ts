// Thailand hiring-compliance backbone — encodes the document trail an SME
// employer must keep when hiring (RD, SSO, DLPW, DOE, Immigration). Drives the
// self-attestation checklist, the compliance score, and the trust badge.
//
// ⚠️ Self-attested, not legal advice. Rates/thresholds change — see
// COMPLIANCE_VERIFIED_ON and the January review note. Confirm against the source
// agency or a licensed Thai accountant/lawyer before filing.

export const COMPLIANCE_VERIFIED_ON = "June 2026";

export interface ComplianceItem {
  key: string;
  label: string;
  detail: string;
  deadline?: string;
}

export type ComplianceScope = "core" | "scale" | "foreign";

export interface ComplianceGroup {
  id: string;
  agency: string;
  agencyTh: string;
  title: string;
  blurb: string;
  scope: ComplianceScope;
  items: ComplianceItem[];
}

// Each item is a status the platform can track (done / not yet). Core groups
// apply to every employer; scale applies at 10+ staff; foreign applies when
// hiring foreign nationals.
export const COMPLIANCE_GROUPS: ComplianceGroup[] = [
  {
    id: "entity-tax",
    agency: "Revenue Dept (RD)",
    agencyTh: "กรมสรรพากร",
    title: "Entity & payroll tax",
    blurb: "Your legal identity and the withholding tax every payslip triggers.",
    scope: "core",
    items: [
      {
        key: "company_pack",
        label: "Company pack on file",
        detail:
          "Affidavit (<3 months), MOA, shareholder list (บอจ.5), VAT cert (ภ.พ.20) — needed downstream by SSO and work-permit filings.",
      },
      {
        key: "company_tax_id",
        label: "Company Tax ID registered",
        detail: "13-digit tax ID (same as the DBD registration number).",
      },
      {
        key: "wht_efiling",
        label: "Monthly WHT (PND.1) e-filed",
        detail: "Withhold tax from wages and remit via RD e-Filing.",
        deadline: "by the 15th, monthly",
      },
      {
        key: "annual_pnd1k",
        label: "Annual PND.1 Kor + 50 Bis to staff",
        detail: "Year-end wage/WHT summary, and a withholding certificate to each employee.",
        deadline: "50 Bis by 15 Feb · PND.1 Kor by end Feb",
      },
    ],
  },
  {
    id: "social-security",
    agency: "Social Security Office (SSO)",
    agencyTh: "สำนักงานประกันสังคม",
    title: "Social security",
    blurb: "Mandatory social insurance: register, then remit 5% + 5% each month.",
    scope: "core",
    items: [
      {
        key: "sso_employer_reg",
        label: "Registered as an SSO contributor",
        detail: "Employer registration (SPS 1-01) the first time you have an employee.",
        deadline: "within 30 days",
      },
      {
        key: "sso_employee_reg",
        label: "Each new hire registered",
        detail: "SPS 1-03 / 1-03/1 so the employee gets a Social Security card.",
        deadline: "within 30 days of start",
      },
      {
        key: "sso_monthly",
        label: "Monthly contributions remitted",
        detail: "SPS 1-10 filing + payment. 5% employee + 5% employer, ceiling THB 17,500/mo (2026).",
        deadline: "by the 15th, monthly",
      },
      {
        key: "wcf_annual",
        label: "Workmen's Compensation Fund reconciled",
        detail: "Employer-only, 0.2%–1.0% of annual wages by industry risk.",
        deadline: "annually",
      },
    ],
  },
  {
    id: "labour-protection",
    agency: "Labour Protection & Welfare (DLPW)",
    agencyTh: "กรมสวัสดิการและคุ้มครองแรงงาน",
    title: "Labour protection",
    blurb: "The floor of the employment relationship — mostly documented & retained, not filed.",
    scope: "core",
    items: [
      {
        key: "written_contract",
        label: "Written contract for every employee",
        detail: "Bilingual recommended; Thai governs. Covers pay, role, hours.",
      },
      {
        key: "min_wage",
        label: "Paying at/above minimum wage",
        detail: "Bangkok THB 400/day; provincial range 337–400. Hotels/entertainment 400 nationwide.",
      },
      {
        key: "hours_leave",
        label: "Hours, day off & statutory leave honoured",
        detail: "Max 8h/day & 48h/week, ≥1 day off/week, annual/sick/public-holiday leave per the LPA.",
      },
      {
        key: "records_kept",
        label: "Wage / OT / leave records kept",
        detail: "Retain employee records ≥2 years after termination.",
      },
      {
        key: "warning_records",
        label: "Warnings & disciplinary records documented",
        detail: "Valid written warnings are needed to justify a for-cause (no-severance) dismissal.",
      },
    ],
  },
  {
    id: "at-scale",
    agency: "DLPW + SSO",
    agencyTh: "กรมสวัสดิการฯ + ประกันสังคม",
    title: "At 10+ employees",
    blurb: "Extra obligations that trigger once you reach ten regular staff.",
    scope: "scale",
    items: [
      {
        key: "work_rules",
        label: "Written work rules (Thai) posted",
        detail: "Establish & display work rules in Thai covering hours, leave, discipline, grievance, termination.",
        deadline: "within 15 days of reaching 10 staff",
      },
      {
        key: "employee_register",
        label: "Employee register maintained (Thai)",
        detail: "Plus wage/OT/holiday payment records, retained 2+ years.",
      },
      {
        key: "ewf",
        label: "Employee Welfare Fund contributions",
        detail: "0.25% of wages where no equivalent provident fund exists (phased in from Oct 2025).",
      },
    ],
  },
  {
    id: "foreign-hires",
    agency: "Employment (DOE) + Immigration",
    agencyTh: "กรมการจัดหางาน + ตม.",
    title: "Foreign hires",
    blurb: "Only if you employ foreign nationals — work permit and visa run together.",
    scope: "foreign",
    items: [
      {
        key: "capital_ratio",
        label: "Capital / 4:1 ratio eligibility met",
        detail: "THB 2M paid-up capital per foreign worker and/or 4 Thai employees per foreigner.",
      },
      {
        key: "work_permit",
        label: "Work permit issued (DOE)",
        detail: "Tied to a specific employer and position; processed at the DOE.",
      },
      {
        key: "visa_extension",
        label: "Non-B visa, extension & 90-day reporting",
        detail: "Maintained for the duration of stay, alongside the work permit.",
      },
    ],
  },
];

export interface ComplianceContext {
  foreignHires: boolean;
  headcount10Plus: boolean;
}

/** Which groups apply given the employer's context. */
export function applicableGroups(ctx: ComplianceContext): ComplianceGroup[] {
  return COMPLIANCE_GROUPS.filter((g) => {
    if (g.scope === "scale") return ctx.headcount10Plus;
    if (g.scope === "foreign") return ctx.foreignHires;
    return true;
  });
}

/** Flat list of item keys that apply in this context. */
export function applicableItemKeys(ctx: ComplianceContext): string[] {
  return applicableGroups(ctx).flatMap((g) => g.items.map((i) => i.key));
}

export interface ComplianceScore {
  done: number;
  total: number;
  pct: number;
  complete: boolean;
}

export function complianceScore(
  doneKeys: string[],
  ctx: ComplianceContext,
): ComplianceScore {
  const applicable = new Set(applicableItemKeys(ctx));
  const done = doneKeys.filter((k) => applicable.has(k)).length;
  const total = applicable.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct, complete: total > 0 && done === total };
}

export type ComplianceStatus = "none" | "in_progress" | "ready";

export function complianceStatus(
  doneKeys: string[],
  ctx: ComplianceContext,
): ComplianceStatus {
  const { done, complete } = complianceScore(doneKeys, ctx);
  if (complete) return "ready";
  if (done > 0) return "in_progress";
  return "none";
}

// ---------------------------------------------------------------------------
// Read-only operator references (rendered, not tracked).
// ---------------------------------------------------------------------------

export const PER_HIRE_CHECKLIST: { phase: string; items: string[] }[] = [
  {
    phase: "At offer / day one",
    items: [
      "Signed employment contract (Thai-governing; bilingual if foreign hire)",
      "Copy of ID card / passport",
      "Bank account details for payroll",
      "Lor Yor 01 (tax allowance declaration)",
      "Acknowledgement of work rules (if 10+ staff)",
      "Emergency contact + personal-data consent (PDPA)",
    ],
  },
  {
    phase: "Within 30 days",
    items: [
      "SSO registration filed — SPS 1-03 / 1-03/1",
      "Employee added to payroll + SSF contribution setup",
    ],
  },
  {
    phase: "Monthly (payroll cycle)",
    items: [
      "WHT filed — PND.1 (by 15th, e-filing)",
      "SSO contribution filed — SPS 1-10 (by 15th)",
      "Payslip issued showing tax + SSO deductions",
    ],
  },
  {
    phase: "Annually",
    items: [
      "PND.1 Kor (by end Feb) + 50 Bis certificates to staff (by 15 Feb)",
      "Workmen's Compensation Fund reconciliation",
      "EWF contributions (if 10+ staff)",
    ],
  },
  {
    phase: "Foreign hire — additional",
    items: [
      "Verify capital / 4:1 ratio eligibility",
      "Non-B visa secured",
      "Work permit issued (DOE)",
      "Extension of stay + 90-day reporting set up",
    ],
  },
  {
    phase: "Triggered at 10 employees",
    items: [
      "Written work rules in Thai posted within 15 days",
      "Employee register maintained in Thai; records kept 2+ years",
    ],
  },
];

export const COMPLIANCE_CALENDAR: { when: string; what: string; agency: string }[] = [
  { when: "Monthly, by the 15th", what: "PND.1 (WHT) + SPS 1-10 (SSO) e-filing", agency: "RD + SSO" },
  { when: "Within 30 days of each hire", what: "SSO registration", agency: "SSO" },
  { when: "By 15 Feb", what: "Issue 50 Bis certificates to employees", agency: "RD" },
  { when: "By end Feb", what: "PND.1 Kor annual summary", agency: "RD" },
  { when: "By end Mar", what: "Employees file PND.91/90 (personal)", agency: "RD" },
  { when: "Annually", what: "Workmen's Compensation Fund reconciliation", agency: "SSO" },
  { when: "Each January", what: "Re-verify SSO wage ceiling & minimum wage", agency: "SSO / DLPW" },
];

export const COMPLIANCE_RATES: { item: string; value: string; note: string }[] = [
  { item: "Min. wage (Bangkok)", value: "THB 400/day", note: "Provincial range 337–400" },
  { item: "SSO rate", value: "5% + 5%", note: "Employee + employer, matched" },
  { item: "SSO wage ceiling", value: "THB 17,500/mo", note: "From 1 Jan 2026 (was 15,000)" },
  { item: "SSO max contribution", value: "THB 875/mo per side", note: "Phased toward 1,000" },
  { item: "Workmen's Comp Fund", value: "0.2%–1.0%", note: "Of annual wages; employer only" },
  { item: "Employee Welfare Fund", value: "0.25% of wages", note: "Mandatory 10+ staff, from Oct 2025" },
  { item: "WHT filing deadline", value: "15th of next month", note: "E-filing mandatory since Jan 2025" },
  { item: "Work-rules threshold", value: "10 employees", note: "Written Thai rules within 15 days" },
  { item: "Foreign-hire capital", value: "THB 2M / foreigner", note: "And/or 4 Thai : 1 foreign ratio" },
];
