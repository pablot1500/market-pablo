// Caja: el cliente deja los productos, el jugador los escanea y cobra.
import * as THREE from 'three';
import { fmt } from './config.js';
import { createProductMesh } from './productMeshes.js';
import { screenTexture } from './textures.js';
import { sfx } from './audio.js';

export class Checkout {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.items = [];
    this.total = 0;
    this.phase = 'idle'; // idle | scanning | payment
    this.method = null;
    this.paid = 0;
    this.updateScreen();
  }

  get busy() { return this.current !== null; }

  begin(customer) {
    const g = this.game;
    this.current = customer;
    this.phase = 'scanning';
    this.total = 0;
    const area = g.world.counterItemArea;
    const n = customer.basket.length;
    const perRow = Math.max(1, Math.ceil(n / 2));
    customer.basket.forEach((product, i) => {
      const mesh = createProductMesh(product);
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const t = perRow === 1 ? 0.5 : col / (perRow - 1);
      mesh.position.set(
        THREE.MathUtils.lerp(area.maxX, area.minX, t) + (Math.random() - 0.5) * 0.03,
        area.y,
        row === 0 ? area.z1 : area.z0,
      );
      mesh.rotation.y = Math.random() * Math.PI;
      // una caja de colisión un poco más grande para que sea fácil apuntarle
      const [w, h, d] = product.size;
      const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.12), Math.max(h, 0.12), Math.max(d, 0.12)), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = h / 2;
      mesh.add(hit);
      hit.userData.interact = { kind: 'checkoutItem', item: mesh, product };
      g.scene.add(mesh);
      g.addInteractable(hit);
      this.items.push({ mesh, hit, product });
    });
    this.updateScreen();
  }

  scan(entry) {
    const idx = this.items.findIndex((it) => it.mesh === entry.item);
    if (idx < 0 || this.phase !== 'scanning') return;
    const it = this.items[idx];
    this.items.splice(idx, 1);
    this.game.scene.remove(it.mesh);
    this.game.removeInteractable(it.hit);
    this.total += this.game.economy.prices[it.product.id];
    sfx.beep();
    if (this.items.length === 0) this.startPayment();
    this.updateScreen();
  }

  startPayment() {
    this.phase = 'payment';
    this.method = Math.random() < 0.55 ? 'cash' : 'card';
    if (this.method === 'cash') this.paid = cashAmount(this.total);
    this.current.say(this.method === 'cash' ? `Te pago con ${fmt(this.paid)}` : 'Pago con tarjeta');
  }

  payCard(cents) {
    if (cents !== this.total) {
      sfx.error();
      return { ok: false, msg: `El monto no coincide (ingresaste ${fmt(cents)}).` };
    }
    this.finish(0);
    return { ok: true };
  }

  payCash(given) {
    const due = this.paid - this.total;
    if (given < due) {
      sfx.error();
      return { ok: false, msg: `Falta vuelto: ${fmt(due - given)}` };
    }
    this.finish(given - due);
    return { ok: true };
  }

  finish(extraChange) {
    const g = this.game;
    const c = this.current;
    g.economy.earn(this.total);
    g.economy.today.served++;
    g.economy.today.itemsSold += c.basket.length;
    if (extraChange > 0) {
      g.economy.money -= extraChange;
      g.economy.today.revenue -= extraChange;
      g.ui.toast(`Diste ${fmt(extraChange)} de vuelto de más`, 'bad');
    }
    sfx.cash();
    g.ui.toast(`Cobraste ${fmt(this.total)}`, 'good', 2200);
    if (g.ui.panelOpen === 'payment') {
      g.ui.hidePanel();
      g.resumeAfterPanel(true);
    }
    this.reset();
    c.checkoutDone();
  }

  abort() {
    for (const it of this.items) {
      this.game.scene.remove(it.mesh);
      this.game.removeInteractable(it.hit);
    }
    if (this.game.ui.panelOpen === 'payment') {
      this.game.ui.hidePanel();
      this.game.resumeAfterPanel(false);
    }
    this.reset();
  }

  reset() {
    this.items = [];
    this.current = null;
    this.phase = 'idle';
    this.total = 0;
    this.method = null;
    this.paid = 0;
    this.updateScreen();
  }

  hudText() {
    if (!this.current) return '';
    if (this.phase === 'scanning') return `🧾 Cliente en caja\nProductos por escanear: ${this.items.length}\nSubtotal: ${fmt(this.total)}`;
    const how = this.method === 'cash' ? `Efectivo: te da ${fmt(this.paid)}` : 'Tarjeta';
    return `🧾 Total: ${fmt(this.total)}\n${how}\n→ Click en la caja registradora`;
  }

  updateScreen() {
    const screen = this.game.world.regScreen;
    const old = screen.material.map;
    const lines = this.phase === 'idle' ? ['CAJA', 'Libre'] : this.phase === 'scanning' ? ['Subtotal', fmt(this.total)] : ['TOTAL', fmt(this.total)];
    const tex = screenTexture(lines, '#1b5e20');
    screen.material.map = tex;
    screen.material.emissiveMap = tex;
    screen.material.needsUpdate = true;
    if (old) old.dispose();
  }
}

// Monto con el que paga un cliente en efectivo (redondea a un billete cómodo)
function cashAmount(total) {
  const opts = new Set();
  for (const step of [100, 500, 1000, 2000, 5000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total) opts.add(v);
  }
  if (Math.random() < 0.15) return total; // a veces paga justo
  const list = [...opts].sort((a, b) => a - b).slice(0, 3);
  return list[Math.floor(Math.random() * list.length)] || total;
}
