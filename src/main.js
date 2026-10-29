import * as THREE from 'three';
import { CYCLE_MINUTES, START_TIME_OF_DAY, WALK_SPEED, RUN_SPEED, SWIM_SPEED, JUMP_SPEED, WATER_Y } from './config.js';
import { buildTerrain, terrainHeight } from './world/terrain.js';
import { buildCamp } from './world/camp.js';
import { buildNature } from './world/nature.js';
import { createSky } from './world/sky.js';
import { createCat, PELTS } from './cat.js';
import { createNPCs } from './npcs.js';
import { makeGround, moveBody } from './physics.js';
import { createControls } from './controls.js';
import { createAudio } from './audio.js';
import { smoothstep } from './rng.js';

// ---------- Renderer, scene, camera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- World ----------
scene.add(buildTerrain());
const camp = buildCamp();
scene.add(camp.group);
const nature = buildNature();
scene.add(nature.group);
const sky = createSky(scene);
const npcs = createNPCs(scene);

const colliders = [...camp.colliders, ...nature.colliders];
const groundAt = makeGround(colliders);
const cameraBlockers = [...camp.cameraBlockers, ...nature.cameraBlockers];
const zones = [...camp.zones, ...nature.zones];

// ---------- Player ----------
// Everything about the player that other players will need to see later
// (for multiplayer) lives in this one object.
const player = {
  x: 9, y: 0, z: 3, vy: 0, facing: Math.atan2(-9, -3),
  grounded: true, swimming: false, underground: false,
  peltId: PELTS[0].id,
};
let playerCat = createCat(PELTS[0]);
scene.add(playerCat.root);

function setPelt(pelt) {
  scene.remove(playerCat.root);
  playerCat = createCat(pelt);
  scene.add(playerCat.root);
  player.peltId = pelt.id;
}

// ---------- Input, audio ----------
const controls = createControls(canvas);
const audio = createAudio();

// ---------- Start screen ----------
const peltsEl = document.getElementById('pelts');
let chosen = PELTS[0];
for (const p of PELTS) {
  const b = document.createElement('button');
  b.className = 'pelt' + (p === chosen ? ' selected' : '');
  b.innerHTML = `<div class="swatch" style="background: radial-gradient(circle at 35% 35%, ${p.accent} 0 28%, ${p.base} 30%)"></div>${p.name}`;
  b.addEventListener('click', () => {
    chosen = p;
    peltsEl.querySelectorAll('.pelt').forEach((el) => el.classList.remove('selected'));
    b.classList.add('selected');
    setPelt(p);
  });
  peltsEl.appendChild(b);
}

let playing = false;
document.getElementById('play').addEventListener('click', () => {
  document.getElementById('start').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  audio.start();
  playing = true;
  controls.state.enabled = true;
  controls.state.yaw = player.facing + Math.PI;
  showToast('OceanClan Camp', 'Welcome home! Explore the camp, the beach and the ocean.');
});

// ---------- HUD ----------
const clockEl = document.getElementById('clock');
const placeEl = document.getElementById('place');
const toastEl = document.getElementById('toast');
const bubbleEl = document.getElementById('bubble');
const helpEl = document.getElementById('help');
let toastTimer = 0;
function showToast(title, text) {
  toastEl.innerHTML = `<b>${title}</b>${text}`;
  toastEl.classList.add('show');
  toastTimer = 5;
}
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'h') helpEl.classList.toggle('hidden');
});

const soundBtn = document.getElementById('btn-sound');
soundBtn.addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  soundBtn.textContent = audio.muted ? '🔇' : '🔊';
});
const musicBtn = document.getElementById('btn-music');
musicBtn.addEventListener('click', () => {
  audio.setMusic(!audio.musicOn);
  musicBtn.classList.toggle('off', !audio.musicOn);
});
const guideEl = document.getElementById('guide');
document.getElementById('btn-guide').addEventListener('click', () => guideEl.classList.remove('hidden'));
document.getElementById('guide-close').addEventListener('click', () => guideEl.classList.add('hidden'));

function findZone() {
  let best = null;
  for (const z of zones) {
    if (z.minY !== undefined && player.y < z.minY) continue;
    if (z.maxY !== undefined && player.y > z.maxY) continue;
    let inside;
    if (z.box) inside = player.z >= z.box.minZ && player.z <= z.box.maxZ;
    else inside = Math.hypot(player.x - z.x, player.z - z.z) < z.r;
    if (!inside) continue;
    const p = z.priority ?? 0;
    if (!best || p > (best.priority ?? 0) || (p === (best.priority ?? 0) && (z.r || 0) < (best.r || 0))) best = z;
  }
  return best;
}
let currentZone = null;

// ---------- Game loop ----------
let timeOfDay = START_TIME_OF_DAY;
let elapsed = 0;
let bubbleTimer = 0;
const clock = new THREE.Timer();
const camTarget = new THREE.Vector3();
const camWanted = new THREE.Vector3();
const camDir = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const playerPos = new THREE.Vector3();
let undergroundFade = 0;
let moveSpeed = 0;

function tick() {
  clock.update();
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  controls.update();
  const cs = controls.state;

  // Time of day
  const speedUp = cs.fastTime && playing ? 40 : 1;
  timeOfDay = (timeOfDay + (dt * speedUp) / (CYCLE_MINUTES * 60)) % 1;

  // Player movement
  if (playing) {
    const fx = -Math.sin(cs.yaw);
    const fz = -Math.cos(cs.yaw);
    const rx = Math.cos(cs.yaw);
    const rz = -Math.sin(cs.yaw);
    let mx = fx * cs.moveZ + rx * cs.moveX;
    let mz = fz * cs.moveZ + rz * cs.moveX;
    const amount = Math.hypot(mx, mz);
    const speed = player.swimming ? SWIM_SPEED : cs.run ? RUN_SPEED : WALK_SPEED;
    if (amount > 0.01) {
      mx /= Math.max(1, amount);
      mz /= Math.max(1, amount);
      const want = Math.atan2(mx, mz);
      let diff = want - player.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      player.facing += diff * Math.min(1, dt * 12);
    }
    const beforeX = player.x;
    const beforeZ = player.z;
    if (controls.consume('jump') && player.grounded && !player.swimming) {
      player.vy = JUMP_SPEED;
      player.grounded = false;
    }
    moveBody(player, mx * speed * dt, mz * speed * dt, dt, groundAt);
    moveSpeed = Math.hypot(player.x - beforeX, player.z - beforeZ) / Math.max(dt, 1e-4);

    if (controls.consume('meow')) {
      audio.playerMeow();
      bubbleTimer = 1.2;
    }
  }

  playerCat.root.position.set(player.x, player.y, player.z);
  playerCat.root.rotation.y = player.facing;
  const mode = player.swimming ? 'swim' : !player.grounded ? 'air' : 'ground';
  playerCat.animate(dt, moveSpeed, mode);
  playerPos.set(player.x, player.y, player.z);

  // How far underground we are (0 = outside, 1 = deep in the cave)
  const ugTarget = smoothstep(-0.4, -2.4, player.y);
  undergroundFade += (ugTarget - undergroundFade) * Math.min(1, dt * 3);

  // Camera
  if (playing) {
    camTarget.set(player.x, player.y + 0.9, player.z);
    let dist = cs.distance;
    let pitch = cs.pitch;
    if (player.underground || player.y < -0.3) {
      dist = Math.min(dist, 2.8);
      pitch = Math.min(pitch, 0.3);
    }
    camDir.set(Math.sin(cs.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(cs.yaw) * Math.cos(pitch)).normalize();
    raycaster.set(camTarget, camDir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(cameraBlockers, false);
    if (hits.length) dist = Math.max(0.6, hits[0].distance - 0.3);
    camWanted.copy(camTarget).addScaledVector(camDir, dist);
    if (player.y > -0.3) {
      const floor = Math.max(terrainHeight(camWanted.x, camWanted.z), WATER_Y) + 0.35;
      if (camWanted.y < floor) camWanted.y = floor;
    }
    const k = hits.length ? 1 : 1 - Math.exp(-dt * 12);
    camera.position.lerp(camWanted, k);
    camera.lookAt(camTarget);
  } else {
    // Slowly circle the cat on the start screen.
    const a = elapsed * 0.15;
    camTarget.set(player.x, player.y + 0.7, player.z);
    camera.position.set(player.x + Math.sin(a) * 3.6, player.y + 1.6, player.z + Math.cos(a) * 3.6);
    camera.lookAt(camTarget);
  }

  // World updates
  sky.update(timeOfDay, camera, playerPos, undergroundFade);
  const env = { ...sky.env, player: playerPos };
  nature.update(dt, elapsed, env);
  npcs.update(dt, playerPos);
  audio.update(dt, { day: env.day, night: env.night, underground: undergroundFade });

  // HUD
  if (playing) {
    const icons = { Dawn: '🌄', Day: '☀️', Sunset: '🌅', Night: '🌙' };
    const hours = Math.floor(timeOfDay * 24);
    const mins = Math.floor((timeOfDay * 24 * 60) % 60);
    clockEl.textContent = `${icons[env.phase]} ${env.phase}${speedUp > 1 ? ' ⏩' : ''}  ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const zone = findZone();
    if (zone !== currentZone) {
      currentZone = zone;
      if (zone) showToast(zone.name, zone.text);
    }
    placeEl.textContent = zone ? `📍 ${zone.name}` : '';
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.remove('show');
    }
    if (bubbleTimer > 0) {
      bubbleTimer -= dt;
      const p = playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)).project(camera);
      bubbleEl.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
      bubbleEl.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
      bubbleEl.classList.add('show');
    } else {
      bubbleEl.classList.remove('show');
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Handy for testing in the browser console.
window.game = { player, camera, controls: controls.state, setTime: (t) => (timeOfDay = t), get time() { return timeOfDay; } };
