// Exterior: edificios con detalles, árboles, faroles y mobiliario urbano.
import * as THREE from 'three';
import * as T from './textures.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });

function withRepeat(tex, rx, ry) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

const SHOPS = [
  ['Farmacia', '#1b7a4a'], ['Panadería', '#8d4a12'], ['Kiosco', '#b71c1c'], ['Ferretería', '#37474f'],
  ['Verdulería', '#2e7d32'], ['Café', '#4e342e'], ['Librería', '#283593'], ['Peluquería', '#6a1b9a'],
  ['Lavadero', '#00838f'], ['Pizzería', '#c62828'], ['Óptica', '#455a64'], ['Heladería', '#ad1457'],
];
const WALLS = ['#d9a066', '#b5c7a3', '#c9a0a0', '#a8b8cc', '#e0cf9e', '#c4b5d6', '#e8d9c4', '#9fb7a8'];
const SHUTTERS = ['#5d7b6f', '#6d4c41', '#37474f', '#7b5e3b', '#4a6572'];

export function buildExterior(scene, addCollider) {
  let shopIdx = 0, colorIdx = 0;
  const railTex = T.railingTexture();
  const railMat = new THREE.MeshStandardMaterial({ map: railTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });
  const corniceMat = mat('#e9e2d3');
  const slabMat = mat('#cfc8ba');
  const roofMat = mat('#6b6b6b', { roughness: 0.95 });
  const acMat = mat('#d0d0d0', { metalness: 0.3, roughness: 0.5 });

  const building = (x0, x1, z0, z1, floors, facing) => {
    const w = x1 - x0, d = z1 - z0;
    const color = WALLS[colorIdx++ % WALLS.length];
    const groundH = 3.4, floorH = 3.0;
    const h = groundH + (floors - 1) * floorH;
    const side = mat(color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.6, d), side);
    body.position.set((x0 + x1) / 2, (h + 0.6) / 2, (z0 + z1) / 2);
    scene.add(body);
    addCollider(x0, x1, z0, z1);

    const g = new THREE.Group();
    g.position.set((x0 + x1) / 2, 0, facing > 0 ? z1 : z0);
    g.rotation.y = facing > 0 ? 0 : Math.PI;
    scene.add(g);
    const place = (mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

    // planta baja con locales
    const shops = Math.max(1, Math.round(w / 6));
    const [name, signColor] = SHOPS[shopIdx++ % SHOPS.length];
    const shopTex = withRepeat(T.shopFront(color, name, signColor), shops, 1);
    place(new THREE.Mesh(new THREE.PlaneGeometry(w, groundH), mat('#ffffff', { map: shopTex })), 0, groundH / 2, 0.02);
    // toldo de tela sobre el local
    const awning = place(new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.06, 0.9), mat(signColor, { roughness: 0.9 })), -w * 0.12, 2.28, 0.45);
    awning.rotation.x = 0.25;

    // pisos superiores
    const bays = Math.max(1, Math.round(w / 3));
    if (floors > 1) {
      const bayTex = withRepeat(T.facadeBay(color, { shutters: SHUTTERS[colorIdx % SHUTTERS.length], style: colorIdx % 3 === 0 ? 1 : 0 }), bays, floors - 1);
      place(new THREE.Mesh(new THREE.PlaneGeometry(w, (floors - 1) * floorH), mat('#ffffff', { map: bayTex })), 0, groundH + (floors - 1) * floorH / 2, 0.02);
    }
    // moldura entre planta baja y primer piso, cornisa arriba
    place(new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.18, 0.28), corniceMat), 0, groundH, 0.12);
    place(new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, 0.42), corniceMat), 0, h + 0.05, 0.2);
    place(new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, 0.3), corniceMat), 0, h + 0.6, 0.12);
    // pilastras en los bordes
    for (const sx of [-1, 1]) place(new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.12), corniceMat), sx * (w / 2 - 0.15), h / 2, 0.06);

    // balcones
    const bayW = w / bays;
    for (let f = 1; f < floors; f++) {
      for (let b = 0; b < bays; b++) {
        if (Math.random() > 0.4) continue;
        const bx = -w / 2 + bayW * (b + 0.5) + (bayW * 0.0);
        const by = groundH + (f - 1) * floorH + 0.25;
        place(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.6), slabMat), bx - bayW * 0.0, by, 0.3);
        place(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9), railMat), bx, by + 0.5, 0.6);
        for (const sx of [-1, 1]) {
          const r = place(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), railMat), bx + sx * 0.85, by + 0.5, 0.3);
          r.rotation.y = Math.PI / 2;
        }
        // maceta
        if (Math.random() < 0.6) {
          place(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 10), mat('#a0522d')), bx + 0.5, by + 0.15, 0.4);
          place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), mat('#3f7f3a', { flatShading: true })), bx + 0.5, by + 0.35, 0.4);
        }
      }
    }

    // techo: aire acondicionado y tanque de agua
    const roofY = h + 0.6;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roofMat);
    top.rotation.x = -Math.PI / 2;
    top.position.set((x0 + x1) / 2, roofY + 0.01, (z0 + z1) / 2);
    scene.add(top);
    if (Math.random() < 0.7) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.1, 14), mat('#5f7d95', { roughness: 0.5 }));
      tank.position.set(x0 + w * (0.3 + Math.random() * 0.4), roofY + 0.55, (z0 + z1) / 2);
      scene.add(tank);
    }
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.5) continue;
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), acMat);
      ac.position.set(x0 + 0.8 + Math.random() * (w - 1.6), roofY + 0.25, facing > 0 ? z1 - 1.2 : z0 + 1.2);
      scene.add(ac);
    }
  };

  // vecinos a los costados de la tienda (miran a la calle)
  const sideSegments = [[-40, -31.8], [-31.8, -23.4], [-23.4, -15.2], [-15.2, -7.1], [7.1, 15.2], [15.2, 23.4], [23.4, 31.8], [31.8, 40]];
  sideSegments.forEach(([a, b], i) => building(a, b, -14, 6.1, 2 + (i % 3), 1));
  // vereda de enfrente
  for (let x = -44; x < 44; x += 8) building(x, x + 8, 17.6, 26, 3 + ((x / 8 + 6) % 3 | 0), -1);

  // ---------- Árboles ----------
  const bark = mat('#5d4037', { roughness: 1 });
  const leafMats = ['#3f7f3a', '#4c8c3f', '#356e33', '#5a9645'].map((c) => mat(c, { flatShading: true, roughness: 0.9 }));
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const soil = mat('#4a3a2c', { roughness: 1 });
  const grate = mat('#2f3335', { metalness: 0.6, roughness: 0.5 });
  const tree = (x, z) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.17, 2.3, 9), bark);
    trunk.position.y = 1.15;
    trunk.rotation.z = (Math.random() - 0.5) * 0.08;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.9, 6), bark);
      const a = (i / 3) * Math.PI * 2 + Math.random();
      br.position.set(Math.cos(a) * 0.25, 2.0 + i * 0.15, Math.sin(a) * 0.25);
      br.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(br);
    }
    const blobs = 7 + Math.floor(Math.random() * 3);
    for (let i = 0; i < blobs; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMats[i % leafMats.length]);
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 0.45 + Math.random() * 0.4;
      const s = i === 0 ? 0.85 : 0.45 + Math.random() * 0.35;
      leaf.position.set(Math.cos(a) * r, 2.7 + (Math.random() - 0.3) * 0.7, Math.sin(a) * r);
      leaf.scale.set(s, s * (0.85 + Math.random() * 0.3), s);
      leaf.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(leaf);
    }
    // cantero con reja
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), soil);
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.022;
    g.add(pit);
    for (const [w, d, px, pz] of [[1.04, 0.05, 0, 0.5], [1.04, 0.05, 0, -0.5], [0.05, 1.04, 0.5, 0], [0.05, 1.04, -0.5, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), grate);
      b.position.set(px, 0.03, pz);
      g.add(b);
    }
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    scene.add(g);
    addCollider(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
  };
  for (const x of [-17.5, -10, -2.6, 10, 17]) tree(x, 8.55);
  for (const x of [-22, -12, 0, 12, 22]) tree(x, 16.1);

  // ---------- Faroles ----------
  const lamps = [];
  const poleMat = mat('#2f3b40', { metalness: 0.6, roughness: 0.35 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd77a', emissiveIntensity: 0 });
  const lamp = (x, z, dir = 1) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.45, 12), poleMat);
    base.position.y = 0.22;
    g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), poleMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    g.add(ring);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 4.1, 12), poleMat);
    pole.position.y = 2.5;
    g.add(pole);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 4.45, 0), new THREE.Vector3(0, 4.85, 0.2), new THREE.Vector3(0, 4.7, 0.95));
    const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.04, 8), poleMat);
    g.add(arm);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.2, 16), poleMat);
    head.position.set(0, 4.62, 1.0);
    g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), poleMat);
    cap.position.set(0, 4.72, 1.0);
    g.add(cap);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.06, 16), bulbMat);
    bulb.position.set(0, 4.5, 1.0);
    g.add(bulb);
    g.position.set(x, 0, z);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(g);
    const light = new THREE.PointLight('#ffd9a0', 0, 15, 1.6);
    light.position.set(x, 4.35, z + dir * 1.0);
    scene.add(light);
    lamps.push(light);
    addCollider(x - 0.18, x + 0.18, z - 0.18, z + 0.18);
  };
  for (const x of [-14, -6, 6, 14]) lamp(x, 8.75, 1);

  // ---------- Mobiliario urbano ----------
  const wood = mat('#ffffff', { map: T.woodGrain(190, 140, [1, 1]), color: '#a0703f' });
  const iron = mat('#263238', { metalness: 0.5, roughness: 0.4 });
  const bench = (x, z, rot = 0) => {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.13), wood);
      s.position.set(0, 0.45, -0.17 + i * 0.15);
      g.add(s);
    }
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.035), wood);
      s.position.set(0, 0.62 + i * 0.16, -0.25);
      s.rotation.x = -0.12;
      g.add(s);
    }
    for (const sx of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.45), iron);
      leg.position.set(sx, 0.22, -0.02);
      g.add(leg);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), iron);
      back.position.set(sx, 0.68, -0.27);
      g.add(back);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.42), iron);
      arm.position.set(sx, 0.62, -0.05);
      g.add(arm);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
    addCollider(x - 0.85, x + 0.85, z - 0.3, z + 0.3);
  };
  bench(-8.6, 6.75);
  bench(-4.5, 16.4, Math.PI);

  const hydrant = (x, z) => {
    const red = mat('#c62828', { roughness: 0.5, metalness: 0.2 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12), red);
    body.position.y = 0.3;
    g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
    dome.position.y = 0.6;
    g.add(dome);
    for (const sx of [-1, 1]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), red);
      n.rotation.z = Math.PI / 2;
      n.position.set(sx * 0.15, 0.42, 0);
      g.add(n);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), red);
    base.position.y = 0.03;
    g.add(base);
    g.position.set(x, 0, z);
    scene.add(g);
    addCollider(x - 0.18, x + 0.18, z - 0.18, z + 0.18);
  };
  hydrant(-12.5, 8.7);
  hydrant(9.0, 16.0);

  const streetBin = (x, z) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.85, 14, 1, true), mat('#2e7d32', { side: THREE.DoubleSide, roughness: 0.5 }));
    body.position.y = 0.55;
    g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 14), mat('#1b5e20'));
    lid.position.y = 0.98;
    g.add(lid);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), iron);
    post.position.y = 0.1;
    g.add(post);
    g.position.set(x, 0, z);
    scene.add(g);
    addCollider(x - 0.27, x + 0.27, z - 0.27, z + 0.27);
  };
  streetBin(-0.8, 8.7);
  streetBin(16, 16.3);

  // senda peatonal y tapas de alcantarilla
  const cw = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: T.crosswalk(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  cw.rotation.x = -Math.PI / 2;
  cw.rotation.z = Math.PI / 2;
  cw.position.set(-11, 0.006, 12);
  scene.add(cw);
  const manhole = mat('#3b3b3b', { metalness: 0.6, roughness: 0.6 });
  for (const [x, z] of [[4, 11.2], [-20, 12.8]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 18), manhole);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.008, z);
    scene.add(m);
  }

  return { lamps, bulbMat };
}
