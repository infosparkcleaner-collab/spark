# SPARK — Brake & Parts Cleaner

A static product site for the SPARK 550 ml brake and parts cleaner, designed for
trade and distributor enquiries. Run `node serve.js` and open
http://localhost:5173. No package installation or build step is required.

Use the server rather than opening the HTML file directly: the 3D stage uses ES
modules and the video needs byte-range support.

## Design

The current design uses white and silver surfaces, charcoal text, Archivo variable
type, and Spark red for primary actions. A graphite studio backdrop with neutral lighting and softer cap reflections keeps the can
visible without oversized background lettering. The fallback uses the clean studio photograph. The headline, tour copy,
primary actions and product facts have separate roles; actions remain available
throughout the tour.

Sections: product tour, workshop demonstration, performance, directions,
applications, specifications and label references, enquiry form.

- Core colours: white `#ffffff`, silver `#f1f3f4`, charcoal `#202327`, muted text
  `#60666d`, Spark red `#d9092f`.
- Desktop uses two-column product and demonstration compositions. Performance
  details use four columns, then two on tablets and one on phones.
- Below 700px, the hero reads headline, product, tour controls, description,
  actions and facts. Application rows become single-column entries without
  horizontal scrolling. Forms are single-column on phones.
- The menu collapses below 1000px; minimum control heights are 44px or greater.
- Content stays visible without entrance animations. Reduced motion is respected.

## Files

| Path | Responsibility |
|---|---|
| `index.html` | Page content, navigation, forms and semantic structure |
| `css/site.css` | Design tokens, components and responsive layouts |
| `js/site.js` | Menu, video, lightbox and enquiry validation |
| `js/stage.js` | Three.js can, label texture, drag and GSAP tour |
| `serve.js` | Local static preview server with video range requests |
| `assets/vendor/` | Local Three.js, GSAP and ScrollTrigger dependencies |
| `assets/img/` | Web images and product references |
| `assets/video/` | Workshop demonstration |
| `legacy/` | Earlier designs, not loaded by the current page |

Archivo is loaded from Google Fonts, with local system fallbacks.

## Product tour

The can is modelled with lathed geometry, a separate cap and a valve. Its label is
assembled from the three actual product photographs into a cylindrical texture.
The four views are the can, precision valve, formula and pack.

- At least 1000px wide and 740px high, with motion enabled: the hero pins below
  the header for two viewport heights. Scroll and the four controls navigate it.
- Smaller or shorter screens: the same controls directly select the four views;
  the page never pins and the can has no automatic idle sway.
- Reduced motion: no pin, no idle sway, and selected poses update immediately.
- No WebGL or JavaScript: the product photograph and stacked descriptions remain.

Pointer dragging rotates the can. Rendering skips settled poses and is gated by
visibility. Font-load refreshes are deferred safely to avoid stale pin positions
when restoring a page at a lower scroll position.

## Video and imagery

The video is square at every breakpoint. It loads when at least 25% visible,
plays muted, and pauses offscreen or when the tab is hidden. Play/pause and sound
controls remain available. Reduced motion prevents automatic loading and playback.

`assets/video/spark-hand-demo.mp4` is approximately 8.6 MB; it has not been
re-encoded during this design pass. Generated product visuals and the illustrative
workshop clip are distinct from the actual label-reference photographs.
`ASSETS.md` records the existing asset provenance.

## Enquiry form

Client-side validation checks name, email and message, with inline error text and
focus on the first invalid field. **No enquiries are transmitted or stored.**
`sendEnquiry(data)` in `js/site.js` is still a stub. Its success message is a demo
state, so a backend must be connected before using the form for real enquiries.

## Validation for the current design

Checked with headless Chrome at 320, 360, 390, 430, 768, 820, 999, 1000, 1024,
1280, 1440 and 1920px widths, plus an 844×390 landscape viewport. No horizontal
page overflow was found. Checked desktop and mobile tour controls, reload from a
lower scroll position, pointer dragging, mobile menu/Escape, square video sizing
and playback, lightbox/focus return, inline validation, and reduced-motion mode.
JavaScript syntax checks pass. This is local browser verification, not a claim of
physical-device or all-browser coverage.

Earlier design explorations remain in `CONCEPT.md`, `REFERENCE-STUDY.md`,
`HIGGSFIELD-PROMPTS.md` and `legacy/`. Local agent tooling is untracked.
