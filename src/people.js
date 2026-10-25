// Personas realistas (Microsoft Rocketbox, licencia MIT) con animaciones de caminar y estar parado.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const PEOPLE = [
  { id: 'Female_Adult_01', name: 'Lucía', gender: 'f', kind: 'Mujer' },
  { id: 'Female_Adult_03', name: 'Carla', gender: 'f', kind: 'Mujer' },
  { id: 'Female_Adult_04', name: 'Marta', gender: 'f', kind: 'Mujer' },
  { id: 'Female_Adult_11', name: 'Sofía', gender: 'f', kind: 'Mujer' },
  { id: 'Female_Adult_15', name: 'Valeria', gender: 'f', kind: 'Mujer' },
  { id: 'Female_Adult_17', name: 'Julieta', gender: 'f', kind: 'Mujer' },
  { id: 'Male_Adult_02', name: 'Tomás', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Adult_04', name: 'Marcos', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Adult_06', name: 'Diego', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Adult_08', name: 'Andrés', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Adult_12', name: 'Kevin', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Adult_17', name: 'Nico', gender: 'm', kind: 'Hombre' },
  { id: 'Male_Child_02', name: 'Benja', gender: 'm', kind: 'Nene' },
  { id: 'Female_Child_01', name: 'Mía', gender: 'f', kind: 'Nena' },
];

// Animaciones disponibles (un archivo por género)
export const ANIMATIONS = {
  walk: { file: 'walk_neutral_01', label: 'Caminar', loop: true },
  walkFast: { file: 'walk_fast_01', label: 'Caminar rápido', loop: true },
  idle: { file: 'idle_neutral_01', label: 'Parado', loop: true },
  look: { file: 'idle_look_around_01', label: 'Mirar alrededor', loop: true },
  wait: { file: 'idle_waiting_01', label: 'Esperando', loop: true },
  phone: { file: 'cell_phone_textmessage', label: 'Con el celular', loop: true },
  take: { file: 'documents_take', label: 'Agarrar', loop: false },
};

const BASE = new URL('../assets/people/', import.meta.url);
const loader = new GLTFLoader();
const modelCache = new Map();
const clipCache = new Map();

function loadGLB(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function loadModel(id) {
  if (!modelCache.has(id)) modelCache.set(id, loadGLB(new URL(`${id}.glb`, BASE).href));
  return modelCache.get(id);
}

function loadClip(gender, key) {
  const file = `${gender}_${ANIMATIONS[key].file}`;
  if (!clipCache.has(file)) {
    clipCache.set(file, loadGLB(new URL(`anims/${file}.glb`, BASE).href).then((g) => g.animations[0]));
  }
  return clipCache.get(file);
}

// Adapta una animación al esqueleto de un modelo: los nenes usan "Bip02" en vez de "Bip01",
// y solo se conserva el movimiento de la raíz (sin pisar el largo de los huesos de cada persona).
// Las caminatas vienen con desplazamiento hacia adelante: se lo saca (queda caminando en el lugar,
// con el balanceo natural) y se calcula a qué velocidad fue grabada para que los pies no patinen.
function retarget(clip, prefix, rootBone, names) {
  const tracks = [];
  let speed = 0;
  for (const t of clip.tracks) {
    const dot = t.name.lastIndexOf('.');
    const node = t.name.slice(0, dot).replace(/^Bip0\d/, prefix);
    const prop = t.name.slice(dot + 1);
    if (prop === 'scale' || !names.has(node)) continue;
    if (prop === 'position') {
      if (node !== prefix || !rootBone) continue;
      const v = Float32Array.from(t.values);
      const [x0, y0, z0] = v;
      const n = v.length;
      const dx = v[n - 3] - x0, dz = v[n - 1] - z0;
      const tEnd = t.times[t.times.length - 1] || 1;
      const rest = rootBone.position;
      const scale = y0 > 0.1 ? rest.y / y0 : 1; // los nenes dan pasos más cortos
      speed = (Math.hypot(dx, dz) / tEnd) * scale;
      for (let i = 0, k = 0; i < n; i += 3, k++) {
        const f = t.times[k] / tEnd;
        v[i] = (v[i] - x0 - dx * f) * scale + rest.x;
        v[i + 1] = (v[i + 1] - y0) * scale + rest.y;
        v[i + 2] = (v[i + 2] - z0 - dz * f) * scale + rest.z;
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${node}.position`, t.times, v));
      continue;
    }
    tracks.push(new t.constructor(`${node}.${prop}`, t.times, t.values));
  }
  return { clip: new THREE.AnimationClip(clip.name, clip.duration, tracks), speed };
}

export class Person {
  constructor(def, gltf, clips) {
    this.def = def;
    this.root = new THREE.Group(); // se mueve y rota este grupo
    this.model = SkeletonUtils.clone(gltf.scene);
    this.root.add(this.model);
    let prefix = 'Bip01', rootBone = null;
    const names = new Set();
    this.model.traverse((o) => {
      names.add(o.name);
      if (/^Bip0\d$/.test(o.name)) { prefix = o.name; rootBone = o; }
      if (o.isMesh) {
        o.frustumCulled = false; // al animarse, la caja original no sirve
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.alphaTest > 0) m.side = THREE.DoubleSide;
          m.roughness = 0.8;
          m.metalness = 0;
        }
      }
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    this.speeds = {}; // velocidad natural (m/s) de cada caminata para este modelo
    for (const [key, clip] of Object.entries(clips)) {
      const { clip: adapted, speed } = retarget(clip, prefix, rootBone, names);
      const action = this.mixer.clipAction(adapted);
      if (ANIMATIONS[key].loop) action.setLoop(THREE.LoopRepeat, Infinity);
      else { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
      this.actions[key] = action;
      this.speeds[key] = speed;
    }
    this.rootBone = rootBone;
    this.prefix = prefix;
    this.current = null;
    // cada persona arranca la animación en un punto distinto para que no se muevan sincronizadas
    this.mixer.setTime(Math.random() * 3);
  }

  play(key, fade = 0.35) {
    const next = this.actions[key];
    if (!next || next === this.current) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
    this.currentKey = key;
  }

  setSpeed(timeScale) {
    if (this.current) this.current.timeScale = timeScale;
  }

  // Ajusta la animación de caminar a la velocidad real de desplazamiento (m/s)
  matchSpeed(metersPerSecond) {
    const natural = this.speeds[this.currentKey];
    if (natural > 0.1) this.setSpeed(metersPerSecond / natural);
  }

  bone(name) {
    return this.model.getObjectByName(`${this.prefix}_${name}`);
  }

  update(dt) { this.mixer.update(dt); }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}

// Descarga en segundo plano los modelos y animaciones (para que los clientes aparezcan sin demora)
export function preloadPeople(ids = PEOPLE.map((p) => p.id)) {
  const jobs = [];
  for (const id of ids) {
    const def = PEOPLE.find((p) => p.id === id);
    jobs.push(loadModel(id).catch(() => null));
    for (const k of Object.keys(ANIMATIONS)) jobs.push(loadClip(def.gender, k).catch(() => null));
  }
  return Promise.all(jobs);
}

export async function createPerson(id) {
  const def = PEOPLE.find((p) => p.id === id);
  const [gltf, ...clipList] = await Promise.all([
    loadModel(id),
    ...Object.keys(ANIMATIONS).map((k) => loadClip(def.gender, k)),
  ]);
  const clips = Object.fromEntries(Object.keys(ANIMATIONS).map((k, i) => [k, clipList[i]]));
  return new Person(def, gltf, clips);
}
