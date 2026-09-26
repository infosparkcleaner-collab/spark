# SPARK — Brake & Parts Cleaner

A static product site for the SPARK 550 ml non-chlorinated brake and parts
cleaner, built for trade and distributor enquiries. No build step and no
package install.

Run `node serve.js` and open http://localhost:5173. Use the server rather than
opening the HTML directly: the 3D stage uses ES modules and the video needs
byte-range support.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | 3D product tour, workshop video, performance, how to use, applications, specifications, FAQ, trade, enquiry form |
| `brake-cleaner-guide.html` | Long-form guide: how to use brake cleaner, chlorinated vs non-chlorinated, safety |
| `about.html` | Brand story and trade call to action |
| `contact.html` | Enquiry form, address and Google map |

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
- No WebGL or JavaScript: the product photograph and all copy remain.

## SEO

Each page has a canonical URL, Open Graph tags and JSON-LD (Organization,
Product, FAQPage, HowTo, Article, LocalBusiness, BreadcrumbList as relevant).
The canonical site URL is written into the pages, `sitemap.xml`, `robots.txt`
and `llms.txt`; change it everywhere when the production domain is set.

## Not in the repository

Old designs, design notes and full-size source photos live in `_local/`, which
is git-ignored and never deployed. Local agent tooling is untracked too.
