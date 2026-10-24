// Экран «Заварка»: схема, доза, помол, таймер, запись результата и совет по помолу.
import { t, WORDS } from './i18n.js';
import { store, uid } from './store.js';
import { $, $$, html, raw, esc, toast, sheet } from './ui.js';
import { Dial, BrewClock, cues, fmt } from './timer.js';
import { plan, brewerById, MIN_DOSE, MAX_DOSE, waterLabel } from './schemes.js';
import { currentScheme, allSchemes, grindFor, currentWater, signed } from './core.js';
import { umPerStep, shiftBy, settingFor } from './grinders.js';
import { brewerChipsHtml } from './settings.js';

let root, dial, clock, P = null, phase = 'idle', drainedAt = null, onChanged = () => {};
const S = () => store.get().settings;

export function mountBrew(el, { changed } = {}) {
  root = el; if (changed) onChanged = changed;
  root.innerHTML = `
    <div class="scheme-strip" id="scheme-strip" role="tablist" aria-label="${t('schemes.title')}"></div>
    <div class="brew-grid">
      <section class="card dial-card" aria-label="Таймер">
        <div class="dial-wrap">
          <svg id="dial" viewBox="0 0 320 320" aria-hidden="true"></svg>
          <div class="dial-center">
            <div class="t-phase" id="t-phase"></div>
            <div class="t-time" id="t-time">0:00</div>
            <div class="t-sub" id="t-sub"></div>
          </div>
        </div>
        <div class="pour-now">
          <div class="pour-box" id="box-add"><div class="k">${t('brew.pourNow')}</div><div class="v accent" id="val-add"></div></div>
          <div class="pour-box"><div class="k">${t('brew.target')}</div><div class="v" id="val-target"></div></div>
        </div>
        <p class="pour-hint" id="pour-hint"></p>
        <div class="btn-row">
          <button class="btn btn-main" id="btn-main">${t('brew.start')}</button>
          <button class="btn btn-sun" id="btn-drained" hidden>${t('brew.drained')}</button>
          <button class="btn btn-ghost icon" id="btn-reset" aria-label="${t('brew.reset')}" title="${t('brew.reset')}">↺</button>
          <button class="btn btn-ghost icon" id="btn-sound" aria-label="${t('brew.sound')}" aria-pressed="true">🔔</button>
        </div>
        <div class="meta-row">
          <span>${t('brew.interval')} <b id="m-interval"></b></span>
          <span>${t('brew.pourTime')} <b id="m-pour"></b></span>
          <span>${t('brew.finish')} <b id="m-finish"></b></span>
        </div>
      </section>
      <section class="card">
        <div class="dose-row">
          <span class="label">${t('brew.dose')}</span>
          <div class="stepper">
            <button class="btn btn-ghost icon" id="dose-minus" aria-label="−0,5 г">−</button>
            <label class="dose-val"><input id="dose" type="number" inputmode="decimal" step="0.5" min="${MIN_DOSE}" max="${MAX_DOSE}"><span>г</span></label>
            <button class="btn btn-ghost icon" id="dose-plus" aria-label="+0,5 г">+</button>
          </div>
          <div class="chips" id="dose-chips">${[14, 15, 18, 22].map(d => `<button class="chip" data-dose="${d}">${d}</button>`).join('')}</div>
        </div>
        <div class="params">
          <button class="param wide" id="p-grind"><span class="k">${t('brew.grind')}</span><span class="v" id="v-grind"></span><span class="s" id="s-grind"></span></button>
          <div class="param"><span class="k">${t('brew.temp')}</span><span class="v" id="v-temp"></span><span class="s">${t('brew.tempSub')}</span></div>
          <div class="param"><span class="k">${t('brew.ratio')}</span><span class="v" id="v-ratio"></span><span class="s" id="s-ratio"></span></div>
          <button class="param wide" id="p-brewer"><span class="k">${t('brew.brewer')}</span><span class="v small" id="v-brewer"></span><span class="s" id="s-brewer"></span></button>
        </div>
        <div class="steps-head"><h2>${t('brew.steps')}</h2><span class="total-chip" id="total-chip"></span></div>
        <ol class="steps" id="steps"></ol>
      </section>
    </div>
    <div id="log-slot"></div>`;

  dial = new Dial($('#dial', root));
  clock = new BrewClock({ onTick: update, onBoundary });

  $('#btn-main', root).onclick = () => (clock.running ? pauseClock() : startClock());
  $('#btn-reset', root).onclick = resetAll;
  $('#btn-drained', root).onclick = () => finish(clock.elapsed);
  const snd = $('#btn-sound', root);
  const paintSound = () => { snd.textContent = S().sound ? '🔔' : '🔕'; snd.setAttribute('aria-pressed', S().sound); };
  snd.onclick = () => { store.update(s => (s.settings.sound = !s.settings.sound)); paintSound(); };
  paintSound();

  const setDose = d => {
    d = Math.round(Math.min(MAX_DOSE, Math.max(MIN_DOSE, +d || 14)) * 2) / 2;
    store.update(s => (s.settings.dose = d)); refresh();
  };
  $('#dose-minus', root).onclick = () => setDose(S().dose - 0.5);
  $('#dose-plus', root).onclick = () => setDose(S().dose + 0.5);
  $('#dose', root).onchange = e => setDose(e.target.value);
  $('#dose-chips', root).onclick = e => { const b = e.target.closest('[data-dose]'); if (b) setDose(b.dataset.dose); };
  $('#p-grind', root).onclick = openGrindSheet;
  $('#p-brewer', root).onclick = openBrewerSheet;

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !/input|textarea|button|select/i.test(e.target.tagName) && !root.hidden) {
      e.preventDefault(); clock.running ? pauseClock() : startClock();
    }
  });
  refresh();
}

// Полная перерисовка при смене схемы, дозы, кофемолки или воронки
export function refresh() {
  if (!root) return;
  resetClockOnly();
  const sc = currentScheme(), dose = S().dose;
  P = plan(sc, dose);

  $('#scheme-strip', root).innerHTML = allSchemes().map(x =>
    `<button class="chip scheme-chip${x.id === sc.id ? ' on' : ''}" role="tab" aria-selected="${x.id === sc.id}" data-id="${esc(x.id)}">${esc(x.icon || '☕')} ${esc(x.name)}</button>`).join('');
  const strip = $('#scheme-strip', root), on = $('.scheme-chip.on', strip);
  if (on) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - 16);
  strip.onclick = e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    store.update(s => (s.settings.schemeId = b.dataset.id)); refresh();
  };

  $('#dose', root).value = dose;
  $$('#dose-chips .chip', root).forEach(c => c.classList.toggle('on', +c.dataset.dose === dose));
  $('#v-temp', root).textContent = `${sc.temp} °C`;
  $('#v-ratio', root).textContent = `1:${(Math.round(P.ratio * 10) / 10).toString().replace('.', ',')}`;
  $('#s-ratio', root).textContent = t('brew.ratioSub', { dose: String(dose).replace('.', ','), water: P.total });
  $('#v-brewer', root).textContent = brewerById(S().brewer).name;
  $('#s-brewer', root).textContent = brewerById(S().brewer).note || '';

  const gi = grindFor(sc, dose);
  $('#v-grind', root).innerHTML = html`<span class="gname">${gi.g.name}</span> <b>${gi.set.label}</b>`;
  const parts = [t('brew.grindSub', { um: Math.round(gi.set.um) })];
  if (gi.set.sub) parts.unshift(gi.set.sub);
  const p = gi.parts, u = gi.unit;
  if (p.calib) parts.push(t('brew.calib', { d: `${signed(p.calib)} ${u(Math.abs(p.calib))}` }));
  if (p.dose) parts.push(t('brew.doseShift', { d: `${signed(p.dose)} ${u(Math.abs(p.dose))}` }));
  if (p.brewer) parts.push(t('brew.brewerShift', { d: `${signed(p.brewer)} ${u(Math.abs(p.brewer))}` }));
  $('#s-grind', root).textContent = parts.join(' · ');

  $('#steps', root).innerHTML = P.steps.map((s, i) => html`
    <li class="step" id="step-${i}">
      <div class="row1"><span class="name"><span class="tick">✓</span>${i + 1}. ${s.name}</span><span class="time">${fmt(s.s)}–${fmt(s.e)}</span></div>
      <div class="row2"><span>${t('brew.pour')} <b>+${s.add} г</b></span><span>${t('brew.onScale')} <b>${s.cum} г</b></span></div>
      <div class="bar"><i id="bar-${i}"></i></div>
    </li>`).join('');
  $('#total-chip', root).textContent = t('brew.total', { w: P.total, n: P.steps.length, pours: WORDS.pour(P.steps.length) });
  $('#m-interval', root).textContent = `${P.interval} с`;
  $('#m-pour', root).textContent = `≈${P.pourSec} с`;
  $('#m-finish', root).textContent = `≈${fmt(P.drawEnd)}`;

  dial.build(P.steps.length);
  update(0);
}

function stepIndex(tm) {
  for (let i = 0; i < P.steps.length; i++) if (tm >= P.steps[i].s && tm < P.steps[i].e) return i;
  return tm >= P.brewEnd ? -1 : 0;
}

function update(tm) {
  const steps = P.steps, idx = stepIndex(tm);
  $('#t-time', root).textContent = fmt(tm);
  const setBox = (add, target, hint) => {
    $('#val-add', root).textContent = add; $('#val-target', root).textContent = target; $('#pour-hint', root).textContent = hint;
  };
  if (phase === 'done') {
    $('#t-phase', root).textContent = `${t('brew.done')} ☕`;
    $('#t-sub', root).textContent = t('brew.doneSub', { t: fmt(drainedAt ?? tm) });
    setBox('—', `${P.total} г`, t('brew.doneHint'));
  } else if (!clock.running && tm === 0) {
    $('#t-phase', root).textContent = t('brew.ready');
    $('#t-sub', root).textContent = t('brew.stageRange', { from: fmt(steps[0].s), to: fmt(steps[0].e) });
    setBox(`+${steps[0].add} г`, `${steps[0].cum} г`, steps[0].hint);
  } else if (idx >= 0 && tm < P.brewEnd) {
    const s = steps[idx];
    $('#t-phase', root).textContent = t('brew.stage', { n: idx + 1, name: s.name });
    $('#t-sub', root).textContent = idx === steps.length - 1 ? t('brew.lastPour') : t('brew.untilNext', { s: Math.ceil(s.e - tm) });
    setBox(`+${s.add} г`, `${s.cum} г`, s.hint);
  } else {
    $('#t-phase', root).textContent = t('brew.drawdown');
    $('#t-sub', root).textContent = t('brew.finishTarget', { t: fmt(P.drawEnd) });
    setBox('—', `${P.total} г`, t('brew.drawdownHint'));
  }
  $('#box-add', root).classList.toggle('hot', clock.running && idx >= 0 && tm < P.brewEnd && tm - steps[idx].s < 12);
  $('#btn-drained', root).hidden = !(phase === 'running' && tm >= P.steps[P.steps.length - 1].s);

  steps.forEach((s, i) => {
    const f = Math.min(1, Math.max(0, (tm - s.s) / (s.e - s.s)));
    dial.set(i, f);
    const li = $(`#step-${i}`, root); if (!li) return;
    li.classList.toggle('active', i === idx && tm < P.brewEnd && phase !== 'done');
    li.classList.toggle('done', tm >= s.e);
    $(`#bar-${i}`, root).style.width = `${f * 100}%`;
  });
}

function onBoundary(prev, now) {
  // если «Сток закончился» так и не нажали — останавливаемся через 2 минуты после цели
  if (now >= P.drawEnd + 120) { finish(null); return; }
  if (!S().sound) return;
  for (const s of P.steps.slice(1)) {
    if (prev < s.s - 5 && now >= s.s - 5) cues.warn();
    if (prev < s.s && now >= s.s) cues.step();
  }
  if (prev < P.brewEnd && now >= P.brewEnd) cues.step();
  if (prev < P.drawEnd && now >= P.drawEnd) cues.finish();
}

function startClock() {
  if (phase === 'done') resetAll();
  phase = 'running';
  if (S().sound) cues.unlock();
  clock.start();
  const b = $('#btn-main', root); b.textContent = t('brew.pause'); b.classList.add('running');
}
function pauseClock() {
  clock.pause();
  const b = $('#btn-main', root); b.textContent = t('brew.resume'); b.classList.remove('running');
  update(clock.elapsed);
}
function resetClockOnly() {
  clock?.pause(); if (clock) clock.elapsed = 0;
  phase = 'idle'; drainedAt = null;
  const b = root && $('#btn-main', root);
  if (b) { b.textContent = t('brew.start'); b.classList.remove('running'); }
  if (root) $('#log-slot', root).innerHTML = '';
}
function resetAll() { resetClockOnly(); update(0); }

function finish(at) {
  clock.pause();
  phase = 'done'; drainedAt = at;
  const b = $('#btn-main', root); b.textContent = t('brew.start'); b.classList.remove('running');
  update(at ?? clock.elapsed);
  showLogForm(at);
}

// ---------- запись заварки ----------
const PROCESSES = ['Мытая', 'Хани', 'Натуральная', 'Анаэробная', 'Другая'];

function showLogForm(at) {
  const lc = store.get().lastCoffee;
  const target = P.drawEnd, time = at != null ? Math.round(at) : target;
  const slot = $('#log-slot', root);
  slot.innerHTML = html`
  <form class="card log-card" id="log-form" autocomplete="off">
    <h2>${t('log.title')}</h2>
    <div class="form-grid">
      <label class="field"><span>${t('log.time')} <small>${t('log.target', { t: fmt(target) })}</small></span>
        <input id="log-time" inputmode="numeric" pattern="[0-9]{1,2}:[0-9]{2}" value="${fmt(time)}" required></label>
      <fieldset class="field"><legend>${t('log.taste')}</legend>
        <div class="seg" id="log-taste">
          <button type="button" data-v="sour">${t('log.sour')}</button>
          <button type="button" data-v="ok" class="on">${t('log.ok')}</button>
          <button type="button" data-v="bitter">${t('log.bitter')}</button>
        </div></fieldset>
      <fieldset class="field"><legend>${t('log.rating')}</legend>
        <div class="stars" id="log-stars">${raw([1, 2, 3, 4, 5].map(n => `<button type="button" data-v="${n}" aria-label="${n}">★</button>`).join(''))}</div></fieldset>
    </div>
    <details class="coffee-box" ${raw(lc.lot ? '' : 'open')}>
      <summary>${t('log.coffee')}${lc.lot ? `: ${lc.roaster ? lc.roaster + ' · ' : ''}${lc.lot}` : ''}</summary>
      <div class="form-grid">
        <label class="field"><span>${t('log.roaster')}</span><input id="log-roaster" value="${lc.roaster}"></label>
        <label class="field"><span>${t('log.lot')}</span><input id="log-lot" value="${lc.lot}"></label>
        <label class="field"><span>${t('log.process')}</span><select id="log-process">
          <option value=""></option>${raw(PROCESSES.map(p => `<option${p === lc.process ? ' selected' : ''}>${p}</option>`).join(''))}</select></label>
        <label class="field"><span>${t('log.roastDate')}</span><input id="log-roast" type="date" value="${lc.roastDate}"></label>
      </div>
    </details>
    <label class="field"><span>${t('log.notes')}</span><textarea id="log-notes" rows="2" placeholder="${t('log.notesPh')}"></textarea></label>
    <div class="row-btns">
      <button class="btn btn-main" type="submit">${t('log.save')}</button>
      <button class="btn btn-ghost" type="button" id="log-skip">${t('log.skip')}</button>
    </div>
  </form>`;
  let taste = 'ok', rating = 0;
  $('#log-taste', slot).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    taste = b.dataset.v; $$('#log-taste button', slot).forEach(x => x.classList.toggle('on', x === b));
  };
  $('#log-stars', slot).onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    rating = +b.dataset.v; $$('#log-stars button', slot).forEach(x => x.classList.toggle('on', +x.dataset.v <= rating));
  };
  $('#log-skip', slot).onclick = () => (slot.innerHTML = '');
  $('#log-form', slot).onsubmit = e => {
    e.preventDefault();
    const m = /^(\d{1,2}):(\d{2})$/.exec($('#log-time', slot).value.trim());
    const sec = m ? +m[1] * 60 + +m[2] : target;
    const coffee = { roaster: $('#log-roaster', slot).value.trim(), lot: $('#log-lot', slot).value.trim(),
      process: $('#log-process', slot).value, roastDate: $('#log-roast', slot).value };
    saveBrew({ sec, taste, rating, coffee, notes: $('#log-notes', slot).value.trim() });
  };
  slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveBrew({ sec, taste, rating, coffee, notes }) {
  const sc = currentScheme(), dose = S().dose, gi = grindFor(sc, dose), w = currentWater();
  const brew = {
    id: uid(), ts: Date.now(), schemeId: sc.id, schemeName: sc.name, dose, water: P.total, ratio: +P.ratio.toFixed(2),
    temp: sc.temp, brewer: S().brewer, brewerName: brewerById(S().brewer).name, grinderId: gi.g.id, grinderName: gi.g.name, setting: gi.set.label, um: Math.round(gi.set.um),
    waterLabel: waterLabel(w), drawdown: sec, drawdownTarget: P.drawEnd, taste, rating, coffee, notes,
    steps: P.steps.map(s => ({ s: s.s, add: s.add, name: s.name })),
  };
  store.update(s => { s.journal.unshift(brew); s.lastCoffee = coffee; });
  toast(t('log.saved'));
  showSuggestion(brew, gi);
}

// Совет: вкус главнее времени. Кисло → мельче, горько → крупнее; время усиливает поправку.
export function suggestion(brew, g, um) {
  const dt = brew.drawdown - brew.drawdownTarget;
  let delta = 0;
  if (brew.taste === 'sour') delta = dt < -15 ? -30 : -23;
  if (brew.taste === 'bitter') delta = dt > 15 ? 30 : 23;
  if (!delta) return { n: 0, dt };
  let n = Math.round(delta / umPerStep(g, um));
  if (!n) n = Math.sign(delta);
  return { n, dt, toUm: shiftBy(g, um, n) };
}

function showSuggestion(brew, gi) {
  const sg = suggestion(brew, gi.g, gi.set.um);
  const slot = $('#log-slot', root);
  const unit = gi.unit(Math.abs(sg.n));
  let text, action = '';
  if (!sg.n) {
    text = t('calib.keep', { setting: gi.set.label });
    if (Math.abs(sg.dt) > 30) text += `. ${t('calib.timeNote', { d: `${sg.dt > 0 ? '+' : '−'}${Math.abs(sg.dt)} с` })}`;
  } else {
    const to = settingFor(gi.g, sg.toUm).label;
    text = t(sg.n < 0 ? 'calib.finer' : 'calib.coarser', { n: Math.abs(sg.n), unit, from: gi.set.label, to });
    action = `<button class="btn btn-main" id="calib-apply">${t('calib.apply')}</button>`;
  }
  slot.innerHTML = `<section class="card suggest-card"><h2>${t('calib.suggest')}</h2><p>${esc(text)}</p>
    <div class="row-btns">${action}<button class="btn btn-ghost" id="calib-close">${t('common.close')}</button></div></section>`;
  $('#calib-close', slot).onclick = () => { slot.innerHTML = ''; resetAll(); };
  const ap = $('#calib-apply', slot);
  if (ap) ap.onclick = () => {
    const d = sg.toUm - gi.set.um;
    store.update(s => { s.calibration[gi.g.id] = (s.calibration[gi.g.id] || 0) + d; s.journal[0].calibApplied = Math.round(d); });
    toast(t('calib.applied')); slot.innerHTML = ''; refresh();
  };
}

// Смена воронки прямо с экрана заварки
function openBrewerSheet() {
  const s = sheet(t('brew.brewer'), `<div id="br-pick">${brewerChipsHtml(S().brewer)}</div>
    <p class="muted small">${esc(t('settings.brewerHint'))}</p>`);
  $('#br-pick', s.body).onclick = e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    store.update(st => (st.settings.brewer = b.dataset.b));
    s.close(); refresh(); onChanged();
  };
}

// Быстрая ручная поправка помола: ±1 деление прямо с экрана заварки
function openGrindSheet() {
  const sc = currentScheme(), gi = grindFor(sc, S().dose);
  const s = sheet(gi.g.name, `
    <p class="sheet-lead">${esc(gi.set.label)}${gi.set.sub ? ' · ' + esc(gi.set.sub) : ''} · ≈${Math.round(gi.set.um)} мкм</p>
    <p class="muted">Подстройте помол под свою кофемолку. Поправка запомнится и применится ко всем схемам.</p>
    <div class="row-btns">
      <button class="btn btn-ghost" data-n="-1">Мельче на 1 ${esc(gi.unit(1))}</button>
      <button class="btn btn-ghost" data-n="1">Крупнее на 1 ${esc(gi.unit(1))}</button>
    </div>
    <p><a href="#settings" data-go>Сменить кофемолку или задать калибровку →</a></p>`);
  s.body.addEventListener('click', e => {
    const b = e.target.closest('[data-n]');
    if (b) {
      const cur = grindFor(sc, S().dose), to = shiftBy(cur.g, cur.set.um, +b.dataset.n);
      store.update(st => (st.calibration[cur.g.id] = (st.calibration[cur.g.id] || 0) + (to - cur.set.um)));
      s.close(); refresh(); toast(t('calib.applied'));
    }
    if (e.target.closest('[data-go]')) s.close();
  });
}
