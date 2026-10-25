// Muebles que se pueden mover: base común + mostrador con caja, escritorio con computadora y tacho.
import * as THREE from 'three';
import { screenTexture, woodGrain } from './textures.js';

export class Furniture {
  constructor(scene, { type, name, w, d }) {
    this.type = type;
    this.name = name;
    this.w = w;
    this.d = d;
    this.rot = 0;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, tag: type, furniture: this };
    this.interactMeshes = [];
  }

  get position() { return this.group.position; }

  // Caja que ocupa en el piso (las rotaciones son múltiplos de 90°)
  footprint(x = this.group.position.x, z = this.group.position.z, rot = this.rot) {
    const rotated = Math.abs(Math.sin(rot)) > 0.5;
    const hw = (rotated ? this.d : this.w) / 2;
    const hd = (rotated ? this.w : this.d) / 2;
    return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
  }

  place(x, z, rot) {
    this.rot = ((rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = this.rot;
    Object.assign(this.collider, this.footprint());
    this.group.updateMatrixWorld(true);
  }

  // Punto del lado "de uso" del mueble (local +z), útil para chequear que se pueda llegar.
  frontPoint(dist = 0.7) {
    return this.group.localToWorld(new THREE.Vector3(0, 0, this.d / 2 + dist)).setY(0);
  }

  mark(mesh, kind = 'furniture', extra = {}) {
    mesh.userData.interact = { kind, furniture: this, ...extra };
    this.interactMeshes.push(mesh);
  }

  add(geometry, material, x, y, z, { kind = 'furniture', parent = this.group } = {}) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    if (kind) this.mark(m, kind);
    return m;
  }
}

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });

// ---------- Mostrador con caja registradora ----------
export class Counter extends Furniture {
  constructor(scene) {
    super(scene, { type: 'counter', name: 'mostrador', w: 2.2, d: 0.8 });
    const H = 0.9;
    this.height = H;
    const wood = mat('#ffffff', { map: woodGrain(150, 110, [3, 1]), color: '#8a5a35' });
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    this.add(box(this.w, H - 0.05, this.d), wood, 0, (H - 0.05) / 2, 0);
    // zócalo y panel frontal
    this.add(box(this.w - 0.04, 0.08, this.d - 0.04), mat('#2b2b2b'), 0, 0.04, 0.0);
    this.add(box(this.w - 0.2, 0.5, 0.02), mat('#ffffff', { map: woodGrain(200, 160, [3, 1]), color: '#c99a6b' }), 0, 0.42, this.d / 2 + 0.01);
    this.add(box(this.w + 0.06, 0.05, this.d + 0.06), mat('#37474f', { roughness: 0.35 }), 0, H - 0.025, 0);
    // cinta transportadora
    this.add(box(1.25, 0.025, 0.36), mat('#1c1c1c', { roughness: 0.95 }), 0.28, H + 0.012, 0.17);
    for (const x of [-0.37, 0.93]) this.add(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10).rotateX(Math.PI / 2), mat('#9e9e9e', { metalness: 0.6 }), x, H + 0.02, 0.17);
    // separador de clientes
    this.add(box(0.3, 0.04, 0.05), mat('#ef6c00'), 0.6, H + 0.045, 0.32);

    // caja registradora (mira al jugador, lado -z local)
    const reg = new THREE.Group();
    reg.position.set(-0.75, H, -0.12);
    reg.rotation.y = Math.PI;
    this.group.add(reg);
    const R = (geo, m, x, y, z) => this.add(geo, m, x, y, z, { kind: 'register', parent: reg });
    R(box(0.45, 0.12, 0.38), mat('#263238', { roughness: 0.4 }), 0, 0.06, 0);
    R(box(0.4, 0.06, 0.14), mat('#455a64'), 0, 0.15, 0.06);
    // teclas
    const keyMat = mat('#eceff1', { roughness: 0.5 });
    for (let i = 0; i < 12; i++) R(box(0.045, 0.015, 0.035), keyMat, -0.11 + (i % 4) * 0.07, 0.19, 0.02 + Math.floor(i / 4) * 0.045);
    R(box(0.06, 0.2, 0.04), mat('#263238'), 0, 0.22, -0.1);
    this.regScreen = R(new THREE.PlaneGeometry(0.3, 0.16), new THREE.MeshStandardMaterial({ map: screenTexture(['CAJA', 'Libre'], '#1b5e20'), emissive: '#ffffff', emissiveIntensity: 0.4 }), 0, 0.36, -0.07);
    this.regScreen.material.emissiveMap = this.regScreen.material.map;
    this.regScreen.rotation.x = -0.2;
    // cajón de dinero
    R(box(0.42, 0.08, 0.02), mat('#37474f'), 0, 0.05, 0.2);
    // lector de código de barras
    const scanner = this.add(box(0.22, 0.03, 0.18), mat('#212121', { roughness: 0.3 }), -0.25, H + 0.015, 0.12, { kind: 'register' });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshStandardMaterial({ color: '#ff1744', emissive: '#ff1744', emissiveIntensity: 0.5, transparent: true, opacity: 0.6 }));
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0.016;
    scanner.add(glass);
  }

  // Posición en el mundo del producto i (de n) que deja el cliente en el mostrador.
  itemPosition(i, n) {
    const perRow = Math.max(1, Math.ceil(n / 2));
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const t = perRow === 1 ? 0.5 : col / (perRow - 1);
    const local = new THREE.Vector3(THREE.MathUtils.lerp(0.85, -0.3, t) + (Math.random() - 0.5) * 0.03, this.height + 0.03, row === 0 ? 0.3 : 0.08);
    return this.group.localToWorld(local);
  }

  customerSpot() {
    return this.group.localToWorld(new THREE.Vector3(0.25, 0, this.d / 2 + 0.75)).setY(0);
  }

  frontPoint() { return this.customerSpot(); }
}

// ---------- Escritorio con la computadora ----------
export class ComputerDesk extends Furniture {
  constructor(scene) {
    super(scene, { type: 'desk', name: 'escritorio', w: 1.3, d: 0.65 });
    const H = 0.76;
    const top = mat('#ffffff', { map: woodGrain(215, 170, [2, 1]), color: '#b98a5e' });
    const metal = mat('#3a3a3a', { metalness: 0.5, roughness: 0.4 });
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    this.add(box(this.w, 0.04, this.d), top, 0, H - 0.02, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.add(box(0.05, H - 0.04, 0.05), metal, sx * (this.w / 2 - 0.05), (H - 0.04) / 2, sz * (this.d / 2 - 0.05));
    this.add(box(this.w - 0.1, 0.25, 0.02), metal, 0, H - 0.2, -this.d / 2 + 0.05);
    // gabinete
    this.add(box(0.2, 0.42, 0.45), mat('#1e1e1e', { roughness: 0.4 }), this.w / 2 - 0.2, 0.22, -0.05);
    // monitor
    const P = (geo, m, x, y, z) => this.add(geo, m, x, y, z, { kind: 'computer' });
    P(box(0.24, 0.015, 0.18), mat('#2b2b2b'), 0, H + 0.008, -0.17);
    P(box(0.05, 0.22, 0.04), mat('#2b2b2b'), 0, H + 0.11, -0.2);
    P(box(0.62, 0.38, 0.035), mat('#151515', { roughness: 0.3 }), 0, H + 0.36, -0.17);
    const screen = P(new THREE.PlaneGeometry(0.58, 0.34), new THREE.MeshStandardMaterial({ map: screenTexture(['Market PC', 'Pedidos', 'Precios']), emissive: '#ffffff', emissiveIntensity: 0.6 }), 0, H + 0.36, -0.151);
    screen.material.emissiveMap = screen.material.map;
    // teclado y mouse
    P(box(0.44, 0.02, 0.15), mat('#2f2f2f'), -0.05, H + 0.01, 0.1);
    P(box(0.06, 0.02, 0.1), mat('#2f2f2f'), 0.28, H + 0.01, 0.1);
    // taza
    const mug = this.add(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 12), mat('#e53935'), -0.45, H + 0.045, -0.05);
    mug.userData.interact.kind = 'computer';
  }
}

// ---------- Tacho de basura ----------
export class TrashBin extends Furniture {
  constructor(scene) {
    super(scene, { type: 'trash', name: 'tacho', w: 0.56, d: 0.56 });
    const T = (geo, m, x, y, z) => this.add(geo, m, x, y, z, { kind: 'trash' });
    const body = mat('#455a64', { side: THREE.DoubleSide, roughness: 0.5 });
    T(new THREE.CylinderGeometry(0.26, 0.22, 0.8, 20, 1, true), body, 0, 0.4, 0);
    T(new THREE.CircleGeometry(0.22, 20).rotateX(-Math.PI / 2), mat('#263238'), 0, 0.02, 0);
    T(new THREE.TorusGeometry(0.26, 0.025, 8, 24).rotateX(Math.PI / 2), mat('#37474f'), 0, 0.8, 0);
    // bolsa negra asomando
    T(new THREE.CylinderGeometry(0.255, 0.24, 0.06, 20, 1, true), mat('#151515', { side: THREE.DoubleSide, roughness: 0.9 }), 0, 0.8, 0);
    // pedal
    T(new THREE.BoxGeometry(0.14, 0.03, 0.08), mat('#263238'), 0, 0.03, 0.26);
  }
}
