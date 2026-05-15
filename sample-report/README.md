# Sample Report — Weekly Organic Growth Brief

A polished, agency-ready sample of the white-label weekly SEO action brief described in [`weekly-organic-growth-brief.md`](../weekly-organic-growth-brief.md) (Section 7). Use this as the downloadable sales asset on the landing page and as the artifact you walk prospects through on discovery calls.

All data in the report is fictional. The footer makes that explicit on every page.

## Files

| File | Purpose |
|---|---|
| `index.html` | The report. Standalone HTML, opens directly in any browser. |
| `styles.css` | Screen styles — responsive, mobile-readable. |
| `print.css` | Print/PDF stylesheet (Letter size, page numbering, sample-data footer). Linked via `media="print"`. |

No build step. No JavaScript. No external dependencies except a Google Fonts request (Source Serif 4, Inter, JetBrains Mono).

## Previewing locally

Open `index.html` directly in your browser, or serve the folder for a closer match to how it'll behave when hosted:

```bash
# from the repo root
cd sample-report
python3 -m http.server 8000
# visit http://localhost:8000
```

## Exporting to PDF

The print stylesheet is tuned for Letter (US) paper with 0.55in margins, a page-numbered footer, and a "sample report · fictional data" middle marker on every page except the cover.

### Option 1 — Chrome / Edge / Brave (recommended)

1. Open `index.html` in the browser.
2. **File → Print** (or `Ctrl/Cmd + P`).
3. Destination: **Save as PDF**.
4. Layout: **Portrait**.
5. Paper size: **Letter** (or A4 if preferred — both work).
6. Margins: **Default**.
7. Options:
   - ✅ **Background graphics** (required — turns on color blocks, tags, KPI cards).
   - ❌ Headers and footers (turn this OFF — the stylesheet provides them).
8. **Save**.

Resulting file: ~8–10 pages, ~250–400 KB.

### Option 2 — Headless Chromium (for automation / CI)

```bash
# requires Chrome/Chromium installed
google-chrome \
  --headless \
  --no-sandbox \
  --disable-gpu \
  --print-to-pdf=sample-weekly-organic-growth-brief.pdf \
  --print-to-pdf-no-header \
  --no-pdf-header-footer \
  file://"$(pwd)"/index.html
```

Or with Puppeteer / Playwright:

```js
// Playwright example
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + __dirname + "/index.html", { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "sample-weekly-organic-growth-brief.pdf",
    format: "Letter",
    printBackground: true,
    margin: { top: "0.55in", right: "0.55in", bottom: "0.7in", left: "0.55in" },
  });
  await browser.close();
})();
```

### Option 3 — `wkhtmltopdf` (legacy, less faithful)

`wkhtmltopdf` does not fully support modern CSS Grid / `@page` margin boxes. Chromium-based options above produce a noticeably better result. If you must use it:

```bash
wkhtmltopdf --enable-local-file-access --print-media-type \
  --page-size Letter --margin-top 14mm --margin-bottom 18mm \
  --margin-left 14mm --margin-right 14mm \
  index.html sample-weekly-organic-growth-brief.pdf
```

## White-labeling

Three things to change before a real agency sends this to a real client:

1. **Brand name + mark** — in `index.html`, search for `[Your Agency Name]`. Replace the SVG mark in `.brand__logo` with the agency's mark.
2. **Color accent** — in `styles.css`, the `--accent` and `--rule` CSS variables drive the primary blue and the ochre divider. Change in one place.
3. **Footer line + page number footer text** — in `print.css`, edit the `@bottom-left` content string under `@page`.

The "sample data" disclaimers are intentional and should be removed only when the report contains real client data.

## What this asset is for

This is the single highest-leverage sales asset in the funnel. Every cold email links to it. Every landing-page CTA references it. Every discovery call walks through it on screen. It substitutes for software, screenshots, and trust signals until the first 5 paid pilots are sold.

---

## Public landing snippet

Drop the following on the landing page (or in any embed context — newsletter, partner site, sales doc) above the download CTA. Plain HTML, no dependencies; matches the report's voice.

```html
<section class="brief-preview">
  <p class="eyebrow">Sample · No agency credentials required</p>
  <h2>See exactly what your clients would receive on Tuesday.</h2>
  <p>
    The Weekly Organic Growth Brief is a 6–10 page white-label SEO action
    report built from a client site's Google Search Console and GA4 data.
    Each brief surfaces the week's urgent risks, the highest-leverage
    opportunities, and a prioritized action list — with priority, impact,
    and effort scoring on every recommendation. The sample below uses
    fictional data on a fictional outdoor publisher; the format, structure,
    and analytical depth are exactly what you'd send to real clients.
  </p>
  <p>
    Read it in 5 minutes. Forward it to a colleague. Then book the 4-week
    pilot when you're ready to see it on one of your own client sites.
  </p>
  <p>
    <a href="/sample-report/" class="cta">View the sample brief →</a>
    <a href="/sample-weekly-organic-growth-brief.pdf" class="cta cta--secondary">Download as PDF</a>
  </p>
  <p class="fineprint">
    Sample data is fictional. Real briefs are sourced from each enrolled
    site's verified GSC and GA4 properties, reviewed by a human analyst
    before delivery.
  </p>
</section>
```

Markdown variant (for newsletters, gist-style hosts, or docs that don't support HTML):

```markdown
**Sample · No agency credentials required**

### See exactly what your clients would receive on Tuesday.

The Weekly Organic Growth Brief is a 6–10 page white-label SEO action report built from a client site's Google Search Console and GA4 data. Each brief surfaces the week's urgent risks, the highest-leverage opportunities, and a prioritized action list — with priority, impact, and effort scoring on every recommendation.

The sample below uses fictional data on a fictional outdoor publisher; the format, structure, and analytical depth are exactly what you'd send to real clients.

Read it in 5 minutes. Forward it to a colleague. Then book the 4-week pilot when you're ready to see it on one of your own client sites.

→ [View the sample brief](/sample-report/)
→ [Download as PDF](/sample-weekly-organic-growth-brief.pdf)

*Sample data is fictional. Real briefs are sourced from each enrolled site's verified GSC and GA4 properties, reviewed by a human analyst before delivery.*
```

Short outreach snippet (for cold emails / LinkedIn / WhatsApp — no formatting):

> Here's a sample of what we'd send for one of your client sites every Tuesday — 6 to 10 pages, white-label, action list with priority and effort scoring, anonymized data for now: [link]. Worth 15 minutes to see what it would look like for [their client]?
