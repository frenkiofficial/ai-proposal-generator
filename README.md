# ProposalKit — AI Proposal & Quote Generator

Interactive demo: fill in the client, scope and price — get a professional
proposal with a cover, scope of work, timeline, pricing with deposit math,
and terms & conditions. Copy it, download it as `.txt` or `.md`, or print
it to PDF. Everything runs locally in the browser; nothing is uploaded.

**Live demo:** https://frenkiofficial.github.io/ai-proposal-generator/

## What it does

- **Fill in the details** — your business, client, project title, service
  type, tone, scope (one deliverable per line), price, currency, billing
  (one-time or monthly retainer), discount, payment terms, duration and
  start date.
- **Two ready-to-click samples** — an online store website proposal
  ($1,450, 50/50 terms) and a social media management retainer ($900/month).
- **Live preview** — after the first generate, every edit updates the
  proposal document as you type.
- **Full proposal document** — cover with proposal number and date,
  about the project, numbered scope, phased timeline with real dates,
  investment table (fee, discount, total), payment schedule, terms, and
  a signature block.
- **Smart price math** — discount, deposit and milestone splits are
  calculated automatically (50/50, 100% upfront, 30/40/30, Net 14).
- **Export** — copy the whole proposal, download it as `.txt` or `.md`,
  or print it to PDF (print stylesheet shows only the proposal).

## Files

- `index.html` — page structure
- `styles.css` — styling (modern minimal, one accent) + print stylesheet
- `app.js` — proposal building, rendering, live updates, export
- `data.js` — service types, payment terms, tones and the two samples

## Note

Demo with sample data. Client names, prices and terms shown are fictional
examples, not real proposals. The terms are a sample template — review them
before using them with a real client. No data leaves the browser.
