const splash = document.querySelector('#splash');
const menu = document.querySelector('#menu-screen');
const panels = [...document.querySelectorAll('.panel')];
const settings = { music: document.querySelector('#music-volume'), sfx: document.querySelector('#sfx-volume'), quality: document.querySelector('#quality-choice') };

function revealMenu() {
  splash.classList.add('leaving');
  window.setTimeout(() => { splash.hidden = true; menu.hidden = false; menu.classList.add('entered'); }, 460);
}

function requestMobileFullscreen() {
  const mobileLayout = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  if (!mobileLayout || document.fullscreenElement || !request) return;
  try { request.call(target)?.catch?.(() => {}); } catch { /* Browser declined fullscreen. */ }
}

function openPanel(panelId) {
  panels.forEach(panel => { panel.hidden = panel.id !== panelId; });
  document.querySelector(`#${panelId}`).querySelector('button, input, select')?.focus();
}

function closePanels() { panels.forEach(panel => { panel.hidden = true; }); document.querySelector('#open-racers').focus(); }

function persistSetting(key, value) { localStorage.setItem(`dlikarts.${key}`, value); }
function loadSetting(key, input, fallback) { const value = localStorage.getItem(`dlikarts.${key}`) ?? fallback; input.value = value; syncOutput(input); }
function syncOutput(input) { const output = document.querySelector(`output[for="${input.id}"]`); if (output) output.textContent = `${input.value}%`; }

document.querySelector('#skip-intro').addEventListener('click', () => { requestMobileFullscreen(); revealMenu(); });
window.setTimeout(revealMenu, 2100);
document.querySelector('#open-racers').addEventListener('click', () => { requestMobileFullscreen(); openPanel('racers-panel'); });
document.querySelector('#open-howto').addEventListener('click', () => { requestMobileFullscreen(); openPanel('howto-panel'); });
document.querySelectorAll('#open-settings, #open-settings-copy').forEach(button => button.addEventListener('click', () => { requestMobileFullscreen(); openPanel('settings-panel'); }));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closePanels));
document.querySelector('#launch-game').addEventListener('click', () => { location.href = '../game/'; });
document.querySelectorAll('.racer-card[data-racer]').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('.racer-card[data-racer]').forEach(item => { item.classList.toggle('selected', item === card); item.setAttribute('aria-pressed', String(item === card)); });
  document.querySelector('#selection-message').textContent = `${card.dataset.racer.toUpperCase()} IS READY TO RACE.`;
}));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
settings.music.addEventListener('input', () => { syncOutput(settings.music); persistSetting('music', settings.music.value); });
settings.sfx.addEventListener('input', () => { syncOutput(settings.sfx); persistSetting('sfx', settings.sfx.value); });
settings.quality.addEventListener('change', () => persistSetting('quality', settings.quality.value));
loadSetting('music', settings.music, 70); loadSetting('sfx', settings.sfx, 80); settings.quality.value = localStorage.getItem('dlikarts.quality') ?? 'auto';
