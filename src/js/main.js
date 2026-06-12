// Vstupní bod: propojí logiku, UI, ukládání a herní smyčku.

import { createInitialState } from './state.js';
import { work, buyGenerator, advance } from './game.js';
import { load, save, clearSave, applyOfflineProgress } from './storage.js';
import { initUI, render, setStatus, showOfflineToast } from './ui.js';

let state = load();

// --- Akce hráče ---------------------------------------------------------
function handleWork() {
  work(state);
  render(state);
}

function handleBuy(generatorId) {
  if (buyGenerator(state, generatorId)) render(state);
}

function handleReset() {
  if (!confirm('Opravdu začít znovu? Veškerý postup bude smazán.')) return;
  clearSave();
  state = createInitialState();
  render(state);
  setStatus('Nová hra spuštěna.');
}

// --- Herní smyčka -------------------------------------------------------
const TICK_MS = 100;
let lastTick = performance.now();

function tick(now) {
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt > 0) advance(state, dt);
  render(state);
  requestAnimationFrame(tick);
}

// Pravidelné ukládání + uložení při odchodu / přepnutí na pozadí.
function autosave() {
  save(state);
  setStatus(`Uloženo ${new Date().toLocaleTimeString('cs-CZ')}`);
}

// --- Start --------------------------------------------------------------
function start() {
  initUI({ onWork: handleWork, onBuy: handleBuy, onReset: handleReset });

  const offline = applyOfflineProgress(state);
  showOfflineToast(offline.earned, offline.seconds);

  render(state);

  setInterval(autosave, 10_000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save(state);
  });
  window.addEventListener('pagehide', () => save(state));

  requestAnimationFrame(tick);
}

start();

// --- Service worker (offline / instalace) -------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('Registrace service workeru selhala:', err);
    });
  });
}
