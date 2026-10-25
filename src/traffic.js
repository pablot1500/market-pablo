// Autos que pasan por la calle (frenan si el jugador se cruza).
import * as THREE from 'three';

const COLORS = ['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#eeeeee', '#212121', '#6a1b9a', '#ef6c00'];
const LANES = [{ z: 10.5, dir: 1 }, { z: 13.5, dir: -1 }];
const LIMIT = 48;

function carModel(color) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1c2833', roughness: 0.1, metalness: 0.6 });
  const tire = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.65, 1.7), body);
  b.position.y = 0.6;
  g.add(b);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 1.5), glass);
  cabin.position.set(-0.2, 1.18, 0);
  g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.52), body);
  roof.position.set(-0.2, 1.47, 0);
  g.add(roof);
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14);
  wheelGeo.rotateX(Math.PI / 2);
  for (const x of [-1.25, 1.25]) for (const z of [-0.82, 0.82]) {
    const w = new THREE.Mesh(wheelGeo, tire);
    w.position.set(x, 0.33, z);
    g.add(w);
  }
  const lights = new THREE.MeshStandardMaterial({ color: '#fffbe0', emissive: '#fff3b0', emissiveIntensity: 0.6 });
  for (const z of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.3), lights);
    l.position.set(1.96, 0.66, z);
    g.add(l);
  }
  return g;
}

export class Traffic {
  constructor(scene) {
    this.cars = [];
    for (let i = 0; i < 4; i++) {
      const lane = LANES[i % 2];
      const mesh = carModel(COLORS[Math.floor(Math.random() * COLORS.length)]);
      mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI;
      const car = { mesh, lane, speed: 0, cruise: 7 + Math.random() * 4, x: -LIMIT + Math.random() * LIMIT * 2, wait: Math.random() * 6 };
      mesh.position.set(car.x, 0, lane.z);
      scene.add(mesh);
      this.cars.push(car);
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
        if (a > 0 && a < 6) blocked = true;
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), (blocked ? 14 : 4) * dt);
      car.x += car.speed * dir * dt;
      if (car.x * dir > LIMIT) {
        car.x = -LIMIT * dir;
        car.wait = 2 + Math.random() * 8;
        car.cruise = 7 + Math.random() * 4;
      }
      car.mesh.position.x = car.x;
    }
  }
}
