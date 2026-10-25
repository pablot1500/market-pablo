// Construye la tienda, la calle, las luces y los objetos fijos.
import * as THREE from 'three';
import { STORE, WORLD_BOUNDS } from './config.js';
import * as T from './textures.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

function withRepeat(tex, rx, ry) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

export function buildWorld(scene) {
  const colliders = [];
  const interactables = [];

  const addCollider = (minX, maxX, minZ, maxZ, tag = 'static') => {
    const c = { minX, maxX, minZ, maxZ, tag };
    colliders.push(c);
    return c;
  };

  const box = (w, h, d, x, y, z, material, { collide = false, parent = scene } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    parent.add(m);
    if (collide) addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  };

  // ---------- Materiales base ----------
  const paintTex = T.wallPaint([1, 1]);
  const brickTex = T.brick([1, 1]);
  const paintMat = (w) => mat('#ffffff', { map: withRepeat(paintTex, w / 2, 1) });
  const brickMat = (w, h) => mat('#ffffff', { map: withRepeat(brickTex, w / 1.6, h / 1.6) });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#bfe3f2', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide,
  });
  const frameMat = mat('#2b2b2b', { roughness: 0.5, metalness: 0.4 });
  const woodMat = mat('#8a5a35', { roughness: 0.7 });
  const woodLight = mat('#c99a6b', { roughness: 0.6 });

  // ---------- Piso y techo de la tienda ----------
  const sw = STORE.maxX - STORE.minX, sd = STORE.maxZ - STORE.minZ;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), mat('#ffffff', { map: T.floorTiles([sw / 1, sd / 1]), roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((STORE.minX + STORE.maxX) / 2, 0.01, (STORE.minZ + STORE.maxZ) / 2);
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd), mat('#f4f4f2', { emissive: '#8a8780', emissiveIntensity: 0.6 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(floor.position.x, STORE.height, floor.position.z);
  scene.add(ceiling);

  const panelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffbe8', emissiveIntensity: 1.2 });
  for (let x = -4.5; x <= 4.5; x += 3) {
    for (let z = -4.5; z <= 4.5; z += 3) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), panelMat);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, STORE.height - 0.01, z);
      scene.add(p);
    }
  }

  // ---------- Paredes ----------
  const H = STORE.height, W = STORE.wall;
  // pared del fondo
  box(sw + W, H, W, 0, H / 2, STORE.minZ, paintMat(sw), { collide: true });
  // paredes laterales
  box(W, H, sd, STORE.minX, H / 2, 0, paintMat(sd), { collide: true });
  box(W, H, sd, STORE.maxX, H / 2, 0, paintMat(sd), { collide: true });

  // pared del frente con vidrieras (brick afuera, pintura adentro)
  const frontZ = STORE.maxZ;
  const frontSegment = (x0, x1) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const mats = (h) => {
      const p = paintMat(w), b = brickMat(w, h);
      return [p, p, p, p, b, p];
    };
    box(w, 0.9, W, cx, 0.45, frontZ, mats(0.9));
    box(w, H - 2.6, W, cx, 2.6 + (H - 2.6) / 2, frontZ, mats(H - 2.6));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.7), glassMat);
    glass.position.set(cx, 1.75, frontZ);
    scene.add(glass);
    // marcos de la vidriera
    box(w, 0.06, 0.12, cx, 0.92, frontZ, frameMat);
    box(w, 0.06, 0.12, cx, 2.58, frontZ, frameMat);
    for (let x = x0; x <= x1 + 0.01; x += w / Math.max(1, Math.round(w / 2.2))) {
      box(0.06, 1.7, 0.12, x, 1.75, frontZ, frameMat);
    }
    addCollider(x0, x1, frontZ - W / 2, frontZ + W / 2);
  };
  frontSegment(STORE.minX - W / 2, STORE.doorMinX);
  frontSegment(STORE.doorMaxX, STORE.maxX + W / 2);
  // dintel sobre la puerta
  {
    const w = STORE.doorMaxX - STORE.doorMinX;
    const p = paintMat(w), b = brickMat(w, H - 2.5);
    box(w, H - 2.5, W, (STORE.doorMinX + STORE.doorMaxX) / 2, 2.5 + (H - 2.5) / 2, frontZ, [p, p, p, p, b, p]);
  }
  // parapeto con el cartel de la tienda
  box(sw + W, 1.0, W, 0, H + 0.5, frontZ, brickMat(sw, 1));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.95), new THREE.MeshStandardMaterial({ map: T.storeSign('MARKET PABLO'), emissive: '#ffffff', emissiveIntensity: 0.25, emissiveMap: T.storeSign('MARKET PABLO') }));
  sign.position.set(0, H + 0.5, frontZ + W / 2 + 0.02);
  scene.add(sign);
  // toldo
  const awning = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.08, 1.1), mat('#2f7d5b', { roughness: 0.9 }));
  awning.position.set(0, 2.95, frontZ + 0.6);
  awning.rotation.x = 0.18;
  scene.add(awning);
  // techo exterior
  box(sw + W, 0.2, sd + W, 0, H + 0.1, 0, mat('#6d6d6d'));

  // ---------- Puertas corredizas ----------
  const doorPanels = [];
  {
    const dw = (STORE.doorMaxX - STORE.doorMinX) / 2;
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(dw, 2.45), glassMat);
      pane.position.y = 1.25;
      g.add(pane);
      box(dw, 0.06, 0.05, 0, 0.04, 0, frameMat, { parent: g });
      box(dw, 0.06, 0.05, 0, 2.46, 0, frameMat, { parent: g });
      box(0.05, 2.45, 0.05, i === 0 ? -dw / 2 : dw / 2, 1.25, 0, frameMat, { parent: g });
      box(0.05, 2.45, 0.05, i === 0 ? dw / 2 : -dw / 2, 1.25, 0, frameMat, { parent: g });
      const closedX = STORE.doorMinX + dw / 2 + i * dw;
      const openX = i === 0 ? STORE.doorMinX - dw / 2 + 0.1 : STORE.doorMaxX + dw / 2 - 0.1;
      g.position.set(closedX, 0, frontZ - 0.12);
      scene.add(g);
      doorPanels.push({ group: g, closedX, openX, t: 0 });
    }
  }
  const doorCenter = new THREE.Vector3((STORE.doorMinX + STORE.doorMaxX) / 2, 0, frontZ);
  // alfombra de entrada
  const mat1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), mat('#3d3d3d', { roughness: 1 }));
  mat1.rotation.x = -Math.PI / 2;
  mat1.position.set(doorCenter.x, 0.015, frontZ - 0.8);
  scene.add(mat1);

  // ---------- Cartel abierto/cerrado ----------
  const signTex = { open: T.openSign(true), closed: T.openSign(false) };
  const signMat = new THREE.MeshStandardMaterial({ map: signTex.closed, emissive: '#ffffff', emissiveMap: signTex.closed, emissiveIntensity: 0.35 });
  const openSignMeshes = [];
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.32), signMat);
    m.position.set(STORE.doorMinX - 0.45, 1.6, frontZ + side * 0.03);
    m.rotation.y = side < 0 ? Math.PI : 0;
    m.userData.interact = { kind: 'sign' };
    scene.add(m);
    openSignMeshes.push(m);
    interactables.push(m);
  }
  const setOpenSign = (open) => {
    signMat.map = open ? signTex.open : signTex.closed;
    signMat.emissiveMap = signMat.map;
    signMat.needsUpdate = true;
  };

  // ---------- Mostrador / caja ----------
  const counter = { x: -3.5, z: 3.6, w: 3.0, d: 0.8, h: 0.9 };
  box(counter.w, counter.h - 0.05, counter.d, counter.x, (counter.h - 0.05) / 2, counter.z, woodMat, { collide: true });
  box(counter.w + 0.06, 0.05, counter.d + 0.06, counter.x, counter.h - 0.025, counter.z, mat('#37474f', { roughness: 0.4 }));
  // cinta transportadora (decorativa)
  box(1.4, 0.02, 0.36, -3.45, counter.h + 0.01, counter.z + 0.17, mat('#1c1c1c', { roughness: 0.9 }));

  // caja registradora
  const register = new THREE.Group();
  box(0.45, 0.12, 0.38, 0, 0.06, 0, mat('#263238', { roughness: 0.4 }), { parent: register });
  box(0.4, 0.1, 0.12, 0, 0.17, 0.08, mat('#37474f'), { parent: register });
  const regScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.16), new THREE.MeshStandardMaterial({ map: T.screenTexture(['CAJA', '$0.00'], '#1b5e20'), emissive: '#ffffff', emissiveIntensity: 0.4 }));
  regScreen.material.emissiveMap = regScreen.material.map;
  regScreen.position.set(0, 0.32, -0.02);
  register.add(regScreen);
  box(0.06, 0.18, 0.04, 0, 0.21, 0, mat('#263238'), { parent: register });
  register.position.set(-4.55, counter.h, counter.z - 0.12);
  register.rotation.y = Math.PI; // la pantalla mira al jugador (hacia -z)
  scene.add(register);
  register.traverse((o) => { if (o.isMesh) { o.userData.interact = { kind: 'register' }; interactables.push(o); } });

  // computadora para pedidos y precios
  const pc = new THREE.Group();
  box(0.5, 0.32, 0.04, 0, 0.32, 0, mat('#212121', { roughness: 0.3 }), { parent: pc });
  box(0.06, 0.16, 0.06, 0, 0.08, 0.02, mat('#424242'), { parent: pc });
  box(0.22, 0.02, 0.16, 0, 0.01, 0.02, mat('#424242'), { parent: pc });
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.28), new THREE.MeshStandardMaterial({ map: T.screenTexture(['Market PC', 'Pedidos', 'Precios']), emissive: '#ffffff', emissiveIntensity: 0.6 }));
  pcScreen.material.emissiveMap = pcScreen.material.map;
  pcScreen.position.set(0, 0.32, -0.021);
  pcScreen.rotation.y = Math.PI;
  pc.add(pcScreen);
  box(0.4, 0.02, 0.14, 0, 0.01, -0.22, mat('#303030'), { parent: pc });
  pc.position.set(-2.35, counter.h, counter.z - 0.05);
  scene.add(pc);
  pc.traverse((o) => { if (o.isMesh) { o.userData.interact = { kind: 'computer' }; interactables.push(o); } });

  // tacho de basura
  const trash = new THREE.Group();
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.8, 16, 1, true), mat('#455a64', { side: THREE.DoubleSide, roughness: 0.5 }));
  bin.position.y = 0.4;
  trash.add(bin);
  const binBottom = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat('#263238'));
  binBottom.rotation.x = -Math.PI / 2;
  binBottom.position.y = 0.02;
  trash.add(binBottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 20), mat('#37474f'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  trash.add(rim);
  trash.position.set(-1.45, 0, 2.7);
  scene.add(trash);
  addCollider(-1.75, -1.15, 2.4, 3.0);
  trash.traverse((o) => { if (o.isMesh) { o.userData.interact = { kind: 'trash' }; interactables.push(o); } });

  // ---------- Exterior: veredas, calle, edificios ----------
  const sidewalkNear = new THREE.Mesh(new THREE.PlaneGeometry(120, 3.0), mat('#ffffff', { map: T.sidewalk([60, 1.5]) }));
  sidewalkNear.rotation.x = -Math.PI / 2;
  sidewalkNear.position.set(0, 0.015, 7.6);
  scene.add(sidewalkNear);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), mat('#ffffff', { map: T.asphalt([30, 1.5]), roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.0, 12);
  scene.add(road);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.25), new THREE.MeshStandardMaterial({ map: T.roadLines([40, 1]), transparent: true }));
  lines.rotation.x = -Math.PI / 2;
  lines.position.set(0, 0.012, 12);
  scene.add(lines);
  const sidewalkFar = new THREE.Mesh(new THREE.PlaneGeometry(120, 2.6), mat('#ffffff', { map: T.sidewalk([60, 1.3]) }));
  sidewalkFar.rotation.x = -Math.PI / 2;
  sidewalkFar.position.set(0, 0.015, 16.3);
  scene.add(sidewalkFar);
  const curbMat = mat('#9e9e9e');
  box(120, 0.12, 0.2, 0, 0.06, 9.05, curbMat);
  box(120, 0.12, 0.2, 0, 0.06, 14.95, curbMat);
  // pasto/tierra alrededor para que no se vea el vacío
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mat('#5b6b4a', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // edificios vecinos (a los costados de la tienda)
  const buildingColors = ['#d9a066', '#b5c7a3', '#c9a0a0', '#a8b8cc', '#e0cf9e', '#c4b5d6'];
  const building = (x0, x1, z0, z1, h, color, frontFacing = 1) => {
    const w = x1 - x0, d = z1 - z0;
    const fac = T.facade(color, '#9cc3dd');
    const front = mat('#ffffff', { map: withRepeat(fac, w / 4, h / 4) });
    const side = mat(color);
    const mats = frontFacing > 0 ? [side, side, side, side, front, side] : [side, side, side, side, side, front];
    box(w, h, d, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, mats);
    addCollider(x0, x1, z0, z1);
  };
  let ci = 0;
  for (let x = -40; x < -7.1; x += 8.3) building(x, Math.min(x + 8.3, -7.1), -14, 6.1, 6 + (ci % 3) * 1.6, buildingColors[ci++ % buildingColors.length]);
  for (let x = 7.1; x < 40; x += 8.3) building(x, Math.min(x + 8.3, 40), -14, 6.1, 6 + (ci % 3) * 1.6, buildingColors[ci++ % buildingColors.length]);
  // vereda de enfrente
  for (let x = -44; x < 44; x += 8) building(x, x + 8, 17.6, 26, 7 + ((ci * 7) % 4) * 1.5, buildingColors[ci++ % buildingColors.length], -1);
  // detrás de la tienda
  box(sw + 0.4, 5, 8, 0, 2.5, -10.2, mat('#8d8d8d'));

  // límites invisibles de la zona caminable
  addCollider(WORLD_BOUNDS.minX - 1, WORLD_BOUNDS.minX, 5, 18);
  addCollider(WORLD_BOUNDS.maxX, WORLD_BOUNDS.maxX + 1, 5, 18);
  addCollider(-25, 25, 17.3, 18.3);

  // faroles
  const lamps = [];
  const poleMat = mat('#37474f', { metalness: 0.5, roughness: 0.4 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd77a', emissiveIntensity: 0 });
  for (const x of [-14, -6, 6, 14]) {
    box(0.12, 4.2, 0.12, x, 2.1, 8.75, poleMat);
    box(0.08, 0.08, 0.9, x, 4.15, 9.15, poleMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), bulbMat);
    bulb.position.set(x, 4.0, 9.55);
    scene.add(bulb);
    const light = new THREE.PointLight('#ffd9a0', 0, 14, 1.6);
    light.position.set(x, 3.9, 9.55);
    scene.add(light);
    lamps.push(light);
    addCollider(x - 0.1, x + 0.1, 8.65, 8.85);
  }

  // árboles y un banco
  const trunkMat = mat('#6d4c41');
  const leafMat = mat('#3f7f3a', { roughness: 0.9 });
  for (const x of [-10, -2.6, 10, 17]) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.8, 8), trunkMat);
    trunk.position.y = 0.9;
    g.add(trunk);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), leafMat);
    leaves.position.y = 2.4;
    leaves.scale.set(1, 1.15, 1);
    g.add(leaves);
    g.position.set(x, 0, 8.6);
    scene.add(g);
    addCollider(x - 0.18, x + 0.18, 8.42, 8.78);
  }
  {
    const bx = -8.6, bz = 6.75;
    box(1.6, 0.06, 0.45, bx, 0.45, bz, woodLight);
    box(1.6, 0.4, 0.06, bx, 0.7, bz - 0.2, woodLight);
    box(0.06, 0.45, 0.4, bx - 0.75, 0.22, bz, poleMat);
    box(0.06, 0.45, 0.4, bx + 0.75, 0.22, bz, poleMat);
    addCollider(bx - 0.8, bx + 0.8, bz - 0.25, bz + 0.25);
  }

  // ---------- Luces ----------
  const hemi = new THREE.HemisphereLight('#dfefff', '#6f6455', 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2dc', 2.0);
  sun.position.set(-20, 30, 25);
  scene.add(sun);
  const interior = [];
  for (const [x, z] of [[-3.5, -3], [3.5, -3], [-3.5, 2.5], [3.5, 2.5]]) {
    const l = new THREE.PointLight('#fff6e5', 9, 0, 2);
    l.position.set(x, 2.9, z);
    scene.add(l);
    interior.push(l);
  }

  const skyDay = new THREE.Color('#9fd3f7');
  const skySunset = new THREE.Color('#f2a36b');
  const skyNight = new THREE.Color('#0b1530');
  scene.fog = new THREE.Fog(skyDay.clone(), 30, 90);
  scene.background = skyDay.clone();

  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const setTimeOfDay = (minutes) => {
    const h = minutes / 60;
    const day = smooth(5.5, 8, h) * (1 - smooth(18.5, 20.8, h));
    const sunset = smooth(17, 19, h) * (1 - smooth(19.5, 21, h));
    const sky = skyNight.clone().lerp(skyDay, day);
    sky.lerp(skySunset, sunset * 0.7);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);
    sun.intensity = 0.05 + 2.0 * day;
    sun.color.set('#fff2dc').lerp(new THREE.Color('#ff9f5a'), sunset);
    hemi.intensity = 0.12 + 0.88 * day;
    const night = 1 - day;
    for (const l of lamps) l.intensity = 30 * smooth(0.35, 0.8, night);
    bulbMat.emissiveIntensity = 2 * smooth(0.35, 0.8, night);
  };

  const updateDoors = (dt, people) => {
    let near = false;
    for (const p of people) {
      const dx = p.x - doorCenter.x, dz = p.z - doorCenter.z;
      if (dx * dx + dz * dz < 2.3 * 2.3) { near = true; break; }
    }
    for (const d of doorPanels) {
      d.t = THREE.MathUtils.clamp(d.t + (near ? 1 : -1) * dt * 2.2, 0, 1);
      d.group.position.x = THREE.MathUtils.lerp(d.closedX, d.openX, d.t);
    }
  };

  // ---------- Puntos de interés para clientes ----------
  const deliverySpots = [];
  for (let level = 0; level < 3; level++) {
    for (const z of [6.75, 7.35, 7.95]) {
      for (const x of [4.3, 4.95, 5.6, 6.25]) deliverySpots.push({ x, y: level * 0.36, z, box: null });
    }
  }

  const queueSpots = [
    [-3.4, 4.75], [-2.4, 4.75], [-1.4, 4.75], [-0.4, 4.75], [0.6, 4.75],
    [0.6, 3.7], [0.6, 2.7], [0.6, 1.7], [1.6, 1.7], [2.6, 1.7],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));

  const counterItemArea = { minX: -4.1, maxX: -2.85, z0: 3.66, z1: 3.9, y: counter.h + 0.02 };

  return {
    colliders,
    interactables,
    setOpenSign,
    setTimeOfDay,
    updateDoors,
    regScreen,
    deliverySpots,
    queueSpots,
    counterItemArea,
    storeEntry: new THREE.Vector3(doorCenter.x, 0, frontZ - 1.6),
    storeOutside: new THREE.Vector3(doorCenter.x, 0, frontZ + 1.2),
    spawnPoints: [new THREE.Vector3(-19, 0, 7.4), new THREE.Vector3(19, 0, 7.6)],
    playerStart: new THREE.Vector3(-3.5, 0, 2.3),
  };
}

// Disposición inicial de las góndolas: [x, z, rotación]
// rotación 0 = el frente mira hacia +z (hacia la calle).
export const SHELF_LAYOUT = [
  [-4.2, -5.6, 0],
  [-1.9, -5.6, 0],
  [0.4, -5.6, 0],
  [-1.5, -2.85, Math.PI],
  [-1.5, -2.35, 0],
  [3.4, -2.85, Math.PI],
  [3.4, -2.35, 0],
];
