// Geometrías y materiales compartidos para cada producto.
// Todas las geometrías tienen el origen en la base (y = 0).
import * as THREE from 'three';
import { productLabel } from './textures.js';

const cache = new Map();

function build(product) {
  const [w, h, d] = product.size;
  let geometry;
  let material;
  if (product.shape === 'bottle') {
    const r = w / 2;
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(r * 0.92, 0),
      new THREE.Vector2(r, h * 0.05),
      new THREE.Vector2(r, h * 0.62),
      new THREE.Vector2(r * 0.42, h * 0.84),
      new THREE.Vector2(r * 0.36, h * 0.92),
      new THREE.Vector2(r * 0.38, h * 0.93),
      new THREE.Vector2(r * 0.38, h),
      new THREE.Vector2(0, h),
    ];
    geometry = new THREE.LatheGeometry(pts, 14);
    const clear = product.id === 'agua';
    material = new THREE.MeshStandardMaterial({
      color: product.color,
      roughness: 0.25,
      metalness: 0.05,
      transparent: clear,
      opacity: clear ? 0.75 : 1,
    });
    // Etiqueta como banda separada (es la misma malla gracias a grupos de material)
    const band = new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.28, 14, 1, true);
    band.translate(0, h * 0.35, 0);
    const merged = mergeTwo(geometry, band);
    geometry = merged;
    material = [material, new THREE.MeshStandardMaterial({ map: productLabel(product), roughness: 0.6 })];
  } else if (product.shape === 'can') {
    geometry = new THREE.CylinderGeometry(w / 2, w / 2, h, 18);
    geometry.translate(0, h / 2, 0);
    const lid = new THREE.MeshStandardMaterial({ color: '#b0b0b0', metalness: 0.6, roughness: 0.35 });
    material = [new THREE.MeshStandardMaterial({ map: productLabel(product), roughness: 0.5 }), lid, lid];
  } else {
    geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(0, h / 2, 0);
    const side = new THREE.MeshStandardMaterial({ color: product.color, roughness: 0.7 });
    const front = new THREE.MeshStandardMaterial({ map: productLabel(product), roughness: 0.6 });
    // orden de caras: +x, -x, +y, -y, +z, -z
    material = [side, side, side, side, front, front];
  }
  return { geometry, material };
}

// Une dos geometrías no indexadas en una sola con dos grupos de material.
function mergeTwo(a, b) {
  const ga = a.index ? a.toNonIndexed() : a;
  const gb = b.index ? b.toNonIndexed() : b;
  const out = new THREE.BufferGeometry();
  for (const attr of ['position', 'normal', 'uv']) {
    const A = ga.getAttribute(attr), B = gb.getAttribute(attr);
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array, 0);
    arr.set(B.array, A.array.length);
    out.setAttribute(attr, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const countA = ga.getAttribute('position').count;
  const countB = gb.getAttribute('position').count;
  out.addGroup(0, countA, 0);
  out.addGroup(countA, countB, 1);
  return out;
}

export function createProductMesh(product) {
  if (!cache.has(product.id)) cache.set(product.id, build(product));
  const { geometry, material } = cache.get(product.id);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
