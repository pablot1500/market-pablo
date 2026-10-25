// Punto de entrada: arma la escena, conecta los sistemas y corre el loop principal.
import * as THREE from 'three';
import { CLOSE_HOUR, GAME_MINUTES_PER_SECOND, OPEN_HOUR, PLAYER, PRODUCTS, PRODUCT_BY_ID, WORLD_BOUNDS, fmt } from './config.js';
import { buildWorld, FURNITURE_LAYOUT } from './world.js';
import { ShelfUnit } from './shelves.js';
import { Counter, ComputerDesk, TrashBin } from './furniture.js';
import { FurnitureMover } from './mover.js';
import { Box, BOX_SIZE } from './boxes.js';
import { NavGrid } from './pathfinding.js';
import { Player } from './player.js';
import { Economy } from './economy.js';
import { Checkout } from './checkout.js';
import { CustomerManager } from './customers.js';
import { Cleaning } from './cleaning.js';
import { Traffic } from './traffic.js';
import { UI } from './ui.js';
import { sfx } from './audio.js';
import { hasSave, readSave, writeSave, readSettings, writeSettings } from './save.js';

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.canvas = this.renderer.domElement;
    document.getElementById('app').prepend(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 220);
    this.scene.add(this.camera);

    this.world = buildWorld(this.scene);
    this.interactables = [...this.world.interactables];
    this.colliders = [...this.world.colliders];

    // muebles (todos se pueden mover con F)
    this.furniture = [];
    this.shelves = [];
    for (const [type, x, z, r] of FURNITURE_LAYOUT) {
      let f;
      if (type === 'shelf') { f = new ShelfUnit(this.scene, this.shelves.length); this.shelves.push(f); }
      else if (type === 'counter') f = this.counter = new Counter(this.scene);
      else if (type === 'desk') f = this.desk = new ComputerDesk(this.scene);
      else f = this.trash = new TrashBin(this.scene);
      f.place(x, z, r);
      this.furniture.push(f);
      this.colliders.push(f.collider);
      for (const m of f.interactMeshes) this.addInteractable(m);
      if (type === 'shelf') for (const slot of f.slots) { this.addInteractable(slot.hit); this.addInteractable(slot.tagMesh); }
    }
    this.nav = new NavGrid({ minX: WORLD_BOUNDS.minX - 0.5, maxX: WORLD_BOUNDS.maxX + 0.5, minZ: WORLD_BOUNDS.minZ, maxZ: WORLD_BOUNDS.maxZ + 0.5 });
    this.nav.rebuild(this.colliders);
    this.updateQueueSpots();

    this.player = new Player(this.camera, this.canvas);
    this.player.setPosition(this.world.playerStart, Math.PI);
    this.settings = { sensitivity: 1, ...readSettings() };
    this.player.sensitivity = this.settings.sensitivity;
    this.economy = new Economy();
    this.ui = new UI(this);
    this.checkout = new Checkout(this);
    this.cleaning = new Cleaning(this);
    this.customers = new CustomerManager(this);
    this.traffic = new Traffic(this.scene);
    this.mover = new FurnitureMover(this);

    this.boxes = [];
    this.queue = [];
    this.day = 1;
    this.time = OPEN_HOUR * 60;
    this.open = false;
    this.closedForDay = false;
    this.summaryShown = false;
    this.started = false;
    this.locked = false;
    this.forceRun = false; // para pruebas automáticas sin pointer lock
    this.timeScale = 1;
    this.mouseDown = false;
    this.target = null;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = PLAYER.reach;
    this.center = new THREE.Vector2(0, 0);
    this.clock = new THREE.Clock();

    for (const slot of this.allSlots()) slot.refreshTag(this.economy.prices);
    this.world.setTimeOfDay(this.time);
    this.player.update(0, this.colliders);
    this.bindInput();
    this.bindMenus();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- utilidades ----------
  addInteractable(obj) { this.interactables.push(obj); }
  removeInteractable(obj) {
    const i = this.interactables.indexOf(obj);
    if (i >= 0) this.interactables.splice(i, 1);
  }

  *allSlots() { for (const u of this.shelves) yield* u.slots; }

  findSlotWith(product, from) {
    let best = null, bestD = Infinity;
    for (const s of this.allSlots()) {
      if (s.product !== product || s.count === 0) continue;
      const p = s.accessPoint();
      const d = p.distanceToSquared(from);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  // Fila de la caja: sale del frente del mostrador y sigue el camino hacia la entrada.
  updateQueueSpots() {
    const start = this.counter.customerSpot();
    const target = this.world.storeEntry.clone().add(new THREE.Vector3(0, 0, -2.2));
    const spots = [start.clone()];
    const walk = (from, to) => {
      const pts = [from, ...this.nav.findPath(from, to)];
      let carry = 0;
      for (let i = 1; i < pts.length && spots.length < 10; i++) {
        const a = pts[i - 1], b = pts[i];
        const len = a.distanceTo(b);
        let d = 0.85 - carry;
        while (d <= len && spots.length < 10) {
          spots.push(a.clone().lerp(b, d / len));
          d += 0.85;
        }
        carry = len - (d - 0.85);
      }
    };
    walk(start, target);
    if (spots.length < 10) walk(spots[spots.length - 1], new THREE.Vector3(0, 0, 0));
    this.queueSpots = spots;
  }

  // Verifica que, con los muebles como están, se pueda llegar a todo. Devuelve el problema o null.
  checkLayout() {
    const entry = this.world.storeEntry;
    const nav = this.nav;
    if (!nav.reachable(entry, this.counter.customerSpot())) return 'Así los clientes no pueden llegar a la caja';
    const behind = this.counter.group.localToWorld(new THREE.Vector3(0, 0, -this.counter.d / 2 - 0.6)).setY(0);
    if (!nav.reachable(entry, behind)) return 'Así no podés pararte detrás de la caja';
    if (!nav.reachable(entry, this.desk.frontPoint(0.6))) return 'Así no podés llegar a la computadora';
    for (const s of this.shelves) if (!nav.reachable(entry, s.frontPoint(0.6))) return 'Así un estante queda sin acceso';
    return null;
  }

  onLayoutChanged() {
    this.nav.rebuild(this.colliders);
    this.updateQueueSpots();
    for (const c of this.customers.list) {
      if (c.state === 'toShelf') c.goTo(c.target.slot.accessPoint());
      else if (c.state === 'queue') c.queueIndex = -1;
      else if (c.state === 'entering') c.goTo(this.world.storeEntry);
      else if (c.state === 'leaving') c.goTo(c.exitPoint);
    }
  }

  stockOf(product) {
    let shelf = 0, boxes = 0;
    for (const s of this.allSlots()) if (s.product === product) shelf += s.count;
    for (const b of this.boxes) if (b.product === product) boxes += b.count;
    if (this.player.held && this.player.held.product === product) boxes += this.player.held.count;
    return { shelf, boxes };
  }

  setPrice(productId, cents) {
    this.economy.setPrice(productId, cents);
    for (const s of this.allSlots()) if (s.product && s.product.id === productId) s.refreshTag(this.economy.prices);
  }

  freeDeliverySpots() { return this.world.deliverySpots.filter((s) => !s.box).length; }

  placeOrder(cart) {
    const items = PRODUCTS.filter((p) => cart[p.id] > 0);
    const nBoxes = items.reduce((a, p) => a + cart[p.id], 0);
    const total = items.reduce((a, p) => a + cart[p.id] * this.economy.boxPrice(p), 0);
    if (!nBoxes) return false;
    if (!this.economy.canAfford(total)) { this.ui.toast('No te alcanza la plata', 'bad'); sfx.error(); return false; }
    if (nBoxes > this.freeDeliverySpots()) { this.ui.toast('No hay lugar en la vereda para tantas cajas', 'bad'); sfx.error(); return false; }
    this.economy.spend(total);
    for (const p of items) {
      for (let i = 0; i < cart[p.id]; i++) {
        const spot = this.world.deliverySpots.find((s) => !s.box);
        this.spawnBox(p, p.boxQty, { spot });
      }
    }
    sfx.cash();
    this.ui.toast(`Pedido de ${nBoxes} caja${nBoxes > 1 ? 's' : ''} entregado en la vereda 📦 (${fmt(total)})`, 'good');
    return true;
  }

  spawnBox(product, count, { spot = null, x = 0, y = 0, z = 0, ry = 0 } = {}) {
    const box = new Box(product, count);
    if (spot) {
      box.mesh.position.set(spot.x, spot.y + BOX_SIZE[1] / 2 + 0.01, spot.z);
      box.mesh.rotation.y = (Math.random() - 0.5) * 0.1;
      spot.box = box;
      box.spot = spot;
    } else {
      box.mesh.position.set(x, y, z);
      box.mesh.rotation.y = ry;
    }
    this.scene.add(box.mesh);
    this.addInteractable(box.mesh);
    this.boxes.push(box);
    return box;
  }

  // ---------- acciones del jugador ----------
  pickUp(box) {
    if (this.player.held) { this.ui.toast('Ya tenés una caja en las manos (Q para soltarla)', 'bad'); return; }
    // si es una pila, agarrar la de arriba
    const p = box.mesh.position;
    let top = box;
    for (const b of this.boxes) {
      const q = b.mesh.position;
      if (Math.abs(q.x - p.x) < 0.3 && Math.abs(q.z - p.z) < 0.3 && q.y > top.mesh.position.y + 0.05) top = b;
    }
    box = top;
    if (box.spot) { box.spot.box = null; box.spot = null; }
    this.boxes.splice(this.boxes.indexOf(box), 1);
    this.removeInteractable(box.mesh);
    this.player.hold(box);
    sfx.pick();
  }

  dropHeld() {
    const pl = this.player;
    if (!pl.held) return;
    const fwd = pl.forward();
    let pos = null;
    for (const d of [0.9, 0.65, 0.4]) {
      const x = pl.position.x + fwd.x * d, z = pl.position.z + fwd.z * d;
      if (!this.pointBlocked(x, z, 0.28)) { pos = { x, z }; break; }
    }
    if (!pos) pos = { x: pl.position.x, z: pl.position.z };
    const box = pl.release();
    let y = BOX_SIZE[1] / 2 + 0.01;
    for (const b of this.boxes) {
      const q = b.mesh.position;
      if (Math.abs(q.x - pos.x) < 0.38 && Math.abs(q.z - pos.z) < 0.32) {
        y = Math.max(y, q.y + BOX_SIZE[1] + 0.005);
        pos = { x: q.x, z: q.z };
      }
    }
    if (y > 1.6) y = BOX_SIZE[1] / 2 + 0.01;
    box.mesh.position.set(pos.x, y, pos.z);
    box.mesh.rotation.set(0, pl.yaw, 0);
    this.scene.add(box.mesh);
    this.addInteractable(box.mesh);
    this.boxes.push(box);
    sfx.thud();
  }

  pointBlocked(x, z, r) {
    return this.colliders.some((c) => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
  }

  placeItem(slot) {
    const box = this.player.held;
    if (!box) return;
    if (box.count === 0) { this.ui.toast('La caja está vacía. Tirala en el tacho.', 'info', 1800); return; }
    if (slot.product && slot.product !== box.product) { this.ui.toast(`Este espacio tiene ${slot.product.short}`, 'bad', 1600); sfx.error(); return; }
    if (slot.isFull()) { this.ui.toast('El estante está lleno', 'info', 1400); return; }
    slot.add(box.product);
    box.count--;
    slot.refreshTag(this.economy.prices);
    sfx.place();
  }

  takeItem(slot) {
    const box = this.player.held;
    if (!box || !slot.product || slot.count === 0) return;
    if (box.count > 0 && box.product !== slot.product) { this.ui.toast('La caja tiene otro producto', 'bad', 1500); return; }
    if (box.count === 0 && box.product !== slot.product) box.setProduct(slot.product);
    if (box.count >= box.capacity) { this.ui.toast('La caja está llena', 'info', 1400); return; }
    slot.remove();
    box.count++;
    slot.clearIfEmpty();
    slot.refreshTag(this.economy.prices);
    sfx.pick();
  }

  trashHeld() {
    const box = this.player.held;
    if (!box) return;
    if (box.count > 0) { this.ui.toast('Solo podés tirar cajas vacías', 'bad', 1600); sfx.error(); return; }
    this.player.release();
    box.mesh.geometry.dispose();
    sfx.thud();
  }

  setOpen(open) {
    if (open && this.closedForDay) { this.ui.toast('La tienda ya cerró por hoy', 'info'); return; }
    this.open = open;
    this.world.setOpenSign(open);
    sfx.door();
    if (open) this.ui.toast('¡Tienda abierta! Empieza a correr el tiempo.', 'good');
    else {
      this.customers.closeStore();
      if (!this.closedForDay) this.ui.toast('Tienda cerrada: el tiempo se detiene.', 'info');
    }
  }

  // ---------- interacción ----------
  hintFor(t) {
    if (this.mover.active) return this.mover.hint();
    if (!t) return '';
    const base = this.baseHint(t);
    const f = t.furniture || (t.slot && t.slot.unit);
    if (f && !this.player.held) return base ? `${base}\nF: mover ${f.name}` : `F: mover ${f.name}`;
    return base;
  }

  baseHint(t) {
    const held = this.player.held;
    const e = this.economy;
    switch (t.kind) {
      case 'slot': {
        const s = t.slot;
        if (held) {
          if (held.count === 0) return s.product ? 'Click der.: guardar en la caja' : 'La caja está vacía';
          if (s.product && s.product !== held.product) return `Este espacio tiene ${s.product.short}`;
          const lines = [];
          const cap = s.capacityFor(held.product);
          lines.push(s.count >= cap ? 'Estante lleno' : `Click: poner ${held.product.short} (${s.count}/${cap})`);
          if (s.count > 0 && held.count < held.capacity) lines.push('Click der.: devolver a la caja');
          return lines.join('\n');
        }
        if (!s.product) return 'Espacio vacío';
        return `${s.product.name} · ${s.count}/${s.capacityFor(s.product)} · ${fmt(e.prices[s.product.id])}\nE: cambiar precio`;
      }
      case 'box': return held ? 'Ya tenés una caja en las manos' : `E: levantar ${t.box.describe().toLowerCase()}`;
      case 'sign': return this.closedForDay ? 'La tienda ya cerró por hoy' : this.open ? 'E: cerrar la tienda' : 'E: abrir la tienda';
      case 'computer': return 'E: usar la computadora';
      case 'trash': return held ? (held.count === 0 ? 'Click: tirar la caja' : 'Solo podés tirar cajas vacías') : 'Tacho de basura';
      case 'checkoutItem': return `Click: escanear ${t.product.short} (${fmt(e.prices[t.product.id])})`;
      case 'register':
        if (this.checkout.phase === 'payment') return `Click: cobrar ${fmt(this.checkout.total)}`;
        if (this.checkout.phase === 'scanning') return 'Escaneá los productos del mostrador';
        return 'Caja registradora';
      case 'dirt': return held ? 'Soltá la caja (Q) para limpiar' : 'Mantené click: limpiar';
      case 'furniture': return '';
      default: return '';
    }
  }

  primaryAction() {
    if (this.mover.active) { this.mover.confirm(); return; }
    const t = this.target;
    if (!t) return;
    switch (t.kind) {
      case 'slot': if (this.player.held) this.placeItem(t.slot); break;
      case 'trash': this.trashHeld(); break;
      case 'checkoutItem': this.checkout.scan(t); break;
      case 'register': if (this.checkout.phase === 'payment') this.ui.openPayment(this.checkout); break;
      case 'box': if (!this.player.held) this.pickUp(t.box); break;
      case 'sign': this.setOpen(!this.open); break;
      case 'computer': this.ui.openComputer(); break;
    }
  }

  secondaryAction() {
    if (this.mover.active) return;
    const t = this.target;
    if (t && t.kind === 'slot' && this.player.held) this.takeItem(t.slot);
  }

  useAction() {
    const t = this.target;
    if (!t) return;
    switch (t.kind) {
      case 'box': this.pickUp(t.box); break;
      case 'sign': this.setOpen(!this.open); break;
      case 'computer': this.ui.openComputer(); break;
      case 'slot': if (!this.player.held && t.slot.product) this.ui.openPriceDialog(t.slot.product); break;
      case 'register': if (this.checkout.phase === 'payment') this.ui.openPayment(this.checkout); break;
      case 'trash': this.trashHeld(); break;
    }
  }

  updateTarget() {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    this.target = hits.length ? hits[0].object.userData.interact : null;
  }

  // ---------- entrada ----------
  bindInput() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    this.canvas.addEventListener('click', () => {
      if (this.started && !this.locked && !this.ui.panelOpen) this.lockPointer();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.player.locked = this.locked;
      if (this.locked) document.getElementById('overlay-pause').classList.add('hidden');
      else if (this.started && !this.ui.panelOpen) this.showPause();
    });
    document.addEventListener('pointerlockerror', () => { if (this.started && !this.ui.panelOpen) this.showPause(); });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) { this.mouseDown = true; this.primaryAction(); }
      if (e.button === 2) this.secondaryAction();
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => {
      if (this.locked && this.mover.active) this.mover.rotate(e.deltaY > 0 ? 1 : -1);
    });
    document.addEventListener('keydown', (e) => {
      if (!this.locked || this.ui.panelOpen) return;
      if (this.mover.active) {
        if (e.code === 'KeyF') this.mover.confirm();
        if (e.code === 'KeyR') this.mover.rotate(1);
        if (e.code === 'KeyQ') this.mover.cancel();
        return;
      }
      if (e.code === 'KeyE') this.useAction();
      if (e.code === 'KeyQ') this.dropHeld();
      if (e.code === 'KeyF') {
        const t = this.target;
        const f = t && (t.furniture || (t.slot && t.slot.unit));
        if (f) this.mover.start(f);
      }
    });
  }

  lockPointer() {
    sfx.unlock();
    try {
      const r = this.canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => this.showPause());
    } catch {
      this.showPause();
    }
  }

  showPause() {
    document.getElementById('overlay-pause').classList.remove('hidden');
    this.mouseDown = false;
  }

  resumeAfterPanel(fromClick) {
    if (!this.started) return;
    if (fromClick) this.lockPointer();
    else this.showPause();
  }

  bindMenus() {
    const start = document.getElementById('overlay-start');
    const cont = document.getElementById('btn-continue');
    cont.classList.toggle('hidden', !hasSave());
    const begin = () => {
      start.classList.add('hidden');
      this.ui.showHUD(true);
      this.started = true;
      this.lockPointer();
      if (this.day === 1 && this.boxes.length === 0) {
        setTimeout(() => this.ui.toast('Empezá usando la computadora del escritorio para comprar mercadería 🖥️', 'info', 6000), 600);
      }
    };
    const safe = (fn) => () => {
      try { fn(); } catch (err) {
        console.error(err);
        if (window.__showLoadError) window.__showLoadError(err.message);
      }
    };
    document.getElementById('btn-new').addEventListener('click', safe(begin));
    cont.addEventListener('click', safe(() => { this.load(readSave()); begin(); }));
    document.getElementById('btn-resume').addEventListener('click', () => this.lockPointer());
    document.getElementById('btn-save').addEventListener('click', () => {
      const ok = writeSave(this.serialize());
      document.getElementById('save-info').textContent = ok ? 'Partida guardada ✔' : 'No se pudo guardar en este navegador.';
    });
    document.getElementById('btn-menu').addEventListener('click', () => location.reload());
    const sliders = [...document.querySelectorAll('.sens-slider')];
    const showSens = () => {
      for (const sl of sliders) {
        sl.value = this.settings.sensitivity;
        sl.parentElement.querySelector('.sens-val').textContent = `${this.settings.sensitivity.toFixed(2)}x`;
      }
    };
    for (const sl of sliders) {
      sl.addEventListener('input', () => {
        this.settings.sensitivity = Number(sl.value);
        this.player.sensitivity = this.settings.sensitivity;
        showSens();
        writeSettings(this.settings);
      });
      sl.addEventListener('click', (e) => e.stopPropagation());
    }
    showSens();
  }

  // ---------- día ----------
  nextDay() {
    this.day++;
    this.time = OPEN_HOUR * 60;
    this.closedForDay = false;
    this.summaryShown = false;
    const changes = this.economy.fluctuate();
    this.economy.resetDayStats();
    writeSave(this.serialize());
    const up = changes.filter((c) => c.change > 0).map((c) => `${c.product.short} ▲${Math.round(c.change * 100)}%`);
    const down = changes.filter((c) => c.change < 0).map((c) => `${c.product.short} ▼${Math.round(-c.change * 100)}%`);
    this.ui.toast(`Día ${this.day} · Partida guardada`, 'good');
    if (up.length) this.ui.toast(`Subieron: ${up.join(', ')}`, 'bad', 7000);
    if (down.length) this.ui.toast(`Bajaron: ${down.join(', ')}`, 'good', 7000);
  }

  updateTime(dt) {
    if (this.open) {
      const before = this.time;
      this.time += dt * GAME_MINUTES_PER_SECOND * this.timeScale;
      const end = Math.min(this.time, CLOSE_HOUR * 60);
      for (let m = Math.floor(before) + 1; m <= Math.floor(end); m++) this.customers.minuteTick(m);
      if (this.time >= CLOSE_HOUR * 60) {
        this.time = CLOSE_HOUR * 60;
        this.closedForDay = true;
        this.setOpen(false);
        this.ui.toast('Son las 21:00: la tienda cerró. Terminá de atender a los que quedan.', 'info', 5000);
      }
    }
    if (this.closedForDay && !this.summaryShown && !this.checkout.busy && this.customers.list.every((c) => c.state === 'leaving')) {
      this.summaryShown = true;
      this.ui.openSummary(() => this.nextDay());
    }
  }

  // ---------- guardado ----------
  serialize() {
    const slots = [];
    for (const u of this.shelves) for (const s of u.slots) if (s.product && s.count) slots.push({ u: u.id, i: s.index, p: s.product.id, n: s.count });
    const spots = this.world.deliverySpots;
    const boxes = this.boxes.map((b) => ({ ...b.toJSON(), spot: b.spot ? spots.indexOf(b.spot) : -1 }));
    const held = this.player.held;
    if (held) boxes.push({ product: held.product ? held.product.id : null, count: held.count, x: this.player.position.x, y: BOX_SIZE[1] / 2, z: this.player.position.z, ry: 0, spot: -1 });
    return {
      version: 1,
      day: this.day,
      time: this.time,
      closedForDay: this.closedForDay,
      economy: this.economy.toJSON(),
      slots,
      boxes,
      dirt: this.cleaning.toJSON(),
      furniture: this.furniture.map((f) => ({ type: f.type, x: f.position.x, z: f.position.z, r: f.rot })),
      player: { x: this.player.position.x, z: this.player.position.z, yaw: this.player.yaw },
    };
  }

  load(data) {
    if (!data || data.version !== 1) return;
    this.day = data.day;
    this.time = data.time;
    this.closedForDay = data.closedForDay;
    this.economy.load(data.economy);
    if (Array.isArray(data.furniture) && data.furniture.length === this.furniture.length) {
      data.furniture.forEach((d, i) => { if (d.type === this.furniture[i].type) this.furniture[i].place(d.x, d.z, d.r); });
      this.onLayoutChanged();
    }
    for (const s of data.slots) {
      const slot = this.shelves[s.u] && this.shelves[s.u].slots[s.i];
      const product = PRODUCT_BY_ID[s.p];
      if (!slot || !product) continue;
      for (let k = 0; k < s.n; k++) slot.add(product);
    }
    for (const b of data.boxes) {
      const product = b.product ? PRODUCT_BY_ID[b.product] : null;
      const spot = b.spot >= 0 ? this.world.deliverySpots[b.spot] : null;
      const box = this.spawnBox(product, b.count, spot && !spot.box ? { spot } : { x: b.x, y: b.y, z: b.z, ry: b.ry });
      if (!product) box.setProduct(null);
    }
    for (const d of data.dirt) this.cleaning.spawn(d.x, d.z);
    if (data.player) this.player.setPosition(new THREE.Vector3(data.player.x, 0, data.player.z), data.player.yaw);
    for (const slot of this.allSlots()) slot.refreshTag(this.economy.prices);
    if (this.closedForDay) this.summaryShown = false;
  }

  // ---------- loop ----------
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const running = this.started && (this.locked || this.ui.panelOpen || this.forceRun) && this.ui.panelOpen !== 'summary';
    if (running) this.step(dt);
    this.renderer.render(this.scene, this.camera);
  }

  step(dt) {
    this.player.update(dt, this.colliders);
    this.updateTime(dt);
    this.customers.update(dt);
    this.traffic.update(dt, this.player.position);
    this.traffic.setNight(this.world.setTimeOfDay(this.time));
    this.world.updateDoors(dt, [this.player.position, ...this.customers.list]);

    if (this.mover.active) { this.mover.update(); this.target = null; }
    else if (!this.ui.panelOpen) this.updateTarget();
    else this.target = null;
    const progress = this.cleaning.update(dt, this.target, this.mouseDown);
    this.ui.setProgress(progress);
    this.ui.setHint(this.hintFor(this.target));
    this.ui.setHeld(this.player.held ? `📦 ${this.player.held.describe()}` : '');
    this.ui.setCheckout(this.checkout.hudText());
    this.ui.updateHUD();
  }
}

const game = new Game();
window.__game = game; // útil para depurar desde la consola
