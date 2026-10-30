import * as THREE from 'three';
import { fbm, smoothstep, lerp } from '../rng.js';
import { WATER_Y, WORLD_SEED } from '../config.js';
import { MOSS, SHORE_START_X, TUNNEL } from './layout.js';

const S = WORLD_SEED;

// Height of the ground (sand, grass, sea floor) at x,z.
export function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  const wild = smoothstep(20, 34, d); // 0 inside camp (flat sand), 1 outside

  let h = 0;
  // Rolling dunes and hills outside camp.
  h += (fbm(x * 0.03, z * 0.03, S, 4) - 0.45) * 5 * wild;
  // Land rises a little going inland (west).
  h += Math.max(0, -x - 30) * 0.06;
  // Beach slopes down into the sea (east).
  if (x > SHORE_START_X) {
    const b = x - SHORE_START_X;
    h -= b * 0.12 + Math.max(0, b - 14) * 0.08;
    h = Math.max(h, -7);
  }
  // Keep the beach near camp smooth.
  const beachCalm = smoothstep(SHORE_START_X - 6, SHORE_START_X + 4, x);
  h = lerp(h, Math.min(h, h * 0.6), beachCalm * wild);
  return h;
}

const C = {
  sand: new THREE.Color('#e8d3a2'),
  campSand: new THREE.Color('#dcc48f'),
  wetSand: new THREE.Color('#b59d6e'),
  seaFloor: new THREE.Color('#8f8360'),
  moss: new THREE.Color('#6f9a45'),
  mossDark: new THREE.Color('#557d34'),
  grass: new THREE.Color('#8fb05a'),
  grassDark: new THREE.Color('#6d9447'),
};

function groundColor(x, z, h, out) {
  const d = Math.hypot(x, z);
  const n = fbm(x * 0.15, z * 0.15, S + 99, 2);

  // Start with sand.
  out.copy(C.campSand).lerp(C.sand, smoothstep(10, 24, d));

  // Grass inland.
  const grassy = smoothstep(-22, -40, x + (n - 0.5) * 16);
  if (grassy > 0) out.lerp(n > 0.5 ? C.grass : C.grassDark, grassy);
  // Grassy patches on the dunes outside camp.
  const dunes = smoothstep(26, 38, d) * smoothstep(12, 2, x) * smoothstep(0.45, 0.6, n);
  if (dunes > 0) out.lerp(C.grass, dunes * 0.8);

  // Soft moss around the Highrock where cats sit for meetings.
  const mossy = smoothstep(MOSS.inner - 0.4, MOSS.inner + 0.6, d) * smoothstep(MOSS.outer + 0.8, MOSS.outer - 1.2 + n * 1.5, d);
  if (mossy > 0) out.lerp(n > 0.45 ? C.moss : C.mossDark, mossy);

  // Wet sand and sea floor.
  if (h < WATER_Y + 0.5) out.lerp(C.wetSand, smoothstep(WATER_Y + 0.5, WATER_Y - 0.1, h));
  if (h < WATER_Y - 0.6) out.lerp(C.seaFloor, smoothstep(WATER_Y - 0.6, WATER_Y - 3, h));
  return out;
}

// Builds the ground as one big low-poly mesh, leaving a hole for the tunnel.
export function buildTerrain({ minX = -140, maxX = 90, minZ = -140, maxZ = 140 } = {}) {
  const w = maxX - minX;
  const dpth = maxZ - minZ;
  const vx = w + 1;
  const vz = dpth + 1;

  const positions = new Float32Array(vx * vz * 3);
  const colors = new Float32Array(vx * vz * 3);
  const col = new THREE.Color();
  for (let j = 0; j < vz; j++) {
    for (let i = 0; i < vx; i++) {
      const x = minX + i;
      const z = minZ + j;
      const h = terrainHeight(x, z);
      const k = (j * vx + i) * 3;
      positions[k] = x;
      positions[k + 1] = h;
      positions[k + 2] = z;
      groundColor(x, z, h, col);
      // Tiny random shade per vertex for a hand-made look.
      const jitter = 0.96 + ((i * 7 + j * 13) % 9) * 0.01;
      colors[k] = col.r * jitter;
      colors[k + 1] = col.g * jitter;
      colors[k + 2] = col.b * jitter;
    }
  }

  const indices = [];
  for (let j = 0; j < vz - 1; j++) {
    for (let i = 0; i < vx - 1; i++) {
      const cx = minX + i + 0.5;
      const cz = minZ + j + 0.5;
      if (Math.abs(cx) < TUNNEL.halfWidth && cz > TUNNEL.holeStartZ && cz < TUNNEL.holeEndZ) continue;
      const a = j * vx + i;
      const b = a + 1;
      const c = a + vx;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
