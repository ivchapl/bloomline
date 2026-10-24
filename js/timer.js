// Таймер заварки: циферблат с сегментами вливаний, звуковые сигналы, удержание экрана.
const NS = 'http://www.w3.org/2000/svg';
const CX = 160, CY = 160, R = 138, GAP = 7;

const polar = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
function arc(r, a0, a1) {
  const [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export class Dial {
  constructor(svg) { this.svg = svg; this.segs = []; this.n = 0; }
  build(n) {
    const svg = this.svg; svg.innerHTML = ''; this.n = n; this.segs = [];
    // 16 рёбер воронки
    for (let i = 0; i < 16; i++) {
      const [x0, y0] = polar(84, i * 22.5), [x1, y1] = polar(120, i * 22.5);
      svg.appendChild(el('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'dial-rib' }));
    }
    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 78, class: 'dial-inner' }));
    const span = (360 - n * GAP) / n;
    for (let i = 0; i < n; i++) {
      const a0 = i * (span + GAP) + GAP / 2, a1 = a0 + span;
      svg.appendChild(el('path', { d: arc(R, a0, a1), class: 'dial-track' }));
      const fg = el('path', { d: arc(R, a0, a1), class: 'dial-fill' });
      svg.appendChild(fg);
      const len = fg.getTotalLength();
      fg.style.strokeDasharray = len; fg.style.strokeDashoffset = len; fg.dataset.len = len;
      this.segs.push(fg);
    }
  }
  set(i, frac) {
    const fg = this.segs[i]; if (!fg) return;
    fg.style.strokeDashoffset = +fg.dataset.len * (1 - frac);
    fg.classList.toggle('done', frac >= 1);
  }
}

let actx = null;
export function beep(freq = 880, dur = 0.12, delay = 0, vol = 0.18) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* звук недоступен */ }
}
export const cues = {
  step: () => { beep(880, 0.1); beep(1175, 0.14, 0.13); },
  warn: () => beep(660, 0.08, 0, 0.12),
  finish: () => { beep(784, 0.12); beep(988, 0.12, 0.15); beep(1319, 0.28, 0.3); },
  unlock: () => beep(880, 0.06, 0, 0.08),
};

// Секундомер с событиями на границах этапов. Время идёт по performance.now(), а не по кадрам.
export class BrewClock {
  constructor({ onTick, onBoundary }) {
    this.onTick = onTick; this.onBoundary = onBoundary;
    this.elapsed = 0; this.running = false; this.raf = 0; this.last = 0; this.lock = null;
  }
  async start() {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    const loop = now => {
      if (!this.running) return;
      const prev = this.elapsed;
      this.elapsed += (now - this.last) / 1000; this.last = now;
      this.onBoundary(prev, this.elapsed);
      this.onTick(this.elapsed);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    try { this.lock = await navigator.wakeLock?.request('screen'); } catch (e) { /* без удержания экрана */ }
  }
  pause() {
    this.running = false; cancelAnimationFrame(this.raf);
    try { this.lock?.release(); } catch (e) { /* уже отпущен */ }
    this.lock = null;
  }
  reset() { this.pause(); this.elapsed = 0; this.onTick(0); }
}

export const fmt = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
