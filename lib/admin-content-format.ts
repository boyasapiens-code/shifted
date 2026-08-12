// Shared plain-text <-> structured-data helpers for the /admin/content
// forms. Arrays and {title,url}/{label,url} lists are edited as plain text
// (comma-separated / "A | B" one per line) rather than raw JSON — friendlier
// for a solo operator than requiring valid JSON syntax. Used by both the
// server actions (parse: form input -> DB value) and the form pages
// (format: DB value -> textarea/input defaultValue) — one place, so the two
// directions can't drift apart.

// ---- parse (form input -> DB value) ---------------------------------------

export function toList(value: unknown): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function dateOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

export function textOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

interface Pair {
  a: string;
  b: string;
}

/** "A | B" one per line -> [{a,b}]. Blank lines skipped. */
function pairsFromLines(value: unknown): Pair[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split("|").map((s) => s.trim());
      return { a: a ?? "", b: b ?? "" };
    })
    .filter((p) => p.a || p.b);
}

export function sourcesFromLines(value: unknown): { title: string; url: string }[] {
  return pairsFromLines(value).map((p) => ({ title: p.a, url: p.b }));
}

export function socialsFromLines(value: unknown): { label: string; url: string }[] {
  return pairsFromLines(value).map((p) => ({ label: p.a, url: p.b }));
}

// ---- format (DB value -> form defaultValue) --------------------------------

export function fromList(list: string[] | null | undefined): string {
  return (list ?? []).join(", ");
}

function linesFromPairs(pairs: Pair[]): string {
  return pairs.map((p) => `${p.a} | ${p.b}`).join("\n");
}

export function linesFromSources(
  sources: { title: string; url: string }[] | null | undefined,
): string {
  return linesFromPairs((sources ?? []).map((s) => ({ a: s.title, b: s.url })));
}

export function linesFromSocials(
  socials: { label: string; url: string }[] | null | undefined,
): string {
  return linesFromPairs((socials ?? []).map((s) => ({ a: s.label, b: s.url })));
}
