// Quick checks for walking: run with `npm test`.
import assert from 'node:assert/strict';
import { makeGround, moveBody } from './physics.js';
import { buildCamp } from './world/camp.js';

const groundAt = makeGround(buildCamp().colliders);
const dt = 1 / 60;

function walk(body, dirX, dirZ, seconds, speed = 4.2, jumpAt = -1) {
  for (let i = 0; i < seconds * 60; i++) {
    if (i === jumpAt && body.grounded) { body.vy = 6.8; body.grounded = false; }
    moveBody(body, dirX * speed * dt, dirZ * speed * dt, dt, groundAt);
  }
  return body;
}
const cat = (x, y, z) => ({ x, y, z, vy: 0, grounded: true });

// 1. Walk down the tunnel into the leader's cave.
let b = walk(cat(0, 0, 9), 0, -1, 4);
assert.ok(b.underground, `should be underground, got y=${b.y} z=${b.z}`);
assert.ok(Math.abs(b.y - -3) < 0.01, `should stand on the cave floor, got ${b.y}`);
console.log('✓ walked into the cave', b.z.toFixed(2));

// 2. Walk back out.
b = walk(b, 0, 1, 5);
assert.ok(!b.underground && b.y > -0.01, `should be back outside, got y=${b.y} z=${b.z}`);
console.log('✓ walked back out', b.z.toFixed(2));

// 3. The Highrock is a wall from the ground.
b = walk(cat(-8, 0, 0), 1, 0, 3);
assert.ok(b.x < -3, `should be stopped by the Highrock, got x=${b.x}`);
console.log('✓ Highrock blocks', b.x.toFixed(2));

// 4. Swim out to sea and come back.
b = walk(cat(20, 0, 3), 1, 0, 6, 2.6);
assert.ok(b.swimming, `should be swimming, got y=${b.y} x=${b.x}`);
assert.ok(Number.isFinite(b.y));
b = walk(b, -1, 0, 8, 2.6);
assert.ok(!b.swimming && b.y > -0.6, `should be back on the beach, got y=${b.y}`);
console.log('✓ swam and came back');

// 5. Jump up the stepping stones onto the Highrock.
const steps = [200, 225, 250, 275].map((a, i) => {
  const d = [6.0, 5.3, 4.6, 3.95][i];
  const r = (a * Math.PI) / 180;
  return [Math.cos(r) * d, Math.sin(r) * d];
});
b = cat(-8.5, 0, -3.1);
const targets = [...steps, [0, 0]];
for (const [tx, tz] of targets) {
  for (let i = 0; i < 300; i++) {
    const dx = tx - b.x, dz = tz - b.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.3) break;
    if (b.grounded && i % 20 === 0) { b.vy = 6.8; b.grounded = false; }
    moveBody(b, (dx / len) * 4.2 * dt, (dz / len) * 4.2 * dt, dt, groundAt);
  }
  // land
  for (let i = 0; i < 60; i++) moveBody(b, 0, 0, dt, groundAt);
  console.log('  on step at', b.x.toFixed(2), b.z.toFixed(2), 'y', b.y.toFixed(2));
}
assert.ok(Math.abs(b.y - 5.2) < 0.01, `should be on top of the Highrock, got ${b.y}`);
console.log('✓ climbed the Highrock');

// 6. Walk into a den through its doorway, but not through its wall.
const ang = (125 * Math.PI) / 180;
const den = [Math.cos(ang) * 13, Math.sin(ang) * 13];
b = cat(den[0] * 0.6, 0, den[1] * 0.6);
const dl = Math.hypot(den[0], den[1]);
b = walk(b, den[0] / dl, den[1] / dl, 1.2);
assert.ok(Math.hypot(b.x - den[0], b.z - den[1]) < 2.5, 'should get inside the den');
b = walk(b, den[0] / dl, den[1] / dl, 3);
assert.ok(Math.hypot(b.x - den[0], b.z - den[1]) < 3.2, 'den back wall should stop the cat');
console.log("✓ walked into the Warriors' den");

console.log('All walking checks passed! 🐾');
