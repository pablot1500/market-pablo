// Clientes: llegan por la vereda, recorren las góndolas, hacen la fila y pagan.
import * as THREE from 'three';
import { CUSTOMER, GAME_MINUTES_PER_SECOND, PRODUCTS, STORE } from './config.js';
import { bubbleTexture } from './textures.js';
import { PEOPLE, createPerson } from './people.js';

const SKIN = ['#f3cfa9', '#e8b88a', '#d39a6a', '#b07548', '#8a5636', '#5e3a24', '#f6d7bd'];
const SHIRTS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00897b', '#546e7a', '#d81b60', '#3949ab', '#f5f5f5', '#795548', '#9ccc65'];
const PANTS = ['#263238', '#37474f', '#1a3a6b', '#4e342e', '#212121', '#5d4037', '#3f51b5', '#8d6e63', '#616161'];
const HAIR = ['#1b1b1b', '#3b2618', '#6b4226', '#a0703f', '#d9b26f', '#8c8c8c', '#e0e0e0', '#7a2e1a'];
const SHOES = ['#1b1b1b', '#3e2723', '#f5f5f5', '#5d4037', '#283593'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Geometrías compartidas por todos los clientes
const GEO = {
  thigh: new THREE.CapsuleGeometry(0.072, 0.3, 4, 10),
  shin: new THREE.CapsuleGeometry(0.058, 0.32, 4, 10),
  shoe: new THREE.CapsuleGeometry(0.052, 0.14, 4, 8).rotateX(Math.PI / 2),
  pelvis: new THREE.CylinderGeometry(0.15, 0.14, 0.2, 14),
  torso: new THREE.LatheGeometry([
    [0, 0], [0.135, 0], [0.142, 0.06], [0.155, 0.18], [0.17, 0.32], [0.175, 0.38], [0.165, 0.43], [0.12, 0.47], [0.055, 0.49], [0.0, 0.495],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 18),
  torsoF: new THREE.LatheGeometry([
    [0, 0], [0.125, 0], [0.12, 0.08], [0.138, 0.22], [0.162, 0.32], [0.162, 0.38], [0.15, 0.43], [0.11, 0.47], [0.05, 0.49], [0.0, 0.495],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 18),
  shoulder: new THREE.SphereGeometry(0.054, 12, 10),
  upperArm: new THREE.CapsuleGeometry(0.052, 0.2, 4, 10),
  forearm: new THREE.CapsuleGeometry(0.04, 0.19, 4, 8),
  hand: new THREE.SphereGeometry(0.045, 8, 6),
  neck: new THREE.CylinderGeometry(0.046, 0.052, 0.12, 12),
  head: new THREE.SphereGeometry(0.1, 20, 16),
  nose: new THREE.ConeGeometry(0.017, 0.045, 8).rotateX(Math.PI / 2),
  ear: new THREE.SphereGeometry(0.026, 8, 6),
  eyeWhite: new THREE.SphereGeometry(0.016, 10, 8),
  iris: new THREE.SphereGeometry(0.0095, 8, 6),
  brow: new THREE.BoxGeometry(0.036, 0.008, 0.01),
  mouth: new THREE.BoxGeometry(0.036, 0.007, 0.006),
  hairCap: new THREE.SphereGeometry(0.108, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
  hairBack: new THREE.CapsuleGeometry(0.09, 0.16, 4, 10),
  bun: new THREE.SphereGeometry(0.05, 10, 8),
  capBrim: new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI),
  skirt: new THREE.CylinderGeometry(0.155, 0.25, 0.4, 16, 1, true),
  belt: new THREE.CylinderGeometry(0.143, 0.143, 0.035, 16),
};

const matCache = new Map();
function m(color, rough = 0.75) {
  const key = color + rough;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, side: THREE.FrontSide }));
  return matCache.get(key);
}

function buildModel() {
  const g = new THREE.Group();
  const body = new THREE.Group(); // todo menos la canasta sube y baja al caminar
  g.add(body);
  const female = Math.random() < 0.5;
  const skin = m(pick(SKIN), 0.6), hair = m(pick(HAIR), 0.85), shirt = m(pick(SHIRTS)), pants = m(pick(PANTS));
  const shoes = m(pick(SHOES), 0.5);
  const skirt = female && Math.random() < 0.4;
  const longSleeves = Math.random() < 0.45;
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // piernas: cadera -> rodilla -> pie
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.085, 0.92, 0);
    body.add(hip);
    mesh(GEO.thigh, skirt ? skin : pants, hip, 0, -0.22, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    mesh(GEO.shin, skirt ? skin : pants, knee, 0, -0.2, 0);
    mesh(GEO.shoe, shoes, knee, 0, -0.42, 0.045);
    legs.push({ hip, knee });
  }
  mesh(GEO.pelvis, skirt ? shirt : pants, body, 0, 0.97, 0).scale.set(1, 1, 0.72);
  if (skirt) mesh(GEO.skirt, m(pick(PANTS)), body, 0, 0.82, 0).scale.set(1, 1, 0.8);
  else mesh(GEO.belt, m('#2b1d14', 0.5), body, 0, 1.06, 0).scale.set(1, 1, 0.72);

  // torso
  const torso = new THREE.Group();
  torso.position.y = 1.0;
  body.add(torso);
  const chest = mesh(female ? GEO.torsoF : GEO.torso, shirt, torso, 0, 0, 0);
  chest.scale.set(female ? 0.95 : 1.05, 1, 0.66);

  // brazos: hombro -> codo -> mano
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * (female ? 0.165 : 0.185), 0.41, 0);
    shoulder.rotation.z = s * 0.05;
    torso.add(shoulder);
    // la articulación del hombro se mueve con el brazo (sin "bolitas" sueltas)
    mesh(GEO.shoulder, shirt, shoulder, 0, -0.01, 0);
    mesh(GEO.upperArm, shirt, shoulder, 0, -0.15, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    mesh(GEO.forearm, longSleeves ? shirt : skin, elbow, 0, -0.13, 0);
    mesh(GEO.hand, skin, elbow, 0, -0.29, 0.005).scale.set(0.9, 1.4, 0.65);
    arms.push({ shoulder, elbow });
  }

  // cabeza
  const headG = new THREE.Group();
  headG.position.y = 0.47;
  torso.add(headG);
  mesh(GEO.neck, skin, headG, 0, 0.0, 0);
  mesh(GEO.head, skin, headG, 0, 0.16, 0.005).scale.set(0.95, 1.17, 1.05);
  mesh(GEO.nose, skin, headG, 0, 0.145, 0.108);
  for (const s of [-1, 1]) {
    mesh(GEO.ear, skin, headG, s * 0.094, 0.155, -0.005).scale.set(0.35, 0.65, 0.5);
    mesh(GEO.eyeWhite, m('#fafafa', 0.3), headG, s * 0.036, 0.172, 0.088);
    mesh(GEO.iris, m(pick(['#3b2618', '#1b1b1b', '#2e6b8a', '#4a7a3a']), 0.3), headG, s * 0.036, 0.172, 0.102);
    mesh(GEO.brow, hair, headG, s * 0.037, 0.2, 0.097).rotation.z = s * -0.08;
  }
  mesh(GEO.mouth, m('#9c4a4a', 0.6), headG, 0, 0.105, 0.1);

  const style = female ? pick(['long', 'long', 'bun', 'short']) : pick(['short', 'short', 'cap', 'bald', 'short']);
  if (style !== 'bald') {
    const cap = mesh(GEO.hairCap, style === 'cap' ? m(pick(SHIRTS), 0.6) : hair, headG, 0, 0.19, -0.012);
    cap.scale.set(1.0, 0.9, 1.08);
    cap.rotation.x = -0.4;
    if (style === 'cap') {
      const brim = mesh(GEO.capBrim, cap.material, headG, 0, 0.225, 0.07);
      brim.scale.set(1.0, 1, 1.3);
      brim.rotation.x = 0.12;
    }
  } else {
    const fringe = mesh(GEO.hairCap, hair, headG, 0, 0.13, -0.02);
    fringe.scale.set(1.02, 0.6, 1.05);
    fringe.rotation.x = -1.4;
  }
  if (style === 'long') mesh(GEO.hairBack, hair, headG, 0, 0.09, -0.055).scale.set(1.1, 1, 0.55);
  if (style === 'bun') mesh(GEO.bun, hair, headG, 0, 0.27, -0.07);

  const basket = buildBasket();
  basket.position.set(0, -0.33, 0);
  basket.rotation.y = Math.PI / 2;
  arms[1].elbow.add(basket);

  const height = (female ? 0.94 : 1.0) * (0.95 + Math.random() * 0.1);
  g.scale.setScalar(height);
  return { group: g, body, torso, legs, arms, head: headG, basket };
}

// Canasta roja de supermercado (cuelga de la mano derecha)
function buildBasket() {
  const basket = new THREE.Group();
  const bm = m('#d32f2f', 0.5);
  const bw = 0.34, bh = 0.18, bd = 0.24;
  const add = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm); b.position.set(x, y, z); basket.add(b); };
  add(bw, 0.02, bd, 0, -bh, 0);
  add(bw, bh, 0.015, 0, -bh / 2, bd / 2);
  add(bw, bh, 0.015, 0, -bh / 2, -bd / 2);
  add(0.015, bh, bd, bw / 2, -bh / 2, 0);
  add(0.015, bh, bd, -bw / 2, -bh / 2, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 12, Math.PI), m('#424242', 0.4));
  handle.position.y = 0.0;
  basket.add(handle);
  basket.visible = false;
  return basket;
}

// Sombra suave bajo los pies (los modelos realistas no proyectan sombras en el juego)
const shadowGeo = new THREE.CircleGeometry(0.34, 24).rotateX(-Math.PI / 2);
const shadowMat = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();
const tmpV = new THREE.Vector3();

let nextId = 1;

export class Customer {
  // person: modelo realista (people.js). Si no hay, se usa el muñeco hecho a mano.
  constructor(game, spawn, person = null) {
    this.id = nextId++;
    this.game = game;
    if (person) {
      this.person = person;
      this.mesh = person.root;
      this.basketMesh = buildBasket();
      this.basketMesh.rotation.y = Math.PI / 2;
      this.mesh.add(this.basketMesh);
      this.hand = person.bone('R_Hand');
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = 0.02;
      this.mesh.add(shadow);
      // en la fila algunos esperan y otros miran el celular
      this.queueAnim = Math.random() < 0.35 ? 'phone' : 'wait';
      person.play('walkFast', 0);
    } else {
      const model = buildModel();
      this.mesh = model.group;
      this.model = model;
      this.basketMesh = model.basket;
    }
    this.pos = spawn.clone();
    this.mesh.position.copy(this.pos);
    this.heading = spawn.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    this.exitPoint = game.world.spawnPoints[Math.floor(Math.random() * 2)];
    this.path = [];
    this.walkPhase = Math.random() * 10;
    this.state = 'entering';
    this.wait = 0;
    this.patience = 0;
    this.queueIndex = -1;
    this.basket = [];
    this.list = makeShoppingList();
    this.target = null;
    this.bubble = null;
    this.bubbleTime = 0;
    this.done = false;
    this.goTo(game.world.storeEntry);
    game.scene.add(this.mesh);
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  goTo(point) {
    this.path = this.game.nav.findPath(this.pos, point);
  }

  say(text, seconds = 2.6) {
    if (this.bubble) { this.mesh.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); }
    const mat = new THREE.SpriteMaterial({ map: bubbleTexture(text), depthTest: true });
    this.bubble = new THREE.Sprite(mat);
    this.bubble.scale.set(1.3, 0.325, 1);
    this.bubble.position.y = 2.15;
    this.mesh.add(this.bubble);
    this.bubbleTime = seconds;
  }

  insideStore() {
    return this.pos.x > STORE.minX && this.pos.x < STORE.maxX && this.pos.z > STORE.minZ && this.pos.z < STORE.maxZ;
  }

  update(dt) {
    const g = this.game;
    if (this.bubble) {
      this.bubbleTime -= dt;
      if (this.bubbleTime <= 0) { this.mesh.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    }

    const moving = this.followPath(dt);

    // a veces ensucian el piso
    if (moving && this.insideStore() && Math.random() < CUSTOMER.dirtPerMinute * GAME_MINUTES_PER_SECOND * dt) {
      g.cleaning.spawn(this.pos.x, this.pos.z);
    }

    switch (this.state) {
      case 'entering':
        if (!moving) this.nextShelf();
        break;
      case 'toShelf':
        if (!moving) {
          this.state = 'picking';
          this.wait = this.person ? 2.0 + Math.random() * 0.6 : 1.0 + Math.random() * 0.8;
          if (this.person && this.person.currentKey === 'take') this.person.actions.take.reset().play();
          const c = this.target.slot.worldCenter();
          this.heading = Math.atan2(c.x - this.pos.x, c.z - this.pos.z);
        }
        break;
      case 'picking':
        this.wait -= dt;
        if (this.wait <= 0) this.pickFromShelf();
        break;
      case 'queue':
        this.updateQueue(dt);
        break;
      case 'checkout':
        this.patience += dt;
        if (this.patience > CUSTOMER.patienceSeconds && g.checkout.phase === 'scanning' && g.checkout.items.length === this.basket.length) {
          this.giveUp();
        }
        break;
      case 'leaving':
        if (!moving) { this.done = true; }
        break;
    }

    this.animate(dt, moving);
  }

  followPath(dt) {
    if (!this.path.length) return false;
    const target = this.path[0];
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const step = CUSTOMER.speed * dt;
    if (dist <= step) {
      this.pos.x = target.x;
      this.pos.z = target.z;
      this.path.shift();
    } else {
      this.pos.x += (dx / dist) * step;
      this.pos.z += (dz / dist) * step;
      this.heading = Math.atan2(dx, dz);
    }
    return true;
  }

  animate(dt, moving) {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    let diff = this.heading - this.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.mesh.rotation.y += diff * Math.min(1, dt * 8);
    if (this.person) { this.animatePerson(dt, moving); return; }
    const md = this.model;
    const k = Math.min(1, dt * 12);
    const lerp = (o, prop, v) => { o.rotation[prop] += (v - o.rotation[prop]) * k; };
    if (moving) this.walkPhase += dt * CUSTOMER.speed * 4.4;
    const p = this.walkPhase;
    const amp = moving ? 1 : 0;
    const carrying = this.basketMesh.visible;
    for (let i = 0; i < 2; i++) {
      const ph = p + i * Math.PI;
      const leg = md.legs[i];
      lerp(leg.hip, 'x', -Math.sin(ph) * 0.5 * amp);
      lerp(leg.knee, 'x', (Math.max(0, Math.cos(ph)) * 0.95 + 0.05) * amp + (1 - amp) * 0.03);
      const arm = md.arms[i];
      const swing = Math.sin(ph) * 0.42 * amp;
      if (i === 1 && carrying) {
        lerp(arm.shoulder, 'x', swing * 0.25);
        lerp(arm.elbow, 'x', -0.05);
      } else if (i === 0 && this.state === 'picking') {
        lerp(arm.shoulder, 'x', -1.25);
        lerp(arm.elbow, 'x', -0.35);
      } else {
        lerp(arm.shoulder, 'x', swing);
        lerp(arm.elbow, 'x', -0.22 - Math.max(0, -Math.sin(ph)) * 0.35 * amp);
      }
    }
    md.body.position.y = moving ? Math.abs(Math.cos(p)) * 0.03 - 0.015 : Math.sin(performance.now() * 0.002 + this.id) * 0.004;
    lerp(md.torso, 'y', Math.sin(p) * 0.08 * amp);
    lerp(md.torso, 'x', moving ? 0.05 : 0);
    // mira hacia la góndola cuando elige
    lerp(md.head, 'x', this.state === 'picking' ? 0.15 : 0);
  }

  animatePerson(dt, moving) {
    const p = this.person;
    let key = 'idle';
    if (moving) key = 'walkFast';
    else if (this.state === 'picking') key = 'take';
    else if (this.state === 'queue' || this.state === 'checkout') key = this.queueAnim;
    p.play(key, 0.3);
    if (moving) p.matchSpeed(CUSTOMER.speed);
    else if (key === 'take') p.setSpeed(1.25);
    p.update(dt);
    // la canasta cuelga derecha desde la mano
    if (this.basketMesh.visible && this.hand) {
      this.mesh.updateMatrixWorld(true);
      this.hand.getWorldPosition(tmpV);
      this.mesh.worldToLocal(tmpV);
      this.basketMesh.position.set(tmpV.x, tmpV.y - 0.02, tmpV.z);
    }
  }

  nextShelf() {
    const g = this.game;
    while (this.list.length) {
      const want = this.list[0];
      const slot = g.findSlotWith(want.product, this.pos);
      if (!slot) {
        this.list.shift();
        g.economy.today.missing++;
        g.economy.changeReputation(-0.004);
        this.say(`No hay ${want.product.short.toLowerCase()} 😕`);
        continue;
      }
      this.target = { slot, want };
      this.state = 'toShelf';
      this.goTo(slot.accessPoint());
      return;
    }
    if (this.basket.length) this.joinQueue();
    else this.leave();
  }

  pickFromShelf() {
    const g = this.game;
    const { slot, want } = this.target;
    if (slot.product !== want.product || slot.count === 0) {
      // alguien se lo llevó o lo cambiaron: buscar en otro lado
      want.retries = (want.retries || 0) + 1;
      if (want.retries > 2) this.list.shift();
      this.nextShelf();
      return;
    }
    this.list.shift();
    if (Math.random() < g.economy.acceptChance(want.product.id)) {
      const n = Math.min(want.qty, slot.count);
      for (let i = 0; i < n; i++) {
        slot.remove();
        this.basket.push(want.product);
      }
      slot.clearIfEmpty();
      slot.refreshTag(g.economy.prices);
      this.basketMesh.visible = true;
    } else {
      g.economy.today.tooExpensive++;
      g.economy.changeReputation(-0.002);
      this.say(`¡Qué caro ${want.product.short.toLowerCase()}!`);
    }
    this.nextShelf();
  }

  joinQueue() {
    const g = this.game;
    this.state = 'queue';
    g.queue.push(this);
    this.queueIndex = -1;
    this.patience = 0;
  }

  updateQueue(dt) {
    const g = this.game;
    this.patience += dt;
    const idx = g.queue.indexOf(this);
    if (idx !== this.queueIndex) {
      this.queueIndex = idx;
      const spots = g.queueSpots;
      this.goTo(spots[Math.min(idx, spots.length - 1)]);
    }
    if (!this.path.length) {
      if (idx === 0 && !g.checkout.busy) {
        this.state = 'checkout';
        const cp = g.counter.position;
        this.heading = Math.atan2(cp.x - this.pos.x, cp.z - this.pos.z); // mirando al mostrador
        g.checkout.begin(this);
        this.basketMesh.visible = false;
        return;
      }
      const spots = g.queueSpots;
      const s = spots[Math.min(idx, spots.length - 1)];
      const ahead = idx > 0 ? spots[Math.min(idx - 1, spots.length - 1)] : null;
      if (ahead) this.heading = Math.atan2(ahead.x - s.x, ahead.z - s.z);
    }
    if (this.patience > CUSTOMER.patienceSeconds) this.giveUp();
  }

  giveUp() {
    const g = this.game;
    g.economy.today.lost++;
    g.economy.changeReputation(-0.03);
    this.say('¡Me cansé de esperar! 😠', 3);
    if (g.checkout.current === this) g.checkout.abort();
    this.basket = [];
    this.basketMesh.visible = false;
    this.leave();
  }

  checkoutDone() {
    const g = this.game;
    g.economy.changeReputation(0.008 + (g.cleaning.cleanliness() - 0.7) * 0.01);
    this.say(pick(['¡Gracias!', '¡Chau, gracias!', '¡Hasta luego!', '¡Buen día!']));
    this.basket = [];
    this.leave();
  }

  leave() {
    const g = this.game;
    const qi = g.queue.indexOf(this);
    if (qi >= 0) g.queue.splice(qi, 1);
    if (this.insideStore() && g.cleaning.count() > 3) g.economy.changeReputation(-0.004);
    this.state = 'leaving';
    this.goTo(this.exitPoint);
  }

  dispose() {
    if (this.person) this.person.dispose();
    this.game.scene.remove(this.mesh);
    // las geometrías del cuerpo son compartidas; solo se liberan las de la canasta
    this.basketMesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    if (this.bubble) this.bubble.material.map.dispose();
  }
}

function makeShoppingList() {
  const n = 1 + Math.floor(Math.random() * Math.random() * 4.5);
  const pool = [...PRODUCTS];
  const list = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, p) => s + p.popularity, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) { r -= pool[idx].popularity; if (r <= 0) break; }
    const product = pool.splice(idx, 1)[0];
    list.push({ product, qty: 1 + Math.floor(Math.random() * Math.random() * 3.5) });
  }
  return list;
}

export class CustomerManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pending = 0;       // clientes cuyo modelo se está cargando
    this.generation = 0;    // para descartar cargas viejas al limpiar
    this.useModels = true;  // si fallan los modelos realistas, se usan los muñecos
  }

  get count() { return this.list.length; }

  hourFactor(hour) {
    if (hour < 10) return 0.6;
    if (hour < 12) return 1.0;
    if (hour < 14) return 1.4;
    if (hour < 17) return 0.9;
    if (hour < 20) return 1.3;
    return 0.6;
  }

  // Se llama una vez por cada minuto de juego mientras la tienda está abierta.
  minuteTick(minute) {
    const g = this.game;
    if (this.list.length + this.pending >= CUSTOMER.maxInWorld) return;
    const rep = g.economy.reputation;
    const clean = g.cleaning.cleanliness();
    const p = CUSTOMER.baseSpawnPerMinute * this.hourFactor(minute / 60) * (0.45 + rep * 1.1) * (0.6 + 0.4 * clean);
    if (Math.random() < p) this.spawn();
  }

  spawn() {
    const g = this.game;
    const sp = g.world.spawnPoints[Math.floor(Math.random() * g.world.spawnPoints.length)];
    const pos = sp.clone().add(new THREE.Vector3(0, 0, (Math.random() - 0.5) * 0.8));
    if (!this.useModels) {
      const c = new Customer(g, pos, null);
      this.list.push(c);
      return c;
    }
    const def = pickPerson();
    const gen = this.generation;
    this.pending++;
    createPerson(def.id).then((person) => {
      this.pending--;
      if (gen !== this.generation) { person.dispose(); return; }
      this.list.push(new Customer(g, pos, person));
    }).catch((err) => {
      console.warn('No se pudieron cargar los modelos de personas, uso los muñecos', err);
      this.pending--;
      this.useModels = false;
      if (gen === this.generation) this.list.push(new Customer(g, pos, null));
    });
    return null;
  }

  update(dt) {
    for (const c of this.list) c.update(dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].done) {
        this.list[i].dispose();
        this.list.splice(i, 1);
      }
    }
  }

  // Al cerrar: los que todavía no hicieron la fila se van.
  closeStore() {
    for (const c of this.list) {
      if (c.state === 'entering') {
        c.say('Uh, está cerrado');
        c.list = [];
        c.leave();
      }
    }
  }

  clear() {
    this.generation++;
    for (const c of this.list) c.dispose();
    this.list = [];
  }
}

// Los chicos aparecen menos seguido que los adultos
function pickPerson() {
  const weights = PEOPLE.map((p) => (p.kind === 'Nene' || p.kind === 'Nena' ? 0.35 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < PEOPLE.length; i++) { r -= weights[i]; if (r <= 0) return PEOPLE[i]; }
  return PEOPLE[0];
}
