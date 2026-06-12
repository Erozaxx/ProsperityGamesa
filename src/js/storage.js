// Ukládání / načítání stavu a výpočet offline progresu.

import { SAVE_KEY, SAVE_VERSION, createInitialState } from './state.js';
import { advance } from './game.js';

// Maximální doba offline progresu (12 hodin) – brání nereálným skokům.
const MAX_OFFLINE_SECONDS = 12 * 60 * 60;

export function save(state) {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Uložení selhalo:', err);
    return false;
  }
}

// Načte stav. Pokud chybí nebo je nekompatibilní, vrátí čerstvý stav.
export function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return createInitialState();

  try {
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) return migrate(data);
    return { ...createInitialState(), ...data };
  } catch (err) {
    console.warn('Načtení selhalo, začínám znovu:', err);
    return createInitialState();
  }
}

// Místo pro budoucí migrace mezi verzemi savů. Zatím začneme načisto.
function migrate(_oldData) {
  return createInitialState();
}

// Připíše výdělek za dobu, kdy byla hra zavřená. Vrací počet vydělaných 💰.
export function applyOfflineProgress(state) {
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - (state.lastSaved || now)) / 1000);
  const capped = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  if (capped <= 0) return { earned: 0, seconds: 0 };

  const earned = advance(state, capped);
  return { earned, seconds: capped };
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
