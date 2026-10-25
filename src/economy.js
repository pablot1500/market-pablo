// Dinero, precios de mercado (fluctúan cada día), precios de venta y estadísticas.
import { PRODUCTS, START_MONEY } from './config.js';

export class Economy {
  constructor() {
    this.money = START_MONEY;
    this.reputation = 0.5; // 0..1
    this.cost = {};    // lo que te cobra el mayorista por unidad
    this.market = {};  // precio de referencia que el cliente considera "normal"
    this.prices = {};  // tu precio de venta
    this.trend = {};   // variación del último cambio de mercado (fracción)
    for (const p of PRODUCTS) {
      this.cost[p.id] = p.cost;
      this.market[p.id] = p.market;
      this.prices[p.id] = p.market;
      this.trend[p.id] = 0;
    }
    this.resetDayStats();
  }

  resetDayStats() {
    this.today = { revenue: 0, spent: 0, served: 0, lost: 0, itemsSold: 0, missing: 0, tooExpensive: 0, startMoney: this.money };
  }

  boxPrice(product) { return this.cost[product.id] * product.boxQty; }

  canAfford(cents) { return this.money >= cents; }

  spend(cents) {
    this.money -= cents;
    this.today.spent += cents;
  }

  earn(cents) {
    this.money += cents;
    this.today.revenue += cents;
  }

  setPrice(productId, cents) {
    this.prices[productId] = Math.max(1, Math.round(cents));
  }

  // Probabilidad de que un cliente acepte el precio de un producto.
  acceptChance(productId) {
    const ratio = this.prices[productId] / this.market[productId];
    let p;
    if (ratio <= 0.85) p = 1;
    else if (ratio <= 1.0) p = 0.97;
    else if (ratio <= 1.25) p = 0.97 - (ratio - 1.0) / 0.25 * 0.3;      // hasta 0.67
    else if (ratio <= 1.7) p = 0.67 - (ratio - 1.25) / 0.45 * 0.67;     // hasta 0
    else p = 0;
    // la buena reputación hace a los clientes un poco más tolerantes
    return Math.max(0, Math.min(1, p + (this.reputation - 0.5) * 0.15));
  }

  changeReputation(delta) {
    this.reputation = Math.max(0.05, Math.min(1, this.reputation + delta));
  }

  // Nuevo día: los precios del mercado se mueven un poco.
  fluctuate() {
    const changes = [];
    for (const p of PRODUCTS) {
      const shock = gaussian() * 0.06 + (Math.random() < 0.08 ? (Math.random() < 0.5 ? -0.15 : 0.18) : 0);
      // tiende a volver al precio base para que no se dispare
      const pull = (p.cost - this.cost[p.id]) / p.cost * 0.15;
      const factor = Math.min(1.25, Math.max(0.8, 1 + shock + pull));
      const newCost = clamp(Math.round(this.cost[p.id] * factor), Math.round(p.cost * 0.55), Math.round(p.cost * 1.8));
      const ratio = newCost / this.cost[p.id];
      this.trend[p.id] = ratio - 1;
      this.cost[p.id] = newCost;
      this.market[p.id] = Math.round(newCost * (p.market / p.cost));
      if (Math.abs(ratio - 1) >= 0.03) changes.push({ product: p, change: ratio - 1 });
    }
    return changes;
  }

  toJSON() {
    return { money: this.money, reputation: this.reputation, cost: this.cost, market: this.market, prices: this.prices, trend: this.trend };
  }

  load(data) {
    this.money = data.money;
    this.reputation = data.reputation;
    Object.assign(this.cost, data.cost);
    Object.assign(this.market, data.market);
    Object.assign(this.prices, data.prices);
    Object.assign(this.trend, data.trend || {});
    this.resetDayStats();
  }
}

function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
