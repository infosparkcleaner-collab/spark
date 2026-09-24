import * as THREE from '../assets/vendor/three.module.js';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

/* ============================================================
   SPARK — 3D Product Experience Engine
   Three.js procedural lathed can + cylindrical photo-label projection
   + GPU particle aerosol jet + interactive 3D hotspots
   + Scroll-linked GSAP playhead & Workshop Video Demonstration
   ============================================================ */

const root = document.querySelector('#experience');
const stage = root.querySelector('.experience__stage');
const host = root.querySelector('.experience__canvas');
const film = root.querySelector('.experience__film');
const video = root.querySelector('.experience__video');

let filmReady = false;
let desiredVideoTime = 0;
let userActiveView = 'auto'; // 'auto' | '3d' | 'video'

// Seek video to exact scroll-scrubbed position
function seekFilm() {
  if (!filmReady || video.seeking || !Number.isFinite(video.duration)) return;
  if (Math.abs(video.currentTime - desiredVideoTime) > 0.03) {
    video.currentTime = desiredVideoTime;
  }
}

function markFilmReady() {
  if (filmReady || video.readyState < 2) return;
  filmReady = true;
  root.classList.add('is-film-ready');
  seekFilm();
}

video.addEventListener('loadeddata', markFilmReady);
video.addEventListener('seeked', seekFilm);
video.addEventListener('error', () => {
  filmReady = false;
  root.classList.remove('is-film-ready');
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// Pre-fetch video into local blob for instantaneous zero-latency frame seeking
async function loadFilm() {
  const src = video.dataset.src;
  if (!src) return;
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(response.status);
    video.src = URL.createObjectURL(await response.blob());
  } catch (error) {
    video.src = src;
  }
  video.load();
  markFilmReady();
}

// Pseudo-random generator for consistent particle dispersion
let randomState = 23092026;
const random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 4294967296;
};

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = (a, b, p) => {
  const t = clamp((p - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

let renderer, raf, running = false, contextLost = false, inView = true;
let progress = 0, target = 0, dragging = false, dragStart = 0, turn = 0, turnStart = 0;
let pointer = { x: 0, y: 0 }, easedPointer = { x: 0, y: 0 };
let lastTime = 0, totalTime = 0, currentChapter = -1;

const chapters = [
  {
    word: 'SPARK',
    title: 'SERIOUS POWER.\nZERO RESIDUE.',
    text: 'Professional-strength brake & parts cleaner. Engineered for the hardest jobs in the shop.',
    tag: '01 / MEET THE CAN',
    act: 0
  },
  {
    word: 'SHAKE.',
    title: 'WAKE IT UP.\nPOP THE CAP.',
    text: 'Heavy-duty solvent with high-pressure propellant. Shake vigorously and release the protective cap.',
    tag: '02 / SHAKE & UNCAP',
    act: 1
  },
  {
    word: 'SPRAY.',
    title: 'HIGH PRESSURE.\nTARGETED BLAST.',
    text: 'Cuts brake fluid, grease, oil and road grime instantly. Precision jet puts the solvent exactly where needed.',
    tag: '03 / ACTIVE SPRAY',
    act: 2
  },
  {
    word: 'CLEAN.',
    title: 'RAPID EVAPORATION.\nZERO RESIDUE.',
    text: 'Evaporates completely in seconds. Leaves metal bare, degreased, and ready for immediate service.',
    tag: '04 / PURE RESTORATION',
    act: 3
  },
  {
    word: 'PROOF.',
    title: 'WORKSHOP VERIFIED.\nREAL RESULTS.',
    text: 'Watch SPARK in action on a real contaminated brake assembly. Authentic hands-on workshop proof.',
    tag: '05 / WORKSHOP PROOF',
    act: 4
  }
];

function fallback() {
  running = false;
  cancelAnimationFrame(raf);
  root.classList.remove('is-webgl');
  root.classList.add('is-static');
  root.querySelector('.experience__title').textContent = 'SPARK';
  root.querySelector('.experience__heading').textContent = chapters[0].title;
  root.querySelector('.experience__description').textContent = chapters[0].text;
  root.querySelector('.experience__eyebrow').textContent = chapters[0].tag;
  window.ScrollTrigger?.refresh();
}

if (reduced.matches || !window.gsap || !window.ScrollTrigger) {
  fallback();
} else {
  loadFilm();
  init().catch(error => {
    console.warn('SPARK: using fallback renderer.', error);
    fallback();
  });
}

async function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  camera.position.set(0, 0.35, 12);

  // Realistic Studio Environment & Lights
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(environment, 0.04);
  scene.environment = envTarget.texture;
  environment.dispose();
  pmrem.dispose();

  // Dramatic automotive lighting
  scene.add(new THREE.HemisphereLight(0xffffff, 0x14161a, 1.6));

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
  keyLight.position.set(-3, 6, 7);
  scene.add(keyLight);

  const redRimLight = new THREE.PointLight(0xe4002b, 35, 20);
  redRimLight.position.set(3.5, 2.5, -2);
  scene.add(redRimLight);

  const fillLight = new THREE.DirectionalLight(0xd9e5f5, 1.8);
  fillLight.position.set(-5, 1, 3);
  scene.add(fillLight);

  const topRim = new THREE.DirectionalLight(0xffffff, 2.0);
  topRim.position.set(0, 8, -3);
  scene.add(topRim);

  // 3D Lathed Aerosol Can Rig
  const rig = new THREE.Group();
  scene.add(rig);

  const can = new THREE.Group();
  rig.add(can);

  // Materials
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xc8ced4,
    metalness: 0.94,
    roughness: 0.26
  });

  const capRedMat = new THREE.MeshPhysicalMaterial({
    color: 0xcd2a06,
    roughness: 0.28,
    metalness: 0.04,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18
  });

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x070809,
    roughness: 0.35,
    metalness: 0.2
  });

  // Aerosol can body profile (lathed)
  const profile = [
    [0, -2.28], [0.54, -2.28], [0.61, -2.24], [0.63, -2.16],
    [0.63, 1.48], [0.60, 1.61], [0.47, 1.76], [0.26, 1.81], [0, 1.81]
  ].map(p => new THREE.Vector2(...p));
  can.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 96), steelMat));

  function cylinder(r1, r2, h, mat, y, parent = can) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 80), mat);
    m.position.y = y;
    parent.add(m);
    return m;
  }

  function ring(radius, tube, y, mat, parent = can) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 96), mat);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    parent.add(m);
    return m;
  }

  // Steel seams and crimps
  ring(0.60, 0.035, -2.22, steelMat);
  ring(0.617, 0.016, -2.14, blackMat);
  ring(0.62, 0.021, 1.45, steelMat);
  cylinder(0.19, 0.23, 0.13, steelMat, 1.82);

  // Spray nozzle
  const nozzle = cylinder(0.17, 0.20, 0.30, new THREE.MeshStandardMaterial({ color: 0xdedcd7, roughness: 0.38 }), 2.0);
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.06, 20), blackMat);
  outlet.rotation.x = Math.PI / 2;
  outlet.position.set(0, 2.02, 0.176);
  can.add(outlet);

  // Removable Protective Aerosol Cap
  const cap = new THREE.Group();
  cap.position.y = 1.99;
  can.add(cap);

  const capProfile = [
    [0, -0.50], [0.636, -0.50], [0.650, -0.47], [0.651, -0.40],
    [0.645, 0.35], [0.635, 0.44], [0.608, 0.49], [0.53, 0.52],
    [0.30, 0.53], [0, 0.53]
  ].map(p => new THREE.Vector2(...p));
  cap.add(new THREE.Mesh(new THREE.LatheGeometry(capProfile, 128), capRedMat));
  ring(0.644, 0.012, -0.47, capRedMat, cap);

  // High-Resolution Cylindrical Label Projected From Actual Photographs
  await Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]);

  const texture = await labelTexture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.635, 0.635, 3.48, 128, 1, true),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.42,
      metalness: 0.08,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3
    })
  );
  label.position.y = -0.30;
  label.rotation.y = Math.PI;
  can.add(label);

  // 3D Ventilated Brake Rotor Assembly
  const rotorRig = new THREE.Group();
  scene.add(rotorRig);
  rotorRig.visible = false;

  const rotor = new THREE.Group();
  rotorRig.add(rotor);

  const discMat = new THREE.MeshStandardMaterial({
    color: 0x1f2226,
    metalness: 0.5,
    roughness: 0.85,
    side: THREE.DoubleSide
  });

  const disc = new THREE.Mesh(new THREE.RingGeometry(0.48, 1.54, 96), discMat);
  rotor.add(disc);

  const backing = new THREE.Mesh(new THREE.RingGeometry(0.48, 1.54, 96), discMat);
  backing.position.z = -0.12;
  rotor.add(backing);

  for (const radius of [0.49, 0.72, 1.48, 1.54]) {
    rotor.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.015, 8, 96), steelMat));
  }

  // Drilled ventilation holes
  for (let i = 0; i < 50; i++) {
    const angle = (i / 25) * Math.PI * 2;
    const radius = i < 25 ? 1.32 : 1.07;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10), blackMat);
    hole.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.008);
    rotor.add(hole);
  }

  // Steel wheel studs
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.20, 6), steelMat);
    stud.rotation.x = Math.PI / 2;
    stud.position.set(Math.cos(a) * 0.61, Math.sin(a) * 0.61, 0.06);
    rotor.add(stud);
  }

  // Brembo-style red performance caliper
  const caliperShape = new THREE.Shape();
  caliperShape.moveTo(-0.16, -0.62);
  caliperShape.lineTo(0.15, -0.62);
  caliperShape.lineTo(0.26, -0.38);
  caliperShape.lineTo(0.26, 0.35);
  caliperShape.lineTo(0.12, 0.61);
  caliperShape.lineTo(-0.16, 0.61);
  caliperShape.lineTo(-0.24, 0.28);
  caliperShape.lineTo(-0.24, -0.3);
  caliperShape.closePath();

  const caliper = new THREE.Mesh(
    new THREE.ExtrudeGeometry(caliperShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.09,
      bevelSegments: 4,
      steps: 1
    }),
    capRedMat
  );
  caliper.position.set(1.32, 0.05, 0.08);
  caliper.rotation.z = -0.15;
  rotorRig.add(caliper);

  for (const y of [-0.3, 0.3]) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.10, 0.05), blackMat);
    bridge.position.set(1.32, y, 0.48);
    bridge.rotation.z = -0.15;
    rotorRig.add(bridge);
  }

  // GPU High-Pressure Spray Mist Particles
  const count = innerWidth < 700 ? 500 : 1000;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const sprayMat = new THREE.PointsMaterial({
    color: 0xb5d5e5,
    size: 0.032,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    map: dotTexture(),
    sizeAttenuation: true
  });

  const spray = new THREE.Points(particleGeo, sprayMat);
  spray.frustumCulled = false;
  scene.add(spray);

  // Atmospheric ambient particles
  const ambientGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(180 * 3);
  for (let i = 0; i < dustPositions.length; i++) dustPositions[i] = (random() - 0.5) * 18;
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    ambientGeo,
    new THREE.PointsMaterial({ color: 0xdde6ed, size: 0.014, transparent: true, opacity: 0.18, depthWrite: false })
  );
  scene.add(dust);

  // Contact Shadow Plane
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.8),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.4, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.8, -2.8, 0);
  scene.add(shadow);

  function size() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(size);
  resizeObserver.observe(stage);
  size();

  root.classList.add('is-webgl');
  root.classList.remove('is-static');

  // Chapter buttons scrubbing
  const stops = [0.0, 0.28, 0.55, 0.74, 0.92];
  root.querySelectorAll('[data-chapter]').forEach((button, i) =>
    button.addEventListener('click', () => {
      const destination = root.offsetTop + (root.offsetHeight - stage.clientHeight) * stops[i];
      turn = 0;
      if (window.lenis) window.lenis.scrollTo(destination, { duration: 1.5 });
      else window.scrollTo({ top: destination, behavior: 'smooth' });
    })
  );

  // View toggle buttons (3D vs Video)
  const viewButtons = root.querySelectorAll('[data-view]');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.view;
      userActiveView = mode;
      viewButtons.forEach(b => b.classList.toggle('is-active', b === btn));
    });
  });

  // ScrollTrigger integration
  const scrollTrigger = window.ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => target = self.progress
  });
  window.ScrollTrigger.refresh();
  target = scrollTrigger.progress;

  // Interactive 3D drag-to-rotate
  host.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    dragging = true;
    dragStart = e.clientX;
    turnStart = turn;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', e => {
    if (dragging) turn = turnStart + (e.clientX - dragStart) * 0.008;
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
  });
  host.addEventListener('pointerup', () => dragging = false);
  host.addEventListener('pointercancel', () => dragging = false);
  host.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

  const rotateBtn = root.querySelector('[data-rotate]');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      window.gsap.to({ v: turn }, {
        v: turn + Math.PI * 2,
        duration: 2.2,
        ease: 'power2.inOut',
        onUpdate: function () { turn = this.targets()[0].v; }
      });
    });
  }

  // Hotspot DOM elements and 3D anchors
  const hotspotElements = {
    nozzle: root.querySelector('[data-hotspot="nozzle"]'),
    formula: root.querySelector('[data-hotspot="formula"]'),
    capacity: root.querySelector('[data-hotspot="capacity"]')
  };

  const hotspotCoords = {
    nozzle: new THREE.Vector3(0, 2.05, 0.18),
    formula: new THREE.Vector3(0, 0.2, 0.64),
    capacity: new THREE.Vector3(0, -1.8, 0.64)
  };

  const hotspotVec = new THREE.Vector3();
  const hotspotNorm = new THREE.Vector3();
  const canNormal = new THREE.Vector3(0, 0, 1);
  const camDir = new THREE.Vector3();

  function updateHotspots(p) {
    const showHotspots = p < 0.24 && userActiveView !== 'video';
    const w = stage.clientWidth;
    const h = stage.clientHeight;

    for (const key in hotspotElements) {
      const el = hotspotElements[key];
      if (!el) continue;
      if (!showHotspots) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }

      hotspotVec.copy(hotspotCoords[key]);
      can.localToWorld(hotspotVec);

      // Check facing angle
      hotspotNorm.copy(canNormal).applyQuaternion(can.quaternion);
      camera.getWorldDirection(camDir);

      if (hotspotNorm.dot(camDir) < -0.15) {
        hotspotVec.project(camera);
        const x = (hotspotVec.x * 0.5 + 0.5) * w;
        const y = (-hotspotVec.y * 0.5 + 0.5) * h;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    }
  }

  const chapterButtons = [...root.querySelectorAll('[data-chapter]')];
  const origin = new THREE.Vector3(), end = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();

  // Primary animation loop
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000 || 0.016, 0.05);
    lastTime = now;
    totalTime += dt;

    const ease = 1 - Math.exp(-dt * 8);
    progress = mix(progress, target, ease);
    easedPointer.x = mix(easedPointer.x, pointer.x, ease);
    easedPointer.y = mix(easedPointer.y, pointer.y, ease);

    const p = progress;
    const mobile = innerWidth < 700;

    // Scroll choreography stages
    // 0.00 -> 0.22: 3D Arrival & 360 inspection
    // 0.22 -> 0.44: Shake & Uncap
    // 0.44 -> 0.68: Targeted Spray Jet at 3D rotor
    // 0.68 -> 0.85: Clean rotor shine
    // 0.85 -> 1.00: Transition to Workshop Demo Video
    const intro = smooth(0.0, 0.20, p);
    const shake = smooth(0.20, 0.26, p) * (1 - smooth(0.38, 0.42, p));
    const uncap = smooth(0.36, 0.50, p);
    const aim = smooth(0.44, 0.56, p);
    const spraying = smooth(0.50, 0.58, p) * (1 - smooth(0.68, 0.76, p));
    const clear = smooth(0.58, 0.78, p);
    const finish = smooth(0.82, 0.94, p);

    const orbit = smooth(0.04, 0.22, p) * Math.PI * 2;

    // Rig position & orientation
    const rigTargetX = mix(mobile ? 0 : 0.1, 0, intro) + aim * (1 - finish) * (mobile ? 1.1 : 2.25);
    const rigTargetY = mix(mobile ? 0.8 : 0.05, mobile ? 0.8 : 0, intro) + aim * (1 - finish) * 0.6;
    rig.position.set(rigTargetX, rigTargetY, 0);

    rig.rotation.set(
      0.06 + easedPointer.y * 0.035,
      -0.12 + easedPointer.x * 0.08,
      mix(-0.22, 0, intro) + Math.sin(p * 180) * shake * 0.18 + aim * (1 - finish) * 0.97
    );

    can.rotation.y = orbit + turn + Math.sin(p * 150) * shake * 0.12;
    rig.position.y += Math.sin(p * 190) * shake * 0.09;

    // Contact shadow
    shadow.position.x = rig.position.x;
    shadow.scale.setScalar(1 + aim * (1 - finish) * 0.5);
    shadow.material.opacity = 0.35 - uncap * 0.08;

    // Cap removal animation
    cap.position.set(uncap * 0.45, 1.99 + uncap * 2.2, 0);
    cap.rotation.z = uncap * -0.42;
    cap.rotation.x = uncap * 0.38;
    cap.visible = p < 0.60 || finish > 0.65;

    if (finish > 0.65) {
      const close = smooth(0.85, 0.98, p);
      cap.position.set((1 - close) * 0.45, 1.99 + (1 - close) * 2.2, 0);
      cap.rotation.set((1 - close) * 0.38, 0, (1 - close) * -0.42);
    }

    nozzle.position.y = 2.0 - spraying * 0.06;

    // Rig scale
    const scale = mix(1.08, 1.12, intro) * (1 - aim * (1 - finish) * 0.18) * (mobile ? 0.96 : 1);
    rig.scale.setScalar(scale);

    // 3D Rotor position & clean transition
    rotorRig.visible = aim > 0.01 && finish < 0.98;
    rotorRig.position.set(mobile ? -0.75 : -2.05, 0.65, -0.40);
    rotorRig.rotation.set(0.05, -0.18, 0);
    rotorRig.scale.setScalar(aim * (1 - finish * 0.6) * (mobile ? 0.65 : 0.95));
    rotor.rotation.z = -p * 2.5;

    // Disc grime transforms from dark oil to gleaming machined steel
    discMat.color.setRGB(mix(0.12, 0.85, clear), mix(0.12, 0.88, clear), mix(0.13, 0.92, clear));
    discMat.roughness = mix(0.88, 0.22, clear);
    discMat.metalness = mix(0.45, 0.94, clear);

    // Camera perspective
    camera.position.z = (mobile ? 16.5 : 11.2) - intro * 0.35 + aim * (1 - finish) * 1.0;
    camera.position.x = easedPointer.x * 0.14;
    camera.position.y = 0.25 + intro * 0.2;
    cameraTarget.set(0, mobile ? 0.3 : 0.25, 0);
    camera.lookAt(cameraTarget);

    scene.updateMatrixWorld();

    // High-Pressure Particle Aerosol Jet
    outlet.getWorldPosition(origin);
    end.copy(rotorRig.position);
    dir.copy(end).sub(origin);
    const length = dir.length();
    dir.normalize();
    side.set(0, 0, 1).cross(dir).normalize();
    up.copy(dir).cross(side);

    for (let i = 0; i < count; i++) {
      const t = (p * 75 + seeds[i * 3]) % 1;
      const spread = 0.016 + t * 0.38;
      const u = (seeds[i * 3 + 1] - 0.5) * spread;
      const v = (seeds[i * 3 + 2] - 0.5) * spread;
      const j = i * 3;
      positions[j] = origin.x + dir.x * t * length + side.x * u + up.x * v;
      positions[j + 1] = origin.y + dir.y * t * length + side.y * u + up.y * v;
      positions[j + 2] = origin.z + dir.z * t * length + side.z * u + up.z * v;
    }
    particleGeo.attributes.position.needsUpdate = true;
    sprayMat.opacity = spraying * 0.95;
    spray.visible = spraying > 0.01;

    dust.rotation.y = p * 0.25;

    // View coordination: 3D Canvas vs Workshop Video
    let targetFilmOpacity = 0;
    if (userActiveView === 'video') {
      targetFilmOpacity = 1;
    } else if (userActiveView === '3d') {
      targetFilmOpacity = 0;
    } else {
      // Natural scroll flow: Film appears at Act 4 (Workshop Demo)
      targetFilmOpacity = filmReady ? smooth(0.82, 0.90, p) : 0;
    }

    film.style.opacity = targetFilmOpacity;
    film.style.transform = `translateX(-50%) translateY(${(1 - targetFilmOpacity) * 20}px)`;
    film.style.pointerEvents = targetFilmOpacity > 0.5 ? 'auto' : 'none';

    // 3D Canvas remains visible throughout, softening slightly when film takes focus
    host.style.opacity = userActiveView === 'video' ? 0.15 : (1 - targetFilmOpacity * 0.85);

    // Sync video playhead with scroll progress
    desiredVideoTime = filmReady ? clamp((p - 0.20) / 0.80, 0, 1) * Math.max(0, video.duration - 0.05) : 0;
    seekFilm();

    // Hotspot tracking
    updateHotspots(p);

    // Active Chapter detection
    let index = 0;
    if (p < 0.22) index = 0;
    else if (p < 0.44) index = 1;
    else if (p < 0.68) index = 2;
    else if (p < 0.85) index = 3;
    else index = 4;

    if (index !== currentChapter) {
      currentChapter = index;
      const c = chapters[index];
      root.querySelector('.experience__title').textContent = c.word;
      root.querySelector('.experience__heading').textContent = c.title;
      root.querySelector('.experience__description').textContent = c.text;
      root.querySelector('.experience__eyebrow').textContent = c.tag;
      root.dataset.act = c.act;

      chapterButtons.forEach((b, i) => {
        b.classList.toggle('is-active', i === index);
        if (i === index) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });

      if (window.gsap) {
        window.gsap.fromTo(
          '.experience__caption',
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, overwrite: true }
        );
      }
    }

    root.style.setProperty('--journey', `${p * 100}%`);
    root.style.setProperty('--heat', `${0.18 + spraying * 0.24}`);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  function start() {
    if (running || document.hidden || !inView || contextLost || reduced.matches) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) start();
    else stop();
  }, { rootMargin: '100px' }).observe(root);

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    contextLost = true;
    stop();
    root.classList.remove('is-webgl');
  });

  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    root.classList.add('is-webgl');
    size();
    start();
  });

  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      scrollTrigger.disable();
      fallback();
    } else {
      root.classList.remove('is-static');
      root.classList.add('is-webgl');
      scrollTrigger.enable();
      window.ScrollTrigger.refresh();
      start();
    }
  });

  start();
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'white');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  g.addColorStop(0.35, 'rgba(0, 0, 0, 0.35)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// 360° Cylindrical Texture Projection from User's High-Res Product Photos
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

  const c = document.createElement('canvas');
  c.width = 3072;
  c.height = 3072;
  const x = c.getContext('2d');
  x.fillStyle = '#0a0d11';
  x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';

  for (let column = 0; column < c.width; column++) {
    const angle = (column / c.width - 0.5) * Math.PI * 2;
    let selected = views[0], distance = Infinity, relative = 0;
    for (const v of views) {
      const a = Math.atan2(Math.sin(angle - v.angle), Math.cos(angle - v.angle));
      if (Math.abs(a) < distance) {
        distance = Math.abs(a);
        selected = v;
        relative = a;
      }
    }
    const factor = selected.image.naturalWidth / 1373;
    const sourceX = (selected.center + Math.sin(relative) * selected.radius) * factor;
    const sourceY = selected.top * selected.image.naturalHeight / 1824;
    const sourceH = (selected.bottom - selected.top) * selected.image.naturalHeight / 1824;
    x.drawImage(selected.image, sourceX, sourceY, Math.max(1, factor), sourceH, column, 0, 1, c.height);
  }
  return new THREE.CanvasTexture(c);
}
