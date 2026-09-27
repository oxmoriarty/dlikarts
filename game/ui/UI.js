export class UI {
  constructor() {
    this.loading = document.querySelector('#loading'); this.countdown = document.querySelector('#countdown'); this.position = document.querySelector('#position'); this.lap = document.querySelector('#lap'); this.lapBanner = document.querySelector('#lap-banner'); this.time = document.querySelector('#time'); this.item = document.querySelector('#item'); this.touchItem = document.querySelector('#touch-item'); this.drift = document.querySelector('#drift'); this.warning = document.querySelector('#warning'); this.results = document.querySelector('#results'); this.debug = document.querySelector('#debug'); this.lastLapAnnouncement = 0; this.lastTouchItem = null;
    document.querySelector('#retry').addEventListener('click', () => { this.audio?.playSfx('uiSelect', { gain: .42, cooldown: 90 }); location.reload(); }); document.querySelector('#quality').addEventListener('change', event => { this.audio?.playSfx('uiSelect', { gain: .34, cooldown: 60 }); this.onQuality?.(event.target.value); });
  }
  bindAudio(audio) {
    this.audio = audio;
    const controls = { master: document.querySelector('#master-volume'), music: document.querySelector('#music-volume'), sfx: document.querySelector('#sfx-volume'), mute: document.querySelector('#audio-mute') };
    if (!controls.master) return;
    controls.master.value = Math.round(audio.settings.master * 100); controls.music.value = Math.round(audio.settings.music * 100); controls.sfx.value = Math.round(audio.settings.sfx * 100); controls.mute.textContent = audio.settings.muted ? 'UNMUTE' : 'MUTE';
    const update = (name, setter) => controls[name].addEventListener('input', event => { setter.call(audio, Number(event.target.value) / 100); this.audio?.playSfx('uiSelect', { gain: .22, cooldown: 70 }); });
    update('master', audio.setMasterVolume); update('music', audio.setMusicVolume); update('sfx', audio.setSfxVolume);
    controls.mute.addEventListener('click', async () => { await audio.unlock(); audio.setMuted(); controls.mute.textContent = audio.settings.muted ? 'UNMUTE' : 'MUTE'; if (!audio.settings.muted) audio.playSfx('uiSelect', { gain: .3 }); });
  }
  hideLoading() { this.loading.classList.add('gone'); }
  updateTouchItem(item) {
    if (!this.touchItem || item === this.lastTouchItem) return;
    this.lastTouchItem = item;
    const icons = {
      ZIPCAP: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z" /><path d="M3 8H1m3 4H1m4 4H2" /></svg>',
      'HALO GUARD': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4" /><path d="M8.5 12h7m-5.5-2.5 1.8 2.5-1.8 2.5m4-5 1.8 2.5-1.8 2.5" /></svg>',
      'RATTLE POD': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.7" /><path d="m5.3 10-2.5-2m2.5 6-2.5 2M9.2 10.2l2.1 2.1m3.5-2.1-2.1 2.1m-2.4 3.2h3.4" /></svg>',
    };
    this.touchItem.dataset.powerup = item || 'EMPTY';
    this.touchItem.classList.toggle('empty', !item);
    this.touchItem.setAttribute('aria-disabled', String(!item));
    this.touchItem.setAttribute('aria-label', item ? `Use ${item}` : 'No power-up available');
    this.touchItem.innerHTML = icons[item] || icons.ZIPCAP;
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
