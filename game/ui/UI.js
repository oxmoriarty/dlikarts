export class UI {
  constructor() {
    this.loading = document.querySelector('#loading'); this.countdown = document.querySelector('#countdown'); this.position = document.querySelector('#position'); this.lap = document.querySelector('#lap'); this.lapBanner = document.querySelector('#lap-banner'); this.time = document.querySelector('#time'); this.item = document.querySelector('#item'); this.touchItem = document.querySelector('#touch-item'); this.drift = document.querySelector('#drift'); this.warning = document.querySelector('#warning'); this.results = document.querySelector('#results'); this.debug = document.querySelector('#debug'); this.lastLapAnnouncement = 0; this.lastTouchItem = undefined;
    document.querySelector('#retry').addEventListener('click', () => { this.audio?.playSfx('uiSelect', { gain: .42, cooldown: 90 }); location.reload(); }); document.querySelector('#quality').addEventListener('change', event => { this.audio?.playSfx('uiSelect', { gain: .34, cooldown: 60 }); this.onQuality?.(event.target.value); });
  }
  bindAudio(audio) {
    this.audio = audio;
    const groups = [
      { master: document.querySelector('#master-volume'), music: document.querySelector('#music-volume'), sfx: document.querySelector('#sfx-volume') },
      { master: document.querySelector('#race-master-volume'), music: document.querySelector('#race-music-volume'), sfx: document.querySelector('#race-sfx-volume') },
    ].filter(group => group.master && group.music && group.sfx);
    if (!groups.length) return;
    const sync = () => groups.forEach(group => Object.entries({ master: audio.settings.master, music: audio.settings.music, sfx: audio.settings.sfx }).forEach(([name, value]) => {
      group[name].value = Math.round(value * 100);
      const output = document.querySelector(`output[for="${group[name].id}"]`);
      if (output) output.textContent = `${group[name].value}%`;
    }));
    const update = (name, setter) => groups.forEach(group => group[name].addEventListener('input', async event => {
      await audio.unlock(); setter.call(audio, Number(event.target.value) / 100); sync(); this.audio?.playSfx('uiSelect', { gain: .22, cooldown: 70 });
    }));
    sync(); update('master', audio.setMasterVolume); update('music', audio.setMusicVolume); update('sfx', audio.setSfxVolume);
  }
  hideLoading() { this.loading.classList.add('gone'); }
  updateTouchItem(item) {
    if (!this.touchItem || item === this.lastTouchItem) return;
    this.lastTouchItem = item;
    const icons = {
      // These are the 2D HUD forms of the actual pickup models: Zipcap's
      // twin cyan blades, Halo Guard's cobalt mascot orb, and Battle Pod's
      // purple ringed pod.
      ZIPCAP: '<svg class="powerup-art" viewBox="0 0 100 100" aria-hidden="true"><path fill="#8deeff" d="M16 48 40 24 87 13 55 47 33 57Z"/><path fill="#8deeff" d="M13 87 46 55 67 44 54 76 29 92Z"/><path fill="#07131d" d="m50 39 12 12-12 12-12-12Z"/><path d="m50 35 16 16-16 16-16-16Z" fill="none" stroke="#8deeff" stroke-width="5"/></svg>',
      'HALO GUARD': '<svg class="powerup-art" viewBox="0 0 100 100" aria-hidden="true"><path d="m27 49-17-12m17 19L10 68" fill="none" stroke="#155cff" stroke-width="9" stroke-linecap="round"/><circle cx="50" cy="53" r="30" fill="#155cff"/><ellipse cx="50" cy="57" rx="23" ry="18" fill="#06133f"/><path fill="#e9f6ff" d="m35 49 8-8 8 8-8 8zm14 0 8-8 8 8-8 8z"/><path fill="#06133f" d="m39 48 4-4 4 4-4 4zm14 0 4-4 4 4-4 4z"/></svg>',
      'RATTLE POD': '<svg class="powerup-art" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="27" fill="#5e175d"/><circle cx="50" cy="50" r="37" fill="none" stroke="#ff4fcc" stroke-width="6"/><circle cx="50" cy="50" r="31" fill="none" stroke="#ff81da" stroke-width="3" transform="rotate(45 50 50)"/><path fill="#e9f6ff" d="m36 46 7-7 7 7-7 7zm14 0 7-7 7 7-7 7z"/><path fill="#06133f" d="m40 45 3-3 3 3-3 3zm14 0 3-3 3 3-3 3z"/></svg>',
    };
    this.touchItem.dataset.powerup = item || 'EMPTY';
    this.touchItem.classList.toggle('empty', !item);
    this.touchItem.setAttribute('aria-disabled', String(!item));
    this.touchItem.setAttribute('aria-label', item ? `Use ${item}` : 'No power-up available');
    this.touchItem.innerHTML = item ? icons[item] : '';
  }
  update(race, player, metrics, audioDebug = null) {
    const racer = player; this.position.textContent = `${racer.position}${['','ST','ND','RD','TH','TH','TH'][racer.position] || 'TH'} / ${race.racers.length}`; this.lap.textContent = `LAP ${Math.min(racer.lap + 1, 3)} / 3`; this.time.textContent = formatTime(race.time); this.item.textContent = racer.kart.item || '—'; this.updateTouchItem(racer.kart.item);
    const tier = racer.kart.tuning.driftTiers.filter(t => racer.kart.driftCharge >= t.seconds).at(-1); this.drift.textContent = racer.kart.boostTimer > 0 ? 'BOOST!' : racer.kart.drift ? (tier?.name || 'DRIFT') : 'READY'; this.drift.style.setProperty('--charge', `${Math.min(1, racer.kart.driftCharge / 2.1)}`);
    this.countdown.textContent = race.displayCountdown; this.countdown.classList.toggle('show', Boolean(race.displayCountdown)); this.warning.textContent = racer.wrongWay ? 'WRONG WAY' : ''; this.debug.textContent = `FPS ${metrics.fps} · ${metrics.ms}ms · ${metrics.calls} calls · ${Math.round(metrics.triangles / 1000)}k tris\n${metrics.geometries} geo · ${metrics.textures} tex · ${Math.round(player.kart.speed * 3.6)} km/h · ${player.kart.drift ? 'DRIFT' : 'GRIP'} · CP ${player.nextGate}/7${audioDebug ? `\nAUDIO ${audioDebug.music} · ${audioDebug.context} · E ${audioDebug.engineRate} · ${audioDebug.voices} voices` : ''}`;
    if (race.lapAnnouncement && race.lapAnnouncement.serial !== this.lastLapAnnouncement) {
      this.lastLapAnnouncement = race.lapAnnouncement.serial;
      this.lapBanner.textContent = `LAP ${race.lapAnnouncement.lap} / ${race.lapAnnouncement.total}`;
      // Force the concise notification animation to restart each lap.
      this.lapBanner.classList.remove('show'); void this.lapBanner.offsetWidth; this.lapBanner.classList.add('show');
    }
    if (race.state === 'RESULTS') { this.results.classList.add('show'); document.querySelector('#result-place').textContent = `${racer.position}${['','ST','ND','RD','TH','TH','TH'][racer.position] || 'TH'} PLACE`; document.querySelector('#result-time').textContent = formatTime(race.time); document.querySelector('#result-best').textContent = racer.bestLap ? formatTime(racer.bestLap) : '—'; }
  }
}
function formatTime(seconds) { const mins = Math.floor(seconds / 60); return `${mins}:${(seconds % 60).toFixed(2).padStart(5,'0')}`; }
