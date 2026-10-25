// Configuración general del juego. Todos los montos están en centavos (enteros)
// para evitar errores de redondeo.

export const GAME_MINUTES_PER_SECOND = 1; // 1 segundo real = 1 minuto de juego
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 21;
export const START_MONEY = 20000; // $200.00

export const PLAYER = {
  eyeHeight: 1.65,
  radius: 0.3,
  walkSpeed: 3.6,
  runSpeed: 6.2,
  reach: 3.0,
  mouseSensitivity: 0.0022,
};

export const CUSTOMER = {
  speed: 1.75,
  maxInWorld: 10,
  patienceSeconds: 150,
  baseSpawnPerMinute: 0.05,
  dirtPerMinute: 0.012,
};

// Dimensiones en metros: [ancho, alto, profundidad]
// cost = lo que pagás al mayorista por unidad; market = precio de referencia al público.
export const PRODUCTS = [
  { id: 'agua', name: 'Agua mineral', short: 'Agua', shape: 'bottle', size: [0.085, 0.3, 0.085], color: '#5ec8f2', accent: '#1565c0', cost: 55, market: 95, boxQty: 12, popularity: 1.3 },
  { id: 'gaseosa', name: 'Gaseosa cola', short: 'Gaseosa', shape: 'bottle', size: [0.1, 0.32, 0.1], color: '#4a1410', accent: '#e53935', cost: 90, market: 150, boxQty: 12, popularity: 1.2 },
  { id: 'leche', name: 'Leche entera', short: 'Leche', shape: 'box', size: [0.09, 0.22, 0.09], color: '#f4f6f8', accent: '#1e88e5', cost: 70, market: 120, boxQty: 12, popularity: 1.4 },
  { id: 'pan', name: 'Pan lactal', short: 'Pan', shape: 'box', size: [0.22, 0.12, 0.12], color: '#e9b872', accent: '#8d4a12', cost: 110, market: 190, boxQty: 8, popularity: 1.1 },
  { id: 'arroz', name: 'Arroz largo fino', short: 'Arroz', shape: 'box', size: [0.14, 0.2, 0.07], color: '#fafafa', accent: '#2e7d32', cost: 95, market: 160, boxQty: 10, popularity: 0.9 },
  { id: 'fideos', name: 'Fideos spaghetti', short: 'Fideos', shape: 'box', size: [0.16, 0.22, 0.05], color: '#ffd54f', accent: '#1a237e', cost: 65, market: 110, boxQty: 12, popularity: 1.0 },
  { id: 'galletitas', name: 'Galletitas', short: 'Galletitas', shape: 'box', size: [0.2, 0.06, 0.07], color: '#6d4c41', accent: '#ffb300', cost: 80, market: 135, boxQty: 12, popularity: 1.0 },
  { id: 'cafe', name: 'Café molido', short: 'Café', shape: 'can', size: [0.1, 0.14, 0.1], color: '#3e2723', accent: '#d7a86e', cost: 240, market: 390, boxQty: 8, popularity: 0.7 },
  { id: 'aceite', name: 'Aceite de girasol', short: 'Aceite', shape: 'bottle', size: [0.08, 0.3, 0.08], color: '#f9c74f', accent: '#2e7d32', cost: 180, market: 290, boxQty: 8, popularity: 0.8 },
  { id: 'cereal', name: 'Cereal de maíz', short: 'Cereal', shape: 'box', size: [0.2, 0.28, 0.07], color: '#ff7043', accent: '#fff176', cost: 190, market: 310, boxQty: 8, popularity: 0.8 },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Billetes y monedas disponibles para dar vuelto (centavos)
export const DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 25, 10, 5, 1];

// Disposición de la tienda (coordenadas en metros; +Z apunta hacia la calle)
export const STORE = {
  minX: -7, maxX: 7, minZ: -6, maxZ: 6, height: 3.2, wall: 0.2,
  doorMinX: 1.5, doorMaxX: 3.5,
};

export const WORLD_BOUNDS = { minX: -19.5, maxX: 19.5, minZ: -7, maxZ: 17 };

export function fmt(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function fmtTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
