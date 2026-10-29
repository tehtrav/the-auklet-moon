import * as THREE from 'three';

const rockMats = new Map();
export function rockMaterial(color = '#9a9083') {
  if (!rockMats.has(color)) {
    rockMats.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  }
  return rockMats.get(color);
}

// A lumpy low-poly rock. sx/sy/sz stretch it. flatTop cuts the top flat so
// cats can stand on it.
export function makeRock(rng, { sx = 1, sy = 1, sz = 1, detail = 1, color, flatTop = null, lumpy = 0.22 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  // Move matching vertices together so the rock stays closed.
  const seen = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 1 + (rng() - 0.5) * 2 * lumpy);
    const f = seen.get(key);
    let y = pos.getY(i) * f * sy;
    if (flatTop !== null && y > flatTop) y = flatTop + (y - flatTop) * 0.08;
    pos.setXYZ(i, pos.getX(i) * f * sx, y, pos.getZ(i) * f * sz);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, rockMaterial(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
