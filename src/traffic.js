// Autos que pasan por la calle (frenan si el jugador se cruza).
import * as THREE from 'three';
import { licensePlate } from './textures.js';

const COLORS = ['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#eeeeee', '#212121', '#6a1b9a', '#ef6c00', '#90a4ae', '#4e342e'];
const LANES = [{ z: 10.5, dir: 1 }, { z: 13.5, dir: -1 }];
const LIMIT = 48;

// Perfiles laterales (x = largo, y = alto). El auto mira hacia +x.
const MODELS = {
  sedan: {
    width: 1.66,
    lower: [[-2.15, 0.32], [-2.15, 0.82], [-2.0, 0.98], [1.2, 1.0], [2.02, 0.88], [2.18, 0.62], [2.14, 0.32]],
    cabin: [[-1.55, 0.98], [-0.98, 1.42], [0.42, 1.44], [1.12, 0.99]],
    wheels: [-1.35, 1.35],
    pillars: [-0.28],
  },
  hatch: {
    width: 1.62,
    lower: [[-1.85, 0.32], [-1.88, 0.95], [-1.75, 1.0], [0.95, 1.0], [1.72, 0.88], [1.88, 0.62], [1.84, 0.32]],
    cabin: [[-1.78, 0.99], [-1.62, 1.46], [0.32, 1.48], [0.98, 0.99]],
    wheels: [-1.18, 1.18],
    pillars: [-0.55],
  },
  van: {
    width: 1.8,
    lower: [[-2.3, 0.35], [-2.3, 1.15], [1.45, 1.15], [2.15, 1.0], [2.25, 0.62], [2.2, 0.35]],
    cabin: [[-2.3, 1.14], [-2.3, 2.02], [0.85, 2.02], [1.5, 1.14]],
    wheels: [-1.45, 1.45],
    pillars: [],
    boxy: true,
  },
};

const glassMat = new THREE.MeshStandardMaterial({ color: '#1c2833', roughness: 0.08, metalness: 0.7 });
const tireMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#c0c4c8', roughness: 0.25, metalness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 });
const chromeMat = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.2, metalness: 1 });
const tireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 20).rotateX(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.235, 14).rotateX(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8).rotateX(Math.PI / 2);

function extrude(points, depth, bevel) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function carModel(color, type) {
  const m = MODELS[type];
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55 });
  const W = m.width;

  g.add(new THREE.Mesh(extrude(m.lower, W - 0.12, 0.06), paint));
  if (m.boxy) {
    g.add(new THREE.Mesh(extrude(m.cabin, W - 0.12, 0.05), paint));
    // parabrisas y ventanillas delanteras
    const [, , c2, c3] = m.cabin;
    const ws = extrude([[c2[0] - 0.55, c3[1] + 0.12], [c2[0] - 0.55, c2[1] - 0.12], [c2[0] + 0.02, c2[1] - 0.06], [c3[0] - 0.02, c3[1] + 0.08]], W + 0.005, 0);
    g.add(new THREE.Mesh(ws, glassMat));
    const front = extrude([[c2[0] - 0.01, c2[1] - 0.1], [c3[0] - 0.08, c3[1] + 0.12], [c3[0] + 0.03, c3[1] + 0.1], [c2[0] + 0.06, c2[1] - 0.08]], W - 0.3, 0);
    g.add(new THREE.Mesh(front, glassMat));
  } else {
    g.add(new THREE.Mesh(extrude(m.cabin, W - 0.3, 0.05), glassMat));
    // techo pintado
    const [c0, c1, c2, c3] = m.cabin;
    const roof = extrude([[c1[0] + 0.03, c1[1] - 0.01], [c2[0] - 0.03, c2[1] - 0.01], [c2[0] - 0.05, c2[1] + 0.05], [c1[0] + 0.05, c1[1] + 0.05]], W - 0.28, 0.02);
    g.add(new THREE.Mesh(roof, paint));
    for (const px of m.pillars) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, c1[1] - c0[1] - 0.02, W - 0.2), paint);
      p.position.set(px, (c0[1] + c1[1]) / 2, 0);
      g.add(p);
    }
  }

  const front = m.lower.reduce((a, p) => Math.max(a, p[0]), -9);
  const rear = m.lower.reduce((a, p) => Math.min(a, p[0]), 9);
  // paragolpes
  for (const x of [front + 0.02, rear - 0.02]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, W - 0.05), trimMat);
    b.position.set(x, 0.42, 0);
    g.add(b);
  }
  // faros y luces traseras
  const head = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff3b0', emissiveIntensity: 0.3 });
  const tail = new THREE.MeshStandardMaterial({ color: '#b71c1c', emissive: '#ff1744', emissiveIntensity: 0.3 });
  for (const z of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.34), head);
    h.position.set(front + 0.03, 0.72, z * (W / 2 - 0.28));
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), tail);
    t.position.set(rear - 0.03, m.boxy ? 0.95 : 0.8, z * (W / 2 - 0.25));
    g.add(t);
    // espejos
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.16), paint);
    mirror.position.set(m.cabin[3][0] - 0.15, m.cabin[3][1] + 0.12, z * (W / 2 + 0.03));
    g.add(mirror);
    // manijas
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), chromeMat);
    handle.position.set(m.pillars.length ? m.pillars[0] + 0.25 : 0.3, 0.9, z * (W / 2 + 0.005));
    g.add(handle);
  }
  // patentes
  const plateMat = new THREE.MeshBasicMaterial({ map: licensePlate() });
  for (const [x, ry] of [[front + 0.1, Math.PI / 2], [rear - 0.1, -Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.13), plateMat);
    p.position.set(x, 0.42, 0);
    p.rotation.y = ry;
    g.add(p);
  }
  // ruedas
  const wheels = [];
  for (const x of m.wheels) for (const z of [-1, 1]) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(tireGeo, tireMat));
    w.add(new THREE.Mesh(rimGeo, rimMat));
    w.add(new THREE.Mesh(hubGeo, trimMat));
    for (let k = 0; k < 5; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.02), rimMat);
      spoke.rotation.z = (k / 5) * Math.PI;
      spoke.position.z = z * 0.12;
      w.add(spoke);
    }
    w.position.set(x, 0.33, z * (W / 2 - 0.08));
    g.add(w);
    wheels.push(w);
  }
  return { group: g, wheels, lights: [head, tail] };
}

export class Traffic {
  constructor(scene) {
    this.cars = [];
    const types = ['sedan', 'hatch', 'van', 'sedan', 'hatch'];
    for (let i = 0; i < 5; i++) {
      const lane = LANES[i % 2];
      const model = carModel(COLORS[Math.floor(Math.random() * COLORS.length)], types[i]);
      const mesh = model.group;
      mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      const car = { mesh, wheels: model.wheels, lights: model.lights, lane, speed: 0, cruise: 7 + Math.random() * 4, x: -LIMIT + Math.random() * LIMIT * 2, wait: Math.random() * 6 };
      mesh.position.set(car.x, 0, lane.z);
      scene.add(mesh);
      this.cars.push(car);
    }
  }

  setNight(n) {
    for (const car of this.cars) {
      car.lights[0].emissiveIntensity = 0.3 + n * 2.2;
      car.lights[1].emissiveIntensity = 0.3 + n * 1.2;
    }
  }

  update(dt, player) {
    for (const car of this.cars) {
      if (car.wait > 0) { car.wait -= dt; car.mesh.visible = false; continue; }
      car.mesh.visible = true;
      const dir = car.lane.dir;
      // ¿hay alguien adelante? (el jugador u otro auto)
      let blocked = false;
      const ahead = (x) => (x - car.x) * dir;
      if (Math.abs(player.z - car.lane.z) < 1.6) {
        const a = ahead(player.x);
        if (a > 0 && a < 7) blocked = true;
      }
      for (const other of this.cars) {
        if (other === car || other.lane !== car.lane || other.wait > 0) continue;
        const a = ahead(other.x);
        if (a > 0 && a < 6.5) blocked = true;
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), (blocked ? 14 : 4) * dt);
      car.x += car.speed * dir * dt;
      for (const w of car.wheels) w.rotation.z -= (car.speed * dt) / 0.33;
      if (car.x * dir > LIMIT) {
        car.x = -LIMIT * dir;
        car.wait = 2 + Math.random() * 8;
        car.cruise = 7 + Math.random() * 4;
      }
      car.mesh.position.x = car.x;
    }
  }
}
