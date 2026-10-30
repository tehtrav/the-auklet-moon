// Where everything in OceanClan camp is. The Highrock is the middle of camp.
// x points toward the ocean (east), z points south.

export const HIGHROCK = { x: 0, z: 0, radius: 3.5, top: 5.2 };

// The tunnel starts as a hole in the sand in front of the Highrock and slopes
// down under it into the leader's cave.
export const TUNNEL = {
  halfWidth: 2, // width of the hole in the sand (matches the 1-unit ground grid)
  walkHalfWidth: 1.55, // how far a cat can walk from the middle of the tunnel
  holeStartZ: 4, // hole in the sand runs from z=4 ...
  holeEndZ: 7, // ... to z=7
  topZ: 7, // the ramp starts here at sand level
  bottomZ: 1.5, // and reaches the cave floor here
  caveEntryZ: 1.9,
};

export const CAVE = { x: 0, z: -3, radius: 5.5, floorY: -3, ceilingY: -0.6 };

export const MOSS = { inner: 3.8, outer: 9.5 };

export const CAMP_RADIUS = 19;
export const SHORE_START_X = 18; // sand starts sloping into the sea here

// Floor height inside the tunnel at a given z.
export function rampFloor(z) {
  const t = Math.min(1, Math.max(0, (TUNNEL.topZ - z) / (TUNNEL.topZ - TUNNEL.bottomZ)));
  return CAVE.floorY * t;
}

export function inTunnelHole(x, z) {
  return Math.abs(x) < TUNNEL.halfWidth && z > TUNNEL.holeStartZ && z < TUNNEL.holeEndZ;
}
