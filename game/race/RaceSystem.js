import { compareRacers, nearProgress } from './raceMath.js';
import { LAPS } from '../config/game-config.js';

export class RaceSystem {
  constructor(racers, track) {
    this.racers = racers; this.track = track; this.state = 'COUNTDOWN'; this.countdown = 3.8; this.goTimer = 0; this.time = 0; this.finishCount = 0; this.resultsTimer = 0;
    racers.forEach(racer => Object.assign(racer, { lap: 0, nextGate: 1, position: 1, finishOrder: 0, lapStart: 0, lapTimes: [], bestLap: 0, wrongWayTime: 0, wrongWay: false, previousProgress: racer.kart.progress, finishExitTimer: 0, retired: false }));
  }
  update(dt) {
    if (this.state === 'READY') return;
    if (this.state === 'COUNTDOWN') { this.countdown -= dt; if (this.countdown <= 0) { this.state = 'RACING'; this.countdown = 0; this.goTimer = .75; } return; }
    if (this.state === 'RESULTS') return;
    this.time += dt; this.goTimer = Math.max(0, this.goTimer - dt);
    for (const racer of this.racers) this.updateRacer(racer, dt);
    this.racers.sort(compareRacers).forEach((racer, index) => racer.position = index + 1);
    if (this.state === 'PLAYER_FINISHED') { this.resultsTimer += dt; if (this.resultsTimer > 3.6 || this.finishCount === this.racers.length) this.state = 'RESULTS'; }
  }
  updateRacer(racer, dt) {
    const kart = racer.kart;
    // A finished kart's score is locked. It remains in `racers` so results
    // and finish order are retained, but it cannot collect another lap.
    if (kart.finished) { racer.wrongWay = false; return; }
    const delta = kart.progress - racer.previousProgress; const wrapped = delta > .5 ? delta - 1 : delta < -.5 ? delta + 1 : delta;
    racer.wrongWayTime = wrapped < -.0007 && Math.abs(kart.speed) > 3 ? racer.wrongWayTime + dt : Math.max(0, racer.wrongWayTime - dt * 2);
    racer.wrongWay = racer.wrongWayTime > 1.25; racer.previousProgress = kart.progress;
    const target = this.track.checkpoints[racer.nextGate];
    if (nearProgress(kart.progress, target) && Math.abs(this.track.query(kart.position, kart.progress).lateral) < this.track.width * .62) {
      if (racer.nextGate === 0) {
        racer.lap += 1; const lapTime = this.time - racer.lapStart; racer.lapStart = this.time; racer.lapTimes.push(lapTime); racer.bestLap = racer.bestLap ? Math.min(racer.bestLap, lapTime) : lapTime;
        racer.nextGate = 1;
        if (racer.lap >= LAPS && !racer.finishOrder) {
          racer.finishOrder = ++this.finishCount;
          kart.finished = true;
          // Finished karts are immediately ghosts to active racers. The main
          // loop then briefly leaves CPU visuals visible before retiring them.
          kart.item = null;
          kart.guardTimer = 0;
          if (racer.player) { this.state = 'PLAYER_FINISHED'; this.resultsTimer = 0; }
        }
      } else racer.nextGate = (racer.nextGate + 1) % this.track.checkpoints.length;
    }
  }
  get displayCountdown() { return this.state === 'COUNTDOWN' ? Math.max(0, Math.ceil(this.countdown)) : this.goTimer > 0 ? 'GO!' : ''; }
}
