# SPARK — Brake & Parts Cleaner

A light-theme product site for the SPARK 550 ml brake and parts cleaner, built for
trade and distributor enquiries.

Run `node serve.js` and open http://localhost:5173. No build step and nothing to
install. The server is required, not optional: the 3D stage is an ES module, so
opening `index.html` from disk will not load it (the page still reads correctly —
it falls back to the product photograph — but you get no can). The video also needs
range requests to seek.

## What the page is

A manufacturer's datasheet rather than a marketing landing page: white paper, cool
grey panels, a single red taken from the pack (`#e4002b`), and one typeface
(Archivo) used at two widths. Structure carries information — the applications and
specifications are real tables, and the only numbered sequence on the page is the
genuine three-step one (shake, spray, clean).

Sections, in order: the can (pinned 3D tour), workshop video, why it performs, how
to use, where it's used, specifications and safety (with the label reference
photographs), contact.

## The can — 3D stage

The opening section is a real-time WebGL model of the 550 ml can: a lathed body,
a separate cap, a valve, and the actual pack artwork wrapped around it. The three
product photographs are column-sliced into a single cylindrical texture, so the
label you turn is the real label.

On a wide screen the section pins for three viewport heights and a scrubbed
ScrollTrigger drives four beats:

| Beat | Rail label | What the can does |
|---|---|---|
| 0 | The can | Rests in a three-quarter view |
| 1 | Precision valve | Cap lifts and is laid aside, revealing the valve |
| 2 | The formula | Turns to the features panel the copy is quoting |
| 3 | The pack | Turns back to the front and settles |

The rail on the right is clickable and scrolls to the middle of a beat. The can can
be dragged to turn it at any time.

**How it degrades.** The beats are plain stacked content in the markup and the
photograph is in the `<img>`, so the section reads correctly with no JavaScript at
all. `gsap.matchMedia` then decides what to add:

- **≥ 921px, motion allowed** — the pinned tour above.
- **≤ 920px** — no pin, beats stacked, can sways gently and stays draggable.
- **`prefers-reduced-motion: reduce`** — no pin, beats stacked, and the can renders
  a single frame then stops. The loop idles to **zero draw calls**, verified.
- **No WebGL, or the module fails** — the photograph simply stays.

The render loop also pauses when the canvas is offscreen or the tab is hidden, and
skips painting entirely once the pose has settled.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole page |
| `css/site.css` | The whole stylesheet |
| `js/site.js` | Menu, video, lightbox, form. No dependencies. |
| `js/stage.js` | The 3D can and its scroll choreography (Three.js + GSAP) |
| `assets/vendor/` | Three.js, GSAP, ScrollTrigger — vendored, no CDN |
| `assets/img/` | Optimised WebP images |
| `assets/video/` | The workshop demonstration clip |
| `assets/reference/` | Full-resolution originals |
| `legacy/` | The previous dark-theme scroll-driven site, kept for reference |

## The video

`assets/video/spark-hand-demo.mp4` — 960×960, 6 seconds. It autoplays muted and
loops, and it is **not** tied to scroll position.

- `preload="none"`, and the file is only fetched once the section is within 25% of
  the viewport, so it costs nothing on first paint.
- Playback pauses when the section scrolls away or the tab is hidden, and resumes
  on return.
- The two controls over the video are a play/pause toggle and a sound toggle, so a
  visitor can turn audio on deliberately.
- Under `prefers-reduced-motion: reduce` it never autoplays and is never
  downloaded; the poster shows with a play button.

The file is 8.6 MB for 6 seconds (≈11 Mbps), which is far heavier than it needs to
be. Re-encoding it to roughly 1–1.5 MB would be the single biggest performance win
left on the page. There is no `ffmpeg` on this machine, so it has not been done:

```
ffmpeg -i assets/video/spark-hand-demo.mp4 -c:v libx264 -crf 26 -preset slow \
       -vf scale=720:720 -movflags +faststart -an assets/video/spark-hand-demo.mp4
```

## The contact form

The form validates in the browser and shows a confirmation, but **nothing is
transmitted or stored yet**. `sendEnquiry(data)` in `js/site.js` is the single
place to wire up a backend; it currently resolves immediately and logs the payload
to the console. The doc comment above it has the `fetch` call to drop in.

Fields: name (required), company or workshop, email (required), phone, enquiry type,
message (required).

## Claims and imagery

Product claims are limited to what the physical label says: non-chlorinated, low
VOC, cleans fast, dries fast, no residue, safe on metals and most surfaces,
550 ml, for professional and DIY use.

- The hero can and the workshop clip are generated imagery produced earlier through
  the Higgsfield plugin from the real product photographs.
- `product-front/side/back.webp` are photographs of the actual can. They are
  daylight snapshots rather than studio work, so they sit in the specifications
  section as label reference, clearly captioned as such, not as brand photography.
- The previous site's before/after rotor slider has been removed. It was the same
  stock photograph shown twice with a sepia filter applied to one half, which is
  not a defensible claim on a product page.

## Verified in the browser

Layout at 360, 390, 768, 1024, 1440 and 1920 with no horizontal page scroll at any
of them (the applications table scrolls inside its own container by design, which
is intended). The pinned panel fits within the viewport at 1024×768.

All four tour beats and the rail navigation; can drag; mobile menu open/close/
Escape; video autoplay/pause-offscreen/resume/sound toggle; reduced-motion
behaviour including the zero-draw-call idle; form validation and success path;
lightbox open/Escape/focus return; lazy image loading; zero console errors or
warnings. `node --check` passes on both scripts.

Frame timing across a full scrub of the pinned range: 6.9 ms median, 7.1 ms worst
frame — comfortable headroom over a 16.7 ms budget.

## Notes

- `assets/vendor/` holds Three.js, GSAP and ScrollTrigger, loaded locally rather
  than from a CDN. Lenis is no longer used by the live page and is kept only
  because `legacy/` still loads it — scrolling here is native.
- `CONCEPT.md`, `HIGGSFIELD-PROMPTS.md` and `REFERENCE-STUDY.md` describe the
  earlier dark scroll-driven concept and remain as history.
- The hero can and the workshop clip were generated through the Higgsfield
  plugin from the real product photographs; `ASSETS.md` records the provenance
  of every asset.
- Local agent tooling (`.claude/`, `.agents/`, `.codex/`, `.mcp.json`) is
  deliberately untracked — it configures a development machine, not the site.
