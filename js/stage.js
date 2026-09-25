/* ============================================================
   SPARK — the can stage
   A lathed aerosol can in WebGL, lit as a bright studio, whose
   pose is driven by a pinned ScrollTrigger through four beats.

   Degradation:
     no WebGL / module error -> the product photograph stays put
     reduced motion          -> no pin, instant pose changes on selection
     narrow / short screens  -> selectable tour, no pin or idle animation
   The photograph is in the markup from the start and the beats read as
   ordinary stacked content, so the first paint never waits for any of
   this and nothing here is load-bearing.
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

const section = document.querySelector('.stage');
const host = document.getElementById('canHost');
const progressBar = document.getElementById('stageProgress');
const beats = [...document.querySelectorAll('.beat')];
const steps = [...document.querySelectorAll('.stage__steps button')];

/* The markup already reads correctly on its own, so a failure here is
   simply "no 3D" — nothing needs undoing. */
if (section && host && window.gsap && window.ScrollTrigger) {
  boot().catch(() => section.classList.remove('is-live', 'is-tour', 'is-interactive'));
}

/* ---------- beat plumbing (works with or without WebGL) ---------- */

let activeBeat = -1;

function showBeat(i) {
  if (i === activeBeat) return;
  activeBeat = i;
  beats.forEach((b, n) => b.classList.toggle('is-on', n === i));
  steps.forEach((s, n) => {
    s.classList.toggle('is-on', n === i);
    if (n === i) s.setAttribute('aria-current', 'true');
    else s.removeAttribute('aria-current');
  });
}

/* Progress 0..1 -> which of the four beats is on screen. */
const beatAt = p => Math.min(3, Math.floor(p * 4 + 0.001));

async function boot() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const can = await buildCan();
  section.classList.add('is-live', 'is-interactive');

  const mm = gsap.matchMedia();

  mm.add(
    {
      /* 740px of height ruled out 1280x720 and any window with devtools open,
         so the scroll story silently vanished on very ordinary laptops. The
         pinned panel needs 640px, which 680 clears with room to spare. */
      pinned: '(min-width: 1000px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)',
      flat: '(max-width: 999px), (max-height: 679px), (prefers-reduced-motion: reduce)',
      reduced: '(prefers-reduced-motion: reduce)'
    },
    ctx => {
      const { pinned, reduced } = ctx.conditions;

      if (!pinned) {
        // Small screens use the same four controls without pinning the page.
        can.setProgress(0);
        can.setSway(false);
        showBeat(0);
        const onStep = e => {
          const i = Number(e.currentTarget.dataset.goto);
          showBeat(i);
          can.setProgress([0, 0.5, 0.75, 1][i]);
          if (reduced) can.snap();
        };
        steps.forEach(s => s.addEventListener('click', onStep));
        if (reduced) can.snap();
        return () => {
          steps.forEach(s => s.removeEventListener('click', onStep));
          activeBeat = -1;
        };
      }

      section.classList.add('is-tour');
      can.setSway(false);
      showBeat(0);

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 80px',
        end: () => '+=' + window.innerHeight * 2,
        pin: '.stage__pin',
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: self => {
          can.setProgress(self.progress);
          showBeat(beatAt(self.progress));
          if (progressBar) progressBar.style.transform = `scaleY(${self.progress})`;
        }
      });

      // Rail buttons land in the middle of their beat. ScrollToPlugin is not
      // vendored, so the scroller is moved directly.
      const onStep = e => {
        const i = Number(e.currentTarget.dataset.goto);
        const to = trigger.start + (trigger.end - trigger.start) * ((i + 0.5) / 4);
        window.scrollTo({ top: to, behavior: 'smooth' });
      };
      steps.forEach(s => s.addEventListener('click', onStep));

      return () => {
        steps.forEach(s => s.removeEventListener('click', onStep));
        section.classList.remove('is-tour');
        if (progressBar) progressBar.style.transform = '';
        activeBeat = -1;
      };
    }
  );

  // Refresh once the variable font has settled so pin measurements stay exact.
  document.fonts.ready.then(() => ScrollTrigger.refresh(true));
}

/* ============================================================
   the can
   ============================================================ */
async function buildCan() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.set(0, 0, 10.5);

  // Neutral studio lighting keeps the pack's warm red from shifting orange
  // and avoids a blue cast on the black label.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  env.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cb, 2.1));

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3.4, 5.6, 6.4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xf4f5f6, 1.5);
  fill.position.set(4.6, 1.2, 4.2);
  scene.add(fill);

  const back = new THREE.DirectionalLight(0xffffff, 1.1);
  back.position.set(0, 3.5, -6);
  scene.add(back);

  const rig = new THREE.Group();
  scene.add(rig);

  const body = new THREE.Group();
  rig.add(body);

  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.92, roughness: 0.28 });
  const capRed = new THREE.MeshPhysicalMaterial({
    color: 0xb51f0b, roughness: 0.4, metalness: 0.02, envMapIntensity: 0.65,
    clearcoat: 0.28, clearcoatRoughness: 0.38
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.38, metalness: 0.18 });

  // can body, lathed from the real silhouette
  const profile = [
    [0, -2.28], [0.54, -2.28], [0.61, -2.24], [0.63, -2.16],
    [0.63, 1.48], [0.60, 1.61], [0.47, 1.76], [0.26, 1.81], [0, 1.81]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  body.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 96), steel));

  const ring = (radius, tube, y, mat, parent) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 96), mat);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    (parent || body).add(m);
    return m;
  };

  ring(0.60, 0.035, -2.22, steel);
  ring(0.617, 0.016, -2.14, black);
  ring(0.62, 0.021, 1.45, steel);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.13, 64), steel);
  neck.position.y = 1.82;
  body.add(neck);

  // valve
  const valve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.2, 0.3, 64),
    new THREE.MeshStandardMaterial({ color: 0xdedcd7, roughness: 0.36, metalness: 0.1 })
  );
  valve.position.y = 2.0;
  body.add(valve);

  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.06, 20), black);
  outlet.rotation.x = Math.PI / 2;
  outlet.position.set(0, 2.02, 0.176);
  body.add(outlet);

  // The cap hangs on the rig, not the body: once it is off it should stay
  // where it was set down while the can turns underneath it.
  const cap = new THREE.Group();
  cap.position.y = 1.99;
  rig.add(cap);
  const capProfile = [
    [0, -0.5], [0.636, -0.5], [0.65, -0.47], [0.651, -0.4],
    [0.645, 0.35], [0.635, 0.44], [0.608, 0.49], [0.53, 0.52],
    [0.3, 0.53], [0, 0.53]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(capProfile, 128), capRed));
  ring(0.644, 0.012, -0.47, capRed, cap);

  // label, projected from the three product photographs
  const tex = await labelTexture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.635, 0.635, 3.48, 128, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: tex, roughness: 0.44, metalness: 0.06,
      clearcoat: 0.3, clearcoatRoughness: 0.32
    })
  );
  label.position.y = -0.3;
  label.rotation.y = Math.PI;
  body.add(label);

  // contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, opacity: 0.4, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.3;
  rig.add(shadow);

  /* ---------- pose ---------- */

  const clamp = THREE.MathUtils.clamp;
  const mix = THREE.MathUtils.lerp;
  const ramp = (a, b, p) => {
    const t = clamp((p - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  let progress = 0;      // scroll 0..1
  let drag = 0;          // extra turn the visitor has dragged in
  let sway = false;
  let snapNext = false;
  let running = true;
  let visible = true;
  let dirty = true;      // forces a repaint after a resize or a state change

  const REST_TURN = -0.35;   // a three-quarter view, not dead-on
  const pose = { turn: REST_TURN, tilt: 0, lift: 0, y: 0, dolly: 0 };
  body.rotation.y = REST_TURN;

  function computePose(p) {
    // 0.00–0.25  resting three-quarter view
    // 0.25–0.50  cap lifts away and drifts aside, can tips to show the valve
    // 0.50–0.75  turn round to the features panel
    // 0.75–1.00  turn back to the front and settle
    const uncap = ramp(0.25, 0.5, p);
    const turnP = ramp(0.5, 0.75, p);
    const rest = ramp(0.75, 1, p);

    // Negative: the wrap puts the features panel a third of a turn anticlockwise
    // of the front, so this lands beat 2 on the panel the copy is describing.
    pose.turn = REST_TURN - turnP * (Math.PI * 2 / 3) - rest * (Math.PI * 4 / 3);
    pose.tilt = uncap * 0.2 - rest * 0.2;
    pose.lift = uncap;
    pose.y = -uncap * 0.3;
    // Pull back while the cap is in the air so it never leaves the frame.
    pose.dolly = uncap * 0.85 + rest * 0.25;
  }

  const tmp = new THREE.Vector3();

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) return;

    computePose(progress);

    /* Off the pinned run there is nothing driving the can, so it sways
       gently either side of its resting view. A full spin would park the
       back of the pack towards the camera half the time. */
    const idle = sway ? Math.sin(now / 1000 * 0.42) * 0.3 : 0;

    let moved = 0;
    const step = (obj, key, target) => {
      const d = (target - obj[key]) * (snapNext ? 1 : 0.12);
      obj[key] += d;
      moved += Math.abs(d);
    };

    step(body.rotation, 'y', pose.turn + drag + idle);
    step(body.rotation, 'x', pose.tilt);
    step(rig.position, 'y', pose.y);

    // Lifted mostly sideways rather than up, so it never leaves the frame.
    step(cap.position, 'y', 1.99 + pose.lift * 0.45);
    step(cap.position, 'x', pose.lift * 0.95);
    step(cap.rotation, 'z', -pose.lift * 0.55);

    tmp.set(0, 0, baseDist + pose.dolly);
    moved += camera.position.distanceTo(tmp);
    camera.position.lerp(tmp, snapNext ? 1 : 0.12);
    camera.lookAt(0, frameDrop, 0);

    shadow.material.opacity = 0.4 - pose.lift * 0.12;

    // Everything has settled and nothing is driving it — stop painting.
    if (moved < 0.0004 && !dragging && !dirty) return;
    dirty = false;
    snapNext = false;
    renderer.render(scene, camera);
  }

  /* The can is about 4.8 units tall and 1.3 wide. Rather than changing the
     lens, hold the field of view and pull the camera back only as far as it
     takes to fit that box — so the can reads at the same size in a tall
     desktop plate and a short mobile one. */
  const FIT_H = 5.5;
  const FIT_W = 3.1;
  const FIT_CAP = 780;   // canvas height the framing is calibrated to
  let baseDist = 11;
  let frameDrop = 0.1;

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    /* Past the calibration height the frame is widened in step with the
       canvas, so the can keeps the same size in pixels instead of growing
       to fill a tall panel. */
    const fitH = FIT_H * (h / Math.min(h, FIT_CAP));
    const half = Math.tan((camera.fov * Math.PI) / 360);
    baseDist = Math.max(fitH / 2 / half, FIT_W / 2 / (half * camera.aspect));

    // Centre the product inside its contained display, leaving room for the cap.
    frameDrop = 0.1;
    dirty = true;
  }

  new ResizeObserver(resize).observe(host);
  resize();

  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden && !!host.offsetParent; });

  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; section.classList.remove('is-live'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { running = true; requestAnimationFrame(frame); });

  // drag to turn
  let dragging = false, startX = 0, startTurn = 0;
  host.addEventListener('pointerdown', e => {
    dragging = true; startX = e.clientX; startTurn = drag;
    host.setPointerCapture(e.pointerId);
    host.classList.add('is-dragging');
  });
  host.addEventListener('pointermove', e => {
    if (dragging) drag = startTurn + (e.clientX - startX) * 0.009;
  });
  const endDrag = () => { dragging = false; host.classList.remove('is-dragging'); };
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);

  requestAnimationFrame(frame);

  return {
    setProgress(p) { progress = p; dirty = true; },
    setSway(on) { sway = on; dirty = true; },
    snap() { snapNext = true; dirty = true; }
  };
}

/* ---------- textures ---------- */

function softShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(24,26,30,0.8)');
  g.addColorStop(0.4, 'rgba(24,26,30,0.26)');
  g.addColorStop(1, 'rgba(24,26,30,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/* The three product photographs are column-sliced into one cylindrical
   wrap. Coordinates are expressed against the 1373x1824 reference frame the
   shots were measured in, then scaled to whatever the files are now.

   This runs on raw pixel buffers rather than one canvas draw per column.
   The draw-call version cost about eight seconds, during which the page sat
   showing the fallback photograph — which read as the site not updating. */
async function labelTexture() {
  const views = [
    { src: 'assets/img/product-front.webp', center: 674, radius: 158, top: 569, bottom: 1574, angle: 0 },
    { src: 'assets/img/product-side.webp', center: 649, radius: 157, top: 579, bottom: 1630, angle: Math.PI * 2 / 3 },
    { src: 'assets/img/product-back.webp', center: 665, radius: 150, top: 608, bottom: 1603, angle: -Math.PI * 2 / 3 }
  ];

  await Promise.all(views.map(async v => {
    v.image = new Image();
    v.image.src = v.src;
    await v.image.decode();
  }));

  const OUT_W = 2048;
  const OUT_H = 1024;

  // Pull each label band out once, at source resolution.
  for (const v of views) {
    v.fx = v.image.naturalWidth / 1373;
    const fy = v.image.naturalHeight / 1824;
    v.left = Math.max(0, Math.floor((v.center - v.radius) * v.fx) - 1);
    v.sy = Math.round(v.top * fy);
    v.sh = Math.round((v.bottom - v.top) * fy);
    v.sw = Math.min(v.image.naturalWidth - v.left, Math.ceil(2 * v.radius * v.fx) + 3);

    const band = document.createElement('canvas');
    band.width = v.sw;
    band.height = v.sh;
    const bx = band.getContext('2d', { willReadFrequently: true });
    bx.drawImage(v.image, v.left, v.sy, v.sw, v.sh, 0, 0, v.sw, v.sh);
    v.px = bx.getImageData(0, 0, v.sw, v.sh).data;
  }

  const out = new ImageData(OUT_W, OUT_H);
  const o = out.data;

  for (let col = 0; col < OUT_W; col++) {
    const angle = (col / OUT_W - 0.5) * Math.PI * 2;

    let sel = views[0], best = Infinity, rel = 0;
    for (const v of views) {
      const a = Math.atan2(Math.sin(angle - v.angle), Math.cos(angle - v.angle));
      if (Math.abs(a) < best) { best = Math.abs(a); sel = v; rel = a; }
    }

    let sx = Math.round((sel.center + Math.sin(rel) * sel.radius) * sel.fx) - sel.left;
    if (sx < 0) sx = 0;
    else if (sx >= sel.sw) sx = sel.sw - 1;

    const px = sel.px, sw = sel.sw, sh = sel.sh;
    for (let y = 0; y < OUT_H; y++) {
      const si = (((y * sh / OUT_H) | 0) * sw + sx) * 4;
      const di = (y * OUT_W + col) * 4;
      o[di] = px[si];
      o[di + 1] = px[si + 1];
      o[di + 2] = px[si + 2];
      o[di + 3] = 255;
    }
  }

  const c = document.createElement('canvas');
  c.width = OUT_W;
  c.height = OUT_H;
  c.getContext('2d').putImageData(out, 0, 0);
  return new THREE.CanvasTexture(c);
}
