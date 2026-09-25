export class UI {
  constructor() {
    this.loading = document.querySelector('#loading'); this.countdown = document.querySelector('#countdown'); this.position = document.querySelector('#position'); this.lap = document.querySelector('#lap'); this.time = document.querySelector('#time'); this.item = document.querySelector('#item'); this.drift = document.querySelector('#drift'); this.warning = document.querySelector('#warning'); this.results = document.querySelector('#results'); this.debug = document.querySelector('#debug');
    document.querySelector('#retry').addEventListener('click', () => location.reload()); document.querySelector('#quality').addEventListener('change', event => this.onQuality?.(event.target.value));
  }
  hideLoading() { this.loading.classList.add('gone'); }
  update(race, player, metrics) {
    const racer = player; this.position.textContent = `${racer.position}${['','ST','ND','RD','TH','TH','TH'][racer.position] || 'TH'} / ${race.racers.length}`; this.lap.textContent = `LAP ${Math.min(racer.lap + 1, 3)} / 3`; this.time.textContent = formatTime(race.time); this.item.textContent = racer.kart.item || '—';
    const tier = racer.kart.tuning.driftTiers.filter(t => racer.kart.driftCharge >= t.seconds).at(-1); this.drift.textContent = racer.kart.boostTimer > 0 ? 'BOOST!' : racer.kart.drift ? (tier?.name || 'DRIFT') : 'READY'; this.drift.style.setProperty('--charge', `${Math.min(1, racer.kart.driftCharge / 2.1)}`);
    this.countdown.textContent = race.displayCountdown; this.countdown.classList.toggle('show', Boolean(race.displayCountdown)); this.warning.textContent = racer.wrongWay ? 'WRONG WAY' : ''; this.debug.textContent = `FPS ${metrics.fps} · ${metrics.ms}ms · ${metrics.calls} calls\n${Math.round(player.kart.speed * 3.6)} km/h · ${player.kart.drift ? 'DRIFT' : 'GRIP'} · CP ${player.nextGate}/7`;
    if (race.state === 'RESULTS') { this.results.classList.add('show'); document.querySelector('#result-place').textContent = `${racer.position}${['','ST','ND','RD','TH','TH','TH'][racer.position] || 'TH'} PLACE`; document.querySelector('#result-time').textContent = formatTime(race.time); document.querySelector('#result-best').textContent = racer.bestLap ? formatTime(racer.bestLap) : '—'; }
  }
}
function formatTime(seconds) { const mins = Math.floor(seconds / 60); return `${mins}:${(seconds % 60).toFixed(2).padStart(5,'0')}`; }
