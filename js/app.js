// Точка входа: загрузка справочника, вкладки, импорт схемы по ссылке, офлайн-режим.
import { t } from './i18n.js';
import { store } from './store.js';
import { $, $$, toast } from './ui.js';
import { loadGrinders } from './grinders.js';
import { decodeScheme, waterLabel, BREWERS } from './schemes.js';
import { schemeById, currentWater } from './core.js';
import { mountBrew, refresh as refreshBrew } from './brew.js';
import { mountSchemes, render as renderSchemes, offerImport } from './schemes-view.js';
import { mountJournal, render as renderJournal } from './journal.js';
import { mountGuide, render as renderGuide } from './guide.js';
import { mountSettings, render as renderSettings, openOnboarding } from './settings.js';

const TABS = ['brew', 'schemes', 'journal', 'guide', 'settings'];

function show(tab) {
  if (!TABS.includes(tab)) tab = 'brew';
  TABS.forEach(x => { $(`#view-${x}`).hidden = x !== tab; });
  $$('.tabbar a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
  if (tab === 'schemes') renderSchemes();
  if (tab === 'journal') renderJournal();
  if (tab === 'settings') renderSettings();
  if (tab === 'guide') renderGuide();
  window.scrollTo(0, 0);
}

function route() {
  const h = location.hash.slice(1);
  if (h.startsWith('s=')) {
    try {
      const sc = decodeScheme(h.slice(2));
      history.replaceState(null, '', '#schemes');
      show('schemes'); offerImport(sc);
    } catch (e) { history.replaceState(null, '', '#schemes'); show('schemes'); toast('Ссылка на схему повреждена'); }
    return;
  }
  show(h || 'brew');
}

function paintWater() {
  const w = currentWater();
  $('#water-chip').innerHTML = `<span class="dot"></span><span class="wl">${waterLabel(w)}</span>`;
  $('#water-chip').title = w.fromLab ? 'Вода из Origami Water Lab' : 'Вода: пресет в настройках';
}

// Всё, что зависит от кофемолки, воронки, дозы и калибровки
function refreshAll() { refreshBrew(); renderSchemes(); renderGuide(); paintWater(); }

async function main() {
  document.title = `${t('app.name')} — ${t('app.tagline')}`;
  try { await loadGrinders(); }
  catch (e) { $('#app-error').hidden = false; return; }

  mountBrew($('#view-brew'), { changed: () => { renderSchemes(); renderGuide(); } });
  mountSchemes($('#view-schemes'), {
    use: id => { store.update(s => (s.settings.schemeId = id)); refreshBrew(); location.hash = '#brew'; },
    changed: refreshBrew,
  });
  mountJournal($('#view-journal'), {
    repeat: b => {
      store.update(s => {
        if (schemeById(b.schemeId).id === b.schemeId) s.settings.schemeId = b.schemeId;
        s.settings.dose = b.dose;
        if (BREWERS.some(x => x.id === b.brewer)) s.settings.brewer = b.brewer;
        if (b.coffee) s.lastCoffee = b.coffee;
      });
      refreshBrew(); location.hash = '#brew';
    },
  });
  mountGuide($('#view-guide'));
  mountSettings($('#view-settings'), { changed: refreshAll });
  paintWater();

  window.addEventListener('hashchange', route);
  // Water Lab может поменять воду в соседней вкладке
  window.addEventListener('storage', e => { if (e.key === 'owl-v1') paintWater(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paintWater(); });
  route();

  if (!store.get().settings.onboarded) openOnboarding(refreshAll);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
