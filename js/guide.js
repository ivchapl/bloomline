// Экран «Справочник»: обработки, что крутить, если невкусно, и сравнение кофемолок.
import { store } from './store.js';
import { $, esc } from './ui.js';
import { BUILTIN, plan } from './schemes.js';
import { grindFor, currentGrinder } from './core.js';
import { allGrinders, settingFor, umPerStep, unitWord, BASE_UM } from './grinders.js';
import { fmt } from './timer.js';

let root;
export function mountGuide(el) { root = el; render(); }

// «на 3–5 щелчков K-Ultra» → в делениях выбранной кофемолки
function stepsText(g, umLo, umHi) {
  const per = umPerStep(g, BASE_UM);
  const a = Math.max(1, Math.round(umLo / per)), b = Math.max(a, Math.round(umHi / per));
  return `${a === b ? a : `${a}–${b}`} ${unitWord(g, b)}`;
}

export function render() {
  if (!root) return;
  const g = currentGrinder(), dose = store.get().settings.dose;
  const procs = BUILTIN.map(x => {
    const P = plan(x, dose), gi = grindFor(x, dose);
    return `<article class="card proc">
      <h3>${x.icon} ${esc(x.name)}</h3><p class="muted">${esc(x.about)}</p>
      <div class="spec"><span>Температура</span><b>${x.temp} °C</b></div>
      <div class="spec"><span>Вода</span><b>${P.total} г · 1:${x.ratio}</b></div>
      <div class="spec"><span>Вливания</span><b>${P.steps.length} · пауза ${P.interval} с</b></div>
      <div class="spec"><span>Помол</span><b>${esc(gi.g.name)} · ${esc(gi.set.label)}</b></div>
      <div class="spec"><span>Финиш</span><b>≈${fmt(P.drawEnd)}</b></div></article>`;
  }).join('');

  root.innerHTML = `
    <div class="view-head"><h1>Справочник</h1></div>
    <h2 class="section-title">Гид по обработкам</h2>
    <p class="muted section-lead">Стартовые точки для светлой обжарки при дозе ${String(dose).replace('.', ',')} г. Главный ориентир всегда конкретный лот в чашке.</p>
    <div class="cards">${procs}</div>

    <h2 class="section-title">Что крутить, если невкусно</h2>
    <p class="muted section-lead">Меняйте по одному параметру за раз: сначала подберите помол под время стока, потом играйте структурой пролива.</p>
    <div class="card fixes">
      <div class="fix"><span>Кисло, пусто, травянистая горечь</span><span>Мельче на <b>${stepsText(g, 23, 38)}</b> либо <b>+1 вливание</b></span></div>
      <div class="fix"><span>Горько, рыхлое тело, сушит</span><span>Крупнее на <b>${stepsText(g, 23, 38)}</b>, <b>минус одно вливание</b>, убрать swirl</span></div>
      <div class="fix"><span>Всё правильно, но плоско</span><span><b>+2 °C</b></span></div>
      <div class="fix"><span>Ферментация давит остальное</span><span><b>−2 °C</b>, крупнее, дайте зерну ещё <b>2–3 недели</b> отлежаться</span></div>
      <div class="fix"><span>Сток дольше цели на 30 с и больше</span><span>Крупнее на <b>${stepsText(g, 38, 38)}</b></span></div>
      <div class="fix"><span>Сток быстрее цели на 30 с и больше</span><span>Мельче на <b>${stepsText(g, 38, 38)}</b></span></div>
      <div class="fix"><span>Керамическая воронка</span><span><b>+2 °C</b> или прогрев кипятком 20 с перед засыпкой</span></div>
      <div class="fix"><span>Хочется слаще, а не кислее</span><span>Поменять местами 1-е и 2-е вливания: первое меньше второго</span></div>
    </div>
    <div class="card principle">
      <h3>Сначала обжарка, потом обработка</h3>
      <p>Плотность и растворимость зерна определяются прежде всего степенью обжарки, а также сортом и высотой. Обработка лишь вносит поправку.</p>
      <p>Температура — рычаг скорости экстракции. Если опускаете её ради бережности к ферментированному лоту, компенсируйте помолом, числом вливаний или временем.</p>
      <p>Лот незнакомый — стартуйте с «Основной»: 14 г, 230 г воды, 93 °C, блуминг и три пролива. Пустовато — добавьте пролив, тяжело и плотно — уберите один.</p>
    </div>

    <h2 class="section-title">Сравнить кофемолки</h2>
    <p class="muted section-lead">Стартовый помол «Основной» схемы при 14 г (≈${BASE_UM} мкм по шкале HCG) на других моделях, без вашей калибровки. Удобно, чтобы переложить рецепт из сообщества на свою кофемолку.</p>
    <input type="search" id="cmp-q" class="search" placeholder="Например, Comandante или Timemore" autocomplete="off">
    <div class="card cmp-list" id="cmp-list"></div>`;

  const list = $('#cmp-list', root);
  const draw = q => {
    q = q.trim().toLowerCase();
    const rows = allGrinders().filter(x => (q ? (x.name + ' ' + x.brand).toLowerCase().includes(q) : x.popular)).slice(0, 80);
    list.innerHTML = rows.map(x => { const s = settingFor(x, BASE_UM);
      return `<div class="cmp-row"><span>${esc(x.name)}</span><b>${esc(s.label)}</b></div>`; }).join('') || '<p class="muted">Ничего не нашлось</p>';
  };
  $('#cmp-q', root).oninput = e => draw(e.target.value);
  draw('');
}
