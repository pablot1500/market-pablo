// Texturas generadas con canvas (no hace falta cargar imágenes).
import * as THREE from 'three';

function canvasTexture(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

export function floorTiles(repeat) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d6d0c4';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = '#bdb6a8';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();
  }, { repeat });
}

export function asphalt(repeat) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3b3d40';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const g = 50 + Math.random() * 30;
      ctx.fillStyle = `rgb(${g},${g},${g + 3})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, { repeat });
}

export function roadLines(repeat) {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, h / 2 - 4, w * 0.55, 8);
  }, { repeat });
}

export function sidewalk(repeat) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b9b5ad';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9d988f';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, { repeat });
}

export function brick(repeat, base = '#a65a45') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a8178';
    ctx.fillRect(0, 0, w, h);
    const bh = 32, bw = 64;
    for (let row = 0; row < h / bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let x = -bw; x < w + bw; x += bw) {
        const shade = Math.random() * 24 - 12;
        ctx.fillStyle = shiftColor(base, shade);
        ctx.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
  }, { repeat });
}

export function facade(color, windowsColor = '#9cc3dd', repeat = [1, 1]) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const px = 34 + x * 128, py = 30 + y * 128;
        ctx.fillStyle = '#e8e2d6';
        ctx.fillRect(px - 6, py - 6, 72, 84);
        ctx.fillStyle = windowsColor;
        ctx.fillRect(px, py, 60, 72);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 4, py + 4, 18, 64);
        ctx.fillStyle = '#e8e2d6';
        ctx.fillRect(px + 28, py, 4, 72);
      }
    }
  }, { repeat });
}

export function wallPaint(repeat) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f7d5b';
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#e7c35a';
    ctx.fillRect(0, h - 26, w, 4);
  }, { repeat });
}

export function cardboard() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(90,60,30,${Math.random() * 0.12})`;
      ctx.beginPath();
      const y = Math.random() * h;
      ctx.moveTo(0, y); ctx.lineTo(w, y + Math.random() * 6 - 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#b8895a';
    ctx.fillRect(w / 2 - 10, 0, 20, h);
  });
}

const boxLabelCache = new Map();
export function boxLabel(product) {
  if (boxLabelCache.has(product.id)) return boxLabelCache.get(product.id);
  const tex = canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#c49a6c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5ecdc';
    roundRect(ctx, 16, 20, w - 32, h - 40, 10);
    ctx.fill();
    ctx.fillStyle = product.accent;
    ctx.fillRect(16, 20, 18, h - 40);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(product.short.toUpperCase(), w / 2 + 8, h / 2 - 12);
    ctx.font = '22px sans-serif';
    ctx.fillText(`x${product.boxQty} unidades`, w / 2 + 8, h / 2 + 24);
  });
  boxLabelCache.set(product.id, tex);
  return tex;
}

const productLabelCache = new Map();
export function productLabel(product) {
  if (productLabelCache.has(product.id)) return productLabelCache.get(product.id);
  const tex = canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = product.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = product.accent;
    ctx.fillRect(0, h * 0.62, w, h * 0.22);
    ctx.fillRect(0, 0, w, h * 0.08);
    ctx.save();
    ctx.translate(w / 2, h * 0.38);
    ctx.fillStyle = isLight(product.color) ? '#222' : '#fff';
    ctx.font = `bold ${product.short.length > 7 ? 22 : 30}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(product.short, 0, 0);
    ctx.restore();
  });
  productLabelCache.set(product.id, tex);
  return tex;
}

export function storeSign(text) {
  return canvasTexture(1024, 192, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1f6e4c');
    grad.addColorStop(1, '#154f36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#fff8e1';
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 6);
  });
}

export function openSign(open) {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = open ? '#1b5e20' : '#7f1d1d';
    roundRect(ctx, 4, 4, w - 8, h - 8, 16);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    roundRect(ctx, 12, 12, w - 24, h - 24, 12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'ABIERTO' : 'CERRADO', w / 2, h / 2 + 3);
  });
}

export function dirtTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const tone = Math.random() < 0.5 ? [92, 64, 40] : [70, 72, 60];
    for (let i = 0; i < 14; i++) {
      const r = 10 + Math.random() * 26;
      const x = w / 2 + (Math.random() - 0.5) * 50;
      const y = h / 2 + (Math.random() - 0.5) * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${tone[0]},${tone[1]},${tone[2]},0.75)`);
      g.addColorStop(1, `rgba(${tone[0]},${tone[1]},${tone[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Cartel de precio de una góndola (se redibuja cuando cambia el precio)
export function createPriceTag() {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 64;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (name, price) => {
    const ctx = c.getContext('2d');
    ctx.fillStyle = name ? '#fffde7' : '#eceff1';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = name ? '#f9a825' : '#b0bec5';
    ctx.fillRect(0, 0, 10, c.height);
    ctx.fillStyle = '#212121';
    ctx.textBaseline = 'middle';
    if (name) {
      ctx.font = '20px sans-serif';
      ctx.fillText(name, 18, 18);
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(price, 18, 46);
    } else {
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#78909c';
      ctx.fillText('— vacío —', 18, 32);
    }
    tex.needsUpdate = true;
  };
  draw(null, null);
  return { texture: tex, draw };
}

// Burbuja de texto que aparece sobre los clientes
export function bubbleTexture(text) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.font = 'bold 44px sans-serif';
    const tw = Math.min(w - 20, ctx.measureText(text).width + 50);
    const x = (w - tw) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, x, 10, tw, h - 30, 24);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 14, h - 21);
    ctx.lineTo(w / 2, h - 2);
    ctx.lineTo(w / 2 + 14, h - 21);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, (h - 20) / 2 + 10, tw - 30);
  });
}

export function screenTexture(lines, bg = '#0d47a1') {
  return canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e3f2fd';
    ctx.font = 'bold 26px sans-serif';
    lines.forEach((l, i) => ctx.fillText(l, 16, 40 + i * 36));
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 150;
}

function shiftColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt), g = clamp(((n >> 8) & 255) + amt), b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}
