// Vykreslování a propojení s DOM. Odděleno od herní logiky.

import { GENERATORS, CLICK_VALUE } from './state.js';
import { generatorCost, productionPerSecond } from './game.js';

// Zkrácené formátování velkých čísel (1.2K, 3.4M, ...).
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
export function formatNumber(value) {
  if (value < 1000) return Number.isInteger(value) ? String(value) : value.toFixed(1);
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(value) / 3));
  const scaled = value / Math.pow(1000, tier);
  return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
}

const els = {};

export function initUI({ onWork, onBuy, onReset }) {
  els.money = document.getElementById('money');
  els.rate = document.getElementById('rate');
  els.clickValue = document.getElementById('click-value');
  els.generators = document.getElementById('generators');
  els.status = document.getElementById('status');
  els.toast = document.getElementById('offline-toast');

  els.clickValue.textContent = formatNumber(CLICK_VALUE);

  document.getElementById('work-btn').addEventListener('click', onWork);
  document.getElementById('reset-btn').addEventListener('click', onReset);

  // Jednou vytvoříme řádek pro každý generátor; pak jen aktualizujeme obsah.
  for (const g of GENERATORS) {
    const li = document.createElement('li');
    li.className = 'generator';
    li.dataset.id = g.id;
    li.innerHTML = `
      <button class="generator__buy" type="button">
        <span class="generator__icon">${g.icon}</span>
        <span class="generator__info">
          <span class="generator__name">${g.name}</span>
          <span class="generator__meta">
            <span class="generator__count" data-count>0</span> ks ·
            +<span data-prod>${formatNumber(g.baseProduction)}</span>/s
          </span>
        </span>
        <span class="generator__cost"><span data-cost>0</span> 💰</span>
      </button>`;
    li.querySelector('.generator__buy').addEventListener('click', () => onBuy(g.id));
    els.generators.appendChild(li);
    g._el = li; // reference pro rychlý update
  }
}

export function render(state) {
  els.money.textContent = formatNumber(state.money);
  els.rate.textContent = formatNumber(productionPerSecond(state));

  for (const g of GENERATORS) {
    const li = g._el;
    const owned = state.owned[g.id] || 0;
    const cost = generatorCost(g, owned);
    li.querySelector('[data-count]').textContent = owned;
    li.querySelector('[data-cost]').textContent = formatNumber(cost);
    li.querySelector('.generator__buy').disabled = state.money < cost;
    li.classList.toggle('generator--affordable', state.money >= cost);
  }
}

export function setStatus(text) {
  if (els.status) els.status.textContent = text;
}

export function showOfflineToast(earned, seconds) {
  if (!els.toast || earned <= 0) return;
  const mins = Math.round(seconds / 60);
  const when = mins >= 60 ? `${Math.round(mins / 60)} h` : `${mins} min`;
  els.toast.textContent = `Vítej zpět! Za ${when} jsi vydělal ${formatNumber(earned)} 💰`;
  els.toast.hidden = false;
  setTimeout(() => { els.toast.hidden = true; }, 5000);
}
