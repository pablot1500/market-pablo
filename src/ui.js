// Interfaz: HUD, mensajes y paneles (computadora, precios, cobro, resumen del día).
import { PRODUCTS, DENOMINATIONS, fmt, fmtTime } from './config.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.panelOpen = null;
    this.onPanelKey = null;
    this.cart = Object.fromEntries(PRODUCTS.map((p) => [p.id, 0]));
    this.computerTab = 'orders';
    this.cache = {};
    $('panel-close').addEventListener('click', () => this.closePanel(true));
    document.addEventListener('keydown', (e) => {
      if (!this.panelOpen) return;
      if (e.code === 'Escape') { this.closePanel(false); return; }
      if (this.onPanelKey) this.onPanelKey(e);
    });
  }

  showHUD(v) { $('hud').classList.toggle('hidden', !v); }

  set(id, value, prop = 'textContent') {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    $(id)[prop] = value;
  }

  updateHUD() {
    const g = this.game;
    this.set('hud-day', `Día ${g.day}`);
    this.set('hud-clock', fmtTime(g.time));
    this.set('hud-status', g.open ? 'ABIERTO' : (g.closedForDay ? 'CERRADO · fin del día' : 'CERRADO'));
    const st = $('hud-status');
    st.classList.toggle('open', g.open);
    st.classList.toggle('closed', !g.open);
    this.set('hud-money', fmt(g.economy.money));
    const stars = Math.round(g.economy.reputation * 5);
    this.set('hud-rep', `Reputación ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`);
    this.set('hud-clean', `Limpieza ${Math.round(g.cleaning.cleanliness() * 100)}%`);
  }

  setHint(text) { this.set('hint', text || ''); $('crosshair').classList.toggle('active', !!text); }
  setHeld(text) { this.set('held', text || ''); }
  setCheckout(text) { this.set('checkout-hud', text || ''); }

  setProgress(frac) {
    const el = $('progress');
    if (frac == null) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    $('progress-bar').style.width = `${Math.round(frac * 100)}%`;
  }

  toast(text, type = 'info', ms = 3200) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = text;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), ms);
  }

  // ---------- Paneles ----------
  openPanel(name, html, { narrow = false } = {}) {
    this.panelOpen = name;
    this.onPanelKey = null;
    $('panel-body').innerHTML = html;
    $('panel').querySelector('.panel-inner').classList.toggle('narrow', narrow);
    $('panel').classList.remove('hidden');
    $('panel-close').classList.toggle('hidden', name === 'summary');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closePanel(fromClick) {
    if (!this.panelOpen) return;
    if (this.panelOpen === 'summary') return; // se cierra con su botón
    this.hidePanel();
    this.game.resumeAfterPanel(fromClick);
  }

  hidePanel() {
    this.panelOpen = null;
    this.onPanelKey = null;
    $('panel').classList.add('hidden');
    $('panel-body').innerHTML = '';
  }

  body() { return $('panel-body'); }

  // ---------- Computadora ----------
  openComputer(tab = this.computerTab) {
    this.computerTab = tab;
    const tabs = [['orders', '🛒 Pedidos'], ['prices', '🏷️ Precios'], ['stats', '📊 Negocio']];
    const html = `
      <h2 style="margin:0 0 12px">Market PC</h2>
      <div class="tabs">${tabs.map(([id, label]) => `<button class="tab ${id === tab ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
      <div id="tab-body"></div>`;
    if (this.panelOpen !== 'computer') this.openPanel('computer', html);
    else this.body().innerHTML = html;
    this.body().querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => this.openComputer(b.dataset.tab)));
    if (tab === 'orders') this.renderOrders();
    else if (tab === 'prices') this.renderPrices();
    else this.renderStats();
  }

  renderOrders() {
    const g = this.game, e = g.economy;
    const free = g.freeDeliverySpots();
    const totalBoxes = Object.values(this.cart).reduce((a, b) => a + b, 0);
    const total = PRODUCTS.reduce((sum, p) => sum + this.cart[p.id] * e.boxPrice(p), 0);
    const rows = PRODUCTS.map((p) => {
      const t = e.trend[p.id];
      const trend = Math.abs(t) < 0.005 ? '<span class="flat">=</span>' : t > 0 ? `<span class="up">▲ ${(t * 100).toFixed(0)}%</span>` : `<span class="down">▼ ${(-t * 100).toFixed(0)}%</span>`;
      const stock = g.stockOf(p);
      return `<tr>
        <td><span class="swatch" style="background:${p.color}"></span>${p.name} <span class="small">${p.brand}</span></td>
        <td class="num">${fmt(e.cost[p.id])}</td>
        <td class="num">${trend}</td>
        <td class="num">${p.boxQty}</td>
        <td class="num"><b>${fmt(e.boxPrice(p))}</b></td>
        <td class="num">${stock.shelf} / ${stock.boxes}</td>
        <td class="num"><span class="qty"><button data-dec="${p.id}">−</button><span>${this.cart[p.id]}</span><button data-inc="${p.id}">+</button></span></td>
      </tr>`;
    }).join('');
    const tb = this.body().querySelector('#tab-body');
    const err = total > e.money ? 'No te alcanza la plata.' : totalBoxes > free ? `Solo hay lugar para ${free} cajas en la vereda.` : '';
    tb.innerHTML = `
      <table>
        <thead><tr><th>Producto</th><th class="num">Costo u.</th><th class="num">Mercado</th><th class="num">U/caja</th><th class="num">Precio caja</th><th class="num">Góndola / cajas</th><th class="num">Cajas</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="small">Tenés ${fmt(e.money)} · Lugar en la vereda: ${free} cajas</div>
        <div style="display:flex;gap:12px;align-items:center">
          <span class="total">Total: ${fmt(total)}</span>
          <button class="btn" id="cart-clear">Vaciar</button>
          <button class="btn primary" id="cart-buy" ${totalBoxes === 0 || err ? 'disabled' : ''}>Comprar</button>
        </div>
      </div>
      <div class="err">${totalBoxes ? err : ''}</div>`;
    tb.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { this.cart[b.dataset.inc]++; this.renderOrders(); }));
    tb.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { this.cart[b.dataset.dec] = Math.max(0, this.cart[b.dataset.dec] - 1); this.renderOrders(); }));
    tb.querySelector('#cart-clear').addEventListener('click', () => { for (const k in this.cart) this.cart[k] = 0; this.renderOrders(); });
    tb.querySelector('#cart-buy').addEventListener('click', () => {
      if (g.placeOrder(this.cart)) {
        for (const k in this.cart) this.cart[k] = 0;
      }
      this.renderOrders();
    });
  }

  chancePill(productId) {
    const c = this.game.economy.acceptChance(productId);
    if (c >= 0.85) return '<span class="pill high">Se vende bien</span>';
    if (c >= 0.45) return '<span class="pill mid">Algo caro</span>';
    return '<span class="pill low">Muy caro</span>';
  }

  renderPrices() {
    const e = this.game.economy;
    const rows = PRODUCTS.map((p) => {
      const margin = e.prices[p.id] - e.cost[p.id];
      return `<tr>
        <td><span class="swatch" style="background:${p.color}"></span>${p.name}</td>
        <td class="num">${fmt(e.cost[p.id])}</td>
        <td class="num">${fmt(e.market[p.id])}</td>
        <td class="num"><span class="qty"><button data-step="${p.id}:-5">−</button>
          <input class="price-input" data-price="${p.id}" value="${(e.prices[p.id] / 100).toFixed(2)}" />
          <button data-step="${p.id}:5">+</button></span></td>
        <td class="num ${margin < 0 ? 'up' : ''}">${fmt(margin)} (${Math.round(margin / e.cost[p.id] * 100)}%)</td>
        <td>${this.chancePill(p.id)}</td>
        <td><button class="btn" data-market="${p.id}">= mercado</button></td>
      </tr>`;
    }).join('');
    const tb = this.body().querySelector('#tab-body');
    tb.innerHTML = `
      <p class="small" style="margin-top:0">El <b>precio de mercado</b> es lo que los clientes consideran normal. Si cobrás más, ganás más por unidad pero se llevan menos. Los precios del mercado cambian todos los días.</p>
      <table>
        <thead><tr><th>Producto</th><th class="num">Costo</th><th class="num">Mercado</th><th class="num">Tu precio</th><th class="num">Ganancia u.</th><th>Clientes</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer"><span class="small">Tip: escribí el precio y apretá Enter.</span><button class="btn" id="all-market">Todos a precio de mercado</button></div>`;
    const apply = (id, cents) => { this.game.setPrice(id, cents); this.renderPrices(); };
    tb.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const [id, d] = b.dataset.step.split(':');
      apply(id, e.prices[id] + Number(d));
    }));
    tb.querySelectorAll('[data-market]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.market, e.market[b.dataset.market])));
    tb.querySelectorAll('[data-price]').forEach((inp) => {
      const commit = () => {
        const v = parseFloat(inp.value.replace(',', '.'));
        if (Number.isFinite(v) && v > 0) apply(inp.dataset.price, Math.round(v * 100));
        else this.renderPrices();
      };
      inp.addEventListener('change', commit);
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); ev.stopPropagation(); });
    });
    tb.querySelector('#all-market').addEventListener('click', () => {
      for (const p of PRODUCTS) this.game.setPrice(p.id, e.market[p.id]);
      this.renderPrices();
    });
  }

  renderStats() {
    const g = this.game, e = g.economy, t = e.today;
    const stat = (label, value, extra = '') => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${extra}</div>`;
    const rows = PRODUCTS.map((p) => {
      const s = g.stockOf(p);
      return `<tr><td><span class="swatch" style="background:${p.color}"></span>${p.name}</td><td class="num">${s.shelf}</td><td class="num">${s.boxes}</td><td class="num">${fmt(e.prices[p.id])}</td></tr>`;
    }).join('');
    this.body().querySelector('#tab-body').innerHTML = `
      <div class="stat-grid">
        ${stat('Ventas de hoy', fmt(t.revenue))}
        ${stat('Compras de hoy', fmt(t.spent))}
        ${stat('Clientes atendidos', t.served)}
        ${stat('Clientes perdidos', t.lost)}
        ${stat('Reputación', `${Math.round(e.reputation * 100)}%`, `<div class="bar"><div style="width:${e.reputation * 100}%"></div></div>`)}
        ${stat('Limpieza', `${Math.round(g.cleaning.cleanliness() * 100)}%`, `<div class="bar"><div style="width:${g.cleaning.cleanliness() * 100}%"></div></div>`)}
      </div>
      <table><thead><tr><th>Producto</th><th class="num">En góndola</th><th class="num">En cajas</th><th class="num">Tu precio</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---------- Precio rápido desde la góndola ----------
  openPriceDialog(product) {
    const e = this.game.economy;
    const render = () => {
      const price = e.prices[product.id];
      return `
        <h2 style="margin-top:0"><span class="swatch" style="background:${product.color}"></span>${product.name}</h2>
        <div class="pay-row"><span>Costo (mayorista)</span><b>${fmt(e.cost[product.id])}</b></div>
        <div class="pay-row"><span>Precio de mercado</span><b>${fmt(e.market[product.id])}</b></div>
        <div class="pay-row"><span>Ganancia por unidad</span><b>${fmt(price - e.cost[product.id])}</b></div>
        <div style="display:flex;gap:8px;align-items:center;justify-content:center;margin:16px 0">
          <button class="btn" data-d="-10">−0.10</button><button class="btn" data-d="-1">−0.01</button>
          <input class="price-input" id="pd-input" style="width:110px;font-size:20px" value="${(price / 100).toFixed(2)}" />
          <button class="btn" data-d="1">+0.01</button><button class="btn" data-d="10">+0.10</button>
        </div>
        <div style="text-align:center">${this.chancePill(product.id)}</div>
        <div class="footer"><button class="btn" id="pd-market">= mercado</button><button class="btn primary" id="pd-ok">Listo</button></div>`;
    };
    const bind = () => {
      const b = this.body();
      b.querySelectorAll('[data-d]').forEach((btn) => btn.addEventListener('click', () => { this.game.setPrice(product.id, e.prices[product.id] + Number(btn.dataset.d)); refresh(); }));
      b.querySelector('#pd-market').addEventListener('click', () => { this.game.setPrice(product.id, e.market[product.id]); refresh(); });
      const inp = b.querySelector('#pd-input');
      const commit = () => {
        const v = parseFloat(inp.value.replace(',', '.'));
        if (Number.isFinite(v) && v > 0) this.game.setPrice(product.id, Math.round(v * 100));
        refresh();
      };
      inp.addEventListener('change', commit);
      inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') commit(); if (ev.key === 'Escape') this.closePanel(false); });
      b.querySelector('#pd-ok').addEventListener('click', () => this.closePanel(true));
    };
    const refresh = () => { this.body().innerHTML = render(); bind(); };
    this.openPanel('price', render(), { narrow: true });
    bind();
  }

  // ---------- Cobro ----------
  openPayment(checkout) {
    const c = checkout;
    if (c.method === 'card') {
      let entry = '';
      const render = (err = '') => `
        <div class="pay-head"><h2 style="margin:0">💳 Pago con tarjeta</h2></div>
        <div class="pay-row"><span>Total a cobrar</span><b>${fmt(c.total)}</b></div>
        <div class="display">${entry ? '$' + entry : '<span style="opacity:.4">$0.00</span>'}</div>
        <div class="keypad">
          ${['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}
        </div>
        <div class="err">${err}</div>
        <div class="footer"><span class="small">Ingresá el monto exacto (también podés usar el teclado).</span><button class="btn primary" id="pay-ok">Cobrar</button></div>`;
      const press = (k) => {
        if (k === '⌫' || k === 'Backspace') entry = entry.slice(0, -1);
        else if (k === '.' || k === ',') { if (!entry.includes('.')) entry += entry ? '.' : '0.'; }
        else if (/^\d$/.test(k)) {
          const dec = entry.split('.')[1];
          if (!(dec && dec.length >= 2) && entry.length < 9) entry += k;
        }
        refresh();
      };
      const submit = () => {
        const cents = Math.round(parseFloat(entry || '0') * 100);
        const res = c.payCard(cents);
        if (!res.ok) { entry = ''; refresh(res.msg); }
      };
      const bind = () => {
        this.body().querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => press(b.dataset.k)));
        this.body().querySelector('#pay-ok').addEventListener('click', submit);
      };
      const refresh = (err) => { if (this.panelOpen !== 'payment') return; this.body().innerHTML = render(err); bind(); };
      this.openPanel('payment', render(), { narrow: true });
      bind();
      this.onPanelKey = (e) => {
        if (e.key === 'Enter') submit();
        else press(e.key);
      };
    } else {
      const given = [];
      const due = c.paid - c.total;
      const sum = () => given.reduce((a, b) => a + b, 0);
      const render = (err = '') => `
        <div class="pay-head"><h2 style="margin:0">💵 Pago en efectivo</h2></div>
        <div class="pay-row"><span>Total</span><b>${fmt(c.total)}</b></div>
        <div class="pay-row"><span>El cliente te da</span><b>${fmt(c.paid)}</b></div>
        <div class="pay-row"><span>Vuelto a entregar</span><b style="color:var(--green)">${fmt(due)}</b></div>
        <div class="display">${fmt(sum())}</div>
        <div class="money-grid">
          ${DENOMINATIONS.map((d) => `<button class="${d >= 100 ? 'bill' : 'coin'}" data-m="${d}">${d >= 100 ? '$' + d / 100 : (d / 100).toFixed(2).replace(/^0/, '')}</button>`).join('')}
        </div>
        <div class="err">${err}</div>
        <div class="footer">
          <div style="display:flex;gap:8px"><button class="btn" id="pay-undo">Deshacer</button><button class="btn" id="pay-reset">Reiniciar</button></div>
          <button class="btn primary" id="pay-ok">${due === 0 ? 'Cobrar' : 'Entregar vuelto'}</button>
        </div>`;
      const bind = () => {
        const b = this.body();
        b.querySelectorAll('[data-m]').forEach((btn) => btn.addEventListener('click', () => { given.push(Number(btn.dataset.m)); refresh(); }));
        b.querySelector('#pay-undo').addEventListener('click', () => { given.pop(); refresh(); });
        b.querySelector('#pay-reset').addEventListener('click', () => { given.length = 0; refresh(); });
        b.querySelector('#pay-ok').addEventListener('click', () => {
          const res = c.payCash(sum());
          if (!res.ok) refresh(res.msg);
        });
      };
      const refresh = (err) => { if (this.panelOpen !== 'payment') return; this.body().innerHTML = render(err); bind(); };
      this.openPanel('payment', render(), { narrow: true });
      bind();
    }
  }

  // ---------- Fin del día ----------
  openSummary(onNext) {
    const g = this.game, e = g.economy, t = e.today;
    const profit = e.money - t.startMoney;
    const stat = (label, value) => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`;
    this.openPanel('summary', `
      <h2 style="margin-top:0">Fin del día ${g.day}</h2>
      <div class="stat-grid">
        ${stat('Ventas', fmt(t.revenue))}
        ${stat('Compras', fmt(t.spent))}
        ${stat('Resultado del día', `<span style="color:${profit >= 0 ? '#2e7d32' : 'var(--red)'}">${fmt(profit)}</span>`)}
        ${stat('Dinero', fmt(e.money))}
        ${stat('Clientes atendidos', t.served)}
        ${stat('Clientes perdidos', t.lost)}
        ${stat('Productos vendidos', t.itemsSold)}
        ${stat('No encontraron', t.missing)}
        ${stat('Les pareció caro', t.tooExpensive)}
        ${stat('Reputación', `${Math.round(e.reputation * 100)}%`)}
      </div>
      <p class="small">Mañana los precios del mercado van a cambiar. Revisá la computadora antes de abrir.</p>
      <div class="footer"><span></span><button class="btn primary" id="next-day">Empezar día ${g.day + 1}</button></div>`);
    this.body().querySelector('#next-day').addEventListener('click', () => {
      this.hidePanel();
      onNext();
      this.game.resumeAfterPanel(true);
    });
  }
}
