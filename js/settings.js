// Экран «Настройки» и первый запуск: кофемолка, калибровка, воронка, вода, данные.
import { t } from './i18n.js';
import { store } from './store.js';
import { $, $$, html, raw, esc, toast, sheet } from './ui.js';
import { allGrinders, filterOptions, settingFor, stepsBetween, unitWord, customGrinder, REF_GRINDER_ID } from './grinders.js';
import { BUILTIN, BREWERS, brewerById, WATER, WATER_LAB_URL, readWaterLab, waterLabel } from './schemes.js';
import { currentGrinder, calibUm, signed } from './core.js';

let root, onChange;
const KINDS = [['hand', 'Ручные'], ['electric', 'Электрические'], ['budget', 'Бюджетные электрические']];

export function mountSettings(el, { changed }) { root = el; onChange = changed; render(); }

// База для калибровки: «Основная» при 14 г на выбранной воронке
const calibBase = () => BUILTIN[0].grindUm + brewerById(store.get().settings.brewer).um;

export function render() {
  if (!root) return;
  const st = store.get().settings, g = currentGrinder();
  const cal = calibUm(g), base = calibBase();
  const calSteps = stepsBetween(g, base, base + cal);
  const opts = filterOptions(g);
  const cur = settingFor(g, base + cal);
  const lab = readWaterLab();

  root.innerHTML = html`
    <div class="view-head"><h1>${t('tab.settings')}</h1></div>

    <section class="card set-block">
      <h2>${t('settings.grinder')}</h2>
      <button class="picker-btn" id="pick-grinder"><b>${g.name}</b><span class="muted">${g.custom ? t('settings.custom') : (g.brand || '')}</span><span aria-hidden="true">›</span></button>
    </section>

    <section class="card set-block">
      <h2>${t('settings.calibration')}</h2>
      <p class="muted">${t('settings.calibHint')}</p>
      <p>${t('settings.calibNow', { v: calSteps ? `${signed(calSteps)} ${unitWord(g, Math.abs(calSteps))} от таблицы` : t('settings.calibNone') })}</p>
      <div class="row-btns">
        <label class="field grow"><span>${t('onb.calib')}</span>
          <select id="calib-sel">${raw(opts.map(o => `<option value="${o.um}"${o.label === cur.label ? ' selected' : ''}>${esc(o.label)}</option>`).join(''))}</select></label>
        <button class="btn btn-main" id="calib-set">${t('settings.calibSet')}</button>
        ${raw(cal ? `<button class="btn btn-ghost" id="calib-reset">${t('settings.calibReset')}</button>` : '')}
      </div>
    </section>

    <section class="card set-block">
      <h2>${t('settings.brewer')}</h2>
      <p class="muted">${t('settings.brewerHint')}</p>
      <div class="chips wrap" id="brewers">${raw(BREWERS.map(b => `<button class="chip${b.id === st.brewer ? ' on' : ''}" data-b="${b.id}">${esc(b.name)}</button>`).join(''))}</div>
    </section>

    <section class="card set-block">
      <h2>${t('settings.water')}</h2>
      ${raw(lab ? `<p>${esc(t('settings.waterLab', { name: waterLabel(lab) }))}</p>`
        : `<p class="muted">${esc(t('settings.waterLabMissing'))}</p>
           <label class="field"><span>${t('settings.waterPreset')}</span><select id="water-sel">${WATER.map(w =>
             `<option value="${w.id}"${w.id === st.waterPreset ? ' selected' : ''}>${esc(waterLabel(w))}</option>`).join('')}</select></label>`)}
      <p><a href="${WATER_LAB_URL}" target="_blank" rel="noopener">${t('settings.waterOpen')} ↗</a></p>
    </section>

    <section class="card set-block">
      <h2>${t('settings.data')}</h2>
      <label class="switch"><input type="checkbox" id="sound" ${raw(st.sound ? 'checked' : '')}><span>${t('settings.sound')}</span></label>
      <div class="row-btns">
        <button class="btn btn-ghost" id="export">${t('settings.export')}</button>
        <label class="btn btn-ghost file-btn">${t('settings.import')}<input type="file" id="import" accept="application/json,.json" hidden></label>
      </div>
    </section>

    <section class="card set-block about">
      <h2>${t('settings.about')}</h2>
      <p>Bloomline — помол, рецепты и таймер для пуровера. Схемы рассчитаны на светлую обжарку.</p>
      <p class="muted small">Шкала помолов: Honest Coffee Guide и конвертер Tasty Coffee, с поправками Bloomline для Timemore S3, KINGrinder K4/K6, 1Zpresso K-Ultra и Comandante X25. Значения в «мкм» условные: это общая линейка для сравнения кофемолок, а не замер частиц.</p>
    </section>`;

  $('#pick-grinder', root).onclick = () => openGrinderPicker(id => { setGrinder(id); });
  $('#calib-set', root).onclick = () => {
    const um = +$('#calib-sel', root).value;
    store.update(s => (s.calibration[g.id] = um - calibBase()));
    toast(t('calib.applied')); changed();
  };
  const rs = $('#calib-reset', root);
  if (rs) rs.onclick = () => { store.update(s => delete s.calibration[g.id]); changed(); };
  $('#brewers', root).onclick = e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    store.update(s => (s.settings.brewer = b.dataset.b)); changed();
  };
  const ws = $('#water-sel', root);
  if (ws) ws.onchange = () => { store.update(s => (s.settings.waterPreset = ws.value)); changed(); };
  $('#sound', root).onchange = e => store.update(s => (s.settings.sound = e.target.checked));
  $('#export', root).onclick = exportData;
  $('#import', root).onchange = importData;
}

function changed() { render(); onChange(); }

function setGrinder(id) {
  store.update(s => (s.settings.grinderId = id)); changed();
}

// ---------- выбор кофемолки ----------
export function grinderListHtml(q, selectedId) {
  const all = allGrinders();
  const item = g => `<button class="g-item${g.id === selectedId ? ' on' : ''}" data-g="${esc(g.id)}"><b>${esc(g.name)}</b>${
    g.id === REF_GRINDER_ID ? '<span class="tag">опорная</span>' : g.source === 'bloomline' ? '<span class="tag">поправка</span>' : ''}</button>`;
  q = q.trim().toLowerCase();
  if (q) {
    const hit = all.filter(g => (g.name + ' ' + g.brand).toLowerCase().includes(q));
    return hit.length ? hit.map(item).join('') : `<p class="muted">Ничего не нашлось. Выберите «${t('settings.custom')}».</p>`;
  }
  const ref = all.find(g => g.id === REF_GRINDER_ID);
  let out = ref ? `<h3 class="g-group">Опорная кофемолка Bloomline</h3>${item(ref)}` : '';
  for (const [k, label] of KINDS) {
    const list = all.filter(g => g.popular && g.kind === k && g.id !== REF_GRINDER_ID);
    out += `<h3 class="g-group">${label}</h3>${list.map(item).join('')}`;
  }
  out += `<h3 class="g-group">${t('settings.all')}</h3>${all.filter(g => !g.popular).map(item).join('')}`;
  return out;
}

export function openGrinderPicker(onPick) {
  const st = store.get().settings;
  const s = sheet(t('settings.grinder'), `
    <input type="search" id="g-q" class="search" placeholder="${t('settings.search')}" autocomplete="off">
    <button class="g-item custom" id="g-custom"><b>＋ ${t('settings.custom')}</b><span class="muted small">${t('settings.customHint')}</span></button>
    <div class="g-list" id="g-list">${grinderListHtml('', st.grinderId)}</div>`);
  const list = $('#g-list', s.body);
  $('#g-q', s.body).oninput = e => (list.innerHTML = grinderListHtml(e.target.value, st.grinderId));
  list.onclick = e => { const b = e.target.closest('[data-g]'); if (b) { s.close(); onPick(b.dataset.g); } };
  $('#g-custom', s.body).onclick = () => { s.close(); openCustom(onPick); };
}

function openCustom(onPick) {
  const c = store.get().settings.custom || { name: '', filter: '', espresso: '' };
  const s = sheet(t('settings.custom'), `<form id="cg" class="editor">
    <p class="muted">${t('settings.customHint')} Шкала считается линейной между этими точками.</p>
    <label class="field"><span>${t('settings.customName')}</span><input id="cg-name" value="${esc(c.name)}" placeholder="Например, Kitfort KT-7104"></label>
    <label class="field"><span>${t('settings.customFilter')}</span><input id="cg-f" inputmode="decimal" value="${esc(c.filter ?? '')}" required></label>
    <label class="field"><span>${t('settings.customEspresso')}</span><input id="cg-e" inputmode="decimal" value="${esc(c.espresso ?? '')}" required></label>
    <p class="err" id="cg-err" hidden>Нужны два разных числа.</p>
    <button class="btn btn-main" type="submit">${t('settings.customSave')}</button></form>`);
  $('#cg', s.body).onsubmit = e => {
    e.preventDefault();
    const rd = id => $(id, s.body).value.trim().replace(',', '.');
    const f = parseFloat(rd('#cg-f')), es = parseFloat(rd('#cg-e'));
    const dec = Math.max(...[rd('#cg-f'), rd('#cg-e')].map(v => (v.split('.')[1] || '').length));
    const custom = { name: $('#cg-name', s.body).value.trim() || t('settings.custom'), filter: f, espresso: es, step: dec ? 10 ** -Math.min(2, dec) : 1 };
    if (!customGrinder(custom)) { $('#cg-err', s.body).hidden = false; return; }
    store.update(st => { st.settings.custom = custom; delete st.calibration.custom; });
    s.close(); onPick('custom');
  };
}

// ---------- первый запуск ----------
export function openOnboarding(done) {
  const wrap = document.createElement('div');
  wrap.className = 'onboarding';
  document.body.appendChild(wrap);
  let step = 1;
  const draw = () => {
    const st = store.get().settings, g = currentGrinder();
    if (step === 1) {
      wrap.innerHTML = `<div class="onb-inner">
        <img src="icons/icon-192.png" alt="" class="onb-logo" width="72" height="72">
        <h1>${t('onb.title')}</h1><h2>1 · ${t('onb.grinder')}</h2>
        <input type="search" id="o-q" class="search" placeholder="${t('settings.search')}" autocomplete="off">
        <button class="g-item custom" id="o-custom"><b>＋ ${t('settings.custom')}</b></button>
        <div class="g-list" id="o-list">${grinderListHtml('', st.grinderId)}</div></div>`;
      const list = $('#o-list', wrap);
      $('#o-q', wrap).oninput = e => (list.innerHTML = grinderListHtml(e.target.value, st.grinderId));
      list.onclick = e => { const b = e.target.closest('[data-g]'); if (b) { store.update(s => (s.settings.grinderId = b.dataset.g)); step = 2; draw(); } };
      $('#o-custom', wrap).onclick = () => openCustom(id => { store.update(s => (s.settings.grinderId = id)); step = 2; draw(); });
    } else if (step === 2) {
      const base = calibBase(), opts = filterOptions(g), cur = settingFor(g, base + calibUm(g));
      wrap.innerHTML = `<div class="onb-inner">
        <h1>${esc(g.name)}</h1><h2>2 · ${t('onb.calib')}</h2><p class="muted">${t('onb.calibHint')}</p>
        <p>Таблица Bloomline предлагает: <b>${esc(cur.label)}</b></p>
        <label class="field"><span>Мой рабочий помол</span><select id="o-cal">${opts.map(o => `<option value="${o.um}"${o.label === cur.label ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
        <div class="row-btns"><button class="btn btn-main" id="o-next">Дальше</button><button class="btn btn-ghost" id="o-skip">${t('onb.skip')}</button></div></div>`;
      $('#o-next', wrap).onclick = () => { const um = +$('#o-cal', wrap).value; store.update(s => (s.calibration[g.id] = um - base)); step = 3; draw(); };
      $('#o-skip', wrap).onclick = () => { step = 3; draw(); };
    } else {
      wrap.innerHTML = `<div class="onb-inner"><h2>3 · ${t('onb.brewer')}</h2>
        <div class="chips wrap" id="o-br">${BREWERS.map(b => `<button class="chip${b.id === st.brewer ? ' on' : ''}" data-b="${b.id}">${esc(b.name)}</button>`).join('')}</div>
        <button class="btn btn-main wide" id="o-done">${t('onb.done')}</button></div>`;
      $('#o-br', wrap).onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; store.update(s => (s.settings.brewer = b.dataset.b)); $$('#o-br .chip', wrap).forEach(c => c.classList.toggle('on', c === b)); };
      $('#o-done', wrap).onclick = () => { store.update(s => (s.settings.onboarded = true)); wrap.remove(); done(); };
    }
    wrap.scrollTop = 0;
  };
  draw();
}

// ---------- резервная копия ----------
function exportData() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bloomline-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  try { const n = store.importJSON(await f.text()); toast(t('settings.imported', { n })); changed(); }
  catch (err) { toast(t('settings.importError')); }
  e.target.value = '';
}
