import * as THREE from 'three';
import { mulberry32 } from '../rng.js';
import { WORLD_SEED } from '../config.js';
import { HIGHROCK, TUNNEL, CAVE, MOSS, CAMP_RADIUS, rampFloor } from './layout.js';
import { makeRock, rockMaterial } from './rocks.js';

const DEN_ROCK = '#a99f8c';

// Builds OceanClan camp: Highrock, dens, moss, tunnel and the leader's cave.
export function buildCamp() {
  const rng = mulberry32(WORLD_SEED + 1);
  const group = new THREE.Group();
  group.name = 'camp';
  const colliders = [];
  const zones = [];
  const cameraBlockers = [];

  // ---------- Highrock ----------
  const hrGeo = new THREE.CylinderGeometry(2.6, 3.1, 5.6, 10, 4);
  jitter(hrGeo, rng, 0.28, (v) => v.y > 2.75 || v.y < -2.75);
  const highrock = new THREE.Mesh(hrGeo, rockMaterial('#8d867c'));
  highrock.position.set(HIGHROCK.x, 2.4, HIGHROCK.z);
  highrock.castShadow = highrock.receiveShadow = true;
  group.add(highrock);
  cameraBlockers.push(highrock);
  colliders.push({ type: 'cyl', x: HIGHROCK.x, z: HIGHROCK.z, r: 2.7, top: HIGHROCK.top });

  // Stepping stones so cats can jump up to the top.
  const steps = [
    { a: 200, d: 6.0, r: 1.2, top: 1.0 },
    { a: 225, d: 5.3, r: 1.05, top: 2.05 },
    { a: 250, d: 4.6, r: 0.95, top: 3.1 },
    { a: 275, d: 3.95, r: 0.85, top: 4.15 },
  ];
  for (const s of steps) {
    const ang = (s.a * Math.PI) / 180;
    const x = HIGHROCK.x + Math.cos(ang) * s.d;
    const z = HIGHROCK.z + Math.sin(ang) * s.d;
    const geo = new THREE.CylinderGeometry(s.r * 0.9, s.r * 1.1, s.top + 0.6, 8, 2);
    jitter(geo, rng, 0.12, (v) => v.y > (s.top + 0.6) / 2 - 0.01);
    const m = new THREE.Mesh(geo, rockMaterial('#978f84'));
    m.position.set(x, (s.top - 0.6) / 2, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    cameraBlockers.push(m);
    colliders.push({ type: 'cyl', x, z, r: s.r, top: s.top });
  }

  zones.push({
    name: 'The Highrock',
    text: 'The leader stands up here to call Clan meetings. Jump up the stepping stones!',
    x: HIGHROCK.x, z: HIGHROCK.z, r: 3.6, minY: 3,
  });
  zones.push({
    name: 'Meeting Moss',
    text: 'Soft moss where cats sit to listen at Clan meetings.',
    x: HIGHROCK.x, z: HIGHROCK.z, r: MOSS.outer, minY: -0.5,
  });

  // Little moss clumps on the meeting ring.
  const mossMat = new THREE.MeshLambertMaterial({ color: '#5f8f3c', flatShading: true });
  const mossGeo = new THREE.IcosahedronGeometry(0.5, 0);
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2;
    const d = MOSS.inner + 0.8 + rng() * (MOSS.outer - MOSS.inner - 1.2);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.abs(x) < TUNNEL.halfWidth + 0.6 && z > 3) continue; // keep the tunnel clear
    const m = new THREE.Mesh(mossGeo, mossMat);
    const s = 0.4 + rng() * 0.6;
    m.scale.set(s * 1.4, s * 0.35, s * 1.2);
    m.position.set(x, 0.02, z);
    m.rotation.y = rng() * 6;
    m.receiveShadow = true;
    group.add(m);
  }

  // ---------- Tunnel to the leader's cave ----------
  buildTunnel(group, cameraBlockers, rng);
  zones.push({
    name: "Tunnel to the Leader's Cave",
    text: 'A secret tunnel under the Highrock. Walk down if you dare!',
    x: 0, z: 5.6, r: 2.6, minY: -1.5,
  });
  zones.push({
    name: "Leader's Cave",
    text: 'The only den under the ground. Glowing crystals light it up!',
    x: CAVE.x, z: CAVE.z, r: CAVE.radius + 2, maxY: -1.5,
  });

  // ---------- Dens ----------
  const dens = [
    { name: "Warriors' Den", text: 'Where warriors sleep after a long day of hunting and patrols.', a: 125, d: 13, r: 3.4 },
    { name: 'Nursery', text: 'Where queens look after the kits. Shh, the kits might be napping!', a: 62, d: 12.5, r: 2.9, feathers: true },
    { name: "Apprentices' Den", text: 'Where apprentices sleep and whisper about their training.', a: 178, d: 13.5, r: 2.6 },
    { name: "Elders' Den", text: 'The elders rest here and tell stories of the old days.', a: 232, d: 13, r: 2.7 },
  ];
  for (const den of dens) buildDen(group, den, colliders, cameraBlockers, zones, rng);

  // ---------- Fresh-kill pile ----------
  const pileAng = (300 * Math.PI) / 180;
  const pile = buildFreshKill(rng);
  pile.position.set(Math.cos(pileAng) * 10.5, 0, Math.sin(pileAng) * 10.5);
  group.add(pile);
  zones.push({
    name: 'Fresh-kill Pile',
    text: 'Fish, crabs and seabirds caught by OceanClan hunters. Elders and kits eat first!',
    x: pile.position.x, z: pile.position.z, r: 2.2,
  });

  // ---------- Boulders around camp ----------
  // Open toward the sea (east) and a gap for the west entrance.
  for (let a = 0; a < Math.PI * 2; a += 0.28 + rng() * 0.08) {
    const fromEast = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (fromEast < 0.8) continue;
    if (Math.abs(fromEast - Math.PI) < 0.22) continue;
    const d = CAMP_RADIUS + rng() * 2.5;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const size = 1.4 + rng() * 1.4;
    const h = size * (0.8 + rng() * 0.5);
    const rock = makeRock(rng, { sx: size, sy: h, sz: size * (0.8 + rng() * 0.4), color: rng() > 0.5 ? '#9b9182' : '#8a8378' });
    rock.position.set(x, h * 0.35, z);
    rock.rotation.y = rng() * 6;
    group.add(rock);
    cameraBlockers.push(rock);
    colliders.push({ type: 'cyl', x, z, r: size * 0.85, top: h * 1.2 });
  }
  zones.push({
    name: 'OceanClan Camp',
    text: 'Home! The Highrock is in the middle and the ocean is right next door.',
    x: 0, z: 0, r: CAMP_RADIUS + 2, minY: -0.5, priority: -1,
  });

  return { group, colliders, zones, cameraBlockers };
}

// Push vertices in and out a bit so shapes look like rough rock.
function jitter(geo, rng, amount, keepY) {
  const pos = geo.attributes.position;
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
    if (!seen.has(key)) seen.set(key, [(rng() - 0.5) * amount, (rng() - 0.5) * amount * 0.6, (rng() - 0.5) * amount]);
    const j = seen.get(key);
    pos.setXYZ(i, v.x + j[0], keepY && keepY(v) ? v.y : v.y + j[1], v.z + j[2]);
  }
  geo.computeVertexNormals();
}

function buildTunnel(group, blockers, rng) {
  const hw = TUNNEL.halfWidth;
  const z0 = TUNNEL.caveEntryZ;
  const z1 = TUNNEL.holeEndZ;
  const steps = 24;
  const floorMat = new THREE.MeshLambertMaterial({ color: '#7a6a52', side: THREE.DoubleSide });
  const wallMat = new THREE.MeshLambertMaterial({ color: '#6e655a', side: THREE.DoubleSide, flatShading: true });

  const roofY = (z) => (z >= TUNNEL.holeStartZ ? 0.06 : Math.min(-0.05, rampFloor(z) + 2.45));

  // Floor ramp.
  const fp = [];
  const fi = [];
  for (let i = 0; i <= steps; i++) {
    const z = z0 + ((z1 - z0) * i) / steps;
    const y = rampFloor(z);
    fp.push(-hw, y, z, hw, y, z);
    if (i < steps) {
      const a = i * 2;
      fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const floor = new THREE.Mesh(indexed(fp, fi), floorMat);
  floor.receiveShadow = true;
  group.add(floor);

  // Two side walls.
  for (const side of [-1, 1]) {
    const wp = [];
    const wi = [];
    for (let i = 0; i <= steps; i++) {
      const z = z0 + ((z1 - z0) * i) / steps;
      const wob = i > 0 && i < steps ? (rng() - 0.5) * 0.15 : 0;
      wp.push(side * (hw + wob), rampFloor(z) - 0.2, z, side * (hw + wob), roofY(z), z);
      if (i < steps) {
        const a = i * 2;
        wi.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const wall = new THREE.Mesh(indexed(wp, wi), wallMat);
    wall.receiveShadow = true;
    group.add(wall);
    blockers.push(wall);
  }

  // Roof, under the sand.
  const rp = [];
  const ri = [];
  const rSteps = 10;
  for (let i = 0; i <= rSteps; i++) {
    const z = z0 + ((TUNNEL.holeStartZ - z0) * i) / rSteps;
    const y = roofY(Math.min(z, TUNNEL.holeStartZ - 0.001));
    rp.push(-hw - 0.1, y, z, hw + 0.1, y, z);
    if (i < rSteps) {
      const a = i * 2;
      ri.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const roof = new THREE.Mesh(indexed(rp, ri), wallMat);
  group.add(roof);
  blockers.push(roof);

  // Rocks framing the entrance.
  for (const side of [-1, 1]) {
    const r = makeRock(rng, { sx: 0.9, sy: 0.7, sz: 1.3, color: '#8d867c' });
    r.position.set(side * (hw + 0.7), 0.2, 5.8);
    group.add(r);
  }

  buildCave(group, blockers, rng);
}

function buildCave(group, blockers, rng) {
  const { x, z, radius, floorY, ceilingY } = CAVE;
  const h = ceilingY - floorY;
  const caveRock = new THREE.MeshLambertMaterial({ color: '#5d5650', side: THREE.DoubleSide, flatShading: true });

  // Floor.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius + 0.3, 28), new THREE.MeshLambertMaterial({ color: '#6b5d4a' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, floorY + 0.001, z);
  floor.receiveShadow = true;
  group.add(floor);

  // Round wall with a gap where the tunnel comes in (+z side).
  const gapHalf = Math.asin((TUNNEL.halfWidth + 0.05) / radius);
  const wallGeo = new THREE.CylinderGeometry(radius, radius, h, 30, 3, true, gapHalf, Math.PI * 2 - gapHalf * 2);
  const wp = wallGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const vx = wp.getX(i);
    const vz = wp.getZ(i);
    const ang = Math.atan2(vx, vz);
    const nearGap = Math.abs(ang) < gapHalf + 0.12;
    const vy = wp.getY(i);
    const edge = Math.abs(vy) > h / 2 - 0.01;
    const f = nearGap ? 1 : 1 + (rng() - 0.5) * (edge ? 0.05 : 0.14);
    wp.setXYZ(i, vx * f, vy, vz * f);
  }
  wallGeo.computeVertexNormals();
  const wall = new THREE.Mesh(wallGeo, caveRock);
  wall.position.set(x, floorY + h / 2, z);
  group.add(wall);
  blockers.push(wall);

  // Ceiling with little stalactites.
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(radius + 0.3, 28), caveRock);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(x, ceilingY, z);
  group.add(ceil);
  blockers.push(ceil);
  const stalGeo = new THREE.ConeGeometry(0.18, 0.7, 5);
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const d = 1.5 + rng() * (radius - 2);
    const s = new THREE.Mesh(stalGeo, caveRock);
    s.rotation.x = Math.PI;
    const k = 0.6 + rng() * 0.9;
    s.scale.set(k, k, k);
    s.position.set(x + Math.cos(a) * d, ceilingY - 0.35 * k, z + Math.sin(a) * d);
    group.add(s);
  }

  // The leader's mossy nest.
  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.35, 8, 16), new THREE.MeshLambertMaterial({ color: '#5e8a3a', flatShading: true }));
  nest.rotation.x = -Math.PI / 2;
  nest.scale.set(1, 1, 0.6);
  nest.position.set(x, floorY + 0.15, z - 2.6);
  group.add(nest);
  const nestMiddle = new THREE.Mesh(new THREE.CircleGeometry(0.95, 16), new THREE.MeshLambertMaterial({ color: '#7aa452' }));
  nestMiddle.rotation.x = -Math.PI / 2;
  nestMiddle.position.set(x, floorY + 0.08, z - 2.6);
  group.add(nestMiddle);

  // Glowing crystals (for the rock collectors!).
  const crystalColors = ['#b9a2ff', '#8fd8ff', '#ffb3e6', '#a6ffd9'];
  const crystalGeo = new THREE.OctahedronGeometry(0.3, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.4;
    if (Math.abs(Math.atan2(Math.cos(a), Math.sin(a))) < 0.1) continue;
    const ca = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(ca - Math.PI / 2) < 0.5) continue; // not in front of the tunnel
    const c = crystalColors[i % crystalColors.length];
    const cluster = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(crystalGeo, new THREE.MeshBasicMaterial({ color: c }));
      m.scale.set(0.6, 1.4 + rng() * 1.2, 0.6);
      m.position.set((rng() - 0.5) * 0.4, 0.3, (rng() - 0.5) * 0.4);
      m.rotation.set((rng() - 0.5) * 0.6, rng() * 3, (rng() - 0.5) * 0.6);
      cluster.add(m);
    }
    const d = radius - 0.5;
    cluster.position.set(x + Math.cos(a) * d, floorY, z + Math.sin(a) * d);
    group.add(cluster);
  }
  const glow1 = new THREE.PointLight('#c3b0ff', 10, 11, 1.4);
  glow1.position.set(x - 2, floorY + 1.4, z - 1);
  const glow2 = new THREE.PointLight('#9fe3ff', 8, 10, 1.4);
  glow2.position.set(x + 2.5, floorY + 1.2, z - 2);
  group.add(glow1, glow2);
}

function buildDen(group, den, colliders, blockers, zones, rng) {
  const ang = (den.a * Math.PI) / 180;
  const x = Math.cos(ang) * den.d;
  const z = Math.sin(ang) * den.d;
  // The doorway faces the Highrock.
  const doorA = Math.atan2(-z, -x);
  const gap = 0.6;
  const phiDoor = Math.PI - doorA; // SphereGeometry measures angles the other way
  const geo = new THREE.SphereGeometry(den.r, 22, 9, phiDoor + gap, Math.PI * 2 - gap * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);
    if (vy < 0.01) continue; // keep the bottom edge on the ground
    const f = 1 + (rng() - 0.5) * 0.12;
    pos.setXYZ(i, pos.getX(i) * f, vy * f, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const dome = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: DEN_ROCK, flatShading: true, side: THREE.DoubleSide }));
  dome.scale.y = 0.78;
  dome.position.set(x, -0.05, z);
  dome.castShadow = dome.receiveShadow = true;
  group.add(dome);
  blockers.push(dome);

  // Nests inside.
  const nestMat = new THREE.MeshLambertMaterial({ color: den.feathers ? '#d9cfc0' : '#62903f', flatShading: true });
  const count = Math.round(den.r * 1.2);
  for (let i = 0; i < count; i++) {
    const a = doorA + Math.PI + (i - (count - 1) / 2) * 0.9;
    const d = den.r * 0.5;
    const n = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 6, 12), nestMat);
    n.rotation.x = -Math.PI / 2;
    n.position.set(x + Math.cos(a) * d, 0.08, z + Math.sin(a) * d);
    group.add(n);
  }

  colliders.push({ type: 'den', x, z, rIn: den.r - 0.45, rOut: den.r + 0.45, doorA, gap: gap * 0.9, top: den.r * 0.78 + 0.2 });
  zones.push({ name: den.name, text: den.text, x, z, r: den.r + 1.2, priority: 1 });
}

function buildFreshKill(rng) {
  const g = new THREE.Group();
  const fishMat = new THREE.MeshLambertMaterial({ color: '#9bb3c4', flatShading: true });
  const crabMat = new THREE.MeshLambertMaterial({ color: '#d0583a', flatShading: true });
  const featherMat = new THREE.MeshLambertMaterial({ color: '#f2f0ea', flatShading: true });
  for (let i = 0; i < 7; i++) {
    const fish = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), fishMat);
    body.scale.set(2.2, 0.7, 0.6);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 4), fishMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.6;
    fish.add(body, tail);
    fish.position.set((rng() - 0.5) * 1.2, 0.15 + i * 0.05, (rng() - 0.5) * 1.2);
    fish.rotation.y = rng() * 6;
    g.add(fish);
  }
  for (let i = 0; i < 2; i++) {
    const crab = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), crabMat);
    crab.scale.set(1.3, 0.5, 1);
    crab.position.set((rng() - 0.5) * 1.3, 0.12, (rng() - 0.5) * 1.3);
    g.add(crab);
  }
  const feather = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), featherMat);
  feather.scale.set(1.4, 0.6, 1);
  feather.position.set(0.3, 0.4, 0);
  g.add(feather);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function indexed(positions, indices) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
