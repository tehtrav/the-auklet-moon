// Game settings that are easy to tweak.

// How long one full day + night lasts, in real minutes.
// (Sunrise -> day -> sunset -> night -> sunrise again.)
export const CYCLE_MINUTES = 20;

// Where the day starts when you load the game (0 = midnight, 0.25 = sunrise,
// 0.5 = noon, 0.75 = sunset).
export const START_TIME_OF_DAY = 0.3;

// Height of the ocean surface.
export const WATER_Y = -0.5;

// Cat movement.
export const WALK_SPEED = 4.2;
export const RUN_SPEED = 8.5;
export const SWIM_SPEED = 2.6;
export const JUMP_SPEED = 6.8;
export const GRAVITY = 18;
export const CAT_RADIUS = 0.4;
export const STEP_UP = 0.35;

// The edges of OceanClan territory you can walk to (for now).
export const BOUNDS = { minX: -95, maxX: 62, minZ: -95, maxZ: 95 };

// Same seed = same world for every player (handy for multiplayer later).
export const WORLD_SEED = 20261029;
