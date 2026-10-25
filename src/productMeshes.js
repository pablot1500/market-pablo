// Modelos 3D de los productos. Cada producto es UNA malla (varias partes unidas con grupos
// de material) para que cientos de productos en las góndolas no pesen demasiado.
// Todas las geometrías tienen el origen en la base (y = 0) y miran hacia +z.
import * as THREE from 'three';
import * as A from './productArt.js';

const cache = new Map();

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, ...opts });
const plastic = (color, opacity) => std({ color, roughness: 0.06, transparent: true, opacity, depthWrite: false });

// Une varias partes {geo, mat} en una sola geometría, agrupando por material.
function merge(parts) {
  const materials = [];
  const ranges = [];
  for (const { geo, mat } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const count = g.attributes.position.count;
    const groups = g.groups.length ? g.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = Array.isArray(mat) ? mat[gr.materialIndex] : mat;
      let mi = materials.indexOf(m);
      if (mi < 0) { mi = materials.length; materials.push(m); }
      ranges.push({ g, start: gr.start, count: gr.count, mi });
    }
  }
  ranges.sort((a, b) => a.mi - b.mi);
  const total = ranges.reduce((s, r) => s + r.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const out = new THREE.BufferGeometry();
  let off = 0;
  for (const r of ranges) {
    const P = r.g.attributes.position.array, N = r.g.attributes.normal.array, U = r.g.attributes.uv.array;
    pos.set(P.subarray(r.start * 3, (r.start + r.count) * 3), off * 3);
    nor.set(N.subarray(r.start * 3, (r.start + r.count) * 3), off * 3);
    uv.set(U.subarray(r.start * 2, (r.start + r.count) * 2), off * 2);
    const last = out.groups[out.groups.length - 1];
    if (last && last.materialIndex === r.mi) last.count += r.count;
    else out.addGroup(off, r.count, r.mi);
    off += r.count;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return { geometry: out, material: materials };
}

const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

// Inflado tipo "almohada" para paquetes blandos (arroz, fideos)
function pillow(geo, w, h, d, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = 1 - (x / (w / 2)) ** 2, fy = 1 - (y / (h / 2)) ** 2;
    if (Math.abs(Math.abs(z) - d / 2) < 1e-4) p.setZ(i, z + Math.sign(z) * amount * Math.max(0, fx) * Math.max(0, fy));
  }
  geo.computeVertexNormals();
  return geo;
}

// Botella PET: devuelve el perfil exterior (radio, altura)
function bottleProfile(r, h, ribs = true) {
  const pts = [[0, 0], [r * 0.78, 0], [r * 0.96, h * 0.012], [r, h * 0.045]];
  if (ribs) pts.push([r, h * 0.12], [r * 0.93, h * 0.14], [r, h * 0.16], [r, h * 0.24], [r * 0.93, h * 0.26], [r, h * 0.28]);
  pts.push([r, h * 0.62], [r * 0.93, h * 0.69], [r * 0.66, h * 0.77], [r * 0.44, h * 0.835], [r * 0.38, h * 0.86], [r * 0.38, h * 0.875]);
  return pts;
}

function bottle(product, { plasticColor, plasticOpacity, liquid, liquidLevel, label, cap, ribs = true }) {
  const [w, h] = product.size;
  const r = w / 2;
  const parts = [];
  const outer = bottleProfile(r, h, ribs);
  parts.push({ geo: lathe(outer), mat: plastic(plasticColor, plasticOpacity) });
  if (liquid) {
    const top = h * liquidLevel;
    const inner = outer.filter(([, y]) => y < top).map(([rr, y]) => [rr * 0.95, Math.max(0.003, y)]);
    inner.push([inner[inner.length - 1][0], top], [0, top]);
    parts.push({ geo: lathe(inner, 20), mat: liquid });
  }
  // aro del cuello y tapa estriada
  parts.push({ geo: new THREE.TorusGeometry(r * 0.46, r * 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, h * 0.872, 0), mat: std({ color: cap, roughness: 0.4 }) });
  const capMat = std({ color: '#ffffff', map: A.capTexture(cap), roughness: 0.45 });
  parts.push({ geo: lathe([[r * 0.4, h * 0.88], [r * 0.43, h * 0.885], [r * 0.43, h * 0.985], [r * 0.39, h], [0, h]], 20), mat: capMat });
  // etiqueta envolvente
  const lh = h * 0.24;
  parts.push({ geo: new THREE.CylinderGeometry(r * 1.012, r * 1.012, lh, 32, 1, true).rotateY(Math.PI).translate(0, h * 0.31 + lh / 2, 0), mat: std({ map: label(), roughness: 0.5 }) });
  return merge(parts);
}

function build(product) {
  const [w, h, d] = product.size;
  switch (product.id) {
    case 'agua':
      return bottle(product, { plasticColor: '#d6f1ff', plasticOpacity: 0.32, liquid: plastic('#9fd8f2', 0.28), liquidLevel: 0.8, label: A.aguaLabel, cap: '#1e88e5' });
    case 'gaseosa':
      return bottle(product, { plasticColor: '#e8f4f8', plasticOpacity: 0.28, liquid: std({ color: '#2a1209', roughness: 0.15 }), liquidLevel: 0.82, label: A.gaseosaLabel, cap: '#d32f2f', ribs: false });
    case 'aceite':
      return bottle(product, { plasticColor: '#fffbe6', plasticOpacity: 0.3, liquid: std({ color: '#e8b51f', roughness: 0.1, emissive: '#5a3c00', emissiveIntensity: 0.25 }), liquidLevel: 0.84, label: A.aceiteLabel, cap: '#2e7d32' });

    case 'leche': {
      const hb = h * 0.8, gh = h * 0.16;
      const front = std({ map: A.lecheFront(), roughness: 0.6 });
      const side = std({ map: A.lecheSide(), roughness: 0.6 });
      const white = std({ color: '#f4f8fb', roughness: 0.6 });
      const parts = [{ geo: new THREE.BoxGeometry(w, hb, d).translate(0, hb / 2, 0), mat: [side, side, white, white, front, side] }];
      const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, gh)]);
      parts.push({ geo: new THREE.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-w / 2, hb, 0), mat: std({ color: '#e3f0fb', roughness: 0.6 }) });
      parts.push({ geo: new THREE.BoxGeometry(w, h - hb - gh, 0.004).translate(0, hb + gh + (h - hb - gh) / 2, 0), mat: white });
      const tilt = Math.atan(gh / (d / 2));
      parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.013, 0.014, 16).translate(0, 0.007, 0).rotateX(tilt).translate(0, hb + gh * 0.5, d * 0.25), mat: std({ color: '#1565c0', roughness: 0.4 }) });
      return merge(parts);
    }

    case 'pan': {
      const hl = h * 0.58;
      const bag = std({ map: A.panBag(), roughness: 0.25 });
      const crust = std({ map: A.breadCrust(), roughness: 0.5 });
      const plain = std({ color: '#efd7a8', roughness: 0.4 });
      const parts = [{ geo: new THREE.BoxGeometry(w, hl, d).translate(0, hl / 2, 0), mat: [plain, plain, crust, plain, bag, bag] }];
      const dome = new THREE.CylinderGeometry(d / 2, d / 2, w, 22, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
      dome.scale(1, (h - hl) / (d / 2), 1).translate(0, hl, 0);
      parts.push({ geo: dome, mat: crust });
      // cierre de la bolsa
      parts.push({ geo: new THREE.CylinderGeometry(d * 0.12, d * 0.3, 0.03, 12).rotateZ(-Math.PI / 2).translate(w / 2 + 0.015, h * 0.5, 0), mat: plastic('#ffffff', 0.5) });
      parts.push({ geo: new THREE.TorusGeometry(d * 0.13, 0.004, 6, 14).rotateY(Math.PI / 2).translate(w / 2 + 0.008, h * 0.5, 0), mat: std({ color: '#c62828' }) });
      return merge(parts);
    }

    case 'arroz':
    case 'fideos': {
      const isRice = product.id === 'arroz';
      const front = std({ map: isRice ? A.arrozFront() : A.fideosFront(), roughness: 0.35 });
      const side = isRice ? std({ map: A.arrozSide(), roughness: 0.4 }) : std({ color: '#1f2a7a', roughness: 0.35 });
      const top = std({ color: isRice ? '#2e7d32' : '#1a237e', roughness: 0.4 });
      const geo = pillow(new THREE.BoxGeometry(w, h, d, 6, 8, 1), w, h, d, d * 0.18).translate(0, h / 2, 0);
      return merge([{ geo, mat: [side, side, top, top, front, front] }]);
    }

    case 'galletitas': {
      const r = h / 2, L = w;
      const body = new THREE.CylinderGeometry(r, r, L * 0.84, 28, 1, true);
      // texto a lo largo del paquete: intercambiar u/v
      const uvA = body.attributes.uv;
      for (let i = 0; i < uvA.count; i++) { const u = uvA.getX(i), v = uvA.getY(i); uvA.setXY(i, 1 - v, u); }
      body.rotateY(Math.PI).rotateZ(Math.PI / 2).translate(0, r, 0);
      const foil = std({ color: '#ff9800', roughness: 0.3, metalness: 0.3 });
      const parts = [{ geo: body, mat: std({ map: A.galletitasWrap(), roughness: 0.3, metalness: 0.15 }) }];
      for (const s of [-1, 1]) {
        parts.push({ geo: new THREE.CylinderGeometry(r, r * 0.35, L * 0.06, 20).rotateZ(s * Math.PI / 2).translate(s * (L * 0.42 + L * 0.03), r, 0), mat: foil });
        parts.push({ geo: new THREE.BoxGeometry(0.012, r * 0.9, 0.004).translate(s * (L / 2 - 0.006), r, 0), mat: foil });
      }
      return merge(parts);
    }

    case 'cafe': {
      const r = w / 2;
      const gold = std({ color: '#c9a227', roughness: 0.3, metalness: 0.85 });
      const steel = std({ color: '#b8b8b8', roughness: 0.3, metalness: 0.9 });
      const parts = [{ geo: new THREE.CylinderGeometry(r, r, h * 0.9, 32, 1, true).rotateY(Math.PI).translate(0, h * 0.45 + 0.004, 0), mat: std({ map: A.cafeLabel(), roughness: 0.35, metalness: 0.2 }) }];
      parts.push({ geo: new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.09, 32).translate(0, h * 0.955, 0), mat: gold });
      parts.push({ geo: new THREE.TorusGeometry(r * 1.0, 0.003, 6, 32).rotateX(Math.PI / 2).translate(0, h, 0), mat: gold });
      parts.push({ geo: new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.008, 32).translate(0, 0.004, 0), mat: steel });
      return merge(parts);
    }

    case 'cereal': {
      const front = std({ map: A.cerealFront(), roughness: 0.5 });
      const back = std({ map: A.cerealBack(), roughness: 0.5 });
      const side = std({ map: A.cerealSide(), roughness: 0.5 });
      const top = std({ color: '#f4511e', roughness: 0.5 });
      return merge([{ geo: new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), mat: [side, side, top, top, front, back] }]);
    }

    default: {
      const m = std({ color: product.color });
      return merge([{ geo: new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), mat: m }]);
    }
  }
}

export function getProductAsset(product) {
  if (!cache.has(product.id)) cache.set(product.id, build(product));
  return cache.get(product.id);
}

export function createProductMesh(product) {
  const { geometry, material } = getProductAsset(product);
  return new THREE.Mesh(geometry, material);
}
