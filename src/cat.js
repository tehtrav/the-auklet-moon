import * as THREE from 'three';

// Pelt choices. Emmy's real art and more patterns can replace these later.
export const PELTS = [
  // Inspired by Emmy's drawing: dark cat, lavender face and tail, blue whiskers.
  { id: 'lavender', name: 'Lavender Moon', base: '#2d2b3d', accent: '#b8a6e0', stripe: null, eyes: '#8fd0ff', whiskers: '#7fc6ff', face: true, tailTip: 4 },
  { id: 'ginger', name: 'Ginger Tabby', base: '#e08a3c', accent: '#f6dcc0', stripe: '#b25e1e', eyes: '#5fbf5a' },
  { id: 'silver', name: 'Silver Tabby', base: '#a9aeb6', accent: '#e9ebef', stripe: '#5d636c', eyes: '#62b3e8' },
  { id: 'midnight', name: 'Midnight Black', base: '#1f1f24', accent: '#3a3a44', stripe: null, eyes: '#f2d14b' },
  { id: 'snowy', name: 'Snowy White', base: '#f3f1ec', accent: '#ffffff', stripe: null, eyes: '#6aa8ff' },
  { id: 'brown', name: 'Brown Tabby', base: '#8a6142', accent: '#d9c2a5', stripe: '#4e3524', eyes: '#d6a43a' },
  { id: 'sandy', name: 'Sandy Cream', base: '#e6cf9f', accent: '#fbf1dc', stripe: '#c9ab72', eyes: '#7bc48a' },
  { id: 'smoke', name: 'Blue Smoke', base: '#6c7a8c', accent: '#aab6c6', stripe: null, eyes: '#e7b54a' },
];

const lamb = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// Builds a simple low-poly cat. It faces +z. Call cat.animate() every frame.
export function createCat(pelt = PELTS[0], { size = 1 } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // everything that bobs up and down
  root.add(body);

  const baseMat = lamb(pelt.base);
  const accentMat = lamb(pelt.accent);
  const stripeMat = pelt.stripe ? lamb(pelt.stripe) : null;
  const pinkMat = lamb('#e89aa7');
  const eyeMat = new THREE.MeshBasicMaterial({ color: pelt.eyes });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#111111' });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 10), baseMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 0.5, 0);
  body.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), accentMat);
  chest.scale.set(1, 1.05, 0.9);
  chest.position.set(0, 0.47, 0.34);
  body.add(chest);

  if (stripeMat) {
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.03, 4, 12, Math.PI * 0.9), stripeMat);
      s.rotation.y = Math.PI / 2;
      s.rotation.z = Math.PI * 0.05;
      s.position.set(0, 0.51, -0.25 + i * 0.16);
      body.add(s);
    }
  }

  // Head
  const head = new THREE.Group();
  head.position.set(0, 0.8, 0.5);
  body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pelt.face ? accentMat : baseMat);
  skull.scale.set(1.05, 0.95, 1);
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), accentMat);
  muzzle.scale.set(1.2, 0.8, 0.9);
  muzzle.position.set(0, -0.07, 0.17);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), pinkMat);
  nose.position.set(0, -0.03, 0.27);
  head.add(nose);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eye.position.set(s * 0.09, 0.04, 0.18);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), pupilMat);
    pupil.scale.set(0.6, 1.3, 0.6);
    pupil.position.set(s * 0.092, 0.04, 0.218);
    head.add(pupil);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.17, 4), baseMat);
    ear.position.set(s * 0.12, 0.2, -0.01);
    ear.rotation.z = -s * 0.25;
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 4), pinkMat);
    inner.position.set(s * 0.115, 0.19, 0.02);
    inner.rotation.z = -s * 0.25;
    head.add(inner);
    // Whiskers
    const wMat = new THREE.LineBasicMaterial({ color: pelt.whiskers || '#f5f5f5' });
    for (let k = 0; k < 2; k++) {
      const pts = [new THREE.Vector3(s * 0.08, -0.06 + k * 0.025, 0.24), new THREE.Vector3(s * 0.3, -0.04 + k * 0.05, 0.2)];
      head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wMat));
    }
  }

  // Legs (pivot at the top so they swing)
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.42, 6);
  legGeo.translate(0, -0.21, 0);
  const pawGeo = new THREE.SphereGeometry(0.075, 7, 5);
  for (const [lx, lz, front] of [[-0.13, 0.3, true], [0.13, 0.3, true], [-0.13, -0.3, false], [0.13, -0.3, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(lx, 0.45, lz);
    const leg = new THREE.Mesh(legGeo, baseMat);
    pivot.add(leg);
    const paw = new THREE.Mesh(pawGeo, accentMat);
    paw.scale.set(1, 0.6, 1.3);
    paw.position.set(0, -0.42, 0.02);
    pivot.add(paw);
    body.add(pivot);
    legs.push({ pivot, front, side: lx > 0 ? 1 : -1 });
  }

  // Tail: a chain of segments
  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 0.6, -0.5);
  body.add(tailRoot);
  const tailSegs = [];
  let parent = tailRoot;
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Group();
    const len = 0.14;
    const isTip = i >= segs - (pelt.tailTip || 2);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05 - i * 0.004, 0.055 - i * 0.004, len + 0.02, 6), isTip ? accentMat : baseMat);
    m.position.y = len / 2;
    seg.add(m);
    if (i > 0) seg.position.y = len;
    parent.add(seg);
    tailSegs.push(seg);
    parent = seg;
  }
  tailRoot.rotation.x = -1.15; // tail points back and up

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  root.scale.setScalar(size);

  let walkPhase = 0;
  let t = Math.random() * 10;

  // speed: how fast the cat moves; mode: 'ground' | 'air' | 'swim' | 'sit'
  function animate(dt, speed, mode = 'ground') {
    t += dt;
    const moving = speed > 0.2;
    walkPhase += dt * (moving ? 3 + speed * 1.6 : 0);
    const swing = moving ? Math.min(1, speed / 4) * 0.7 : 0;

    for (const l of legs) {
      const offset = (l.front ? 0 : Math.PI) + (l.side > 0 ? Math.PI / 2 : 0);
      let target = Math.sin(walkPhase + offset) * swing;
      if (mode === 'air') target = l.front ? -0.7 : 0.7;
      if (mode === 'swim') target = Math.sin(t * 6 + offset) * 0.8;
      if (mode === 'sit') target = l.front ? 0 : -1.2;
      l.pivot.rotation.x += (target - l.pivot.rotation.x) * Math.min(1, dt * 14);
    }

    let bob = moving ? Math.abs(Math.sin(walkPhase)) * 0.04 : Math.sin(t * 2) * 0.006;
    if (mode === 'swim') bob = Math.sin(t * 3) * 0.03;
    body.position.y = bob;
    if (mode === 'sit') {
      body.rotation.x += (-0.45 - body.rotation.x) * Math.min(1, dt * 6);
      body.position.y = -0.1;
    } else {
      body.rotation.x += (0 - body.rotation.x) * Math.min(1, dt * 8);
    }
    head.rotation.x = mode === 'sit' ? 0.45 : 0;

    // Tail swish
    const swish = moving ? 0.25 : 0.4;
    const tailSpeed = moving ? 5 : 1.6;
    for (let i = 0; i < tailSegs.length; i++) {
      tailSegs[i].rotation.z = Math.sin(t * tailSpeed - i * 0.6) * swish * (0.3 + i * 0.12);
      tailSegs[i].rotation.x = i === 0 ? 0 : (moving ? 0.05 : 0.18);
    }
  }

  return { root, animate, head, pelt };
}
