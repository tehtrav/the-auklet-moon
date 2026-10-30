import * as THREE from 'three';
import { createCat, PELTS } from './cat.js';
import { terrainHeight } from './world/terrain.js';
import { HIGHROCK } from './world/layout.js';

// Placeholder OceanClan cats so camp feels alive. Emmy will name and draw them!
const byId = (id) => PELTS.find((p) => p.id === id);

export function createNPCs(scene) {
  const npcs = [];
  const at = (deg, d) => {
    const a = (deg * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
  };

  function add({ label, pelt, size = 1, pos, mode = 'sit', face = 0, wander = 0, patrol = 0, y = null }) {
    const cat = createCat(pelt, { size });
    cat.root.position.copy(pos);
    cat.root.position.y = y ?? terrainHeight(pos.x, pos.z);
    cat.root.rotation.y = face;
    scene.add(cat.root);
    const tag = makeTag(label);
    tag.position.set(0, 1.25 + 0.3 / size, 0);
    const tagSize = 0.75 + 0.25 * size;
    tag.scale.set((1.6 * tagSize) / size, (0.4 * tagSize) / size, 1);
    cat.root.add(tag);
    npcs.push({ cat, tag, mode, home: pos.clone(), wander, patrol, target: pos.clone(), wait: Math.random() * 3, speed: 0, angle: Math.random() * 6, fixedY: y });
  }

  // The leader, on top of the Highrock.
  add({ label: 'Leader', pelt: byId('silver'), pos: new THREE.Vector3(HIGHROCK.x + 0.6, 0, HIGHROCK.z + 0.6), y: HIGHROCK.top, face: Math.PI * 0.25 });
  // A queen and her kits by the nursery.
  const nursery = at(62, 12.5);
  const toCenter = (p) => Math.atan2(-p.x, -p.z);
  add({ label: 'Queen', pelt: byId('sandy'), pos: nursery.clone().multiplyScalar(0.72), face: toCenter(nursery) });
  add({ label: 'Kit', pelt: byId('ginger'), size: 0.5, pos: nursery.clone().multiplyScalar(0.62), mode: 'wander', wander: 2.6 });
  add({ label: 'Kit', pelt: byId('snowy'), size: 0.48, pos: nursery.clone().multiplyScalar(0.66), mode: 'wander', wander: 2.6 });
  // An elder sunning outside the elders' den.
  const elders = at(232, 13);
  add({ label: 'Elder', pelt: byId('smoke'), pos: elders.clone().multiplyScalar(0.75), face: toCenter(elders) });
  // A warrior on patrol around camp.
  add({ label: 'Warrior', pelt: byId('brown'), pos: at(0, 15), mode: 'patrol', patrol: 15.5 });
  // An apprentice practicing by their den.
  const app = at(178, 13.5);
  add({ label: 'Apprentice', pelt: byId('midnight'), size: 0.75, pos: app.clone().multiplyScalar(0.7), mode: 'wander', wander: 3 });

  function update(dt, playerPos) {
    for (const n of npcs) {
      const root = n.cat.root;
      let mode = n.mode === 'sit' ? 'sit' : 'ground';
      n.speed = 0;
      if (n.mode === 'wander') {
        n.wait -= dt;
        const to = n.target.clone().sub(root.position).setY(0);
        if (to.length() < 0.2) {
          if (n.wait <= 0) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * n.wander;
            n.target.set(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r);
            n.wait = 1 + Math.random() * 3;
          } else {
            mode = 'sit';
          }
        } else {
          const sp = 1.6;
          to.normalize();
          root.position.addScaledVector(to, sp * dt);
          turnTo(root, Math.atan2(to.x, to.z), dt);
          n.speed = sp;
        }
      } else if (n.mode === 'patrol') {
        n.angle += dt * 0.12;
        const tx = Math.cos(n.angle) * n.patrol;
        const tz = Math.sin(n.angle) * n.patrol;
        const dx = tx - root.position.x;
        const dz = tz - root.position.z;
        root.position.x = tx;
        root.position.z = tz;
        turnTo(root, Math.atan2(dx, dz), dt);
        n.speed = n.patrol * 0.12;
      }
      if (n.fixedY === null) root.position.y = terrainHeight(root.position.x, root.position.z);
      n.cat.animate(dt, n.speed, mode);
      const dist = root.position.distanceTo(playerPos);
      n.tag.visible = dist > 2.2 && dist < 9;
    }
  }
  return { update };
}

function turnTo(obj, target, dt) {
  let diff = target - obj.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  obj.rotation.y += diff * Math.min(1, dt * 6);
}

export function makeTag(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px "Trebuchet MS", sans-serif';
  const w = g.measureText(text).width + 30;
  g.fillStyle = 'rgba(20,30,50,0.65)';
  roundRect(g, (256 - w) / 2, 10, w, 44, 20);
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(1.6, 0.4, 1);
  return s;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
