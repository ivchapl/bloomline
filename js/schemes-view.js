// Экран «Схемы»: базовые и свои схемы, редактор (параметры как у Fellow Aiden или ручные шаги), «Поделиться».
import { t, WORDS } from './i18n.js';
import { store, uid } from './store.js';
import { $, $$, html, raw, esc, toast, sheet, confirmSheet, copyText } from './ui.js';
import { BUILTIN, plan, resolveSteps, stepsFromParams, DEFAULT_PARAMS, encodeScheme, brewerById, waterLabel } from './schemes.js';
import { grindFor, currentWater, currentGrinder, calibUm } from './core.js';
import { settingFor, shiftBy } from './grinders.js';
import { fmt } from './timer.js';

let root, onUse, onChanged;

export function mountSchemes(el, { use, changed }) { root = el; onUse = use; onChanged = changed; render(); }

export function render() {
  if (!root) return;
  const mine = store.get().schemes, dose = store.get().settings.dose;
  const card = x => {
    const P = plan(x, dose), gi = grindFor(x, dose);
    return html`<article class="card scheme-card" data-id="${x.id}">
      <h3><span aria-hidden="true">${x.icon || '☕'}</span> ${x.name}</h3>
      ${raw(x.about ? `<p class="muted">${esc(x.about)}</p>` : '')}
      <div class="spec-row">
        <span>1:${String(x.ratio).replace('.', ',')}</span><span>${x.temp} °C</span>
        <span>${P.steps.length} ${WORDS.pour(P.steps.length)}</span><span>финиш ≈${fmt(P.drawEnd)}</span>
        <span class="accent-text">${gi.g.name} · ${gi.set.label}</span>
      </div>
      <div class="row-btns">
        <button class="btn btn-main sm" data-act="use">${t('schemes.use')}</button>
        <button class="btn btn-ghost sm" data-act="${x.builtin ? 'copy' : 'edit'}">${x.builtin ? t('schemes.copy') : t('schemes.edit')}</button>
        <button class="btn btn-ghost sm" data-act="share">${t('schemes.share')}</button>
        ${raw(x.builtin ? '' : `<button class="btn btn-ghost sm danger-text" data-act="del">${t('schemes.delete')}</button>`)}
      </div>
    </article>`;
  };
  root.innerHTML = `
    <div class="view-head"><h1>${t('schemes.title')}</h1>
      <button class="btn btn-main" id="new-scheme">＋ ${t('schemes.new')}</button></div>
    <div id="import-slot"></div>
    <h2 class="section-title">${t('schemes.mine')}</h2>
    ${mine.length ? `<div class="cards">${mine.map(card).join('')}</div>` : `<p class="empty">${t('schemes.empty')}</p>`}
    <h2 class="section-title">${t('schemes.builtin')}</h2>
    <p class="muted section-lead">Светлая обжарка, Origami с конусным фильтром Hario. Помол рассчитан под вашу кофемолку.</p>
    <div class="cards">${BUILTIN.map(card).join('')}</div>`;

  $('#new-scheme', root).onclick = () => openEditor(null);
  root.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const x = [...BUILTIN, ...store.get().schemes].find(s => s.id === id);
    if (b.dataset.act === 'use') onUse(id);
    if (b.dataset.act === 'edit') openEditor(x);
    if (b.dataset.act === 'copy') openEditor({ ...structuredClone(x), id: null, builtin: false, name: `${x.name} · моя` });
    if (b.dataset.act === 'share') openShare(x);
    if (b.dataset.act === 'del' && await confirmSheet(t('schemes.confirmDelete', { name: x.name }), t('schemes.delete'))) {
      store.update(s => {
        s.schemes = s.schemes.filter(y => y.id !== id);
        if (s.settings.schemeId === id) s.settings.schemeId = 'wsoft';
      });
      toast(t('schemes.deleted')); render(); onChanged();
    }
  };
}

// Предложение добавить схему из ссылки
export function offerImport(scheme) {
  if (!root) return;
  $('#import-slot', root).innerHTML = html`<div class="card import-card">
    <p>${t('schemes.import', { name: scheme.name })}</p>
    <div class="row-btns"><button class="btn btn-main sm" id="imp-yes">${t('schemes.importBtn')}</button>
    <button class="btn btn-ghost sm" id="imp-no">${t('common.close')}</button></div></div>`;
  $('#imp-yes', root).onclick = () => {
    const x = { ...scheme, id: uid(), icon: '🔗' };
    store.update(s => { s.schemes.unshift(x); }); toast(t('schemes.imported')); render(); onChanged();
  };
  $('#imp-no', root).onclick = () => ($('#import-slot', root).innerHTML = '');
}

// ---------- редактор ----------
function openEditor(src) {
  const dose = store.get().settings.dose;
  const g = currentGrinder();
  // помол в редакторе показываем таким, каким его молоть: с калибровкой и поправкой воронки, при 14 г
  const off = calibUm(g) + brewerById(store.get().settings.brewer).um;
  const ed = src ? structuredClone(src) : {
    id: null, name: 'Моя схема', icon: '☕', ratio: 16, temp: 93, grindUm: BUILTIN[1].grindUm, drawdown: 40,
    mode: 'params', params: { ...DEFAULT_PARAMS },
  };
  ed.params = ed.params || { ...DEFAULT_PARAMS };
  ed.mode = ed.mode || 'steps';
  // ручные шаги храним в граммах для текущей дозы, при сохранении переводим в доли
  const toRows = () => {
    const P = plan(ed, dose); const { pourEnd } = resolveSteps(ed);
    ed.pourEnd = pourEnd;
    return P.steps.map(s => ({ at: s.s, g: s.add, name: s.name, hint: s.hint }));
  };
  let rows = toRows();

  const s = sheet(src?.id ? t('schemes.edit') : t('editor.title'), `<form id="ed-form" class="editor" autocomplete="off"></form>`);
  const form = $('#ed-form', s.body);

  const num = (id, label, val, min, max, step, extra = '') => `<label class="field"><span>${label}</span>
      <input id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${val}" ${extra}></label>`;

  function draw() {
    const P = plan(ed, dose), gs = settingFor(g, ed.grindUm + off);
    const shares = ed.params.shares.length >= ed.params.pulses ? ed.params.shares : Array(ed.params.pulses).fill(Math.round(100 / ed.params.pulses));
    form.innerHTML = `
      <label class="field"><span>${t('editor.name')}</span><input id="ed-name" maxlength="60" value="${esc(ed.name)}" required></label>
      <div class="form-grid">
        ${ed.mode === 'params' ? num('ed-ratio', t('editor.ratio') + ', 1:', ed.ratio, 10, 22, 0.5)
          : `<div class="field"><span>${t('editor.ratio')}</span><output class="out">1:${(P.ratio).toFixed(1).replace('.', ',')}</output></div>`}
        ${num('ed-temp', t('editor.temp') + ', °C', ed.temp, 80, 100, 1)}
        <div class="field"><span>${t('editor.grind')} <small>${t('editor.grindHint')}</small></span>
          <div class="stepper"><button type="button" class="btn btn-ghost icon" data-grind="-1" aria-label="Мельче">−</button>
          <output class="out">${esc(g.name)} · <b>${esc(gs.label)}</b></output>
          <button type="button" class="btn btn-ghost icon" data-grind="1" aria-label="Крупнее">+</button></div></div>
        ${num('ed-drawdown', t('editor.drawdown'), ed.drawdown, 10, 180, 5)}
      </div>
      <div class="seg mode-seg" role="tablist">
        <button type="button" data-mode="params" class="${ed.mode === 'params' ? 'on' : ''}">${t('editor.mode.params')}</button>
        <button type="button" data-mode="steps" class="${ed.mode === 'steps' ? 'on' : ''}">${t('editor.mode.steps')}</button>
      </div>
      ${ed.mode === 'params' ? `
        <div class="form-grid">
          ${num('ed-bx', t('editor.bloomWater'), ed.params.bloomX, 1, 6, 0.5)}
          ${num('ed-bt', t('editor.bloomTime'), ed.params.bloomTime, 10, 90, 5)}
          ${num('ed-pulses', t('editor.pulses'), ed.params.pulses, 1, 8, 1)}
          ${num('ed-int', t('editor.interval'), ed.params.interval, 10, 90, 5)}
        </div>
        <div class="field"><span>${t('editor.dist')}</span>
          <div class="seg" id="ed-dist"><button type="button" data-d="equal" class="${ed.params.dist === 'equal' ? 'on' : ''}">${t('editor.equal')}</button>
          <button type="button" data-d="custom" class="${ed.params.dist === 'custom' ? 'on' : ''}">${t('editor.custom')}</button></div></div>
        ${ed.params.dist === 'custom' ? `<p class="muted small">${t('editor.sharesHint')}</p><div class="shares">${shares.map((v, i) =>
          `<label class="field"><span>${i + 1}, %</span><input type="number" inputmode="numeric" min="0" max="100" step="1" data-share="${i}" value="${v}"></label>`).join('')}</div>` : ''}
      ` : `
        <div class="tbl-wrap"><table class="steps-edit"><thead><tr><th>${t('editor.start')}</th><th>${t('editor.water')}</th><th>${t('editor.stepName')}</th><th></th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td><input type="number" inputmode="numeric" min="0" max="600" step="5" data-row="${i}" data-f="at" value="${r.at}" aria-label="${t('editor.start')}"></td>
          <td><input type="number" inputmode="numeric" min="1" max="400" step="1" data-row="${i}" data-f="g" value="${r.g}" aria-label="${t('editor.water')}"></td>
          <td><input data-row="${i}" data-f="name" maxlength="40" value="${esc(r.name)}" aria-label="${t('editor.stepName')}"></td>
          <td>${rows.length > 1 ? `<button type="button" class="icon-btn" data-del="${i}" aria-label="Удалить шаг">✕</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <div class="row-btns"><button type="button" class="btn btn-ghost sm" id="ed-add">＋ ${t('editor.addStep')}</button>
        ${num('ed-pourend', 'Конец последнего вливания, с', ed.pourEnd, 10, 600, 5)}</div>
      `}
      <h3 class="preview-title">${t('editor.preview', { dose: String(dose).replace('.', ',') })}</h3>
      <ol class="steps compact">${P.steps.map((x, i) => `<li class="step"><div class="row1"><span class="name">${i + 1}. ${esc(x.name)}</span>
        <span class="time">${fmt(x.s)}–${fmt(x.e)}</span></div><div class="row2"><span>влить <b>+${x.add} г</b></span><span>на весах <b>${x.cum} г</b></span></div></li>`).join('')}</ol>
      <p class="muted small">Финиш ≈${fmt(P.drawEnd)} · вода ${P.total} г</p>
      <div class="row-btns sticky-actions"><button class="btn btn-main" type="submit">${t('editor.save')}</button>
        <button class="btn btn-ghost" type="button" id="ed-cancel">${t('editor.cancel')}</button></div>`;
  }

  // читаем поля обратно в ed (без перерисовки, чтобы не сбивать фокус)
  function read() {
    const v = id => $(`#${id}`, form);
    ed.name = v('ed-name').value.trim() || 'Моя схема';
    ed.temp = clamp(+v('ed-temp').value, 80, 100, ed.temp);
    ed.drawdown = clamp(+v('ed-drawdown').value, 10, 180, ed.drawdown);
    if (ed.mode === 'params') {
      ed.ratio = clamp(+v('ed-ratio').value, 10, 22, ed.ratio);
      ed.params.bloomX = clamp(+v('ed-bx').value, 1, 6, ed.params.bloomX);
      ed.params.bloomTime = clamp(+v('ed-bt').value, 10, 90, ed.params.bloomTime);
      ed.params.pulses = clamp(Math.round(+v('ed-pulses').value), 1, 8, ed.params.pulses);
      ed.params.interval = clamp(+v('ed-int').value, 10, 90, ed.params.interval);
      const sh = $$('[data-share]', form).map(i => +i.value || 0);
      if (sh.length) ed.params.shares = sh;
    } else {
      $$('[data-row]', form).forEach(i => {
        const r = rows[+i.dataset.row], f = i.dataset.f;
        r[f] = f === 'name' ? i.value : (+i.value || 0);
      });
      ed.pourEnd = clamp(+v('ed-pourend').value, 10, 600, ed.pourEnd);
      applyRows();
    }
  }
  function applyRows() {
    rows.sort((a, b) => a.at - b.at);
    const sum = rows.reduce((a, r) => a + Math.max(0, r.g), 0) || 1;
    ed.ratio = +(sum / dose).toFixed(2);
    ed.steps = rows.map(r => ({ at: r.at, frac: Math.max(0, r.g) / sum, name: r.name || 'Вливание', hint: r.hint || '' }));
    ed.pourEnd = Math.max(ed.pourEnd || 0, rows[rows.length - 1].at + 10);
  }

  form.addEventListener('change', e => {
    if (e.target.matches('input')) { read(); draw(); }
  });
  form.addEventListener('click', e => {
    const gb = e.target.closest('[data-grind]');
    if (gb) { read(); ed.grindUm = shiftBy(g, settingFor(g, ed.grindUm + off).um, +gb.dataset.grind) - off; draw(); return; }
    const mb = e.target.closest('[data-mode]');
    if (mb && mb.dataset.mode !== ed.mode) {
      read();
      if (mb.dataset.mode === 'steps') { ed.mode = 'steps'; rows = toRows(); applyRows(); }
      else { ed.mode = 'params'; ed.ratio = Math.round(ed.ratio * 2) / 2; }
      draw(); return;
    }
    const db = e.target.closest('[data-d]');
    if (db) { read(); ed.params.dist = db.dataset.d; draw(); return; }
    const del = e.target.closest('[data-del]');
    if (del) { read(); rows.splice(+del.dataset.del, 1); applyRows(); draw(); return; }
    if (e.target.closest('#ed-add')) {
      read(); const last = rows[rows.length - 1];
      rows.push({ at: last.at + 30, g: Math.round(last.g), name: 'Вливание', hint: '' });
      ed.pourEnd = Math.max(ed.pourEnd, last.at + 55); applyRows(); draw(); return;
    }
    if (e.target.closest('#ed-cancel')) s.close();
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); read();
    if (ed.mode === 'params') {
      const gen = stepsFromParams(ed.ratio, ed.params);
      ed.pourEnd = gen.pourEnd;
    }
    const isNew = !ed.id;
    if (isNew) ed.id = uid();
    ed.builtin = false;
    store.update(st => {
      const i = st.schemes.findIndex(x => x.id === ed.id);
      if (i >= 0) st.schemes[i] = ed; else st.schemes.unshift(ed);
      st.settings.schemeId = ed.id;
    });
    toast(t('editor.saved')); s.close(); render(); onChanged();
  });
  draw();
}

const clamp = (v, lo, hi, def) => (isFinite(v) && v !== 0 ? Math.min(hi, Math.max(lo, v)) : def);

// ---------- поделиться ----------
export function shareText(x, dose, link) {
  const P = plan(x, dose), gi = grindFor(x, dose), st = store.get().settings;
  return [
    `Bloomline · ${x.name}`,
    `Способ приготовления: Пуровер (${brewerById(st.brewer).name})`,
    `Дозировка: ${String(dose).replace('.', ',')} г`,
    `Вода: ${P.total} г · ${waterLabel(currentWater())}`,
    `Температура: ${x.temp} °C`,
    `Кофемолка и помол: ${gi.g.name} ${gi.set.label} (≈${Math.round(gi.set.um)} мкм по шкале HCG)`,
    `Проливы: ${P.steps.map(s => `${fmt(s.s)} +${s.add} г`).join(' · ')}`,
    `Финиш: ≈${fmt(P.drawEnd)}`,
    `Схема в Bloomline: ${link}`,
  ].join('\n');
}

function openShare(x) {
  const dose = store.get().settings.dose;
  const link = `${location.origin}${location.pathname}#s=${encodeScheme(x)}`;
  const text = shareText(x, dose, link);
  const s = sheet(`${t('schemes.share')}: ${x.name}`, `
    <label class="field"><span>${t('share.link')}</span><input id="sh-link" readonly value="${esc(link)}"></label>
    <div class="row-btns"><button class="btn btn-ghost sm" id="sh-copy-link">${t('share.copy')}</button>
      ${navigator.share ? `<button class="btn btn-main sm" id="sh-send">${t('share.send')}</button>` : ''}</div>
    <label class="field"><span>${t('share.tasty')}</span><textarea id="sh-text" rows="9" readonly>${esc(text)}</textarea></label>
    <div class="row-btns"><button class="btn btn-ghost sm" id="sh-copy-text">${t('share.copy')}</button></div>`);
  const sel = id => { const el = $(id, s.body); el.focus(); el.select(); };
  $('#sh-copy-link', s.body).onclick = async () => { if (!await copyText(link)) sel('#sh-link'); };
  $('#sh-copy-text', s.body).onclick = async () => { if (!await copyText(text)) sel('#sh-text'); };
  const send = $('#sh-send', s.body);
  if (send) send.onclick = () => navigator.share({ title: `Bloomline · ${x.name}`, text, url: link }).catch(() => {});
}
