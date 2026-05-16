# Landing page — Weekly Organic Growth Brief

A static, single-page sales site for the 4-week paid pilot. No JavaScript. No build step. No tracking. Visually matched to the `sample-report/` assets.

## Files

| File | Purpose |
|---|---|
| `index.html` | The full landing page. |
| `styles.css` | All styles. Mobile responsive. Print-friendly. |

## What this page sells

- **Primary CTA:** View the sample report (opens `/sample-report/`).
- **Secondary CTA:** Apply for the 4-week pilot (prefilled `mailto:` link).
- **Offer:** $950 one-site pilot · $1,750 agency pilot (up to 3 sites) · +$400/site beyond 3 · 4 weeks · refund through week 2 · no contract.

## Before you publish

1. **Email address.** Open `index.html` and find/replace `[INSERT MY REAL EMAIL HERE]` (appears in 7 places — header CTA, hero CTA, both pricing CTAs, final CTA, footer contact link). Replace with the inbox or forwarder you actually monitor.
2. **Brand mark + brand name.** The SVG mark in `.brand` is a generic example. Replace with your agency mark and update `.brand__name` in the header and footer.
3. **Sample PDF.** Export the sample report to `sample-weekly-organic-growth-brief.pdf` (instructions in `../sample-report/README.md`) and host it at the same root as the landing page so `/sample-weekly-organic-growth-brief.pdf` resolves.
4. **Optional:** swap the `mailto:` CTAs for a Typeform / Tally / Calendly link if you want a structured intake. Keep the prefilled subject + body in `mailto:` either way — it pre-qualifies the application.

## Local preview

No build step. Just open the file or serve the folder:

```bash
cd landing-page
python3 -m http.server 8000
# visit http://localhost:8000
```

### Deployment path

This page is designed to be hosted at:

```
/weekly-organic-growth-brief/
```

All internal links (`./sample-report/`, `./sample-weekly-organic-growth-brief.pdf`) are **relative**, so the page works equally well at the domain root (`/`), at a subpath (`/weekly-organic-growth-brief/`), or under any other prefix — no link changes required.

The expected published structure is:

```
/weekly-organic-growth-brief/
├── index.html                              ← from landing-page/
├── styles.css                              ← from landing-page/
├── sample-report/                          ← from sample-report/
│   ├── index.html
│   ├── styles.css
│   └── print.css
└── sample-weekly-organic-growth-brief.pdf  ← exported from sample-report/
```

Resulting URLs:

| URL | Resolves to |
|---|---|
| `https://your-domain.com/weekly-organic-growth-brief/` | The landing page |
| `https://your-domain.com/weekly-organic-growth-brief/sample-report/` | The HTML sample report |
| `https://your-domain.com/weekly-organic-growth-brief/sample-weekly-organic-growth-brief.pdf` | The downloadable PDF |

For local preview, mirror that structure on disk and serve from one level up:

```bash
# Assuming a public/weekly-organic-growth-brief/ folder laid out as above:
cd public
python3 -m http.server 8000
# visit http://localhost:8000/weekly-organic-growth-brief/
```

## Deployment

### Netlify

1. Create a `public/weekly-organic-growth-brief/` directory laid out as shown above.
2. From the `public/` directory: `npx netlify-cli deploy --prod --dir .`
   (or drag-and-drop the folder into the Netlify dashboard).
3. Add a custom domain in **Site settings → Domain management**.
4. Optional `netlify.toml` for headers and a short-link redirect:

   ```toml
   [build]
     publish = "."

   [[headers]]
     for = "/weekly-organic-growth-brief/*"
     [headers.values]
       Cache-Control = "public, max-age=300, must-revalidate"

   [[headers]]
     for = "/weekly-organic-growth-brief/sample-weekly-organic-growth-brief.pdf"
     [headers.values]
       Cache-Control = "public, max-age=86400"
       Content-Disposition = "inline"

   [[redirects]]
     from = "/pilot"
     to = "/weekly-organic-growth-brief/"
     status = 301

   [[redirects]]
     from = "/sample"
     to = "/weekly-organic-growth-brief/sample-report/"
     status = 301
   ```

### Vercel

1. Lay out the `public/` directory as above.
2. From that directory: `npx vercel --prod`
3. When prompted for project type, choose "Other" (no framework).
4. Add the custom domain in the Vercel dashboard.
5. Optional `vercel.json`:

   ```json
   {
     "headers": [
       {
         "source": "/weekly-organic-growth-brief/sample-weekly-organic-growth-brief.pdf",
         "headers": [
           { "key": "Cache-Control", "value": "public, max-age=86400" },
           { "key": "Content-Disposition", "value": "inline" }
         ]
       }
     ],
     "redirects": [
       { "source": "/pilot", "destination": "/weekly-organic-growth-brief/", "permanent": true },
       { "source": "/sample", "destination": "/weekly-organic-growth-brief/sample-report/", "permanent": true }
     ]
   }
   ```

### Cloudflare Pages

Same `public/` layout. Connect your repo (or upload directly) and set the build output directory to the folder containing `index.html`. No build command needed.

### GitHub Pages

1. Push the contents of `public/` to the `gh-pages` branch (or to the root of a repo named `<user>.github.io`).
2. Enable Pages in repo settings, source = `gh-pages` branch.
3. Custom domain via the `CNAME` file in repo root.

### WordPress

You have two clean options:

**Option A — embed as a custom-template Page (recommended for an existing WordPress site):**

1. In your active (child) theme, create `page-pilot.php`:

   ```php
   <?php
   /* Template Name: Pilot Landing */
   header("X-Robots-Tag: index, follow", true);
   ?>
   <!doctype html>
   <html <?php language_attributes(); ?>>
   <head>
     <meta charset="<?php bloginfo('charset'); ?>" />
     <?php wp_head(); ?>
   </head>
   <body>
     <!-- paste the contents of <main> ... </main> + <footer> from index.html here -->
     <?php wp_footer(); ?>
   </body>
   </html>
   ```

2. Copy `styles.css` into the theme as `assets/landing.css` and enqueue it conditionally:

   ```php
   add_action('wp_enqueue_scripts', function () {
     if (is_page_template('page-pilot.php')) {
       wp_enqueue_style('landing', get_stylesheet_directory_uri() . '/assets/landing.css');
       wp_enqueue_style(
         'landing-fonts',
         'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
       );
     }
   });
   ```

3. Create a new Page in WP admin, set the template to "Pilot Landing", publish at `/pilot/`.
4. Upload the sample PDF via Media → Add New, then update the link in the page HTML to point to the resulting media URL (or place the PDF at the document root via FTP and keep the `/sample-weekly-organic-growth-brief.pdf` path).
5. For `/sample-report/`, the cleanest approach is to FTP-upload the `sample-report/` folder to the WordPress root next to `wp-config.php`. WP's `.htaccess` rewrite ignores existing files and folders, so the URL resolves directly.

**Option B — Host the landing on a subdomain (recommended if the main WP site is heavy):**

Put the static files on Netlify / Vercel / Cloudflare Pages at `pilot.youragency.com` and point any links from the main site to it. WP doesn't need to know it exists. This is faster and avoids theme conflicts.

## Pricing summary

- **One-site 4-week pilot:** $950
- **Agency 4-week pilot (up to 3 sites):** $1,750
- **Additional pilot site beyond 3:** +$400/site
- **Monthly continuation, single site:** $750–$950/month
- **Monthly continuation, 3-site agency package:** $1,500–$2,250/month

The full pricing logic lives in `../weekly-organic-growth-brief.md` Sections 2 and 3.

## Performance

- Total transferred over the wire: index.html (~14 KB), styles.css (~14 KB), Google Fonts request (~30–50 KB depending on subset). No images, no JavaScript. Lighthouse Performance/Best Practices/SEO/Accessibility should all be in the 95+ range out of the box.
- If you want to drop the Google Fonts dependency for offline reliability or privacy, replace the `<link>` to `fonts.googleapis.com` with self-hosted `.woff2` files (or remove and let the system stack take over — the CSS already lists graceful fallbacks).

## Accessibility checks already in place

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
- Skip-style smooth scrolling honors `prefers-reduced-motion`.
- Native `<details>`/`<summary>` for the FAQ — keyboard accessible, screen-reader-friendly, no ARIA needed.
- All CTAs are real anchors. No click-only JavaScript handlers.
- Color contrast on body text and CTA buttons passes WCAG AA.

Review one item before publishing: the `mailto:` links should be replaced with a structured intake (Typeform / Tally / Calendly) once you have one. Some users have no default mail client and the link will appear inert to them.

## Pre-publish checklist

Run through this list before sending the URL to a single agency.

- [ ] Landing page opens cleanly on desktop (latest Chrome, Safari, Firefox).
- [ ] Landing page opens cleanly on mobile (iOS Safari, Android Chrome — test at 360px width).
- [ ] No instance of `[INSERT MY REAL EMAIL HERE]` remains anywhere in `landing-page/index.html`.
- [ ] No instance of `[PUT MY REAL EMAIL HERE]` or `hello@example.com` remains anywhere in the deployed files.
- [ ] All internal links use relative paths (`./sample-report/`, `./sample-weekly-organic-growth-brief.pdf`) so the page works at any subpath, including `/weekly-organic-growth-brief/`.
- [ ] All six `mailto:` CTAs open the email client with the correct subject and prefilled body — or have been replaced with a structured intake URL (Typeform / Tally / Calendly).
- [ ] The footer no longer reads "Sample landing page" or any "replace before publishing" wording.
- [ ] The brand mark SVG and `.brand__name` text have been swapped for your real brand (or the placeholder has been kept intentionally).
- [ ] `/sample-weekly-organic-growth-brief.pdf` downloads correctly when clicked from the page.
- [ ] `/sample-report/` opens the HTML sample report correctly in a new tab.
- [ ] Pricing on the landing page matches `weekly-organic-growth-brief.md`: $950 / $1,750 / +$400 site / $750–$950 mo / $1,500–$2,250 mo.
- [ ] No claim of guaranteed traffic, rankings, revenue, or leads anywhere on the page.
- [ ] "Sample uses fictional data" disclaimer remains visible on the hero preview card.
- [ ] Sample PDF exported per the steps in `../sample-report/README.md` — background graphics ON, Chrome headers/footers OFF.
- [ ] At least one CTA on every visible scroll position points to the 4-week pilot.
- [ ] OG title and description in `<head>` reflect the offer and pricing.
- [ ] Domain has HTTPS and a valid certificate.
- [ ] Cache-control headers on the PDF allow inline view, not forced download (optional polish — see Netlify/Vercel snippets above).
