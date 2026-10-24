// Небольшие помощники для разметки, всплывающих сообщений и нижних панелей.
import { t } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? (vals[i]?.__raw ?? esc(vals[i])) : ''), '');
}
export const raw = s => ({ __raw: s });

let toastTimer = 0;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => (el.hidden = true), 250); }, 2200);
}

// Нижняя панель (sheet). Возвращает элемент содержимого и функцию закрытия.
export function sheet(title, bodyHtml, { onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet-head"><h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="${esc(t('common.close'))}">✕</button></header>
      <div class="sheet-body">${bodyHtml}</div>
    </section>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => {
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('.sheet-backdrop').addEventListener('click', close);
  wrap.querySelector('[data-close]').addEventListener('click', close);
  return { body: wrap.querySelector('.sheet-body'), close };
}

// Подтверждение внутри страницы (без системных диалогов)
export function confirmSheet(question, yesLabel) {
  return new Promise(resolve => {
    let done = false;
    const s = sheet(question, `<div class="row-btns">
      <button class="btn btn-danger" data-yes>${esc(yesLabel || t('common.yes'))}</button>
      <button class="btn btn-ghost" data-no>${esc(t('common.no'))}</button></div>`,
      { onClose: () => { if (!done) resolve(false); } });
    s.body.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); s.close(); };
    s.body.querySelector('[data-no]').onclick = () => { done = true; resolve(false); s.close(); };
  });
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t('share.copied')); return true; }
  catch (e) { return false; }
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
