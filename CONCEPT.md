# SPARK — Brake & Parts Cleaner
## Scroll-Driven Site Concept — "THE RITUAL"

---

## 1. The Idea in One Line

**The whole site is one can of Spark being used.**

You don't scroll through a product page — you scroll through the three seconds
it takes a mechanic to shake, uncap, spray and walk away from a clean brake
assembly. The pack line *"SHAKE. SPRAY. CLEAN. IT'S THAT EASY!"* becomes the
site's skeleton, not a footnote on the label.

Razorpay's Sprint 26 site works because one object stays on screen and the page
moves around it. We do the same with the can: it enters once, and it never
leaves until it has done its job.

---

## 2. Narrative Spine

| Act | Scroll | On screen | Copy beat |
|---|---|---|---|
| **00 · IGNITION** | Preloader | Spark strikes, SPARK wordmark builds | — |
| **01 · ARRIVAL** | 0–10% | Can falls in, rotates, settles centre over a dark garage void | *Professional strength.* |
| **02 · SHAKE** | 18–34% | Can shakes hard, metal ball rattle motion, headline snaps in | *Wake it up.* |
| **03 · UNCAP** | 34–52% | Cap lifts off, spins, drifts out of frame; nozzle revealed | *Nothing between you and the job.* |
| **04 · SPRAY** | 52–72% | Can tilts, high-pressure jet erupts, thousands of particles, screen hazes | *One pass. Full pressure.* |
| **05 · CLEAN** | 72–90% | Jet clears, grime **wipes off the rotor in the spray direction**, chrome underneath | *No residue. No wiping. No waiting.* |
| **06 · THE ADVANTAGE** | 90–100% | Can settles, tagline lands | *FASTER. CLEANER. SAFER.* |

After the pinned act, the page becomes conventional — but the memory of the
spray carries it.

---

## 3. Section Map (full page)

1. **Preloader** — ignition sweep + percentage
2. **Sticky Scene** (700vh pinned) — the six acts above
3. **Proof** — before / after rotor, draggable + scroll-scrubbed wipe
4. **Pillars** — horizontal pinned scroll, 4 oversized panels:
   Removes Brake Fluid · Fast Drying · Safe on Metals · Low VOC
5. **Ideal For** — 5 application cards (trucks, cars, brake systems, clutch, machinery)
6. **Numbers** — 550 ml · 60s dry · 0 residue · Low VOC, counting up
7. **Specs & Safety** — non-chlorinated, hazard pictograms, compliance strip
8. **CTA** — *SHAKE. SPRAY. CLEAN.* + distributor enquiry
9. **Footer** — marquee, legal

---

## 4. Art Direction

**Mood:** a lit workshop at night. Black rubber, red steel, chrome highlights,
one acid-green accent that only ever means *eco / low VOC*.

```
--ink      #08090B   background void
--steel    #14161A   panels
--spark    #E4002B   brand red (from pack)
--flare    #FF3B1F   hot edge / gradient top
--ember    #FF8A00   spark particles
--acid     #C8FF00   low-VOC / eco accent only
--chrome   #E8EAED   clean metal, primary text
--smoke    #8A9099   secondary text
```

**Type:** `Anton` for display (condensed, shouty, matches the pack), `Barlow
Condensed` italic for the technical sub-lines, `Inter` for body. Headlines run
huge — `clamp(3rem, 12vw, 11rem)` — and are allowed to clip the viewport edge.

**Texture:** animated film grain over everything at 4% opacity, a faint
workshop grid, and a vignette. Nothing is flat black.

**Motion rules:**
- Everything critical is scrubbed to scroll, never auto-playing.
- Easing is mechanical: `power3.out` for arrivals, `expo.out` for the cap.
- The spray is the only chaotic element on the site. Everything else is precise.
- `prefers-reduced-motion` gets a static, fully-readable page. No exceptions.

---

## 5. Where the Higgsfield Renders Go

The site ships **fully working without a single photo** — the can, the rotor and
the spray are drawn in CSS/SVG/canvas. Every image is an *upgrade slot*, so you
can drop renders in one at a time without breaking anything.

| Slot | File / hook | What it replaces |
|---|---|---|
| **Hero can sequence** | `assets/sequence/can_0001.webp …` + `USE_SEQUENCE = true` in `js/main.js` | The CSS can, with a real 60-frame 360° render |
| **Before rotor** | `--img-before` on `.ba__pane--before` | CSS grime texture |
| **After rotor** | `--img-after` on `.ba__pane--after` | CSS chrome texture |
| **Pillar backdrops** | `--bg` on each `.pillar` | Gradient wash |
| **Application cards** | `--bg` on each `.app-card` | Icon-only card |
| **CTA hero shot** | `--img` on `.cta__visual` | Silhouette |

Prompts for all of these are written out in `HIGGSFIELD-PROMPTS.md`, including
the exact turntable spec for the frame sequence.

---

## 6. Build Stack

- Plain HTML / CSS / JS — no build step, opens straight from disk
- **GSAP 3 + ScrollTrigger** for scrub and pinning
- **Lenis** for smooth scroll (with a native-scroll fallback)
- Canvas 2D particle system for the spray (~1,200 particles, capped by DPR)
- Graceful degradation: if the CDN is unreachable, the page renders as a clean
  static site instead of a blank screen

---

## 7. What Makes It Better Than a Product Page

1. **The product is the interface.** No hero image + feature grid. The can does the talking.
2. **A claim is proven, not stated.** "No residue" is a rotor you wipe clean by scrolling.
3. **The spray is physics, not a video.** It responds to scroll speed and direction.
4. **The safety panel is designed, not disclaimed.** Hazard pictograms treated as graphic assets — reads as professional-grade, not scary.
5. **Eco has its own colour.** Low VOC never competes with the red; it's the one green thing on the site.
