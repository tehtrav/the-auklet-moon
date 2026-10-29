// Keyboard, mouse and touch input.
export function createControls(canvas) {
  const keys = new Set();
  const state = {
    yaw: Math.PI * 0.75, // camera angle around the cat
    pitch: 0.32,
    distance: 6,
    moveX: 0,
    moveZ: 0,
    run: false,
    jump: false,
    meow: false,
    fastTime: false,
    enabled: false,
  };

  const onKey = (e, down) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    if (down) keys.add(k);
    else keys.delete(k);
    if (down && k === ' ') state.jump = true;
    if (down && k === 'm') state.meow = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', () => keys.clear());

  // Drag with the mouse (or one finger on the right side) to look around.
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && joystick.id === null && e.clientX < window.innerWidth * 0.45) {
      joystick.id = e.pointerId;
      joystick.sx = e.clientX;
      joystick.sy = e.clientY;
      joystick.x = 0;
      joystick.y = 0;
      showStick(e.clientX, e.clientY);
      return;
    }
    dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (joystick.id === e.pointerId) {
      const dx = e.clientX - joystick.sx;
      const dy = e.clientY - joystick.sy;
      const len = Math.hypot(dx, dy);
      const max = 50;
      const k = len > max ? max / len : 1;
      joystick.x = (dx * k) / max;
      joystick.y = (dy * k) / max;
      moveKnob(dx * k, dy * k);
      return;
    }
    if (!dragging || dragging.id !== e.pointerId) return;
    const dx = e.clientX - dragging.x;
    const dy = e.clientY - dragging.y;
    dragging.x = e.clientX;
    dragging.y = e.clientY;
    state.yaw -= dx * 0.006;
    state.pitch = Math.min(1.2, Math.max(-0.15, state.pitch + dy * 0.004));
  });
  const end = (e) => {
    if (joystick.id === e.pointerId) {
      joystick.id = null;
      joystick.x = joystick.y = 0;
      hideStick();
    }
    if (dragging && dragging.id === e.pointerId) dragging = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => {
    state.distance = Math.min(14, Math.max(2.5, state.distance + e.deltaY * 0.005));
    e.preventDefault();
  }, { passive: false });

  // On-screen joystick for tablets.
  const joystick = { id: null, sx: 0, sy: 0, x: 0, y: 0 };
  const stick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  function showStick(x, y) {
    if (!stick) return;
    stick.style.display = 'block';
    stick.style.left = `${x - 60}px`;
    stick.style.top = `${y - 60}px`;
    moveKnob(0, 0);
  }
  function moveKnob(dx, dy) {
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function hideStick() {
    if (stick) stick.style.display = 'none';
  }

  function bindButton(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fn();
    });
  }
  bindButton('btn-jump', () => (state.jump = true));
  bindButton('btn-meow', () => (state.meow = true));

  function update() {
    let x = 0;
    let z = 0;
    if (keys.has('w') || keys.has('arrowup')) z += 1;
    if (keys.has('s') || keys.has('arrowdown')) z -= 1;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('q')) state.yaw += 0.03;
    if (keys.has('e')) state.yaw -= 0.03;
    if (joystick.id !== null) {
      x += joystick.x;
      z -= joystick.y;
    }
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    state.moveX = x;
    state.moveZ = z;
    state.run = keys.has('shift') || (joystick.id !== null && Math.hypot(joystick.x, joystick.y) > 0.95);
    state.fastTime = keys.has('t');
  }

  function consume(name) {
    const v = state[name];
    state[name] = false;
    return v && state.enabled;
  }

  return { state, update, consume };
}
