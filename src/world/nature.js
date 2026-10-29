import * as THREE from 'three';
import { mulberry32, fbm } from '../rng.js';
import { WATER_Y, WORLD_SEED } from '../config.js';
import { terrainHeight } from './terrain.js';
import { makeRock } from './rocks.js';

// Where the sand meets the water for a given z.
export function shoreX(z) {
  let x = 5;
  while (x < 80 && terrainHeight(x, z) > WATER_Y) x += 0.25;
  return x;
}

export function buildNature() {
  const rng = mulberry32(WORLD_SEED + 2);
  const group = new THREE.Group();
  group.name = 'nature';
  const colliders = [];
  const zones = [];
  const cameraBlockers = [];
  const updaters = [];

  // ---------- Ocean ----------
  const oceanUniforms = { uTime: { value: 0 } };
  const oceanGeo = new THREE.PlaneGeometry(500, 640, 125, 160);
  oceanGeo.rotateX(-Math.PI / 2);
  oceanGeo.translate(262, 0, 0); // starts at x=12, past camp, so it never shows under the sand
  const oceanMat = new THREE.MeshPhongMaterial({
    color: '#2f7fa6',
    specular: '#cfe9ff',
    shininess: 70,
    flatShading: true,
    transparent: true,
    opacity: 0.86,
  });
  oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wx = position.x; float wz = position.z;
        transformed.y += sin(wx * 0.22 + uTime * 1.1) * 0.16
                       + sin(wz * 0.31 + wx * 0.07 + uTime * 0.8) * 0.12
                       + sin((wx + wz) * 0.6 + uTime * 1.9) * 0.04;`
      );
  };
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.y = WATER_Y;
  ocean.receiveShadow = true;
  group.add(ocean);

  // ---------- Foam where waves wash onto the sand ----------
  const foamZ = [];
  for (let z = -140; z <= 140; z += 2) foamZ.push({ z, x: shoreX(z) });
  const foamPos = new Float32Array(foamZ.length * 2 * 3);
  const foamIdx = [];
  for (let i = 0; i < foamZ.length - 1; i++) {
    const a = i * 2;
    foamIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute('position', new THREE.BufferAttribute(foamPos, 3));
  foamGeo.setIndex(foamIdx);
  const foamMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.frustumCulled = false;
  group.add(foam);
  updaters.push((dt, t, env) => {
    const swash = Math.sin(t * 0.75);
    for (let i = 0; i < foamZ.length; i++) {
      const { z, x } = foamZ[i];
      const off = swash * 0.6 + Math.sin(t * 0.5 + z * 0.08) * 0.3 - 0.1;
      const x0 = x + off - 0.5;
      const x1 = x + off + 0.3;
      const k = i * 6;
      foamPos[k] = x0; foamPos[k + 1] = Math.max(terrainHeight(x0, z), WATER_Y) + 0.04; foamPos[k + 2] = z;
      foamPos[k + 3] = x1; foamPos[k + 4] = Math.max(terrainHeight(x1, z), WATER_Y) + 0.04; foamPos[k + 5] = z;
    }
    foamGeo.attributes.position.needsUpdate = true;
    foamMat.opacity = 0.2 + 0.3 * (1 - (swash + 1) / 2);
  });
  updaters.push((dt, t) => { oceanUniforms.uTime.value = t; });

  // ---------- Pine trees inland ----------
  const treeCount = 150;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0);
  const leafGeo1 = new THREE.ConeGeometry(1.6, 3.2, 7);
  leafGeo1.translate(0, 3.4, 0);
  const leafGeo2 = new THREE.ConeGeometry(1.15, 2.4, 7);
  leafGeo2.translate(0, 4.9, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#7a5636' }), treeCount);
  const leaves1 = new THREE.InstancedMesh(leafGeo1, new THREE.MeshLambertMaterial({ color: '#3d6b3a', flatShading: true }), treeCount);
  const leaves2 = new THREE.InstancedMesh(leafGeo2, new THREE.MeshLambertMaterial({ color: '#4a7d43', flatShading: true }), treeCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let placed = 0;
  let tries = 0;
  while (placed < treeCount && tries < 5000) {
    tries++;
    const x = -100 + rng() * 75;
    const z = -110 + rng() * 220;
    if (Math.hypot(x, z) < 34) continue;
    if (fbm(x * 0.05, z * 0.05, 77, 2) < 0.42) continue; // little forests, not everywhere
    const s = 0.8 + rng() * 0.7;
    const y = terrainHeight(x, z) - 0.1;
    q.setFromAxisAngle(up, rng() * 6);
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + rng() * 0.4), s));
    trunks.setMatrixAt(placed, m4);
    leaves1.setMatrixAt(placed, m4);
    leaves2.setMatrixAt(placed, m4);
    colliders.push({ type: 'cyl', x, z, r: 0.35 * s, top: 99 });
    placed++;
  }
  for (const im of [trunks, leaves1, leaves2]) {
    im.count = placed;
    im.castShadow = true;
    im.receiveShadow = true;
    group.add(im);
  }

  // ---------- Grass tufts ----------
  const tuftGeo = new THREE.ConeGeometry(0.12, 0.7, 3);
  tuftGeo.translate(0, 0.3, 0);
  const grassCount = 2600;
  const grass = new THREE.InstancedMesh(tuftGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), grassCount);
  const gc = new THREE.Color();
  let g = 0;
  tries = 0;
  while (g < grassCount && tries < 40000) {
    tries++;
    const x = -105 + rng() * 135;
    const z = -110 + rng() * 220;
    const d = Math.hypot(x, z);
    if (d < 24) continue;
    const h = terrainHeight(x, z);
    if (h < WATER_Y + 0.6) continue;
    const inland = x < -24;
    const dune = !inland && fbm(x * 0.15, z * 0.15, WORLD_SEED + 99, 2) > 0.5 && x < 14;
    if (!inland && !dune) continue;
    const s = 0.6 + rng() * 0.9;
    q.setFromAxisAngle(up, rng() * 6);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (rng() - 0.5) * 0.4);
    q.multiply(tilt);
    m4.compose(new THREE.Vector3(x, h, z), q, new THREE.Vector3(s, s, s));
    grass.setMatrixAt(g, m4);
    gc.set(inland ? (rng() > 0.5 ? '#6f9b45' : '#88ad55') : '#a7b26a');
    grass.setColorAt(g, gc);
    g++;
  }
  grass.count = g;
  grass.receiveShadow = true;
  group.add(grass);

  // ---------- Beach treasures: shells and colorful pebbles ----------
  const shellGeo = new THREE.SphereGeometry(0.13, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const shellColors = ['#fff4ea', '#f7c9c0', '#f3dfb5', '#e9e1ff'];
  const pebbleGeo = new THREE.IcosahedronGeometry(0.1, 0);
  const pebbleColors = ['#6a8caf', '#b56f6f', '#8fae7f', '#d7c48a', '#9d8bc2', '#555c66'];
  for (let i = 0; i < 160; i++) {
    const z = -100 + rng() * 200;
    const sx = shoreX(z);
    const x = sx - 0.5 - rng() * 9;
    if (Math.hypot(x, z) < 15) continue;
    const isShell = rng() > 0.45;
    const mesh = new THREE.Mesh(
      isShell ? shellGeo : pebbleGeo,
      new THREE.MeshLambertMaterial({
        color: isShell ? shellColors[i % shellColors.length] : pebbleColors[i % pebbleColors.length],
        flatShading: !isShell,
      })
    );
    mesh.position.set(x, terrainHeight(x, z) + 0.01, z);
    mesh.rotation.y = rng() * 6;
    const s = 0.8 + rng() * 0.8;
    mesh.scale.set(s, s * (isShell ? 0.7 : 0.8), s);
    group.add(mesh);
  }

  // ---------- Driftwood ----------
  const woodMat = new THREE.MeshLambertMaterial({ color: '#b9a58b', flatShading: true });
  for (let i = 0; i < 12; i++) {
    const z = -90 + rng() * 180;
    if (Math.abs(z) < 12) continue;
    const x = shoreX(z) - 2 - rng() * 6;
    const len = 1.5 + rng() * 2.5;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, len, 6), woodMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rng() * 3;
    log.position.set(x, terrainHeight(x, z) + 0.12, z);
    log.castShadow = true;
    group.add(log);
  }

  // ---------- Tide pools ----------
  const poolMat = new THREE.MeshPhongMaterial({ color: '#3f9fb3', transparent: true, opacity: 0.8, shininess: 90 });
  const pools = [{ z: -34 }, { z: -46 }, { z: 32 }, { z: 52 }];
  for (const p of pools) {
    const x = shoreX(p.z) - 4;
    const y = terrainHeight(x, p.z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6 + rng(), 14), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, y + 0.03, p.z);
    group.add(pool);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const r = makeRock(rng, { sx: 0.5, sy: 0.35, sz: 0.5, detail: 0, color: '#8d8a83' });
      r.position.set(x + Math.cos(a) * 2.1, y + 0.1, p.z + Math.sin(a) * 2.1);
      group.add(r);
    }
  }
  zones.push({ name: 'Tide Pools', text: 'Little pools left by the tide. Look for crabs!', x: shoreX(-40) - 4, z: -40, r: 9 });
  zones.push({ name: 'Tide Pools', text: 'Little pools left by the tide. Look for crabs!', x: shoreX(42) - 4, z: 42, r: 13 });

  // ---------- Sea caves along the north shore ----------
  for (const cz of [-62, -76]) {
    const cx = shoreX(cz) - 3;
    const base = terrainHeight(cx, cz);
    for (const side of [-1, 1]) {
      const pillar = makeRock(rng, { sx: 1.6, sy: 3.4, sz: 1.6, color: '#7f7a73' });
      const px = cx;
      const pz = cz + side * 2.6;
      pillar.position.set(px, base + 2.2, pz);
      group.add(pillar);
      cameraBlockers.push(pillar);
      colliders.push({ type: 'cyl', x: px, z: pz, r: 1.5, top: 99 });
    }
    const lintel = makeRock(rng, { sx: 2.2, sy: 1.2, sz: 4.0, color: '#86817a' });
    lintel.position.set(cx, base + 5.2, cz);
    group.add(lintel);
    cameraBlockers.push(lintel);
  }
  zones.push({ name: 'Sea Caves', text: 'Stone arches carved by the waves. OceanClan cats love to explore here.', x: shoreX(-69) - 3, z: -69, r: 12 });

  // ---------- The beach and the sea ----------
  zones.push({ name: 'The Beach', text: 'Warm sand, salty wind, and the sound of the waves.', x: 26, z: 0, r: 40, priority: -2, minY: WATER_Y - 0.1 });
  zones.push({ name: 'The Ocean', text: 'OceanClan cats are great swimmers. Paddle with your paws!', x: 80, z: 0, r: 200, priority: -3, maxY: WATER_Y - 0.15 });

  // ---------- Border markers ----------
  const markerMat = new THREE.MeshLambertMaterial({ color: '#c9c2b3', flatShading: true });
  for (const bz of [-89, 89]) {
    for (let x = -94; x < shoreX(bz) - 1; x += 4 + rng() * 3) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rng() * 0.2, 0), markerMat);
      m.position.set(x, terrainHeight(x, bz) + 0.15, bz + (rng() - 0.5));
      group.add(m);
    }
  }
  zones.push({ name: 'MoonClan Border', text: 'Past these stones is MoonClan territory. Coming soon!', x: -20, z: -92, r: 0, box: { minZ: -100, maxZ: -84 }, priority: 2 });
  zones.push({ name: 'SunClan Border', text: 'Past these stones is SunClan territory. Coming soon!', x: -20, z: 92, r: 0, box: { minZ: 84, maxZ: 100 }, priority: 2 });

  // ---------- Seabirds ----------
  const birdMat = new THREE.MeshLambertMaterial({ color: '#f4f4f0', side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.25, 0, 0, 0.25, 1.1, 0, 0], 3));
  wingGeo.computeVertexNormals();
  const birds = [];
  for (let i = 0; i < 12; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), birdMat);
    body.scale.set(1, 0.8, 2.2);
    const lw = new THREE.Mesh(wingGeo, birdMat);
    const rw = new THREE.Mesh(wingGeo, birdMat);
    rw.scale.x = -1;
    bird.add(body, lw, rw);
    group.add(bird);
    birds.push({
      bird, lw, rw,
      cx: 30 + rng() * 40, cz: (rng() - 0.5) * 80,
      r: 10 + rng() * 25, h: 10 + rng() * 12,
      speed: (0.15 + rng() * 0.15) * (rng() > 0.5 ? 1 : -1),
      phase: rng() * 6.28,
    });
  }
  updaters.push((dt, t, env) => {
    const show = env.night < 0.6;
    for (const b of birds) {
      b.bird.visible = show;
      if (!show) continue;
      const a = b.phase + t * b.speed;
      b.bird.position.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * 0.7 + b.phase) * 1.5, b.cz + Math.sin(a) * b.r);
      b.bird.rotation.y = -a + (b.speed > 0 ? Math.PI : 0);
      const flap = Math.sin(t * 7 + b.phase) * 0.5;
      b.lw.rotation.z = flap;
      b.rw.rotation.z = -flap;
    }
  });

  // ---------- Crabs that scuttle away ----------
  const crabMat = new THREE.MeshLambertMaterial({ color: '#d4573a', flatShading: true });
  const crabs = [];
  for (let i = 0; i < 10; i++) {
    const crab = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), crabMat);
    body.scale.set(1, 0.5, 1.3);
    crab.add(body);
    for (const s of [-1, 1]) {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), crabMat);
      claw.position.set(0.22, 0.05, s * 0.2);
      crab.add(claw);
      for (let k = 0; k < 3; k++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 3), crabMat);
        leg.rotation.x = s * 1.1;
        leg.position.set(-0.1 + k * 0.1, 0, s * 0.25);
        crab.add(leg);
      }
    }
    let z = (rng() - 0.5) * 160;
    if (Math.abs(z) < 6) z += 12;
    const homeX = shoreX(z) - 1.5 - rng() * 3;
    crab.position.set(homeX, terrainHeight(homeX, z) + 0.08, z);
    group.add(crab);
    crabs.push({ crab, homeX, homeZ: z, phase: rng() * 6, flee: 0 });
  }
  updaters.push((dt, t, env) => {
    for (const c of crabs) {
      const p = c.crab.position;
      const dx = p.x - env.player.x;
      const dz = p.z - env.player.z;
      const near = dx * dx + dz * dz < 9;
      c.flee = near ? 1 : Math.max(0, c.flee - dt * 0.2);
      let tx = c.homeX + c.flee * 4;
      let tz = c.homeZ + Math.sin(t * 0.4 + c.phase) * 2.5;
      const sp = near ? 4 : 1;
      p.x += Math.sign(tx - p.x) * Math.min(Math.abs(tx - p.x), sp * dt);
      p.z += Math.sign(tz - p.z) * Math.min(Math.abs(tz - p.z), sp * dt);
      p.y = Math.max(terrainHeight(p.x, p.z), WATER_Y - 0.4) + 0.08;
      c.crab.rotation.y = Math.sin(t * 12 + c.phase) * 0.08;
    }
  });

  // ---------- Fireflies at night ----------
  const ffCount = 160;
  const ffPos = new Float32Array(ffCount * 3);
  const ffBase = [];
  for (let i = 0; i < ffCount; i++) {
    let x, z;
    do {
      x = -90 + rng() * 75;
      z = -90 + rng() * 180;
    } while (Math.hypot(x, z) < 22);
    if (i < 30) {
      const a = rng() * 6.28;
      x = Math.cos(a) * (12 + rng() * 8);
      z = Math.sin(a) * (12 + rng() * 8);
    }
    ffBase.push([x, terrainHeight(x, z) + 0.6 + rng() * 1.8, z, rng() * 6]);
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({ color: '#fff2a0', size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fireflies = new THREE.Points(ffGeo, ffMat);
  fireflies.frustumCulled = false;
  group.add(fireflies);
  updaters.push((dt, t, env) => {
    ffMat.opacity = Math.max(0, env.night - 0.4) * 1.6 * (0.7 + 0.3 * Math.sin(t * 3));
    fireflies.visible = ffMat.opacity > 0.01;
    if (!fireflies.visible) return;
    for (let i = 0; i < ffCount; i++) {
      const b = ffBase[i];
      ffPos[i * 3] = b[0] + Math.sin(t * 0.5 + b[3]) * 0.8;
      ffPos[i * 3 + 1] = b[1] + Math.sin(t * 0.9 + b[3] * 2) * 0.3;
      ffPos[i * 3 + 2] = b[2] + Math.cos(t * 0.4 + b[3]) * 0.8;
    }
    ffGeo.attributes.position.needsUpdate = true;
  });

  // ---------- Clouds ----------
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, fog: false, transparent: true, opacity: 0.95 });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 4);
    for (let k = 0; k < puffs; k++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rng() * 3, 0), cloudMat);
      puff.position.set(k * 4 - puffs * 2, rng() * 2, (rng() - 0.5) * 4);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    cloud.position.set(-200 + rng() * 450, 60 + rng() * 30, -250 + rng() * 500);
    group.add(cloud);
    clouds.push(cloud);
  }
  updaters.push((dt, t, env) => {
    cloudMat.color.copy(env.cloudColor);
    for (const c of clouds) {
      c.position.z += dt * 1.2;
      if (c.position.z > 260) c.position.z = -260;
    }
  });

  function update(dt, t, env) {
    for (const u of updaters) u(dt, t, env);
  }

  return { group, colliders, zones, cameraBlockers, update };
}
