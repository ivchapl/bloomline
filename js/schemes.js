// Схемы пролива, воронки, вода и расчёт плана под дозу.
import { BASE_UM } from './grinders.js';

// Базовые схемы — из Origami Brew Lab (светлая обжарка, Origami + конусный фильтр Hario).
// Помол сдвинут на 7 щелчков K-Ultra в мелкую сторону (согласовано 24.10.2026): 0.7.0 / 0.7.1 / 0.7.2 / 0.7.3 / 0.7.8.
// Доли воды и тайминги — как в проверенных планах на 14 г.
const K = 7.6; // мкм на щелчок K-Ultra по шкале HCG
export const BUILTIN = [
  {
    id: 'wdense', builtin: true, name: 'Мытая плотная', icon: '💧',
    about: 'Кения, мытая Эфиопия. Плотное высокогорное зерно не боится жара.',
    temp: 95, ratio: 16, grindUm: 70 * K, pourEnd: 120, drawdown: 40,
    steps: [
      { at: 0, frac: 55 / 225, name: 'Блуминг +', hint: 'Увеличенное первое вливание смещает чашку в кислотность. Смочите всю поверхность, затем лёгкий swirl' },
      { at: 35, frac: 35 / 225, name: 'Импульс I', hint: 'Укороченный второй пролив: баланс уже задан, дальше набираем экстракцию' },
      { at: 55, frac: 45 / 225, name: 'Импульс II', hint: 'Лейте на подсохшую таблетку, не по стенкам' },
      { at: 75, frac: 45 / 225, name: 'Импульс III', hint: 'Держите ритм: таблетка не должна пересыхать' },
      { at: 95, frac: 45 / 225, name: 'Импульс IV', hint: 'Финальный пролив, дальше не трогаем' },
    ],
  },
  {
    id: 'wsoft', builtin: true, name: 'Мытая мягкая', icon: '🌿',
    about: 'Колумбия, Перу. Кислотность спокойнее, перегрев уводит в резкость.',
    temp: 93, ratio: 16, grindUm: BASE_UM, pourEnd: 120, drawdown: 40,
    steps: [
      { at: 0, frac: 55 / 225, name: 'Блуминг +', hint: 'Увеличенное первое вливание выводит кислотность вперёд' },
      { at: 35, frac: 50 / 225, name: 'Импульс I', hint: 'Укороченный второй пролив, спокойной спиралью из центра' },
      { at: 65, frac: 60 / 225, name: 'Импульс II', hint: 'Ровный уровень воды, без агрессии' },
      { at: 95, frac: 60 / 225, name: 'Финиш', hint: 'Последнее вливание и одно лёгкое вращение' },
    ],
  },
  {
    id: 'honey', builtin: true, name: 'Хани', icon: '🍯',
    about: 'Карамель, косточковые, мягкая кислотность. Тело важнее яркости.',
    temp: 93, ratio: 15, grindUm: 72 * K, pourEnd: 105, drawdown: 50,
    steps: [
      { at: 0, frac: 52 / 210, name: 'Блуминг +', hint: 'Увеличенный блуминг, swirl только здесь — дальше таблетку не трогаем' },
      { at: 40, frac: 74 / 210, name: 'Основной пролив', hint: 'Один длинный спокойный круг, минимум турбулентности' },
      { at: 75, frac: 84 / 210, name: 'Финиш', hint: 'Долейте ровно, без вращения — бережём тело' },
    ],
  },
  {
    id: 'natural', builtin: true, name: 'Натуральная', icon: '🍒',
    about: 'Схема 4:6 Касуи в варианте на кислотность: первое вливание больше второго.',
    temp: 92, ratio: 16, grindUm: 73 * K, pourEnd: 125, drawdown: 40,
    steps: [
      { at: 0, frac: 50 / 225, name: '40% · первое', hint: 'Первое вливание больше второго — вариант 4:6 на кислотность. Захотите слаще, поменяйте их местами' },
      { at: 40, frac: 40 / 225, name: '40% · второе', hint: 'Укороченное второе. Верх таблетки должен чуть подсохнуть, но не досуха' },
      { at: 70, frac: 68 / 225, name: '60% · крепость', hint: 'С этого момента работаем на плотность, а не на баланс' },
      { at: 100, frac: 67 / 225, name: '60% · финиш', hint: 'Последнее вливание, дальше только дренаж' },
    ],
  },
  {
    id: 'funky', builtin: true, name: 'Фанки / анаэроб', icon: '🍷',
    about: 'Ферментные ноты легко перекрывают всё остальное. Сознательно низкая экстракция.',
    temp: 90, ratio: 17, grindUm: 78 * K, pourEnd: 100, drawdown: 45,
    steps: [
      { at: 0, frac: 55 / 240, name: 'Блуминг +', hint: 'Смочить и оставить в покое — никакого swirl' },
      { at: 40, frac: 90 / 240, name: 'Основной пролив', hint: 'Крупный спокойный пролив. Цель — низкая экстракция, а не полнота' },
      { at: 75, frac: 95 / 240, name: 'Финиш', hint: 'Короткое время здесь не проблема, а задача' },
    ],
  },
];

// Поправки помола для воронок — ориентировочные стартовые значения, калибровка их уточняет
export const BREWERS = [
  { id: 'origami-cone', name: 'Origami + конусный фильтр', um: 0 },
  { id: 'origami-wave', name: 'Origami + волновой фильтр', um: -15 },
  { id: 'v60', name: 'Hario V60', um: 0 },
  { id: 'kalita', name: 'Kalita Wave', um: -15 },
  { id: 'orea', name: 'Orea', um: -15 },
  { id: 'april', name: 'April', um: -15 },
  { id: 'switch', name: 'Hario Switch', um: 60 },
  { id: 'clever', name: 'Clever Dripper', um: 60 },
];
export const brewerById = id => BREWERS.find(b => b.id === id) || BREWERS[0];

// Доза: проверено на 22 г — на 3 щелчка K-Ultra крупнее, чем на 14 г
export const BASE_DOSE = 14;
export const DOSE_UM_PER_G = (3 * K) / 8;
export const MIN_DOSE = 12, MAX_DOSE = 40;

// Вода: пресеты Origami Water Lab (тот же адрес ivchapl.github.io — её выбор читается напрямую)
export const WATER_LAB_URL = 'https://ivchapl.github.io/origami-water-lab/';
export const WATER = [
  { id: 'bhm', name: 'BH Melbourne', gh: 24, kh: 12 },
  { id: 'melb', name: 'Melbourne', gh: 50, kh: 20 },
  { id: 'holy', name: 'Holy Water', gh: 62, kh: 23 },
  { id: 'lb', name: 'Light & Bright', gh: 60, kh: 25 },
  { id: 'rp2', name: 'Rao/Perger ½', gh: 43.5, kh: 20 },
  { id: 'rp', name: 'Rao/Perger', gh: 87.5, kh: 40 },
  { id: 'bud', name: 'Budapest', gh: 51, kh: 40 },
];
export function readWaterLab() {
  try {
    const s = JSON.parse(localStorage.getItem('owl-v1') || 'null');
    if (!s || typeof s !== 'object') return null;
    const p = WATER.find(w => w.id === s.preset);
    const gh = +s.gh, kh = +s.kh;
    const same = p && Math.abs(p.gh - gh) < 0.01 && Math.abs(p.kh - kh) < 0.01;
    return { name: same ? p.name : 'Своя вода', gh, kh };
  } catch (e) { return null; }
}
export const waterLabel = w => `${w.name} · GH ${+w.gh.toFixed(1)} · KH ${+w.kh.toFixed(1)}`;

// --- редактор: схема по параметрам (как у Fellow Aiden) ---
export const DEFAULT_PARAMS = { bloomX: 3, bloomTime: 35, pulses: 3, interval: 30, dist: 'equal', shares: [] };

export function stepsFromParams(ratio, p) {
  const bloomFrac = Math.min(0.6, p.bloomX / ratio);
  const n = Math.max(1, Math.min(10, p.pulses | 0));
  let shares = p.dist === 'custom' && p.shares.length >= n ? p.shares.slice(0, n).map(x => Math.max(0, +x || 0)) : Array(n).fill(1);
  const sum = shares.reduce((a, b) => a + b, 0) || 1;
  shares = shares.map(x => x / sum);
  const steps = [{ at: 0, frac: bloomFrac, name: 'Блуминг', hint: 'Смочите всю поверхность кофе, затем лёгкий swirl' }];
  for (let i = 0; i < n; i++) {
    steps.push({
      at: p.bloomTime + i * p.interval, frac: (1 - bloomFrac) * shares[i],
      name: i === n - 1 ? 'Финиш' : `Вливание ${i + 1}`,
      hint: i === n - 1 ? 'Последнее вливание, дальше не трогаем' : 'Спокойной спиралью из центра, не по стенкам',
    });
  }
  return { steps, pourEnd: p.bloomTime + n * p.interval };
}

export function resolveSteps(scheme) {
  if (scheme.mode === 'params') return stepsFromParams(scheme.ratio, scheme.params);
  return { steps: scheme.steps, pourEnd: scheme.pourEnd };
}

// План под конкретную дозу: граммы на каждый шаг, цели на весах, время финиша
export function plan(scheme, dose) {
  const { steps, pourEnd } = resolveSteps(scheme);
  const total = Math.round((dose * scheme.ratio) / 5) * 5;
  const fsum = steps.reduce((a, s) => a + s.frac, 0) || 1;
  let acc = 0, prevCum = 0;
  const out = steps.map((s, i) => {
    acc += s.frac / fsum;
    const cum = i === steps.length - 1 ? total : Math.round(total * acc);
    const add = cum - prevCum; prevCum = cum;
    const e = i < steps.length - 1 ? steps[i + 1].at : Math.max(pourEnd, s.at + 10);
    return { s: s.at, e, add, cum, name: s.name, hint: s.hint || '' };
  });
  const drawEnd = Math.round(out[out.length - 1].e + (scheme.drawdown ?? 40) + (dose - BASE_DOSE) * 0.6);
  const gaps = out.slice(1).map((s, i) => s.s - out[i].s).slice(1);
  const interval = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : (out[1] ? out[1].s : 0);
  const maxAdd = Math.max(...out.map(s => s.add));
  return {
    total, steps: out, brewEnd: out[out.length - 1].e, drawEnd,
    ratio: total / dose, interval, pourSec: Math.max(3, Math.round(maxAdd / 6)),
  };
}

// --- ссылка на схему: компактный JSON в base64url ---
export function encodeScheme(s) {
  const { steps, pourEnd } = resolveSteps(s);
  const c = { n: s.name, r: s.ratio, t: s.temp, g: Math.round(s.grindUm), p: pourEnd, d: s.drawdown,
    s: steps.map(x => [x.at, Math.round(x.frac * 1000), x.name]) };
  const bytes = new TextEncoder().encode(JSON.stringify(c));
  let bin = ''; bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeScheme(str) {
  const bin = atob(str.replaceAll('-', '+').replaceAll('_', '/'));
  const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  if (!c || !Array.isArray(c.s) || !c.s.length) throw new Error('bad scheme');
  const num = (v, lo, hi, def) => (isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : def);
  return {
    name: String(c.n || 'Схема').slice(0, 60), ratio: num(c.r, 10, 22, 16), temp: num(c.t, 80, 100, 93),
    grindUm: num(c.g, 200, 1400, BASE_UM), pourEnd: num(c.p, 10, 600, 120), drawdown: num(c.d, 10, 300, 40),
    mode: 'steps',
    steps: c.s.slice(0, 15).map(x => ({ at: num(x[0], 0, 600, 0), frac: num(x[1], 0, 1000, 0) / 1000, name: String(x[2] || '').slice(0, 40), hint: '' })),
  };
}
