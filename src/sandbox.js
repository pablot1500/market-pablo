// Sandbox para ver las personas realistas: invocarlas, verlas pasear y probar animaciones.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PEOPLE, createPerson } from './people.js';
import { floorTiles, woodGrain } from './textures.js';

const AREA = 7; // radio por donde pasean

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe3ef');
scene.fog = new THREE.Fog('#cfe3ef', 25, 60);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(4.5, 2.4, 6.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 1.2;
controls.maxDistance = 25;

scene.add(new THREE.HemisphereLight('#ffffff', '#8d7f6a', 1.1));
const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
sun.position.set(6, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 });
scene.add(sun);

const floor = new THREE.Mesh(new THREE.CircleGeometry(AREA + 3, 48), new THREE.MeshStandardMaterial({ map: floorTiles([14, 14]), roughness: 0.6 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
// una góndola de referencia para comparar alturas
{
  const wood = new THREE.MeshStandardMaterial({ color: '#e4e1db', map: woodGrain(240, 205, [1, 1]), roughness: 0.6 });
  const shelf = new THREE.Group();
  const add = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; shelf.add(m); };
  add(2, 1.85, 0.04, 0, 0.925, -0.23);
  for (const y of [0.12, 0.56, 1.0, 1.44, 1.85]) add(2, 0.03, 0.5, 0, y, 0);
  for (const x of [-1, 1]) add(0.04, 1.85, 0.5, x, 0.925, 0);
  shelf.position.set(0, 0, -AREA - 1.2);
  scene.add(shelf);
}

// ---------- personas ----------
const people = [];
let mode = 'wander';
let wanderSpeed = 1.2;
const status = document.getElementById('sb-status');
const loading = document.getElementById('sb-loading');
let pending = 0;

function randomPoint() {
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * AREA;
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

async function spawn(id) {
  pending++;
  loading.classList.remove('hidden');
  try {
    const p = await createPerson(id);
    p.root.position.copy(randomPoint());
    p.root.rotation.y = Math.random() * Math.PI * 2;
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    p.target = null;
    p.wait = Math.random() * 1.5;
    scene.add(p.root);
    people.push(p);
    applyMode(p);
  } catch (err) {
    console.error(err);
    alert(`No se pudo cargar ${id}: ${err.message || err}`);
  } finally {
    pending--;
    if (!pending) loading.classList.add('hidden');
    status.textContent = `Personas: ${people.length}`;
  }
}

function applyMode(p) {
  if (mode === 'wander') { p.play('idle'); p.wait = Math.random() * 1.5; p.target = null; }
  else { p.target = null; p.play(mode); p.setSpeed(1); }
}

function updatePerson(p, dt) {
  if (mode === 'wander') {
    if (!p.target) {
      p.wait -= dt;
      if (p.wait <= 0) {
        p.target = randomPoint();
        p.play('walk');
      }
    } else {
      const pos = p.root.position;
      const dx = p.target.x - pos.x, dz = p.target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      // gira suavemente hacia el destino y avanza
      const desired = Math.atan2(dx, dz);
      let diff = desired - p.root.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.root.rotation.y += diff * Math.min(1, dt * 4);
      const facing = Math.max(0, Math.cos(diff));
      const step = wanderSpeed * dt * facing;
      pos.x += Math.sin(p.root.rotation.y) * step;
      pos.z += Math.cos(p.root.rotation.y) * step;
      p.matchSpeed(wanderSpeed * Math.max(0.35, facing));
      if (dist < 0.3) {
        p.target = null;
        p.wait = 1.5 + Math.random() * 4;
        p.play(Math.random() < 0.4 ? 'look' : 'idle');
      }
    }
  }
  p.update(dt);
}

// ---------- interfaz ----------
const grid = document.getElementById('sb-people');
for (const def of PEOPLE) {
  const b = document.createElement('button');
  b.className = 'btn sb-person';
  b.innerHTML = `<b>${def.name}</b><span>${def.kind}</span>`;
  b.addEventListener('click', () => spawn(def.id));
  grid.appendChild(b);
}
document.getElementById('sb-random').addEventListener('click', () => {
  for (let i = 0; i < 5; i++) spawn(PEOPLE[Math.floor(Math.random() * PEOPLE.length)].id);
});
document.getElementById('sb-clear').addEventListener('click', () => {
  for (const p of people) p.dispose();
  people.length = 0;
  status.textContent = 'Personas: 0';
});
document.querySelectorAll('.sb-mode').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.sb-mode').forEach((x) => x.classList.toggle('active', x === b));
  mode = b.dataset.mode;
  people.forEach(applyMode);
}));
const speed = document.getElementById('sb-speed');
speed.addEventListener('input', () => {
  wanderSpeed = Number(speed.value);
  document.getElementById('sb-speed-val').textContent = `${wanderSpeed.toFixed(2)} m/s`;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  for (const p of people) updatePerson(p, dt);
  controls.update();
  renderer.render(scene, camera);
});

window.__sandbox = { people, spawn, scene, camera, controls, setMode: (m) => document.querySelector(`.sb-mode[data-mode="${m}"]`).click() };
