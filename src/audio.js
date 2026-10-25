// Sonidos simples sintetizados con WebAudio (sin archivos).
let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() { audio(); },
  beep() { tone(1850, 0.09, { type: 'square', vol: 0.06 }); },
  place() { tone(420, 0.06, { type: 'triangle', vol: 0.12, slide: -120 }); },
  pick() { tone(300, 0.08, { type: 'triangle', vol: 0.12, slide: 160 }); },
  cash() {
    tone(1320, 0.12, { type: 'triangle', vol: 0.12 });
    tone(1760, 0.25, { type: 'triangle', vol: 0.12, delay: 0.1 });
  },
  error() { tone(160, 0.22, { type: 'sawtooth', vol: 0.07 }); },
  door() { tone(880, 0.15, { vol: 0.08 }); tone(660, 0.25, { vol: 0.08, delay: 0.14 }); },
  clean() { tone(600 + Math.random() * 300, 0.05, { type: 'triangle', vol: 0.04 }); },
  thud() { tone(110, 0.12, { type: 'triangle', vol: 0.2, slide: -40 }); },
};
