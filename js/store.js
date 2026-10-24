// Состояние приложения в localStorage. Формат версионирован, чтобы позже подключить облако без переделки.
const KEY = 'bloomline-v1';

const DEFAULTS = {
  v: 1,
  settings: {
    onboarded: false,
    grinderId: '1zpresso-k-ultra',
    custom: null,            // {name, filter, espresso, step}
    brewer: 'origami-air-cone',
    dose: 14,
    schemeId: 'base',
    sound: true,
    waterPreset: 'melb',
  },
  calibration: {},           // grinderId → поправка в мкм
  schemes: [],               // свои схемы
  journal: [],               // заварки, новые сверху
  lastCoffee: { roaster: '', lot: '', process: '', roastDate: '' },
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...raw.settings } };
    }
  } catch (e) { /* пустое или недоступное хранилище — начинаем с умолчаний */ }
  return structuredClone(DEFAULTS);
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
}

export const store = {
  get: () => state,
  update(fn) { fn(state); persist(); listeners.forEach(l => l(state)); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  exportJSON() {
    return JSON.stringify({ app: 'bloomline', exported: new Date().toISOString(), ...state }, null, 2);
  },
  // Слияние: свои схемы и записи журнала добавляются по id, настройки берутся из копии
  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || data.app !== 'bloomline') throw new Error('not a bloomline backup');
    let added = 0;
    this.update(s => {
      const ids = new Set(s.journal.map(b => b.id));
      for (const b of data.journal || []) if (!ids.has(b.id)) { s.journal.push(b); added++; }
      s.journal.sort((a, b) => b.ts - a.ts);
      const sids = new Set(s.schemes.map(x => x.id));
      for (const x of data.schemes || []) if (!sids.has(x.id)) { s.schemes.push(x); added++; }
      s.settings = { ...s.settings, ...(data.settings || {}) };
      s.calibration = { ...s.calibration, ...(data.calibration || {}) };
    });
    return added;
  },
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
