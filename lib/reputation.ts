// Worker reputation states (see migration 0017). Protect the scarce side:
// a low score reduces ranking and shows a recovery path — it never bans.

export type ReputationState = "building" | "active" | "at_risk" | "suspended";

export const REPUTATION_LABEL: Record<ReputationState, string> = {
  building: "Building reputation",
  active: "Active",
  at_risk: "At risk",
  suspended: "Suspended",
};

/** Build the plain-language recovery guidance for the worker's panel. */
export function recoveryFactors(counts: {
  noShow: number;
  lateCancel: number;
  lateArrival: number;
}): string[] {
  const f: string[] = [];
  if (counts.noShow > 0)
    f.push(`${counts.noShow} no-show${counts.noShow > 1 ? "s" : ""} in the last 90 days`);
  if (counts.lateCancel > 0)
    f.push(`${counts.lateCancel} late cancellation${counts.lateCancel > 1 ? "s" : ""}`);
  if (counts.lateArrival > 0)
    f.push(`${counts.lateArrival} late arrival${counts.lateArrival > 1 ? "s" : ""}`);
  return f;
}
