# SPARK animation reference study

Inspected 22 September 2026.

## Razorpay Sprint ’26

https://razorpay.com/sprint/26

Direct browser inspection confirmed:

- Webflow page structure and runtime.
- Three.js 0.160.0 imported as an ES module.
- GLTFLoader and DRACOLoader loading Sprint.glb (Sprint_mobile.glb on mobile).
- Embedded camera animation, played via AnimationMixer.setTime according to scroll position.
- Pointer parallax layered over the animated camera.
- GSAP 3.12.5 and ScrollTrigger for page animation.
- Rive canvas runtime 2.26.6 for smaller interactive visuals.

The key visual mechanism is an actual 3D scene and camera choreography, not just a translated product image. No Razorpay source code or model assets were copied into SPARK.

## Awwwards references

- Lusion v3: https://www.awwwards.com/sites/lusion-v3 — 3D presentation, reactive pointer interaction and scroll animation. Adapted the idea of a persistent spatial object and quiet interface around it.
- Orken: https://www.awwwards.com/sites/orken — story sections, bold typography and scene transitions. Adapted the idea of large chapter words and a continuous narrative.

These are references for motion and composition; SPARK retains its own packaging, colors, copy and product story.

## Implemented for SPARK

`js/experience.js` builds an original Three.js model: lathed metal aerosol body, cylindrical label texture, separate red cap, nozzle, brake disc, caliper and GPU particle spray. The label is drawn as a native canvas texture using the established SPARK typography plus the generated brake detail asset. It is a modeled visualization, not a manufacturer CAD model.

ScrollTrigger drives a 0–1 playhead. A damped render loop applies bottle rotation, cap removal, camera movement, nozzle-directed spray and surface color change. Chapter buttons scrub to defined positions; dragging or the rotate button adds inspection rotation. Real photographs remain in the lower page.

Performance: locally vendored Three.js, bounded pixel ratio and particle count, no model download, and rendering pauses offscreen or when the tab is hidden. Reduced motion or initialization failure uses the existing product photograph. No Rive dependency is needed for this product sequence.

Entry points: `css/experience.css`, `js/experience.js`, and the `#experience` section in `index.html`.
