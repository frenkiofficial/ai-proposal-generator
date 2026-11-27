/* ProposalKit — AI Proposal & Quote Generator (demo).
   Service types, phase templates, payment terms, tones and the two
   ready-to-click sample proposals. All names and figures are fictional
   sample data for the demo only. */

const SERVICE_TYPES = {
  website: {
    label: "Website / Landing Page",
    defaultScope: [
      "Homepage + up to 5 inner pages",
      "Mobile-responsive design",
      "Contact form + basic SEO setup",
      "2 revision rounds included",
    ],
    phases: ["Discovery & planning", "Design", "Build & content", "Review & launch"],
  },
  store: {
    label: "Online Store Setup",
    defaultScope: [
      "Homepage + product catalog (up to 40 products)",
      "Shopping cart & secure checkout",
      "Payment setup — Stripe & PayPal",
      "Mobile-responsive design",
      "Product upload — first 20 products included",
      "Basic SEO setup",
      "2 revision rounds included",
    ],
    phases: ["Setup & catalog", "Design & checkout", "Payment & testing", "Launch & handover"],
  },
  social: {
    label: "Social Media Management",
    defaultScope: [
      "12 feed posts per month",
      "4 short-form videos per month",
      "Stories 3× per week",
      "Comments & DMs answered within 24 hours",
      "Monthly performance report",
    ],
    phases: ["Onboarding & audit", "Content calendar", "Publishing & engagement", "Reporting & optimization"],
  },
  seo: {
    label: "SEO Articles / Content Writing",
    defaultScope: [
      "Keyword research for the niche",
      "4 SEO articles per month (1,000+ words each)",
      "Meta titles & descriptions",
      "Internal linking suggestions",
      "Monthly ranking report",
    ],
    phases: ["Keyword research", "Drafting", "Review & edits", "Publishing"],
  },
  admin: {
    label: "Admin, Data & Reports",
    defaultScope: [
      "Data collection from your sources",
      "Cleanup & structuring (spreadsheets)",
      "Weekly summary report",
      "Monthly dashboard update",
    ],
    phases: ["Data collection", "Cleanup & structuring", "Report build", "Delivery & walkthrough"],
  },
  custom: {
    label: "Custom Project",
    defaultScope: [
      "Kickoff call & requirements",
      "Delivery of the agreed scope",
      "1 revision round included",
    ],
    phases: ["Kickoff", "Build", "Review", "Delivery"],
  },
};

const PAYMENT_TERMS = {
  "50-50": {
    label: "50% upfront, 50% on delivery",
    schedule: (total) => [
      { label: "Deposit — due to start the project", pct: 50, amount: round2(total * 0.5) },
      { label: "Balance — due on delivery", pct: 50, amount: round2(total - round2(total * 0.5)) },
    ],
    depositNote: "A 50% deposit is due before work starts; the remaining 50% is due on delivery.",
  },
  "100-upfront": {
    label: "100% upfront",
    schedule: (total) => [
      { label: "Full payment — due before work starts", pct: 100, amount: round2(total) },
    ],
    depositNote: "Full payment is due before work starts.",
  },
  "30-40-30": {
    label: "30% / 40% / 30% milestones",
    schedule: (total) => {
      const first = round2(total * 0.3);
      const second = round2(total * 0.4);
      return [
        { label: "Milestone 1 — 30% to start the project", pct: 30, amount: first },
        { label: "Milestone 2 — 40% at the midpoint review", pct: 40, amount: second },
        { label: "Milestone 3 — 30% on delivery", pct: 30, amount: round2(total - first - second) },
      ];
    },
    depositNote: "30% is due to start, 40% at the midpoint review, and the final 30% on delivery.",
  },
  "net-14": {
    label: "100% on delivery (Net 14)",
    schedule: (total) => [
      { label: "Full payment — due within 14 days of delivery", pct: 100, amount: round2(total) },
    ],
    depositNote: "No payment is due upfront. The full amount is invoiced on delivery and due within 14 days.",
  },
};

const TONES = {
  professional: {
    label: "Professional",
    intro: (d) =>
      `Thank you for considering ${d.senderBusiness} for this project. This proposal outlines exactly what we will deliver, when it will be ready, and what it will cost — so you can approve it with confidence.`,
    closing:
      "We would love to get started. Reply to this proposal to confirm, and we will send the first invoice and book your start date.",
  },
  friendly: {
    label: "Friendly",
    intro: (d) =>
      `Thanks so much for thinking of ${d.senderBusiness}! Here's a clear, no-surprises plan for your project: what's included, when you'll get it, and what it costs. If anything looks off, just tell us — we'll adjust it together.`,
    closing:
      "Excited to work with you! Just reply to say yes and we'll get the ball rolling — invoice and start date included.",
  },
  concise: {
    label: "Concise",
    intro: (d) =>
      `Here is the plan from ${d.senderBusiness}: scope, timeline, and price — everything you need to decide.`,
    closing: "Reply to confirm and we will start.",
  },
};

const CURRENCIES = {
  USD: { symbol: "$", code: "USD", locale: "en-US" },
  GBP: { symbol: "£", code: "GBP", locale: "en-GB" },
  EUR: { symbol: "€", code: "EUR", locale: "en-IE" },
  AUD: { symbol: "A$", code: "AUD", locale: "en-AU" },
};

/* Two ready-to-click samples. startDate is filled in by app.js (today)
   so the generated timeline is always current. */
const SAMPLES = {
  store: {
    senderName: "Aqua Ter",
    senderBusiness: "Aqua Ter — Web & AI Services",
    senderEmail: "hello@aquaterstudio.example",
    clientName: "Marina Cole",
    clientCompany: "Marina's Boutique",
    projectTitle: "Online Store Website for Marina's Boutique",
    serviceType: "store",
    scope: [
      "Homepage + product catalog (up to 40 products)",
      "Shopping cart & secure checkout",
      "Payment setup — Stripe & PayPal",
      "Mobile-responsive design",
      "Product upload — first 20 products included",
      "Basic SEO setup",
      "2 revision rounds included",
    ].join("\n"),
    price: 1450,
    currency: "USD",
    billing: "one-time",
    paymentTerms: "50-50",
    durationWeeks: 3,
    discount: 0,
    tone: "professional",
  },
  social: {
    senderName: "Aqua Ter",
    senderBusiness: "Aqua Ter — Web & AI Services",
    senderEmail: "hello@aquaterstudio.example",
    clientName: "Sarah Linden",
    clientCompany: "Bloom Fitness Studio",
    projectTitle: "Social Media Management — 3-Month Plan",
    serviceType: "social",
    scope: [
      "12 feed posts per month",
      "4 short-form videos per month",
      "Stories 3× per week",
      "Comments & DMs answered within 24 hours",
      "Monthly performance report",
    ].join("\n"),
    price: 900,
    currency: "USD",
    billing: "monthly",
    paymentTerms: "100-upfront",
    durationWeeks: 12,
    discount: 0,
    tone: "friendly",
  },
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* Exported for the Node smoke test (app.js requires data.js the same way). */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SERVICE_TYPES, PAYMENT_TERMS, TONES, CURRENCIES, SAMPLES, round2 };
}
