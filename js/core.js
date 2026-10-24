// Производные значения: текущая кофемолка, схема, итоговый помол и вода.
import { store } from './store.js';
import { grinderById, settingFor, stepsBetween, unitWord } from './grinders.js';
import { BUILTIN, brewerById, BASE_DOSE, DOSE_UM_PER_G, WATER, readWaterLab } from './schemes.js';

export const currentGrinder = () => {
  const s = store.get().settings;
  return grinderById(s.grinderId, s.custom);
};

export const allSchemes = () => [...store.get().schemes, ...BUILTIN];
export const schemeById = id => allSchemes().find(x => x.id === id) || BUILTIN[0];
export const currentScheme = () => schemeById(store.get().settings.schemeId);

export const calibUm = (g = currentGrinder()) => store.get().calibration[g.id] || 0;

// Итоговый помол: схема + воронка + доза + калибровка кофемолки
export function grindFor(scheme, dose, g = currentGrinder()) {
  const brewer = brewerById(store.get().settings.brewer);
  const doseUm = (dose - BASE_DOSE) * DOSE_UM_PER_G;
  const cal = calibUm(g);
  const um = scheme.grindUm + brewer.um + doseUm + cal;
  const set = settingFor(g, um);
  // Сколько делений даёт каждая поправка — для подписи под помолом
  const base = scheme.grindUm;
  const steps = (from, to) => stepsBetween(g, from, to);
  return {
    g, um, set, unit: n => unitWord(g, n),
    parts: {
      brewer: steps(base, base + brewer.um),
      dose: steps(base + brewer.um, base + brewer.um + doseUm),
      calib: steps(base + brewer.um + doseUm, um),
    },
  };
}

export function currentWater() {
  const lab = readWaterLab();
  if (lab) return { ...lab, fromLab: true };
  const p = WATER.find(w => w.id === store.get().settings.waterPreset) || WATER[1];
  return { ...p, fromLab: false };
}

export const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
