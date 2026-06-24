// SHIFTED — workforce archetypes + fit engine.
// Behavioral archetypes (how someone works on the floor — not personality fluff).
// No archetype is "better"; each is a better FIT for different role demands.

export type ArchetypeKey =
  | "host"
  | "operator"
  | "closer"
  | "anchor"
  | "builder"
  | "specialist";

export interface Archetype {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  blurb: string;
}

export const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  host: {
    key: "host",
    name: "Host",
    tagline: "Guest-facing energy",
    blurb:
      "You read people fast and make them feel welcome. Service is your craft — the room runs warmer when you're on.",
  },
  operator: {
    key: "operator",
    name: "Operator",
    tagline: "Systems & reliability",
    blurb:
      "You run the playbook. SOPs, prep, open/close — done right, every time. The shift is smooth because you're steady.",
  },
  closer: {
    key: "closer",
    name: "Closer",
    tagline: "Sales & upsell",
    blurb:
      "You turn interest into the sale without the pressure. Baskets get bigger and customers still feel good.",
  },
  anchor: {
    key: "anchor",
    name: "Anchor",
    tagline: "Calm under pressure",
    blurb:
      "Rush hits, things break — you don't. The team steadies around you when it gets loud.",
  },
  builder: {
    key: "builder",
    name: "Builder",
    tagline: "Ambitious fast learner",
    blurb:
      "You level up fast and want the next rung. Give you a new skill and you'll own it in a week.",
  },
  specialist: {
    key: "specialist",
    name: "Specialist",
    tagline: "Craft depth",
    blurb:
      "You go deep. Mastery of the craft — quality and consistency others can't match.",
  },
};

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

// --- Assessment -------------------------------------------------------------
export interface Question {
  prompt: string;
  options: { label: string; archetype: ArchetypeKey }[];
}

export const QUESTIONS: Question[] = [
  {
    prompt: "It's your first hour on a brand-new floor. You gravitate to…",
    options: [
      { label: "Greeting customers and reading the room", archetype: "host" },
      { label: "Learning the open/close checklist cold", archetype: "operator" },
      { label: "Figuring out what sells and how to pitch it", archetype: "closer" },
      { label: "Watching how the craft is done here", archetype: "specialist" },
    ],
  },
  {
    prompt: "A line is forming and one machine just broke. You…",
    options: [
      { label: "Stay calm, re-sequence, keep the line moving", archetype: "anchor" },
      { label: "Keep guests smiling so the wait feels shorter", archetype: "host" },
      { label: "Work the system — fastest path to clear it", archetype: "operator" },
      { label: "Improvise a fix on the fly", archetype: "builder" },
    ],
  },
  {
    prompt: "A regular asks 'what should I get?' You…",
    options: [
      { label: "Match them to the perfect thing and add one more", archetype: "closer" },
      { label: "Ask about their taste and guide them warmly", archetype: "host" },
      { label: "Give the expert breakdown of the options", archetype: "specialist" },
      { label: "Stick to the proven recommendations", archetype: "operator" },
    ],
  },
  {
    prompt: "Your manager hands you a skill you've never done. You…",
    options: [
      { label: "Dive in and learn it fast", archetype: "builder" },
      { label: "Want to master it properly before going live", archetype: "specialist" },
      { label: "Ask for the SOP and follow it exactly", archetype: "operator" },
      { label: "Find the version that helps me sell more", archetype: "closer" },
    ],
  },
  {
    prompt: "What makes a shift feel great?",
    options: [
      { label: "Guests left happy because of me", archetype: "host" },
      { label: "Everything ran like clockwork", archetype: "operator" },
      { label: "I hit big numbers", archetype: "closer" },
      { label: "We survived chaos and I kept us cool", archetype: "anchor" },
    ],
  },
  {
    prompt: "The thing coworkers thank you for most:",
    options: [
      { label: "Keeping morale up", archetype: "host" },
      { label: "Never dropping the ball", archetype: "operator" },
      { label: "Staying steady when it's mad busy", archetype: "anchor" },
      { label: "Teaching them something new", archetype: "builder" },
    ],
  },
  {
    prompt: "A tough, angry customer. You…",
    options: [
      { label: "De-escalate calmly, no drama", archetype: "anchor" },
      { label: "Win them back with charm", archetype: "host" },
      { label: "Follow the complaint procedure precisely", archetype: "operator" },
      { label: "Turn it into a sale and a fan", archetype: "closer" },
    ],
  },
  {
    prompt: "Six months from now you want to be…",
    options: [
      { label: "Running shifts / training the team", archetype: "builder" },
      { label: "The best in the city at my craft", archetype: "specialist" },
      { label: "Top of the sales board", archetype: "closer" },
      { label: "The one everyone trusts to open & close", archetype: "operator" },
    ],
  },
  {
    prompt: "Pick the compliment you'd be proudest of:",
    options: [
      { label: "'Customers love you.'", archetype: "host" },
      { label: "'You never miss a detail.'", archetype: "operator" },
      { label: "'You could sell anything.'", archetype: "closer" },
      { label: "'Nothing rattles you.'", archetype: "anchor" },
    ],
  },
  {
    prompt: "Slow afternoon, no customers. You…",
    options: [
      { label: "Deep-clean and reset to spec", archetype: "operator" },
      { label: "Practice and refine my craft", archetype: "specialist" },
      { label: "Learn a station I don't know yet", archetype: "builder" },
      { label: "Prep a little selling theatre for later", archetype: "closer" },
    ],
  },
  {
    prompt: "Your superpower in three words:",
    options: [
      { label: "People feel welcome", archetype: "host" },
      { label: "Reliable, every time", archetype: "operator" },
      { label: "Cool under fire", archetype: "anchor" },
      { label: "Master of craft", archetype: "specialist" },
    ],
  },
  {
    prompt: "New menu launches tomorrow. You…",
    options: [
      { label: "Learn every detail so I can teach it", archetype: "specialist" },
      { label: "Plan how to upsell the new items", archetype: "closer" },
      { label: "Make sure the prep & SOPs are ready", archetype: "operator" },
      { label: "Get hyped to learn something new", archetype: "builder" },
    ],
  },
  {
    prompt: "Double-booked rush, short-staffed. Your instinct:",
    options: [
      { label: "Breathe, triage, hold the line", archetype: "anchor" },
      { label: "Keep guests cheerful through the wait", archetype: "host" },
      { label: "Run the most efficient system possible", archetype: "operator" },
      { label: "Jump on any station that needs me", archetype: "builder" },
    ],
  },
  {
    prompt: "You'd rather be known as the person who…",
    options: [
      { label: "Makes every guest's day", archetype: "host" },
      { label: "Drives the revenue", archetype: "closer" },
      { label: "Holds the standard", archetype: "operator" },
      { label: "Knows the craft cold", archetype: "specialist" },
    ],
  },
  {
    prompt: "What pulls you to a job?",
    options: [
      { label: "Great team & guest vibe", archetype: "host" },
      { label: "Room to grow fast", archetype: "builder" },
      { label: "Clear systems & expectations", archetype: "operator" },
      { label: "A craft worth mastering", archetype: "specialist" },
    ],
  },
];

/** Tally archetype picks → dominant archetype + score map. */
export function scoreArchetype(picks: ArchetypeKey[]): {
  archetype: ArchetypeKey;
  scores: Record<string, number>;
} {
  const scores: Record<string, number> = {};
  for (const k of ARCHETYPE_LIST.map((a) => a.key)) scores[k] = 0;
  for (const p of picks) if (p in scores) scores[p] += 1;
  let top: ArchetypeKey = "host";
  let max = -1;
  for (const a of ARCHETYPE_LIST) {
    if (scores[a.key] > max) {
      max = scores[a.key];
      top = a.key;
    }
  }
  return { archetype: top, scores };
}

// --- Fit engine -------------------------------------------------------------
// Each role is mapped to the archetypes it most rewards. Used with verified
// skill coverage to score a worker's fit for a role.
export const ROLE_FIT: Record<string, ArchetypeKey[]> = {
  budtender: ["host", "closer", "specialist"],
  barista: ["host", "anchor", "operator"],
  server: ["host", "anchor", "closer"],
  bartender: ["host", "closer", "anchor"],
  host: ["host", "anchor"],
  retail: ["host", "closer"],
  cashier: ["operator", "anchor"],
  cook: ["operator", "anchor", "specialist"],
  manager: ["operator", "builder"],
  supervisor: ["operator", "builder", "anchor"],
};

/** Derive a known role key from a free-text job title. */
export function deriveRole(title: string | null | undefined): string | null {
  const t = (title ?? "").toLowerCase();
  for (const key of Object.keys(ROLE_FIT)) {
    if (t.includes(key)) return key;
  }
  if (t.includes("barista")) return "barista";
  return null;
}

/** Fit label for a worker's archetype against a role. */
export function archetypeFit(
  archetype: ArchetypeKey | null,
  roleKey: string | null,
): "strong" | "open" | null {
  if (!archetype || !roleKey || !ROLE_FIT[roleKey]) return null;
  return ROLE_FIT[roleKey].includes(archetype) ? "strong" : "open";
}
