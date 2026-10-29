import * as THREE from 'three';
import { smoothstep, mulberry32 } from '../rng.js';

const COL = {
  nightTop: new THREE.Color('#0a1230'),
  nightHorizon: new THREE.Color('#1d2c55'),
  dayTop: new THREE.Color('#4b9fe0'),
  dayHorizon: new THREE.Color('#c4e6f7'),
  sunsetTop: new THREE.Color('#4a3f86'),
  sunsetHorizon: new THREE.Color('#f59a5c'),
  sunDay: new THREE.Color('#fff6e0'),
  sunLow: new THREE.Color('#ffae6b'),
  moon: new THREE.Color('#b9c8ff'),
  hemiDay: new THREE.Color('#d8eefc'),
  hemiNight: new THREE.Color('#7284c4'),
  groundDay: new THREE.Color('#c9b48a'),
  groundNight: new THREE.Color('#4a4f72'),
  caveFog: new THREE.Color('#1a1626'),
};

// Sky, sun, moon, stars and lights that change through the day.
export function createSky(scene) {
  const uniforms = {
    topColor: { value: new THREE.Color() },
    horizonColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3() },
    sunColor: { value: new THREE.Color() },
    twilight: { value: 0 },
    sunUp: { value: 1 },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor;
      uniform float twilight; uniform float sunUp;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55));
        if (h < 0.0) col = mix(horizonColor, horizonColor * 0.8, clamp(-h * 4.0, 0.0, 1.0));
        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 900.0) * 2.0 * sunUp + pow(s, 6.0) * 0.45 * twilight + pow(s, 60.0) * 0.25 * sunUp);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // Stars.
  const rng = mulberry32(42);
  const starPos = [];
  for (let i = 0; i < 1800; i++) {
    const u = rng() * 2 - 1;
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const y = Math.abs(u) * 0.95 + 0.05;
    starPos.push(Math.cos(a) * r * 450, y * 450, Math.sin(a) * r * 450);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  // The moon, with a soft glow around it.
  const moonTex = new THREE.CanvasTexture(drawMoon());
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(16, 40),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false })
  );
  scene.add(moon);
  const glowTex = new THREE.CanvasTexture(drawGlow());
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#c9d4ff', transparent: true, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
  moonGlow.scale.set(110, 110, 1);
  scene.add(moonGlow);

  // Lights.
  const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  scene.fog = new THREE.Fog('#c4e6f7', 70, 300);

  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const tmp = new THREE.Color();
  const env = {
    night: 0,
    day: 1,
    twilight: 0,
    phase: 'Day',
    cloudColor: new THREE.Color('#ffffff'),
    sunDir,
    underground: 0,
  };

  function update(timeOfDay, camera, playerPos, underground) {
    const ang = timeOfDay * Math.PI * 2;
    // Sun rises over the ocean (east, +x) and sets inland (west).
    sunDir.set(Math.sin(ang), -Math.cos(ang), 0.35).normalize();
    moonDir.set(-Math.sin(ang + 0.25), Math.cos(ang + 0.25) * 0.9 + 0.15, -0.3).normalize();
    const e = sunDir.y;

    const day = smoothstep(-0.05, 0.3, e);
    const tw = Math.exp(-Math.pow(e / 0.2, 2));
    const night = 1 - smoothstep(-0.22, 0.05, e);
    env.day = day;
    env.twilight = tw;
    env.night = night;
    env.underground = underground;

    const t = timeOfDay;
    env.phase = t >= 0.2 && t < 0.3 ? 'Dawn' : t >= 0.3 && t < 0.7 ? 'Day' : t >= 0.7 && t < 0.8 ? 'Sunset' : 'Night';

    const top = uniforms.topColor.value.copy(COL.nightTop).lerp(COL.dayTop, day).lerp(COL.sunsetTop, tw * 0.45);
    const hor = uniforms.horizonColor.value.copy(COL.nightHorizon).lerp(COL.dayHorizon, day).lerp(COL.sunsetHorizon, tw * 0.75);
    uniforms.sunDir.value.copy(sunDir);
    uniforms.sunColor.value.copy(COL.sunDay).lerp(COL.sunLow, tw);
    uniforms.twilight.value = tw;
    uniforms.sunUp.value = smoothstep(-0.08, 0.02, e);
    void top;

    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    starMat.opacity = night * 0.95;
    stars.rotation.y = timeOfDay * Math.PI * 2 * 0.2;

    moon.position.copy(camera.position).addScaledVector(moonDir, 400);
    moon.lookAt(camera.position);
    moonGlow.position.copy(moon.position);
    const moonVis = smoothstep(-0.1, 0.1, moonDir.y);
    moon.material.opacity = moonVis * (0.35 + 0.65 * night);
    moonGlow.material.opacity = moonVis * night * 0.8;

    // Lights: sun by day, moonlight by night. Never fully dark so kids can see.
    const sunStrength = smoothstep(-0.04, 0.25, e);
    const ug = 1 - underground * 0.85;
    if (e > -0.06) {
      sun.position.copy(playerPos).addScaledVector(sunDir, 80);
      sun.color.copy(COL.sunDay).lerp(COL.sunLow, tw);
      sun.intensity = (2.3 * sunStrength + 0.05) * ug;
    } else {
      sun.position.copy(playerPos).addScaledVector(moonDir, 80);
      sun.color.copy(COL.moon);
      sun.intensity = 1.1 * night * ug;
    }
    sun.target.position.copy(playerPos);

    hemi.color.copy(COL.hemiNight).lerp(COL.hemiDay, day).lerp(COL.sunLow, tw * 0.35);
    hemi.groundColor.copy(COL.groundNight).lerp(COL.groundDay, day);
    hemi.intensity = (2.1 + 0.4 * day + 0.6 * tw) * ug;

    scene.fog.color.copy(hor).lerp(COL.caveFog, underground);
    scene.fog.near = 70 * (1 - underground) + 4 * underground;
    scene.fog.far = 300 * (1 - underground) + 30 * underground;

    // Clouds: white by day, peachy at sunset, grey-blue at night.
    env.cloudColor.copy(tmp.set('#3c4670')).lerp(COL.dayHorizon, day).lerp(new THREE.Color('#ffc59a'), tw * 0.6);
    env.cloudColor.lerp(new THREE.Color('#ffffff'), day * 0.6);
  }

  return { update, env };
}

function drawMoon() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(110, 110, 20, 128, 128, 126);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#dfe3f5');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  const rng = mulberry32(7);
  g.fillStyle = 'rgba(160,165,200,0.35)';
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * 90;
    g.beginPath();
    g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 6 + rng() * 18, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function drawGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}
