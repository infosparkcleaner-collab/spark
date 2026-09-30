# SPARK — Brake & Parts Cleaner

A static product site for the SPARK 550 ml non-chlorinated brake and parts
cleaner, built for trade and distributor enquiries. No build step and no
package install.

Run `node serve.js` and open http://localhost:5173. Use the server rather than
opening the HTML directly: the 3D stage uses ES modules and the video needs
byte-range support.

## Pages

Pages are served without the .html extension (`/about`, `/contact`, `/brake-cleaner-guide`) by
`cleanUrls` in `vercel.json`; `/about.html` redirects to `/about`. `serve.js` does the same locally,
and unknown paths get `404.html`.

| Page | Purpose |
|---|---|
| `index.html` | 3D product tour, workshop video, performance, how to use, applications, specifications, FAQ, trade, enquiry form |
| `brake-cleaner-guide.html` | Long-form guide: how to use brake cleaner, chlorinated vs non-chlorinated, safety |
| `about.html` | Brand story and trade call to action |
| `contact.html` | Enquiry form, address and Google map |
| `become-a-dealer.html` | Ontario dealer and distributor page: what is supplied, how to apply, FAQ |

## Files

| Path | Responsibility |
|---|---|
| `css/site.css` | Design tokens, components and responsive layouts for every page |
| `js/site.js` | Menu, product-view tabs, video, lightbox, enquiry form |
| `js/stage.js` | Three.js can, label texture, drag and the GSAP scroll tour |
| `assets/vendor/` | Local Three.js, GSAP and ScrollTrigger |
| `assets/img/`, `assets/video/` | Web-ready images and the workshop film |
| `integration/` | Google Apps Script that writes enquiries to the sheet (see its README) |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Crawl and AI-assistant discovery files |
| `serve.js` | Local preview server only; not needed in production |

## Design

- Brand orange `#fc5a00` taken from the logo. Buttons are orange with
  near-black text (white on this orange fails contrast); small orange text on
  white uses `#b83e00`.
- Light site, with a dark hero stage (the can floats in an orange glow) and dark
  contact and footer. Type is Archivo from Google Fonts.

## Product tour

- Any screen at least 560px tall with motion allowed: the hero pins and scroll
  turns the can through four views (can, valve, formula, pack). Wide screens use
  two columns; phones and upright tablets stack into one column that fits a
  single viewport.
- Shorter screens (a phone on its side): tabs select the views and the can sways.
- Reduced motion: no pin, no sway, poses change instantly.
- No WebGL or JavaScript: the rendered can image and all copy remain.

### The can stage

Two images are baked ahead of time so the hero loads fast and never jumps:

- `assets/img/can-wrap.webp`: the label wrap, cut from the three product
  photos. Re-bake by opening http://localhost:5173/_local/tools/bake-can.html
  (with `node serve.js` running) and saving the download over it.
- `assets/img/spark-can-render.webp`: the placeholder shown until WebGL is
  ready. It is a render of the 3D can itself at 440×780 CSS px (2× pixels,
  transparent), so the swap is invisible. Re-render it after any change to the
  can's lighting, materials, resting pose or label wrap: load the home page at
  2× device scale, force `#canHost` to 440×780 with everything else hidden,
  screenshot it with a transparent background, and save as WebP (quality ~0.86).

## SEO

Each page has a canonical URL, Open Graph tags and JSON-LD (LocalBusiness,
Product, FAQPage, HowTo, Article, BreadcrumbList as relevant). The same
LocalBusiness entity (`#org`, service area Ontario, phone) is used on the home
and contact pages; keep it identical if you edit either. FAQ answers in the
JSON-LD must match the visible text word for word. `robots.txt` names the
search and AI crawlers, and `llms.txt` states the business facts in plain text.
Update `sitemap.xml` and `llms.txt` when a page is added.

The canonical site URL is written into the pages, `sitemap.xml`, `robots.txt`
and `llms.txt`; change it everywhere when the production domain is set.

Off-site work (Google Business Profile, directories, Safety Data Sheet) and the
questions still open are in `_local/docs/seo-audit-ontario.html`.

## Analytics

Every page loads Vercel Web Analytics with two small tags before `</body>`
(`/_vercel/insights/script.js`, no package needed). It only starts once
**Analytics > Enable** is switched on for the project in the Vercel dashboard
and the site is deployed; until then the request returns 404 and nothing is
collected. The dashboard also shows a project-specific script path that
blockers are less likely to catch; if you prefer it, swap it into the `src` on
all six pages. `serve.js` answers the route with an empty script locally.

Google Analytics 4 (tag `G-R41JT9PP5W`) is installed in the `<head>` of the same
six pages, as Google's standard gtag.js snippet. Visits from `localhost` are
counted like any other unless a data filter excludes them in Google Analytics.

Google Tag Manager (container `GTM-KS6Z4S7H`) is also installed: the script high
in the `<head>` and the `<noscript>` fallback straight after `<body>`, on the
same six pages. Do not also add a GA4 config tag for `G-R41JT9PP5W` inside that
container, or every page view is counted twice; either manage Google Analytics
from the container and remove the direct gtag.js snippet, or keep the direct
snippet and leave GA4 out of the container.

## Not in the repository

Old designs, design notes and full-size source photos live in `_local/`, which
is git-ignored and never deployed. Local agent tooling is untracked too.
