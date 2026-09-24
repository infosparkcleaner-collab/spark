# Higgsfield Prompt Sheet — SPARK

Copy-paste prompts, in the order you should generate them. Each one says exactly
where the output file goes and what to flip in the code.

**Global style suffix** — append to every prompt:

> shot on 85mm, studio product photography, dramatic single key light from upper
> left, deep black seamless background, subtle red rim light, high contrast,
> crisp specular highlights on metal, photoreal, 8k, no text artifacts

**Product lock** — describe the can the same way every time:

> a 550ml aerosol spray can, glossy red and black gradient body, matte black
> plastic overcap, chrome base ring, bold white condensed "SPARK" wordmark with
> a small starburst, red and black professional automotive label

---

## 1. Hero Turntable Sequence — highest value, do this first

Generate a **360° turntable**, 60 frames, camera locked, can rotating on Y axis.

> Product turntable of [PRODUCT LOCK], rotating slowly on a turntable, camera
> completely static and locked off, can centred in frame, full can visible head
> to base with 10% margin, consistent lighting across all frames, floating in
> pure black void, soft contact shadow directly beneath. [STYLE SUFFIX]

**Output:** `assets/sequence/can_0001.webp` … `can_0060.webp`
(4-digit zero padding, 1200×1600, WebP q80, under 120KB each)

**Then in `js/main.js`:**
```js
const USE_SEQUENCE = true;   // line ~14
const SEQ_COUNT    = 60;
```
The CSS can auto-hides and the canvas sequence takes over — cap-lift and tilt
keyframes gracefully fall back to scale/opacity when a sequence is active.

---

## 2. Cap-Off Variant (optional, sells the UNCAP act)

> [PRODUCT LOCK] with the black overcap removed and floating 15cm above the can,
> cap tumbling mid-air, exposed white spray nozzle with red actuator visible on
> top of the can, motion blur on the cap only, can perfectly sharp. [STYLE SUFFIX]

**Output:** `assets/img/can-uncapped.webp` → set `--img` on `.can--photo`

---

## 3. Before Rotor — the grime hero

> Extreme close-up of a heavily contaminated car brake disc rotor and caliper,
> caked in black brake dust, oily grease film, rust streaks on the edge, dull
> grimy metal, workshop floor lighting, shallow depth of field. [STYLE SUFFIX]

**Output:** `assets/img/rotor-before.webp` (1600×1200)
**Hook:** `.ba__pane--before { --img: url(../assets/img/rotor-before.webp); }`

## 4. After Rotor — identical framing, this matters

> Exact same camera angle and framing as the contaminated brake rotor, now
> perfectly clean, bright bare machined metal, sharp cooling vane edges, clean
> caliper, dry surface with zero residue, faint chrome reflections. [STYLE SUFFIX]

**Output:** `assets/img/rotor-after.webp`
**Hook:** `.ba__pane--after { --img: url(../assets/img/rotor-after.webp); }`

> ⚠️ Generate 3 and 4 from the same seed / same base image. If the framing
> drifts, the wipe reveal breaks the illusion instantly.

---

## 5. Spray Plate — for the SPRAY act backdrop

> High-speed photograph of a fine aerosol spray jet firing diagonally across
> frame, thousands of tiny atomised droplets catching red rim light, dense cone
> near the nozzle dispersing into mist, frozen motion, black background.
> [STYLE SUFFIX]

**Output:** `assets/img/spray-plate.webp` → `.scene__plate { --img: … }`

---

## 6. Pillar Backdrops (4)

Each goes to `assets/img/pillar-01…04.webp`, hooked via `--bg` on `.pillar`.

1. **Removes brake fluid** — "macro of brake fluid and grease dissolving off a metal caliper surface, liquid running off, dark moody workshop"
2. **Fast drying** — "macro of a wet metal surface flash-evaporating, faint vapour rising, surface turning dry and matte, backlit"
3. **Safe on metals** — "macro of a pristine machined aluminium clutch component and steel brake parts arranged on black rubber, untouched finish"
4. **Low VOC** — "macro of clean metal parts with soft green-tinted light, fresh clean air feel, minimal, calm, eco" *(this is the only green frame on the site)*

---

## 7. Application Cards (5)

`assets/img/app-01…05.webp`, hooked via `--bg` on `.app-card`. Keep all five in
the same tight tonal range so the grid reads as a set.

1. Commercial truck wheel hub in a fleet workshop bay
2. Passenger car front brake assembly, wheel removed, on a lift
3. Disassembled brake caliper and pads on a clean workbench
4. Clutch plate and pressure plate on black rubber matting
5. Machine tooling and wrenches in a dark industrial workshop

---

## 8. CTA Hero Shot

> [PRODUCT LOCK] standing on a dark workshop bench, low three-quarter hero
> angle, dramatic red backlight creating a halo, blurred garage in the deep
> background, condensation-free clean can. [STYLE SUFFIX]

**Output:** `assets/img/cta-can.webp` → `.cta__visual { --img: … }`

---

## Conversion step

```bash
# in the project root, after dropping PNGs into a scratch folder
npx @squoosh/cli --webp '{"quality":80}' -d assets/img scratch/*.png
```
Target: sequence frames <120KB, stills <300KB. The sequence preloads before the
pin engages, so weight there is the difference between smooth and stuttering.
