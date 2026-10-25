// Grilla de navegación simple (A*) para que los clientes caminen esquivando obstáculos.
import * as THREE from 'three';

export class NavGrid {
  constructor(bounds, cell = 0.5, inflate = 0.32) {
    this.cell = cell;
    this.inflate = inflate;
    this.minX = bounds.minX;
    this.minZ = bounds.minZ;
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / cell);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  rebuild(colliders) {
    this.blocked.fill(0);
    const r = this.inflate;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = this.minX + (col + 0.5) * this.cell;
        const z = this.minZ + (row + 0.5) * this.cell;
        for (const c of colliders) {
          if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
            this.blocked[row * this.cols + col] = 1;
            break;
          }
        }
      }
    }
  }

  toCell(x, z) {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  inBounds(col, row) { return col >= 0 && row >= 0 && col < this.cols && row < this.rows; }

  isFree(col, row) { return this.inBounds(col, row) && !this.blocked[row * this.cols + col]; }

  freeAt(x, z) { const [c, r] = this.toCell(x, z); return this.isFree(c, r); }

  center(col, row) {
    return new THREE.Vector3(this.minX + (col + 0.5) * this.cell, 0, this.minZ + (row + 0.5) * this.cell);
  }

  nearestFree(col, row) {
    if (this.isFree(col, row)) return [col, row];
    for (let rad = 1; rad < 8; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          if (this.isFree(col + dc, row + dr)) return [col + dc, row + dr];
        }
      }
    }
    return [col, row];
  }

  lineFree(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist / (this.cell * 0.4));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.freeAt(a.x + dx * t, a.z + dz * t)) return false;
    }
    return true;
  }

  findPath(from, to) {
    let [sc, sr] = this.nearestFree(...this.toCell(from.x, from.z));
    let [ec, er] = this.nearestFree(...this.toCell(to.x, to.z));
    const N = this.cols * this.rows;
    const start = sr * this.cols + sc, goal = er * this.cols + ec;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = new MinHeap();
    g[start] = 0;
    open.push(start, 0);
    const h = (i) => {
      const c = i % this.cols, r = (i / this.cols) | 0;
      const dx = Math.abs(c - ec), dz = Math.abs(r - er);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (open.size) {
      const cur = open.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const c = cur % this.cols, r = (cur / this.cols) | 0;
      for (const [dc, dr, cost] of dirs) {
        const nc = c + dc, nr = r + dr;
        if (!this.isFree(nc, nr)) continue;
        if (dc && dr && (!this.isFree(c + dc, r) || !this.isFree(c, r + dr))) continue;
        const ni = nr * this.cols + nc;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          open.push(ni, ng + h(ni));
        }
      }
    }
    if (!found) return [to.clone()];
    const cells = [];
    for (let i = goal; i !== -1; i = came[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => this.center(i % this.cols, (i / this.cols) | 0));
    pts[pts.length - 1] = new THREE.Vector3(to.x, 0, to.z);
    // suavizado: saltear puntos intermedios si hay línea libre
    const smooth = [];
    let anchor = new THREE.Vector3(from.x, 0, from.z);
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineFree(anchor, pts[j])) j--;
      smooth.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return smooth;
  }
}

class MinHeap {
  constructor() { this.items = []; this.prio = []; }
  get size() { return this.items.length; }
  push(item, p) {
    const a = this.items, q = this.prio;
    a.push(item); q.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (q[parent] <= q[i]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      [q[parent], q[i]] = [q[i], q[parent]];
      i = parent;
    }
  }
  pop() {
    const a = this.items, q = this.prio;
    const top = a[0];
    const lastI = a.pop(), lastP = q.pop();
    if (a.length) {
      a[0] = lastI; q[0] = lastP;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && q[l] < q[m]) m = l;
        if (r < a.length && q[r] < q[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [q[m], q[i]] = [q[i], q[m]];
        i = m;
      }
    }
    return top;
  }
}
