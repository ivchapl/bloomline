// Экран «Журнал»: сохранённые заварки, повтор и удаление.
import { t } from './i18n.js';
import { store } from './store.js';
import { html, raw, esc, toast, confirmSheet, sheet, fmtDate } from './ui.js';
import { brewerById } from './schemes.js';
import { fmt } from './timer.js';

let root, onRepeat;
const TASTE = { sour: ['log.sour', 'bad'], ok: ['log.ok', 'good'], bitter: ['log.bitter', 'bad'] };
// имя воронки сохраняется в записи; у ранних записей его нет — берём из списка
const brewerName = b => b.brewerName || brewerById(b.brewer).name;

export function mountJournal(el, { repeat }) { root = el; onRepeat = repeat; render(); }

export function render() {
  if (!root) return;
  const list = store.get().journal;
  root.innerHTML = `<div class="view-head"><h1>${t('journal.title')}</h1><span class="muted">${list.length || ''}</span></div>
    ${list.length ? `<div class="journal">${list.map(row).join('')}</div>` : `<p class="empty">${t('journal.empty')}</p>`}`;
  root.onclick = e => {
    const item = e.target.closest('[data-id]'); if (!item) return;
    open(list.find(b => b.id === item.dataset.id));
  };
}

function row(b) {
  const c = b.coffee || {};
  const [tk, cls] = TASTE[b.taste] || TASTE.ok;
  return html`<button class="card brew-row" data-id="${b.id}">
    <span class="br-top"><b>${c.lot || b.schemeName}</b><span class="muted">${fmtDate(b.ts)}</span></span>
    <span class="br-mid">${c.roaster ? c.roaster + ' · ' : ''}${b.schemeName} · ${String(b.dose).replace('.', ',')} г · ${b.grinderName} ${b.setting} · ${brewerName(b)}</span>
    <span class="br-bot"><span class="pill ${cls}">${t(tk)}</span><span>сток ${fmt(b.drawdown)}</span>
      ${raw(b.rating ? `<span class="stars-ro" aria-label="Оценка ${b.rating} из 5">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}</span>` : '')}</span>
  </button>`;
}

function open(b) {
  const c = b.coffee || {};
  const rows = [
    ['Схема', b.schemeName], ['Доза', `${String(b.dose).replace('.', ',')} г → ${b.water} г воды (1:${String(b.ratio).replace('.', ',')})`],
    ['Температура', `${b.temp} °C`], ['Помол', `${b.grinderName} · ${b.setting} (≈${b.um} мкм)`],
    ['Воронка', brewerName(b)], ['Вода', b.waterLabel],
    ['Сток', `${fmt(b.drawdown)} при цели ${fmt(b.drawdownTarget)}`],
    ['Кофе', [c.roaster, c.lot, c.process].filter(Boolean).join(' · ') || '—'],
    ['Дата обжарки', c.roastDate ? new Date(c.roastDate).toLocaleDateString('ru-RU') : '—'],
  ];
  if (b.calibApplied) rows.push(['Калибровка', `применена поправка ${b.calibApplied > 0 ? '+' : ''}${b.calibApplied} мкм`]);
  const s = sheet(fmtDate(b.ts), `
    <dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${b.notes ? `<p class="notes">${esc(b.notes)}</p>` : ''}
    <div class="row-btns"><button class="btn btn-main" data-repeat>${t('journal.repeat')}</button>
      <button class="btn btn-ghost danger-text" data-del>${t('journal.delete')}</button></div>`);
  s.body.querySelector('[data-repeat]').onclick = () => { s.close(); onRepeat(b); };
  s.body.querySelector('[data-del]').onclick = async () => {
    if (!await confirmSheet(t('journal.confirmDelete', { date: fmtDate(b.ts) }), t('journal.delete'))) return;
    store.update(st => { st.journal = st.journal.filter(x => x.id !== b.id); });
    s.close(); toast(t('journal.deleted')); render();
  };
}
