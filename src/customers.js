// Clientes: llegan por la vereda, recorren las góndolas, hacen la fila y pagan.
import * as THREE from 'three';
import { CUSTOMER, GAME_MINUTES_PER_SECOND, PRODUCTS, STORE } from './config.js';
import { bubbleTexture } from './textures.js';

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const SHIRTS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00897b', '#546e7a', '#d81b60', '#3949ab'];
const PANTS = ['#263238', '#37474f', '#1a237e', '#4e342e', '#212121', '#5d4037'];
const HAIR = ['#212121', '#4e342e', '#795548', '#d7a86e', '#9e9e9e', '#3e2723'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildModel() {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const skin = m(pick(SKIN)), shirt = m(pick(SHIRTS)), pants = m(pick(PANTS)), hair = m(pick(HAIR));
  const scale = 0.92 + Math.random() * 0.16;

  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.1, 0.85, 0);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.16), pants);
    leg.position.y = -0.425;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.24), m('#1b1b1b'));
    shoe.position.set(0, -0.82, 0.04);
    pivot.add(shoe);
    g.add(pivot);
    legs.push(pivot);
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), shirt);
  torso.position.y = 1.18;
  torso.scale.z = 0.7;
  g.add(torso);
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.27, 1.42, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.11), shirt);
    arm.position.y = -0.26;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin);
    hand.position.y = -0.57;
    pivot.add(hand);
    g.add(pivot);
    arms.push(pivot);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), skin);
  head.position.y = 1.66;
  g.add(head);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.148, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairMesh.position.y = 1.67;
  hairMesh.rotation.x = -0.25;
  g.add(hairMesh);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), m('#111'));
    eye.position.set(s * 0.05, 1.68, 0.125);
    g.add(eye);
  }
  // canasta (aparece cuando lleva productos)
  const basket = new THREE.Group();
  const bm = m('#d32f2f');
  const bw = 0.36, bh = 0.2, bd = 0.24;
  const add = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm); b.position.set(x, y, z); basket.add(b); };
  add(bw, 0.02, bd, 0, 0, 0);
  add(bw, bh, 0.02, 0, bh / 2, bd / 2);
  add(bw, bh, 0.02, 0, bh / 2, -bd / 2);
  add(0.02, bh, bd, bw / 2, bh / 2, 0);
  add(0.02, bh, bd, -bw / 2, bh / 2, 0);
  basket.position.set(0.32, 0.72, 0.12);
  basket.visible = false;
  g.add(basket);

  g.scale.setScalar(scale);
  return { group: g, legs, arms, basket };
}

let nextId = 1;

export class Customer {
  constructor(game, spawn) {
    this.id = nextId++;
    this.game = game;
    const model = buildModel();
    this.mesh = model.group;
    this.legs = model.legs;
    this.arms = model.arms;
    this.basketMesh = model.basket;
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
          this.wait = 1.0 + Math.random() * 0.8;
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
    this.mesh.rotation.y += diff * Math.min(1, dt * 10);
    if (moving) this.walkPhase += dt * 7;
    const swing = moving ? Math.sin(this.walkPhase) * 0.5 : 0;
    this.legs[0].rotation.x = THREE.MathUtils.lerp(this.legs[0].rotation.x, swing, 0.3);
    this.legs[1].rotation.x = THREE.MathUtils.lerp(this.legs[1].rotation.x, -swing, 0.3);
    this.arms[0].rotation.x = THREE.MathUtils.lerp(this.arms[0].rotation.x, -swing * 0.7, 0.3);
    const carrying = this.basketMesh.visible;
    this.arms[1].rotation.x = THREE.MathUtils.lerp(this.arms[1].rotation.x, carrying ? -0.3 : swing * 0.7, 0.3);
    if (this.state === 'picking') this.arms[0].rotation.x = THREE.MathUtils.lerp(this.arms[0].rotation.x, -1.3, 0.2);
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
      const spots = g.world.queueSpots;
      this.goTo(spots[Math.min(idx, spots.length - 1)]);
    }
    if (!this.path.length) {
      if (idx === 0 && !g.checkout.busy) {
        this.state = 'checkout';
        this.heading = Math.PI; // mirando al mostrador
        g.checkout.begin(this);
        this.basketMesh.visible = false;
        return;
      }
      const spots = g.world.queueSpots;
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
    this.game.scene.remove(this.mesh);
    this.mesh.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
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
    if (this.list.length >= CUSTOMER.maxInWorld) return;
    const rep = g.economy.reputation;
    const clean = g.cleaning.cleanliness();
    const p = CUSTOMER.baseSpawnPerMinute * this.hourFactor(minute / 60) * (0.45 + rep * 1.1) * (0.6 + 0.4 * clean);
    if (Math.random() < p) this.spawn();
  }

  spawn() {
    const g = this.game;
    const sp = g.world.spawnPoints[Math.floor(Math.random() * g.world.spawnPoints.length)];
    const c = new Customer(g, sp.clone().add(new THREE.Vector3(0, 0, (Math.random() - 0.5) * 0.8)));
    this.list.push(c);
    return c;
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
    for (const c of this.list) c.dispose();
    this.list = [];
  }
}
