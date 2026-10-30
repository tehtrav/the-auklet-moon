import { terrainHeight } from './world/terrain.js';
import { TUNNEL, CAVE, rampFloor, inTunnelHole } from './world/layout.js';
import { WATER_Y, CAT_RADIUS, STEP_UP, GRAVITY, BOUNDS } from './config.js';

const SWIM_Y = WATER_Y - 0.42; // how low a swimming cat floats
const UNDERGROUND_Y = -0.6;

// The area around the tunnel and the leader's cave.
function nearCave(x, z) {
  if (Math.hypot(x - CAVE.x, z - CAVE.z) < CAVE.radius + 1) return true;
  return Math.abs(x) < TUNNEL.halfWidth + 0.5 && z > TUNNEL.bottomZ - 1 && z < TUNNEL.holeEndZ + 0.5;
}

// Builds a function that says how high the floor is at x,z for a cat at
// height y. Returns Infinity if there is a wall there.
export function makeGround(colliders) {
  function groundAt(x, z, y) {
    if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return Infinity;

    if (inTunnelHole(x, z) && Math.abs(x) < TUNNEL.walkHalfWidth) return rampFloor(z);
    if (inTunnelHole(x, z) && y < -0.15) return Infinity; // hole's side walls

    if (y < UNDERGROUND_Y && nearCave(x, z)) {
      // Under the ground: only the tunnel and cave have floor.
      if (Math.abs(x) < TUNNEL.walkHalfWidth && z >= TUNNEL.bottomZ - 0.5 && z <= TUNNEL.holeStartZ + 0.01) return rampFloor(z);
      if (Math.hypot(x - CAVE.x, z - CAVE.z) < CAVE.radius - CAT_RADIUS) return CAVE.floorY;
      return Infinity;
    }

    let g = terrainHeight(x, z);
    if (g < SWIM_Y) g = SWIM_Y; // float on the water
    for (const c of colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d2 = dx * dx + dz * dz;
      if (c.type === 'cyl') {
        const rr = c.r + CAT_RADIUS;
        if (d2 < rr * rr) {
          if (y >= c.top - STEP_UP) g = Math.max(g, c.top);
          else return Infinity;
        }
      } else if (c.type === 'den') {
        const d = Math.sqrt(d2);
        if (d > c.rIn && d < c.rOut && y < c.top) {
          const a = Math.atan2(dz, dx);
          let diff = a - c.doorA;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          if (Math.abs(diff) > c.gap) return Infinity;
        }
      }
    }
    return g;
  }
  return groundAt;
}

// Moves a cat body {x,y,z,vy,grounded} by dx,dz, sliding along walls.
export function moveBody(body, dx, dz, dt, groundAt) {
  const tryMove = (nx, nz) => {
    const g = groundAt(nx, nz, body.y);
    if (g > body.y + STEP_UP) return false;
    body.x = nx;
    body.z = nz;
    return true;
  };
  if (!tryMove(body.x + dx, body.z + dz)) {
    // Slide along the wall.
    if (!tryMove(body.x + dx, body.z)) tryMove(body.x, body.z + dz);
  }

  let g = groundAt(body.x, body.z, body.y);
  if (!Number.isFinite(g)) g = body.y - 1; // stuck in a wall somehow: just let the cat fall out
  body.vy -= GRAVITY * dt;
  body.y += body.vy * dt;
  if (body.grounded && body.vy <= 0 && body.y > g - 0.01 && body.y - g < STEP_UP + 0.1) {
    // Stick to slopes and ramps when walking down.
    body.y = g;
  }
  if (body.y <= g) {
    body.y = g;
    body.vy = 0;
    body.grounded = true;
  } else {
    body.grounded = body.y - g < 0.02;
  }
  body.swimming = g <= SWIM_Y + 0.001 && body.y <= SWIM_Y + 0.05 && terrainHeight(body.x, body.z) < SWIM_Y;
  body.underground = body.y < UNDERGROUND_Y && nearCave(body.x, body.z);
}

export { SWIM_Y };
