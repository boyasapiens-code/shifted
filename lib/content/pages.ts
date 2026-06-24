// Content registry for the static company / legal / solutions pages.
// Each slug maps to a route under app/<slug>/page.tsx via <InfoPage>.

export interface InfoSection {
  heading: string;
  body: string;
}

export interface InfoPageContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
}

export const INFO_PAGES: Record<string, InfoPageContent> = {
  accessibility: {
    eyebrow: "Company",
    title: "Accessibility",
    intro:
      "SHIFTED should work for everyone — on any device, with any ability. We build to WCAG 2.1 AA and treat accessibility as part of doing the job right, not an afterthought.",
    sections: [
      {
        heading: "What we commit to",
        body: "Keyboard-navigable flows, sufficient colour contrast, readable type, descriptive labels, and screen-reader-friendly structure across the product.",
      },
      {
        heading: "Found a barrier?",
        body: "If something is hard to use with assistive technology, tell us at access@shiftedth.com and we'll fix it. Real feedback from real people is how we improve.",
      },
    ],
  },
  "talent-solutions": {
    eyebrow: "For employers",
    title: "Talent Solutions",
    intro:
      "Hire vetted frontline staff — baristas, servers, bartenders, budtenders, retail and hospitality pros — without the no-shows and fake résumés.",
    sections: [
      {
        heading: "Only see verified people",
        body: "Filter to candidates by verification level. Every level is earned and reviewed, so you spend time on real, qualified applicants.",
      },
      {
        heading: "Avoid bad hires",
        body: "Our shared reference network surfaces reliability, no-show history and would-rehire signals from past employers — before you commit.",
      },
    ],
  },
  "community-guidelines": {
    eyebrow: "Trust & safety",
    title: "Community Guidelines",
    intro:
      "SHIFTED works because people show up honestly — workers and employers alike. These are the standards everyone agrees to.",
    sections: [
      {
        heading: "Be real",
        body: "No fake profiles, fake companies, fake reviews, or misleading job posts. Verification and references exist to keep the network trustworthy.",
      },
      {
        heading: "Be fair",
        body: "Clear salaries, honest expectations, respectful conduct. Reviews are only between matched parties after real, completed work.",
      },
      {
        heading: "Consequences",
        body: "Accounts that scam, harass, or repeatedly no-show can lose verification, be limited, or be removed.",
      },
    ],
  },
  careers: {
    eyebrow: "Company",
    title: "Careers",
    intro:
      "SHIFTED is built by operators — people who've run the cafés, bars, hotels and shops. We're a small team in Bangkok building the trust layer for frontline work.",
    sections: [
      {
        heading: "Who we look for",
        body: "Practical, honest people who care about craft and about the workers and businesses we serve. Hospitality and retail experience is a real plus.",
      },
      {
        heading: "Get in touch",
        body: "We hire infrequently but always want to meet good people. Send a note and what you'd want to work on to careers@shiftedth.com.",
      },
    ],
  },
  "marketing-solutions": {
    eyebrow: "For employers",
    title: "Marketing Solutions",
    intro:
      "Put your brand in front of the right frontline talent. Boost roles and feature your verified workplace to stand out to the people you actually want to hire.",
    sections: [
      {
        heading: "Boost & feature",
        body: "Promote a role to the top of relevant searches, or feature your verified company so candidates see you first. (Rolling out — talk to us.)",
      },
      {
        heading: "Built for hospitality & retail",
        body: "No noisy ad network — just relevant placement in front of vetted candidates in your city and industry.",
      },
    ],
  },
  legal: {
    eyebrow: "Legal",
    title: "Privacy & Terms",
    intro:
      "Plain-language summaries of how SHIFTED handles your data and the terms of using the platform. The full policies govern — this is the readable version.",
    sections: [
      {
        heading: "Privacy (PDPA)",
        body: "We collect only what's needed to run the network — profile, work history, verification evidence — and process it under Thailand's PDPA. Verification documents are stored privately and shared only with reviewers. We never sell your personal data.",
      },
      {
        heading: "Your data, your control",
        body: "You can view, edit, export or delete your profile data. Email privacy@shiftedth.com for any data request.",
      },
      {
        heading: "Terms of use",
        body: "Use SHIFTED honestly and lawfully, follow the Community Guidelines, and don't misuse other people's information. Full Terms of Service and Privacy Policy documents are available on request and will be linked here.",
      },
    ],
  },
  "ad-choices": {
    eyebrow: "Legal",
    title: "Ad Choices",
    intro:
      "SHIFTED isn't an ad network. We don't run third-party advertising or track you across the web for ad targeting.",
    sections: [
      {
        heading: "What you'll see",
        body: "The only promotion on SHIFTED is relevant: boosted roles and featured verified employers, shown based on what you're searching for here — not your browsing history elsewhere.",
      },
      {
        heading: "Your controls",
        body: "Manage notification and visibility preferences in your account settings. Questions: privacy@shiftedth.com.",
      },
    ],
  },
  advertising: {
    eyebrow: "For employers",
    title: "Advertising",
    intro:
      "Reach vetted hospitality, retail and lifestyle talent with clean, relevant promotion — no banner spam, no vanity feed.",
    sections: [
      {
        heading: "Relevant by design",
        body: "Promotion on SHIFTED is contextual: the right role in front of the right candidate, in the right city and industry.",
      },
      {
        heading: "Interested?",
        body: "We're onboarding early partners. Reach us at partners@shiftedth.com.",
      },
    ],
  },
  "sales-solutions": {
    eyebrow: "For employers",
    title: "Sales Solutions",
    intro:
      "Growing a small chain or staffing multiple venues? Tools to find, verify and manage frontline talent across locations.",
    sections: [
      {
        heading: "Hire across locations",
        body: "Manage roles and applicants for every branch in one place, with verification and references built in.",
      },
      {
        heading: "Talk to us",
        body: "For multi-venue and chain accounts, email sales@shiftedth.com and we'll set you up.",
      },
    ],
  },
  mobile: {
    eyebrow: "Product",
    title: "Mobile",
    intro:
      "SHIFTED is mobile-first by design — apply, respond and manage hiring in taps, right from your phone's browser.",
    sections: [
      {
        heading: "Works today",
        body: "The full web app is built for mobile: fast, responsive, and usable on the floor between shifts.",
      },
      {
        heading: "Native apps",
        body: "Dedicated iOS and Android apps are on the roadmap. For now, add shiftedth.com to your home screen for an app-like experience.",
      },
    ],
  },
  "small-business": {
    eyebrow: "For employers",
    title: "Small Business",
    intro:
      "Independent cafés, bars, shops and studios are who we build for. Hire reliable people without an agency or a recruiter's fee.",
    sections: [
      {
        heading: "Free to start",
        body: "Post a role, review vetted applicants, and hire — no upfront cost. You only pay for boosts and premium tools when you want them.",
      },
      {
        heading: "Trust built in",
        body: "Verification and the shared reference network give a one-person operation the same hiring confidence as a big chain.",
      },
    ],
  },
  "safety-center": {
    eyebrow: "Trust & safety",
    title: "Safety Center",
    intro:
      "Hiring and working should feel safe. Here's how to stay safe on SHIFTED and how we help.",
    sections: [
      {
        heading: "For workers",
        body: "Apply to verified employers, meet in public or on-site for interviews, never pay to get a job, and keep conversations on-platform. Report anything off.",
      },
      {
        heading: "For employers",
        body: "Use verification levels and references to vet candidates, confirm identity on day one, and report no-shows so the network stays honest.",
      },
      {
        heading: "Report a problem",
        body: "See something unsafe or a scam? Email safety@shiftedth.com — we review every report.",
      },
    ],
  },
};
