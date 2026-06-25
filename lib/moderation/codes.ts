// Legal + policy codes the engine maps every flag to (keeps moderation
// defensible and auditable). From SHIFTED_AI_Moderation_Engine.md §1.

export interface CodeInfo {
  code: string;
  basis: string;
  watches: string;
}

export const LEGAL_CODES: Record<string, CodeInfo> = {
  "CCA-14": {
    code: "CCA-14",
    basis: "Computer Crime Act B.E. 2550 (2017 amend.) s.14",
    watches: "Importing false data causing damage; fraud content.",
  },
  "CCA-16": {
    code: "CCA-16",
    basis: "Computer Crime Act s.16",
    watches: "Doctored/defamatory images that damage reputation.",
  },
  "CCA-15": {
    code: "CCA-15",
    basis: "Computer Crime Act s.15 (intermediary)",
    watches: "Service-provider notice-and-takedown + logging duties.",
  },
  "DEF-326/328": {
    code: "DEF-326/328",
    basis: "Criminal Code ss.326, 328 (defamation by publication)",
    watches: "False statements of fact harming a named party's reputation.",
  },
  "DEF-328": {
    code: "DEF-328",
    basis: "Criminal Code s.328 (defamation by publication)",
    watches: "Published false statement of fact about a named party.",
  },
  "PDPA-GEN": {
    code: "PDPA-GEN",
    basis: "Personal Data Protection Act B.E. 2562",
    watches: "Personal data without lawful basis (phone, address, ID, photo, salary).",
  },
  "PDPA-26": {
    code: "PDPA-26",
    basis: "PDPA s.26 (sensitive data)",
    watches: "Health, disability, criminal record, religion, race, politics, union, sexual orientation — hard block.",
  },
  LABOUR: {
    code: "LABOUR",
    basis: "Labour Protection Act; minimum-wage & work-permit rules",
    watches: "Illegal job terms (below minimum wage, illegal hours, no permit).",
  },
  NATSEC: {
    code: "NATSEC",
    basis: "CCA s.14 national-security limb; Criminal Code s.112",
    watches: "National-security / monarchy-related illegal content — block + escalate.",
  },
};

export const POLICY_CODES: Record<string, string> = {
  HARASSMENT: "Insults, slurs, threats, intimidation.",
  DISCRIM: "Discriminatory posting or screening.",
  RETALIATION: "Punishing/threatening over honest feedback.",
  FAKE_REVIEW: "Fake or coordinated reviews/ratings.",
  FRAUD: "Fake job, pay-to-apply, scam pattern.",
  DOXXING: "Exposing a third party's private contact details.",
  CONSENT_MISSING: "Network content about a worker without active consent.",
};

export const ALL_LEGAL_CODES = Object.keys(LEGAL_CODES);
export const ALL_POLICY_CODES = Object.keys(POLICY_CODES);
