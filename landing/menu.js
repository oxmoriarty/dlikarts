import { AudioManager } from '../game/audio/AudioManager.js?v=gapless-kart-audio-1';
import { prepareMobilePresentation, requestMobilePresentation } from '../shared/mobile-presentation.js?v=persistent-landscape-1';
import { populateCommunity } from './community.js';
import { RACERS, racerId } from '../shared/racers.js';

const audio = new AudioManager();
audio.playMusic('menu');
const splash = document.querySelector('#splash');
const menu = document.querySelector('#menu-screen');
const panels = [...document.querySelectorAll('.panel')];
const settings = { master: document.querySelector('#master-volume'), music: document.querySelector('#music-volume'), sfx: document.querySelector('#sfx-volume'), quality: document.querySelector('#quality-choice'), controls: document.querySelector('#control-choice') };
const requestedPanel = new URLSearchParams(location.search).get('panel');
const requestedView = new URLSearchParams(location.search).get('view');
const returnToRace = new URLSearchParams(location.search).get('return') === 'game';
const playSelect = () => audio.playSfx('uiSelect', { gain: .34, cooldown: 70 });
prepareMobilePresentation();
populateCommunity();

function revealMenu() {
  splash.classList.add('leaving');
  window.setTimeout(() => { splash.hidden = true; menu.hidden = false; menu.classList.add('entered'); void requestMobilePresentation(); }, 460);
}

function openPanel(panelId) {
  playSelect();
  panels.forEach(panel => { panel.hidden = panel.id !== panelId; });
  document.querySelector(`#${panelId}`).querySelector('button, input, select')?.focus();
}

function closePanels() {
  audio.playSfx('uiBack', { gain: .32, cooldown: 70 });
  if (returnToRace) { location.href = '../game/'; return; }
  panels.forEach(panel => { panel.hidden = true; }); document.querySelector('#open-racers').focus();
}

function persistSetting(key, value) { localStorage.setItem(`dlikarts.${key}`, value); }
function loadSetting(key, input, fallback) { const value = localStorage.getItem(`dlikarts.${key}`) ?? fallback; input.value = value; syncOutput(input); }
function syncOutput(input) { const output = document.querySelector(`output[for="${input.id}"]`); if (output) output.textContent = `${input.value}%`; }

document.querySelector('#skip-intro')?.addEventListener('click', async () => { await audio.unlock(); playSelect(); void requestMobilePresentation(); revealMenu(); });
if (requestedPanel === 'settings') {
  splash.hidden = true; menu.hidden = false; menu.classList.add('entered');
  requestAnimationFrame(() => openPanel('settings-panel'));
} else if (requestedView === 'menu') {
  splash.hidden = true; menu.hidden = false; menu.classList.add('entered');
} else window.setTimeout(revealMenu, 2100);
document.querySelector('#open-racers').addEventListener('click', () => { void audio.unlock(); openPanel('racers-panel'); void requestMobilePresentation(); });
document.querySelector('#open-howto')?.addEventListener('click', () => { void audio.unlock(); openPanel('howto-panel'); void requestMobilePresentation(); });
document.querySelectorAll('#open-settings, #open-settings-copy').forEach(button => button.addEventListener('click', () => { void audio.unlock(); openPanel('settings-panel'); void requestMobilePresentation(); }));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closePanels));
document.querySelector('#open-socials').addEventListener('click', () => { void audio.unlock(); openPanel('community-panel'); void requestMobilePresentation(); });
document.querySelector('#open-game-jam').addEventListener('click', () => { void audio.unlock(); playSelect(); });
document.querySelectorAll('.community-panel a').forEach(link => link.addEventListener('click', playSelect));
let selectedRacer = 'guatam';
try { selectedRacer = racerId(localStorage.getItem('dlikarts.racer')); } catch { /* Storage can be unavailable in private browsing. */ }
function selectRacer(id) {
  selectedRacer = racerId(id);
  document.querySelectorAll('.racer-card[data-racer]').forEach(card => {
    const selected = card.dataset.racer === selectedRacer;
    card.classList.toggle('selected', selected); card.setAttribute('aria-pressed', String(selected));
  });
  document.querySelector('#selection-message').textContent = `${RACERS[selectedRacer].name} IS READY TO RACE.`;
  document.querySelector('#launch-game').innerHTML = `RACE AS ${RACERS[selectedRacer].name} <span>→</span>`;
}
selectRacer(selectedRacer);
document.querySelector('#launch-game').addEventListener('click', () => { playSelect(); location.href = `../game/?racer=${selectedRacer}`; });
document.querySelectorAll('.racer-card[data-racer]').forEach(card => card.addEventListener('click', () => { playSelect();
  selectRacer(card.dataset.racer);
  try { localStorage.setItem('dlikarts.racer', selectedRacer); } catch { /* Selection still works without persistence. */ }
}));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
settings.master.addEventListener('input', () => { syncOutput(settings.master); audio.setMasterVolume(Number(settings.master.value) / 100); playSelect(); });
settings.music.addEventListener('input', () => { syncOutput(settings.music); audio.setMusicVolume(Number(settings.music.value) / 100); persistSetting('music', settings.music.value); });
settings.sfx.addEventListener('input', () => { syncOutput(settings.sfx); audio.setSfxVolume(Number(settings.sfx.value) / 100); persistSetting('sfx', settings.sfx.value); });
settings.quality.addEventListener('change', () => persistSetting('quality', settings.quality.value));
settings.controls.addEventListener('change', () => persistSetting('controls', settings.controls.value));
settings.master.value = Math.round(audio.settings.master * 100); settings.music.value = Math.round(audio.settings.music * 100); settings.sfx.value = Math.round(audio.settings.sfx * 100); syncOutput(settings.master); syncOutput(settings.music); syncOutput(settings.sfx); settings.quality.value = localStorage.getItem('dlikarts.quality') ?? 'auto'; settings.controls.value = localStorage.getItem('dlikarts.controls') === 'screen' ? 'screen' : 'buttons';
