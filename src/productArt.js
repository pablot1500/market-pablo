// Etiquetas de los productos dibujadas con canvas (marcas inventadas).
import * as THREE from 'three';

const cache = new Map();

function tex(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

// ---------- utilidades de dibujo ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, { size = 40, font = 'sans-serif', weight = 'bold', color = '#222', align = 'center', stroke = null, strokeW = 6, maxW } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.strokeText(str, x, y, maxW);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y, maxW);
}

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// líneas de "letra chica" (ingredientes, código de barras, etc.)
function finePrint(ctx, x, y, w, lines, color = 'rgba(0,0,0,0.45)') {
  ctx.fillStyle = color;
  for (let i = 0; i < lines; i++) {
    const lw = w * (0.55 + ((i * 37) % 40) / 100);
    ctx.fillRect(x, y + i * 9, lw, 3);
  }
}

function barcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#111';
  let px = x;
  let seed = 7;
  while (px < x + w) {
    seed = (seed * 9301 + 49297) % 233280;
    const bw = 1 + (seed % 3);
    if (seed % 2) ctx.fillRect(px, y, bw, h);
    px += bw + 1;
  }
}

function noise(ctx, w, h, n, colorFn) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colorFn();
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

// ---------- AGUA: Cumbre ----------
export const aguaLabel = () => tex('agua', 512, 160, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#e8f6ff'], [1, '#b9e2fb']]);
  ctx.fillRect(0, 0, w, h);
  // montañas nevadas
  ctx.fillStyle = '#4f8fc0';
  ctx.beginPath();
  ctx.moveTo(60, h); ctx.lineTo(150, 50); ctx.lineTo(200, 95); ctx.lineTo(260, 30); ctx.lineTo(360, h);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(150, 50); ctx.lineTo(170, 70); ctx.lineTo(160, 72); ctx.lineTo(140, 66); ctx.fill();
  ctx.beginPath(); ctx.moveTo(260, 30); ctx.lineTo(285, 62); ctx.lineTo(268, 58); ctx.lineTo(245, 52); ctx.fill();
  text(ctx, 'Cumbre', w / 2, 62, { size: 64, font: 'Georgia, serif', color: '#0d47a1', stroke: '#fff', strokeW: 8 });
  text(ctx, 'AGUA MINERAL NATURAL · SIN GAS', w / 2, 112, { size: 20, color: '#1565c0' });
  text(ctx, '500 ml', w / 2, 140, { size: 18, weight: '600', color: '#1565c0' });
  ctx.fillStyle = '#1e88e5';
  ctx.fillRect(0, 0, w, 8);
  ctx.fillRect(0, h - 8, w, 8);
});

// ---------- GASEOSA: Andina Cola ----------
export const gaseosaLabel = () => tex('gaseosa', 512, 180, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#e53935'], [1, '#b71c1c']]);
  ctx.fillRect(0, 0, w, h);
  // onda blanca
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.72 + Math.sin(x / 40) * 10);
  ctx.stroke();
  text(ctx, 'Andina', w / 2, 66, { size: 74, font: 'Georgia, serif', weight: 'italic bold', color: '#fff', stroke: '#7f0000', strokeW: 6 });
  text(ctx, 'COLA', w / 2, 116, { size: 28, color: '#ffe082' });
  text(ctx, '1,5 L · sabor original', w * 0.78, h - 22, { size: 16, weight: '600', color: '#fff' });
  // burbujas
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(20 + (i * 53) % w, 20 + (i * 29) % 60, 3 + (i % 4), 0, Math.PI * 2); ctx.fill(); }
});

// ---------- ACEITE: Girasol del Sur ----------
export const aceiteLabel = () => tex('aceite', 512, 180, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#2e7d32'], [1, '#1b5e20']]);
  ctx.fillRect(0, 0, w, h);
  // girasol
  const cx = 95, cy = 92;
  ctx.fillStyle = '#fdd835';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, 22, 10, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5d4037';
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e2723';
  for (let i = 0; i < 30; i++) ctx.fillRect(cx - 20 + (i * 7) % 40, cy - 20 + (i * 13) % 40, 3, 3);
  text(ctx, 'Girasol', 330, 62, { size: 58, font: 'Georgia, serif', color: '#fff8e1' });
  text(ctx, 'del Sur', 330, 108, { size: 34, font: 'Georgia, serif', weight: 'italic', color: '#fdd835' });
  text(ctx, 'ACEITE DE GIRASOL · 900 ml', 330, 148, { size: 17, color: '#c8e6c9' });
});

// ---------- LECHE: Tambo Sur (cartón) ----------
export const lecheFront = () => tex('leche-front', 256, 384, (ctx, w, h) => {
  ctx.fillStyle = '#fbfdff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = grad(ctx, 0, h * 0.55, 0, h, [[0, '#42a5f5'], [1, '#1565c0']]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.62 + Math.sin(x / 30) * 8);
  ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.fill();
  // pasto y vaca
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(0, h * 0.55, w, 18);
  ctx.fillStyle = '#fff';
  rr(ctx, 70, 150, 110, 58, 26); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(105, 172, 16, 11, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(150, 190, 12, 9, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  rr(ctx, 168, 132, 44, 40, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f8bbd0';
  rr(ctx, 186, 152, 26, 18, 8); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(180, 146, 3, 0, Math.PI * 2); ctx.fill();
  for (const lx of [84, 106, 146, 166]) ctx.fillRect(lx, 204, 8, 26);
  text(ctx, 'Tambo Sur', w / 2, 52, { size: 42, font: 'Georgia, serif', color: '#0d47a1' });
  text(ctx, 'desde 1952', w / 2, 86, { size: 16, weight: 'italic', color: '#1976d2' });
  text(ctx, 'LECHE', w / 2, h * 0.75, { size: 40, color: '#fff' });
  text(ctx, 'ENTERA', w / 2, h * 0.84, { size: 26, color: '#e3f2fd' });
  text(ctx, '1 L', w / 2, h * 0.93, { size: 22, color: '#fff' });
});

export const lecheSide = () => tex('leche-side', 256, 384, (ctx, w, h) => {
  ctx.fillStyle = '#fbfdff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(0, h * 0.85, w, h * 0.15);
  text(ctx, 'Información nutricional', w / 2, 40, { size: 18, color: '#0d47a1' });
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 60, w - 40, 170);
  finePrint(ctx, 30, 72, w - 60, 17);
  barcode(ctx, 60, 255, 136, 50);
});

// ---------- PAN LACTAL: Doradito (bolsa) ----------
export const panBag = () => tex('pan-bag', 512, 256, (ctx, w, h) => {
  // se ve el pan a través de la bolsa
  ctx.fillStyle = '#f3dcb0';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 1500, () => `rgba(${180 + Math.random() * 40},${140 + Math.random() * 30},${80 + Math.random() * 30},0.4)`);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 2, h);
  // etiqueta impresa
  ctx.fillStyle = '#c62828';
  rr(ctx, 110, 40, 292, 176, 24); ctx.fill();
  ctx.fillStyle = '#fff8e1';
  rr(ctx, 120, 50, 272, 156, 18); ctx.fill();
  text(ctx, 'Doradito', w / 2, 100, { size: 56, font: 'Georgia, serif', weight: 'italic bold', color: '#c62828' });
  text(ctx, 'PAN LACTAL BLANCO', w / 2, 148, { size: 22, color: '#6d4c41' });
  text(ctx, 'rodajas finas · 380 g', w / 2, 180, { size: 18, weight: '600', color: '#8d6e63' });
});

export const breadCrust = () => tex('pan-crust', 256, 256, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#a0612b'], [1, '#c98a4b']]);
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 2500, () => `rgba(${90 + Math.random() * 60},${50 + Math.random() * 30},${20},0.35)`);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 0; x < w; x += 40) ctx.fillRect(x, 0, 2, h);
});

// ---------- ARROZ: Don Grano ----------
export const arrozFront = () => tex('arroz-front', 256, 384, (ctx, w, h) => {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, w, 110);
  ctx.fillStyle = '#fbc02d';
  ctx.fillRect(0, 110, w, 8);
  text(ctx, 'Don Grano', w / 2, 48, { size: 40, font: 'Georgia, serif', color: '#fff' });
  text(ctx, 'calidad superior', w / 2, 86, { size: 16, weight: 'italic', color: '#c8e6c9' });
  // ventana con granos
  ctx.save();
  rr(ctx, 40, 140, w - 80, 130, 50);
  ctx.clip();
  ctx.fillStyle = '#efe9da';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#e8e0c8';
    ctx.beginPath();
    ctx.ellipse(40 + Math.random() * (w - 80), 140 + Math.random() * 130, 7, 2.5, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4;
  rr(ctx, 40, 140, w - 80, 130, 50); ctx.stroke();
  text(ctx, 'ARROZ', w / 2, 300, { size: 34, color: '#1b5e20' });
  text(ctx, 'LARGO FINO 00000', w / 2, 330, { size: 16, color: '#33691e' });
  text(ctx, '1 kg', w / 2, 360, { size: 24, color: '#2e7d32' });
});

export const arrozSide = () => tex('arroz-side', 128, 384, (ctx, w, h) => {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(0, 0, w, 110);
  finePrint(ctx, 12, 140, w - 24, 14);
  barcode(ctx, 20, 290, 88, 40);
});

// ---------- FIDEOS: Nonna Rosa ----------
export const fideosFront = () => tex('fideos-front', 256, 384, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#1a237e'], [1, '#283593']]);
  ctx.fillRect(0, 0, w, h);
  text(ctx, 'Nonna Rosa', w / 2, 46, { size: 38, font: 'Georgia, serif', weight: 'italic bold', color: '#ffd54f' });
  text(ctx, 'PASTA DE SÉMOLA', w / 2, 80, { size: 15, color: '#c5cae9' });
  // ventana con spaghetti
  ctx.save();
  rr(ctx, 46, 104, w - 92, 200, 30);
  ctx.clip();
  ctx.fillStyle = '#f2c94c';
  ctx.fillRect(0, 0, w, h);
  for (let x = 46; x < w - 46; x += 3) {
    ctx.fillStyle = (x / 3) % 2 ? '#e8b923' : '#f7d774';
    ctx.fillRect(x, 104, 2, 200);
  }
  ctx.restore();
  ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 4;
  rr(ctx, 46, 104, w - 92, 200, 30); ctx.stroke();
  // bandera
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(w / 2 - 36, 316, 24, 14);
  ctx.fillStyle = '#fff'; ctx.fillRect(w / 2 - 12, 316, 24, 14);
  ctx.fillStyle = '#c62828'; ctx.fillRect(w / 2 + 12, 316, 24, 14);
  text(ctx, 'SPAGHETTI N° 7 · 500 g', w / 2, 354, { size: 17, color: '#fff' });
});

// ---------- GALLETITAS: Crocantes (paquete tubo) ----------
export const galletitasWrap = () => tex('galletitas', 512, 128, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#ffb300'], [0.5, '#ffca28'], [1, '#ff8f00']]);
  ctx.fillRect(0, 0, w, h);
  // galletitas dibujadas
  for (let i = 0; i < 3; i++) {
    const cx = 60 + i * 34, cy = h / 2;
    ctx.fillStyle = '#d7a15b';
    ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a86b2d'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#5d3a1a';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(cx - 12 + (k * 11) % 24, cy - 10 + (k * 7) % 20, 3.5, 0, Math.PI * 2); ctx.fill(); }
  }
  text(ctx, 'Crocantes', 320, 52, { size: 46, font: 'Georgia, serif', weight: 'italic bold', color: '#5d2e0c', stroke: '#fff3c4', strokeW: 6 });
  text(ctx, 'GALLETITAS CON CHIPS DE CHOCOLATE · 150 g', 320, 98, { size: 14, color: '#5d2e0c' });
});

// ---------- CAFÉ: Molienda (lata) ----------
export const cafeLabel = () => tex('cafe', 512, 192, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#3e2723'], [1, '#1b0f0b']]);
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d7a86e';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  // granos
  for (const [x, y, a] of [[70, 70, 0.5], [100, 110, -0.4], [60, 130, 1.1], [430, 70, -0.6], [455, 115, 0.3]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b1a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, 5, 12, 0); ctx.stroke();
    ctx.restore();
  }
  text(ctx, 'MOLIENDA', w / 2, 72, { size: 54, font: 'Georgia, serif', color: '#d7a86e' });
  text(ctx, 'CAFÉ TOSTADO MOLIDO', w / 2, 116, { size: 20, color: '#efdcc4' });
  text(ctx, 'intensidad ●●●●○ · 250 g', w / 2, 150, { size: 16, weight: '600', color: '#bcaaa4' });
});

// ---------- CEREAL: Copos del Sol ----------
export const cerealFront = () => tex('cereal-front', 384, 512, (ctx, w, h) => {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, '#ff7043'], [1, '#f4511e']]);
  ctx.fillRect(0, 0, w, h);
  // sol con rayos
  ctx.save(); ctx.translate(290, 120);
  ctx.fillStyle = '#ffeb3b';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillRect(48, -6, 30, 12); }
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e65100';
  ctx.beginPath(); ctx.arc(-15, -8, 5, 0, Math.PI * 2); ctx.arc(15, -8, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e65100'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 4, 20, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
  text(ctx, 'Copos', 130, 70, { size: 66, font: 'Georgia, serif', weight: 'bold', color: '#fff', stroke: '#bf360c', strokeW: 8 });
  text(ctx, 'del Sol', 140, 130, { size: 44, font: 'Georgia, serif', weight: 'italic bold', color: '#fff59d', stroke: '#bf360c', strokeW: 6 });
  // bowl con copos y leche
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(w / 2, 330, 140, 40, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = ['#f9a825', '#fbc02d', '#f57f17'][i % 3];
    ctx.beginPath(); ctx.ellipse(w / 2 - 120 + Math.random() * 240, 300 + Math.random() * 50, 14, 9, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1565c0';
  ctx.beginPath(); ctx.moveTo(w / 2 - 150, 335); ctx.quadraticCurveTo(w / 2, 470, w / 2 + 150, 335); ctx.fill();
  ctx.fillStyle = '#0d47a1'; ctx.fillRect(w / 2 - 150, 333, 300, 6);
  ctx.fillStyle = '#fff';
  rr(ctx, 20, 440, 150, 50, 12); ctx.fill();
  text(ctx, 'COPOS DE MAÍZ', 95, 458, { size: 14, color: '#bf360c' });
  text(ctx, '500 g', 95, 478, { size: 14, color: '#bf360c' });
  ctx.fillStyle = '#ffeb3b';
  ctx.beginPath(); ctx.arc(320, 455, 40, 0, Math.PI * 2); ctx.fill();
  text(ctx, '+ HIERRO', 320, 448, { size: 13, color: '#bf360c' });
  text(ctx, '+ VITAMINAS', 320, 466, { size: 11, color: '#bf360c' });
});

export const cerealSide = () => tex('cereal-side', 128, 512, (ctx, w, h) => {
  ctx.fillStyle = '#ff7043';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, 60, w - 20, 300);
  text(ctx, 'Nutrición', w / 2, 80, { size: 14, color: '#bf360c' });
  finePrint(ctx, 18, 100, w - 36, 26);
  barcode(ctx, 20, 400, 88, 46);
});

export const cerealBack = () => tex('cereal-back', 384, 512, (ctx, w, h) => {
  ctx.fillStyle = '#ffccbc';
  ctx.fillRect(0, 0, w, h);
  text(ctx, '¡Encontrá las 5 diferencias!', w / 2, 40, { size: 22, color: '#bf360c' });
  for (const x of [30, 200]) {
    ctx.fillStyle = '#fff';
    rr(ctx, x, 70, 154, 200, 12); ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(x + 77, 140, 40, 0, Math.PI * 2); ctx.fill();
  }
  finePrint(ctx, 30, 300, w - 60, 20);
});

// ---------- tapas, plásticos ----------
export const capTexture = (color) => tex(`cap-${color}`, 64, 64, (ctx, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 2, h);
});
