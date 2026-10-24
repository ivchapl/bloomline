// Справочник кофемолок и пересчёт «условные мкм HCG ↔ деление на шкале».
import { WORDS } from './i18n.js';

// Опорная точка: «Основная» схема при 14 г = K-Ultra 0.7.1 ≈ 540 мкм (оптимум автора в Origami).
export const BASE_UM = 540;
// Опорная кофемолка: по ней найден оптимум и к ней привязана шкала; стоит по умолчанию и первой в списках
export const REF_GRINDER_ID = '1zpresso-k-ultra';
// Точка эспрессо для «своей кофемолки»: середина диапазона эспрессо HCG (180–380).
const ESPRESSO_UM = 280;

let LIST = [];
let BY_ID = new Map();

export async function loadGrinders() {
  const res = await fetch('data/grinders.json');
  const data = await res.json();
  LIST = data.grinders;
  BY_ID = new Map(LIST.map(g => [g.id, g]));
  return LIST;
}

export const allGrinders = () => LIST;

// «Своя кофемолка» по двум точкам: деление для фильтра ↔ BASE_UM, деление для эспрессо ↔ ESPRESSO_UM
export function customGrinder(c) {
  if (!c || !isFinite(c.filter) || !isFinite(c.espresso) || c.filter === c.espresso) return null;
  const upu = (BASE_UM - ESPRESSO_UM) / (c.filter - c.espresso);
  const um0 = BASE_UM - c.filter * upu;
  const vAt = um => (um - um0) / upu;
  const lo = Math.min(vAt(100), vAt(1400)), hi = Math.max(vAt(100), vAt(1400));
  return {
    id: 'custom', name: c.name || 'Своя кофемолка', brand: '', custom: true,
    scale: { type: 'linear', fmt: 'num', step: c.step || 1, um0, umPerUnit: upu, min: Math.max(0, lo), max: hi, unit: 'step' },
  };
}

export function grinderById(id, custom) {
  if (id === 'custom') return customGrinder(custom) || BY_ID.get('1zpresso-k-ultra');
  return BY_ID.get(id) || BY_ID.get('1zpresso-k-ultra');
}

const decimalsOf = step => (step >= 1 ? 0 : Math.min(3, Math.round(-Math.log10(step))));
const pad2 = n => String(n).padStart(2, '0');

function linearLabel(sc, v) {
  if (sc.fmt === 'rc') {
    const c = Math.round(v);
    return { label: `${Math.floor(c / sc.base)}.${pad2(c % sc.base)}`, sub: `${c} ${WORDS.click(c)}` };
  }
  if (sc.fmt === 'rnt') {   // оборот.цифра.риска: K-Ultra (10 рисок на цифру), C5 ESP Pro (5)
    const per = sc.per || 10, c = Math.round(v), r = Math.floor(c / sc.base), rest = c % sc.base;
    return { label: `${r}.${Math.floor(rest / per)}.${rest % per}`, sub: `${c} ${WORDS.click(c)}` };
  }
  if (sc.fmt === 'nt') {    // цифра.щелчок: C5 Pro — 3 щелчка на цифру, «10», «10.1», «10.2»
    const c = Math.round(v), n = Math.floor(c / sc.per), k = c % sc.per;
    return { label: k ? `${n}.${k}` : `${n}`, sub: `${c} ${WORDS.click(c)}` };
  }
  return { label: v.toFixed(decimalsOf(sc.step)), sub: '' };
}

const snap = (sc, v) => {
  const s = Math.round(v / sc.step) * sc.step;
  return Math.min(sc.max, Math.max(sc.min, s));
};

// Деление на шкале, ближайшее к заданным мкм
export function settingFor(g, um) {
  const sc = g.scale;
  if (sc.type === 'table') {
    let best = 0, bd = Infinity;
    sc.points.forEach((p, i) => { const d = Math.abs(p[1] - um); if (d < bd) { bd = d; best = i; } });
    return { value: best, label: sc.points[best][0], sub: '', um: sc.points[best][1] };
  }
  const v = snap(sc, (um - sc.um0) / sc.umPerUnit);
  return { value: v, ...linearLabel(sc, v), um: sc.um0 + v * sc.umPerUnit };
}

export function umOf(g, value) {
  const sc = g.scale;
  if (sc.type === 'table') return sc.points[Math.max(0, Math.min(sc.points.length - 1, value))][1];
  return sc.um0 + value * sc.umPerUnit;
}

// Сдвиг на n делений от заданной точки (знак: + крупнее)
export function shiftBy(g, um, n) {
  const sc = g.scale, cur = settingFor(g, um);
  if (sc.type === 'table') return umOf(g, cur.value + n);
  const dir = Math.sign(sc.umPerUnit) || 1;
  return umOf(g, snap(sc, cur.value + n * dir * sc.step));
}

export function stepsBetween(g, umA, umB) {
  const sc = g.scale, a = settingFor(g, umA), b = settingFor(g, umB);
  if (sc.type === 'table') return b.value - a.value;
  return Math.round((b.value - a.value) / sc.step) * (Math.sign(sc.umPerUnit) || 1);
}

// Сколько мкм в одном делении рядом с этой точкой
export function umPerStep(g, um) {
  const sc = g.scale;
  if (sc.type === 'linear') return Math.abs(sc.umPerUnit * sc.step);
  const i = settingFor(g, um).value, p = sc.points;
  const a = p[Math.max(0, i - 1)][1], b = p[Math.min(p.length - 1, i + 1)][1];
  return Math.max(1, Math.abs(b - a) / Math.max(1, Math.min(p.length - 1, i + 1) - Math.max(0, i - 1)));
}

export const unitWord = (g, n) => (g.scale.unit === 'click' ? WORDS.click(n) : WORDS.step(n));

// Варианты делений в разумной для фильтра зоне — для выпадающих списков
export function filterOptions(g, umLo = 300, umHi = 900) {
  const sc = g.scale, out = [];
  if (sc.type === 'table') {
    sc.points.forEach((p, i) => { if (p[1] >= umLo && p[1] <= umHi) out.push({ value: i, label: p[0], um: p[1] }); });
    return out;
  }
  const a = (umLo - sc.um0) / sc.umPerUnit, b = (umHi - sc.um0) / sc.umPerUnit;
  const lo = snap(sc, Math.min(a, b)), hi = snap(sc, Math.max(a, b));
  const n = Math.round((hi - lo) / sc.step);
  const stride = Math.max(1, Math.ceil(n / 400));   // не больше ~400 пунктов
  for (let i = 0; i <= n; i += stride) {
    const v = +(lo + i * sc.step).toFixed(6);
    out.push({ value: v, label: linearLabel(sc, v).label, um: umOf(g, v) });
  }
  return out;
}
