/* ProposalKit — AI Proposal & Quote Generator (demo).
   Pure proposal logic (buildProposal, renderers) is kept DOM-free so it
   can be smoke-tested in Node; the browser wiring lives in init(). */

/* NOTE: data.js declares SERVICE_TYPES etc. as top-level consts in the
   shared global scope when both files load as classic <script> tags.
   Destructuring them into same-named consts here used to throw
   "Identifier 'SERVICE_TYPES' has already been declared" at load time,
   which killed the whole script (no init, every button inert).
   So the bindings below use K_ names to avoid the collision. */
const DATA =
  typeof module !== "undefined" && typeof require === "function"
    ? require("./data.js")
    : { SERVICE_TYPES, PAYMENT_TERMS, TONES, CURRENCIES, SAMPLES, round2 };

const K_SERVICE_TYPES = DATA.SERVICE_TYPES;
const K_PAYMENT_TERMS = DATA.PAYMENT_TERMS;
const K_TONES = DATA.TONES;
const K_CURRENCIES = DATA.CURRENCIES;
const K_SAMPLES = DATA.SAMPLES;
const kRound2 = DATA.round2;

/* ---------------- helpers ---------------- */

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseScope(text, serviceType) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (lines.length > 0) return lines;
  const svc = K_SERVICE_TYPES[serviceType] || K_SERVICE_TYPES.custom;
  return svc.defaultScope.slice();
}

function formatMoney(amount, currencyCode) {
  const c = K_CURRENCIES[currencyCode] || K_CURRENCIES.USD;
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateLong(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatRange(a, b) {
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) return `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  return `${formatDateShort(a)} – ${formatDateShort(b)} ${b.getFullYear()}`;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function parseDateInput(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeProposalNo(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(100 + Math.random() * 900));
  return `PROP-${y}${m}${d}-${seq}`;
}

/* ---------------- core: build the proposal ---------------- */

function buildPhases(startDate, durationWeeks, phaseNames) {
  const count = Math.min(phaseNames.length, Math.max(1, durationWeeks));
  const names = phaseNames.slice(0, count);
  const base = Math.floor(durationWeeks / count);
  const extra = durationWeeks - base * count; // first `extra` phases get +1 week
  const phases = [];
  let cursor = new Date(startDate);
  names.forEach((name, i) => {
    const weeks = base + (i < extra ? 1 : 0);
    const start = new Date(cursor);
    const end = addDays(cursor, weeks * 7 - 1);
    phases.push({ name, weeks, start, end });
    cursor = addDays(end, 1);
  });
  return phases;
}

function buildProposal(input) {
  const today = input.today instanceof Date ? input.today : new Date();
  const service = K_SERVICE_TYPES[input.serviceType] || K_SERVICE_TYPES.custom;
  const tone = K_TONES[input.tone] || K_TONES.professional;
  const terms = K_PAYMENT_TERMS[input.paymentTerms] || K_PAYMENT_TERMS["50-50"];

  const senderName = (input.senderName || "").trim() || "Aqua Ter";
  const senderBusiness = (input.senderBusiness || "").trim() || "Aqua Ter — Web & AI Services";
  const senderEmail = (input.senderEmail || "").trim();
  const clientName = (input.clientName || "").trim() || "Valued Client";
  const clientCompany = (input.clientCompany || "").trim();
  const projectTitle = (input.projectTitle || "").trim() || `${service.label} Proposal`;
  const startDate = input.startDate instanceof Date ? input.startDate : today;
  const durationWeeks = clampNum(input.durationWeeks, 1, 52, 4);
  const discountPct = clampNum(input.discount, 0, 100, 0);
  const price = Math.max(0, Number(input.price) || 0);
  const billing = input.billing === "monthly" ? "monthly" : "one-time";
  const currency = K_CURRENCIES[input.currency] ? input.currency : "USD";

  const scope = parseScope(input.scopeText, input.serviceType);
  const phases = buildPhases(startDate, durationWeeks, service.phases);
  const endDate = phases.length ? phases[phases.length - 1].end : addDays(startDate, durationWeeks * 7 - 1);

  const subtotal = kRound2(price);
  const discountAmt = kRound2((subtotal * discountPct) / 100);
  const total = kRound2(subtotal - discountAmt);
  const schedule = terms.schedule(total);
  const dueNow = schedule.length ? schedule[0].amount : total;

  const termLines = [
    `This quote is valid for 14 days from ${formatDateLong(today)}.`,
    terms.depositNote,
    "Two revision rounds are included. Extra revisions are billed at $45/hour.",
    "Final files and account access are handed over after the final payment.",
    "Payments more than 14 days overdue carry a 5% late fee.",
  ];
  if (billing === "monthly") {
    termLines.push("This is a monthly retainer. It renews each month until cancelled with 14 days' notice.");
  }
  termLines.push("Prices in this proposal are examples for the demo — confirm your real rates before sending.");

  const d = {
    senderName,
    senderBusiness,
    // Avoid "Aqua Ter — Aqua Ter — Web & AI Services" when the business
    // name already starts with the sender's name.
    senderLine: senderBusiness.toLowerCase().startsWith(senderName.toLowerCase())
      ? senderBusiness
      : `${senderName} — ${senderBusiness}`,
    senderEmail,
    clientName,
    clientCompany,
    projectTitle,
    serviceLabel: service.label,
    billing,
    currency,
    durationWeeks,
    discountPct,
    startDate,
    endDate,
    today,
  };

  return {
    proposalNo: input.proposalNo || makeProposalNo(today),
    dateStr: formatDateLong(today),
    ...d,
    intro: tone.intro(d),
    closing: tone.closing,
    scope,
    phases,
    money: { subtotal, discountAmt, total, schedule, dueNow },
    termLines,
    isMonthly: billing === "monthly",
    feeLabel: billing === "monthly" ? "Monthly fee" : "Project fee",
    totalLabel: billing === "monthly" ? "Total (per month)" : "Total",
  };
}

/* ---------------- renderers ---------------- */

function renderMarkdown(p) {
  const L = [];
  L.push(`# Proposal — ${p.projectTitle}`);
  L.push("");
  L.push(`**Proposal:** ${p.proposalNo} · **Date:** ${p.dateStr}`);
  L.push(`**Prepared for:** ${p.clientName}${p.clientCompany ? `, ${p.clientCompany}` : ""}`);
  L.push(`**Prepared by:** ${p.senderLine}${p.senderEmail ? ` (${p.senderEmail})` : ""}`);
  L.push("");
  L.push("## 1. About this project");
  L.push("");
  L.push(p.intro);
  L.push("");
  L.push("## 2. Scope of work");
  L.push("");
  p.scope.forEach((item, i) => L.push(`${i + 1}. ${item}`));
  L.push("");
  L.push("## 3. Timeline");
  L.push("");
  L.push("| Phase | Dates | Duration |");
  L.push("| --- | --- | --- |");
  p.phases.forEach((ph) =>
    L.push(`| ${ph.name} | ${formatRange(ph.start, ph.end)} | ${ph.weeks} week${ph.weeks > 1 ? "s" : ""} |`)
  );
  L.push("");
  L.push(`Project starts ${formatDateLong(p.startDate)} and finishes ${formatDateLong(p.endDate)} (${p.durationWeeks} weeks).`);
  L.push("");
  L.push("## 4. Investment");
  L.push("");
  L.push("| Item | Amount |");
  L.push("| --- | ---: |");
  L.push(`| ${p.feeLabel} | ${formatMoney(p.money.subtotal, p.currency)} |`);
  if (p.discountPct > 0) {
    L.push(`| Discount (${p.discountPct}%) | −${formatMoney(p.money.discountAmt, p.currency)} |`);
  }
  L.push(`| **${p.totalLabel}** | **${formatMoney(p.money.total, p.currency)}** |`);
  L.push("");
  L.push("### Payment schedule");
  L.push("");
  p.money.schedule.forEach((s) => L.push(`- ${s.label}: **${formatMoney(s.amount, p.currency)}**`));
  L.push("");
  L.push("## 5. Terms");
  L.push("");
  p.termLines.forEach((t) => L.push(`- ${t}`));
  L.push("");
  L.push("## 6. Acceptance");
  L.push("");
  L.push(`Agreed by ${p.clientName}: ______________________   Date: __________`);
  L.push("");
  L.push(p.closing);
  L.push("");
  L.push("---");
  L.push("*Sample proposal generated with ProposalKit (demo). Figures and terms are examples — edit before sending to a real client.*");
  return L.join("\n");
}

function renderText(p) {
  const lines = renderMarkdown(p)
    .split("\n")
    .map((line) => {
      if (/^#{1,3} /.test(line)) return line.replace(/^#{1,3} /, "").toUpperCase();
      if (/^\|/.test(line)) {
        const cells = line.split("|").filter((c) => c.trim() && !/^-+$/.test(c.trim()));
        if (cells.some((c) => /^-+$/.test(c.trim()))) return null;
        return cells
          .map((c) => c.trim().replace(/\*\*([^*]+)\*\*/g, "$1"))
          .join(" — ");
      }
      return line
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/^- /g, "• ")
        .replace(/^---$/, "--------------------------------------------------");
    })
    .filter((l) => l !== null);
  return lines.join("\n");
}

function renderProposalHTML(p) {
  const scopeHtml = p.scope.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const phaseRows = p.phases
    .map(
      (ph) =>
        `<tr><td>${escapeHtml(ph.name)}</td><td>${escapeHtml(formatRange(ph.start, ph.end))}</td><td class="num">${ph.weeks} week${ph.weeks > 1 ? "s" : ""}</td></tr>`
    )
    .join("");
  const discountRow =
    p.discountPct > 0
      ? `<tr><td>Discount (${p.discountPct}%)</td><td class="num neg">−${escapeHtml(formatMoney(p.money.discountAmt, p.currency))}</td></tr>`
      : "";
  const scheduleHtml = p.money.schedule
    .map((s) => `<li><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(formatMoney(s.amount, p.currency))}</strong></li>`)
    .join("");
  const termsHtml = p.termLines.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  const priceNote =
    p.money.total === 0
      ? `<p class="price-note">No price entered yet — add a price on the left to complete this proposal.</p>`
      : "";

  return `
  <div class="doc">
    <div class="doc-head">
      <div>
        <div class="doc-sender">${escapeHtml(p.senderBusiness)}</div>
        ${p.senderEmail ? `<div class="doc-email">${escapeHtml(p.senderEmail)}</div>` : ""}
      </div>
      <div class="doc-meta">
        <div><span>Proposal</span><strong>${escapeHtml(p.proposalNo)}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(p.dateStr)}</strong></div>
      </div>
    </div>

    <h2 class="doc-title">${escapeHtml(p.projectTitle)}</h2>
    <p class="doc-prepared">Prepared for <strong>${escapeHtml(p.clientName)}${p.clientCompany ? `, ${escapeHtml(p.clientCompany)}` : ""}</strong> · ${escapeHtml(p.serviceLabel)}</p>

    <h3 class="doc-sec"><span>01</span> About this project</h3>
    <p>${escapeHtml(p.intro)}</p>

    <h3 class="doc-sec"><span>02</span> Scope of work</h3>
    <ol class="doc-scope">${scopeHtml}</ol>

    <h3 class="doc-sec"><span>03</span> Timeline</h3>
    <table class="doc-table">
      <thead><tr><th>Phase</th><th>Dates</th><th class="num">Duration</th></tr></thead>
      <tbody>${phaseRows}</tbody>
    </table>
    <p class="doc-dates">Project starts ${escapeHtml(formatDateLong(p.startDate))} and finishes ${escapeHtml(formatDateLong(p.endDate))} (${p.durationWeeks} weeks).</p>

    <h3 class="doc-sec"><span>04</span> Investment</h3>
    <table class="doc-table price-table">
      <tbody>
        <tr><td>${escapeHtml(p.feeLabel)}</td><td class="num">${escapeHtml(formatMoney(p.money.subtotal, p.currency))}</td></tr>
        ${discountRow}
        <tr class="total-row"><td>${escapeHtml(p.totalLabel)}</td><td class="num">${escapeHtml(formatMoney(p.money.total, p.currency))}</td></tr>
      </tbody>
    </table>
    ${priceNote}
    <ul class="doc-schedule">${scheduleHtml}</ul>

    <h3 class="doc-sec"><span>05</span> Terms</h3>
    <ul class="doc-terms">${termsHtml}</ul>

    <h3 class="doc-sec"><span>06</span> Acceptance</h3>
    <div class="doc-sign">
      <div class="sign-block"><span class="sign-line"></span><span class="sign-who">${escapeHtml(p.clientName)} — Client</span></div>
      <div class="sign-block"><span class="sign-line"></span><span class="sign-who">${escapeHtml(p.senderLine)}</span></div>
    </div>
    <p class="doc-closing">${escapeHtml(p.closing)}</p>

    <p class="doc-foot">Sample proposal generated with ProposalKit (demo). Figures and terms are examples — edit before sending to a real client.</p>
  </div>`;
}

/* ---------------- browser wiring ---------------- */

let currentProposal = null;
let currentProposalNo = null;
let liveTimer = null;

function $(id) {
  return document.getElementById(id);
}

function collectInput() {
  return {
    senderName: $("senderName").value,
    senderBusiness: $("senderBusiness").value,
    senderEmail: $("senderEmail").value,
    clientName: $("clientName").value,
    clientCompany: $("clientCompany").value,
    projectTitle: $("projectTitle").value,
    serviceType: $("serviceType").value,
    scopeText: $("scopeInput").value,
    price: $("priceInput").value,
    currency: $("currencySelect").value,
    billing: $("billingSelect").value,
    paymentTerms: $("paymentTerms").value,
    durationWeeks: $("durationWeeks").value,
    discount: $("discountInput").value,
    tone: $("toneSelect").value,
    startDate: parseDateInput($("startDate").value) || new Date(),
    today: new Date(),
    proposalNo: currentProposalNo,
  };
}

function renderResults(p) {
  currentProposal = p;
  $("emptyState").hidden = true;
  $("results").hidden = false;
  $("outputHint").textContent = `Proposal ${p.proposalNo} · live preview`;
  $("proposalDoc").innerHTML = renderProposalHTML(p);
  $("statTotal").textContent = formatMoney(p.money.total, p.currency);
  $("statDueNow").textContent = formatMoney(p.money.dueNow, p.currency);
  $("statWeeks").textContent = `${p.durationWeeks} wks`;
  $("statItems").textContent = String(p.scope.length);
  $("priceHint").hidden = p.money.total !== 0;
}

function generateProposal(newNumber) {
  if (newNumber || !currentProposalNo) currentProposalNo = makeProposalNo(new Date());
  const p = buildProposal(collectInput());
  renderResults(p);
}

function scheduleLiveUpdate() {
  if (!currentProposal) return; // live updates only after the first generate
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => generateProposal(false), 250);
}

function showToast(msg) {
  const toast = $("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  showToast(okMsg);
}

function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileBase(p) {
  return p.proposalNo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function loadSample(key) {
  const s = K_SAMPLES[key];
  if (!s) return;
  $("senderName").value = s.senderName;
  $("senderBusiness").value = s.senderBusiness;
  $("senderEmail").value = s.senderEmail;
  $("clientName").value = s.clientName;
  $("clientCompany").value = s.clientCompany;
  $("projectTitle").value = s.projectTitle;
  $("serviceType").value = s.serviceType;
  $("scopeInput").value = s.scope;
  $("priceInput").value = s.price;
  $("currencySelect").value = s.currency;
  $("billingSelect").value = s.billing;
  $("paymentTerms").value = s.paymentTerms;
  $("durationWeeks").value = s.durationWeeks;
  $("discountInput").value = s.discount;
  $("toneSelect").value = s.tone;
  $("startDate").value = toDateInput(new Date());
  document.querySelectorAll(".chip[data-sample]").forEach((c) =>
    c.classList.toggle("active", c.dataset.sample === key)
  );
  generateProposal(true);
  $("proposalDoc").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  $("senderName").value = "Aqua Ter";
  $("senderBusiness").value = "Aqua Ter — Web & AI Services";
  $("senderEmail").value = "hello@aquaterstudio.example";
  $("clientName").value = "";
  $("clientCompany").value = "";
  $("projectTitle").value = "";
  $("serviceType").value = "website";
  $("scopeInput").value = "";
  $("priceInput").value = "";
  $("currencySelect").value = "USD";
  $("billingSelect").value = "one-time";
  $("paymentTerms").value = "50-50";
  $("durationWeeks").value = 4;
  $("discountInput").value = 0;
  $("toneSelect").value = "professional";
  $("startDate").value = toDateInput(new Date());
  document.querySelectorAll(".chip[data-sample]").forEach((c) => c.classList.remove("active"));
  currentProposal = null;
  currentProposalNo = null;
  $("results").hidden = true;
  $("emptyState").hidden = false;
  $("outputHint").textContent = "Waiting for your details";
}

function init() {
  resetForm();
  $("generateBtn").addEventListener("click", () => generateProposal(true));
  $("resetBtn").addEventListener("click", resetForm);
  document.querySelectorAll(".chip[data-sample]").forEach((c) =>
    c.addEventListener("click", () => loadSample(c.dataset.sample))
  );

  // Live preview: after the first generate, every edit re-renders.
  ["senderName", "senderBusiness", "senderEmail", "clientName", "clientCompany", "projectTitle",
   "scopeInput", "priceInput", "durationWeeks", "discountInput", "startDate"].forEach((id) =>
    $(id).addEventListener("input", scheduleLiveUpdate)
  );
  ["serviceType", "currencySelect", "billingSelect", "paymentTerms", "toneSelect"].forEach((id) =>
    $(id).addEventListener("change", scheduleLiveUpdate)
  );

  // Changing service type with an empty scope shows that service's default items.
  $("serviceType").addEventListener("change", () => {
    if (!$("scopeInput").value.trim()) scheduleLiveUpdate();
  });

  $("copyBtn").addEventListener("click", () => {
    if (!currentProposal) return;
    copyText(renderText(currentProposal), "Proposal copied");
  });
  $("downloadTxtBtn").addEventListener("click", () => {
    if (!currentProposal) return;
    downloadFile(`${fileBase(currentProposal)}.txt`, renderText(currentProposal), "text/plain");
    showToast("Downloaded .txt");
  });
  $("downloadMdBtn").addEventListener("click", () => {
    if (!currentProposal) return;
    downloadFile(`${fileBase(currentProposal)}.md`, renderMarkdown(currentProposal), "text/markdown");
    showToast("Downloaded .md");
  });
  $("printBtn").addEventListener("click", () => {
    if (!currentProposal) return;
    window.print();
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildProposal,
    renderMarkdown,
    renderText,
    renderProposalHTML,
    parseScope,
    buildPhases,
    formatMoney,
    formatRange,
    formatDateLong,
    clampNum,
    escapeHtml,
    makeProposalNo,
  };
}
