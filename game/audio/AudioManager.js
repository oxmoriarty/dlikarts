import { GaplessMotor, seamlessMotorBuffer } from './GaplessMotor.js';
const MUSIC = {
  menu: new URL('../../assets/audio/music/menu.ogg', import.meta.url).href,
  race: new URL('../../assets/audio/music/race.ogg', import.meta.url).href,
  finalLap: new URL('../../assets/audio/music/race-final-lap.ogg', import.meta.url).href,
  results: new URL('../../assets/audio/music/results.ogg', import.meta.url).href,
};

const SFX = {
  engine: new URL('../../assets/audio/sfx/engine-loop.wav', import.meta.url).href,
  drift: new URL('../../assets/audio/sfx/kart-drift.wav', import.meta.url).href,
  boost: new URL('../../assets/audio/sfx/kart-boost.wav', import.meta.url).href,
  collision: new URL('../../assets/audio/sfx/kart-impact.wav', import.meta.url).href,
  landing: new URL('../../assets/audio/sfx/kart-landing.wav', import.meta.url).href,
  countdown: new URL('../../assets/audio/sfx/countdown.ogg', import.meta.url).href,
  go: new URL('../../assets/audio/sfx/go.ogg', import.meta.url).href,
  powerupPickup: new URL('../../assets/audio/sfx/kart-pickup.wav', import.meta.url).href,
  shield: new URL('../../assets/audio/sfx/kart-shield.wav', import.meta.url).href,
  projectile: new URL('../../assets/audio/sfx/kart-missile.wav', import.meta.url).href,
  victory: new URL('../../assets/audio/sfx/kart-victory.wav', import.meta.url).href,
  lapComplete: new URL('../../assets/audio/sfx/lap-complete.ogg', import.meta.url).href,
  raceFinish: new URL('../../assets/audio/sfx/race-finish.ogg', import.meta.url).href,
  uiSelect: new URL('../../assets/audio/sfx/kart-click.wav', import.meta.url).href,
  uiBack: new URL('../../assets/audio/sfx/kart-back.wav', import.meta.url).href,
};

const STORAGE_KEY = 'dlikarts.audio.v1';
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const approach = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * dt));

function makeAudio(url, loop = false) {
  const audio = new Audio(url);
  // Loading dozens of full sound buffers during boot can starve music decoding
  // on mobile browsers. Metadata is enough until a sound is actually needed.
  audio.preload = 'metadata';
  audio.loop = loop;
  audio.volume = 0;
  audio._gain = 1;
  audio._fadeToken = 0;
  audio._stopping = false;
  audio._wanted = false;
  audio.addEventListener('error', () => { audio._failed = true; }, { once: true });
  return audio;
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored) return { master: clamp(stored.master ?? .9), music: clamp(stored.music ?? .7), sfx: clamp(stored.sfx ?? .8), muted: Boolean(stored.muted) };
    // Preserve preferences saved by the existing landing page before the audio
    // pass without forcing users to reset their sliders.
    return { master: .9, music: clamp((Number(localStorage.getItem('dlikarts.music')) || 70) / 100), sfx: clamp((Number(localStorage.getItem('dlikarts.sfx')) || 80) / 100), muted: false };
  } catch { return { master: .9, music: .7, sfx: .8, muted: false }; }
}

export class AudioManager {
  constructor() {
    this.settings = loadSettings();
    this.context = null;
    this.soundBuffers = new Map();
    this.unlocked = false;
    this.desiredMusic = null;
    this.currentMusic = null;
    this.music = Object.fromEntries(Object.entries(MUSIC).map(([name, url]) => [name, makeAudio(url, true)]));
    this.loops = { drift: new GaplessMotor(this, 'drift') };
    // Each active kart owns an engine loop. CPU voices are spatially
    // approximated with distance gain rather than expensive WebAudio panners.
    this.engineVoices = new Map();
    this.pools = new Map();
    this.cooldowns = new Map();
    this.activeFades = new Set();
    this.lastRaceState = null;
    this.lastCountdown = null;
    this.lastLap = 0;
    this.lastDrift = false;
    this.lastBoost = 0;
    this.lastAirborne = false;
    this.lastVerticalSpeed = 0;
    this.finalLapTriggered = false;
    this.finishTriggered = false;
    this.engineRate = .72;
    this.engineGain = 0;
    this.driftGain = 0;
    this.pendingCollision = 0;
    this.pausedForVisibility = false;
    this.gameplayPaused = false;
    Object.keys(SFX).filter(name => !['engine', 'drift'].includes(name)).forEach(name => this.createPool(name, name === 'collision' ? 2 : 3));
    document.addEventListener('visibilitychange', () => this.handleVisibility());
    // iOS can interrupt the context again after switching apps. A later touch
    // must be able to resume it even after the original first-tap unlock.
    const resumeOnGesture = () => { if (!this.unlocked || this.context?.state !== 'running') void this.unlock(); };
    document.addEventListener('pointerdown', resumeOnGesture, { passive: true });
    document.addEventListener('keydown', resumeOnGesture);
  }

  createPool(name, count) { this.pools.set(name, Array.from({ length: count }, () => new GaplessMotor(this, name, false))); }
  persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* Private browsing may deny storage. */ } }
  effective(bus, gain = 1) { return this.settings.muted ? 0 : clamp(this.settings.master * this.settings[bus] * gain); }
  refreshVolumes() {
    Object.values(this.music).forEach(audio => { audio.volume = this.effective('music', audio._gain); });
    Object.values(this.loops).forEach(audio => { audio.volume = this.effective('sfx', audio._gain); });
    this.engineVoices.forEach(voice => {
      voice.engine.volume = this.effective('sfx', voice.engine._gain);
    });
    this.pools.forEach(pool => pool.forEach(audio => { audio.volume = this.effective('sfx', audio._gain); }));
  }
  setMasterVolume(value) { this.settings.master = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setMusicVolume(value) { this.settings.music = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setSfxVolume(value) { this.settings.sfx = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setMuted(muted = !this.settings.muted) { this.settings.muted = Boolean(muted); this.persist(); this.refreshVolumes(); }
  setGameplayPaused(paused) {
    this.gameplayPaused = Boolean(paused);
    if (this.gameplayPaused) {
      Object.values(this.music).forEach(audio => audio.pause());
      Object.values(this.loops).forEach(audio => audio.pause());
      this.pools.forEach(pool => pool.forEach(audio => audio.pause()));
      this.engineVoices.forEach(voice => voice.engine.pause());
      return;
    }
    if (!this.unlocked || document.hidden) return;
    if (this.currentMusic) this.playElement(this.music[this.currentMusic]);
    Object.values(this.loops).forEach(audio => { if (audio._wanted) this.playElement(audio); });
    this.engineVoices.forEach(voice => { if (voice.engine._wanted) this.playElement(voice.engine); });
  }

  async unlock() {
    if (!this.context && (window.AudioContext || window.webkitAudioContext)) {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.context = new Context();
    }
    this.unlocked = true;
    try { if (this.context && !['running','closed'].includes(this.context.state)) await this.context.resume(); } catch { /* A browser can still reject a non-gesture resume. */ }
    // Decode once on the race page, not on every menu interaction or kart.
    if (document.querySelector?.('#game') && !this.raceAudioPrepared) {
      this.raceAudioPrepared = true;
      await Promise.all(Object.keys(SFX).map(name => this.prepareSound(name)));
    }
    if (!document.hidden && this.desiredMusic) this.playMusic(this.desiredMusic);
  }

  async prepareSound(name) {
    if (!this.context?.decodeAudioData) return null;
    if (!this.soundBuffers.has(name)) this.soundBuffers.set(name, fetch(SFX[name])
      .then(response => { if (!response.ok) throw new Error('Motor asset unavailable'); return response.arrayBuffer(); })
      .then(bytes => this.context.decodeAudioData(bytes))
      .then(buffer => ['engine', 'drift'].includes(name) ? seamlessMotorBuffer(this.context, buffer) : buffer)
      .catch(() => null));
    return this.soundBuffers.get(name);
  }

  playElement(audio) { if (!this.unlocked || this.gameplayPaused || audio._failed || document.hidden || !audio.paused) return; audio.play().catch(() => {}); }
  fade(audio, target, seconds = .35, bus = 'music', stopAtEnd = false) {
    const token = ++audio._fadeToken;
    const started = performance.now(); const initial = audio._gain;
    const tick = now => {
      if (token !== audio._fadeToken) return;
      const t = clamp((now - started) / (seconds * 1000));
      audio._gain = initial + (target - initial) * t; audio.volume = this.effective(bus, audio._gain);
      if (t < 1) requestAnimationFrame(tick);
      else if (stopAtEnd && target <= 0.001) { audio.pause(); audio.currentTime = 0; audio._stopping = false; }
    };
    requestAnimationFrame(tick);
  }
  playMusic(name, seconds = .55) {
    this.desiredMusic = name;
    if (!this.unlocked || !this.music[name]) return;
    const next = this.music[name];
    if (this.currentMusic === name && !next.paused) return;
    const previous = this.currentMusic ? this.music[this.currentMusic] : null;
    // The supplied final-lap mix is an alternate race cue. Mirroring the
    // current playback position where metadata is ready avoids a needless
    // musical restart, while the short crossfade masks imperfect alignment.
    if (name === 'finalLap' && previous && Number.isFinite(next.duration) && next.duration > 0) next.currentTime = previous.currentTime % next.duration;
    next._gain = 0; next.volume = 0; this.playElement(next); this.fade(next, 1, seconds, 'music');
    if (previous && previous !== next) this.fade(previous, 0, seconds, 'music', true);
    this.currentMusic = name;
  }
  stopMusic(seconds = .3, clearDesired = true) {
    // A late first key press can unlock browser audio. Clear the requested
    // menu cue as well as the active element so that unlock cannot resurrect
    // menu music on top of the countdown/race music.
    if (clearDesired) this.desiredMusic = null;
    if (!this.currentMusic) return;
    const audio = this.music[this.currentMusic];
    this.fade(audio, 0, seconds, 'music', true);
    this.currentMusic = null;
  }

  playSfx(name, { gain = 1, rate = 1, cooldown = 0 } = {}) {
    if (!this.unlocked || document.hidden || this.gameplayPaused || !this.pools.has(name)) return false;
    if (['uiSelect', 'uiBack'].includes(name) && ['COUNTDOWN', 'RACING', 'PLAYER_FINISHED'].includes(this.lastRaceState)) return false;
    const now = performance.now();
    if (now < (this.cooldowns.get(name) || 0)) return false;
    this.cooldowns.set(name, now + cooldown);
    const pool = this.pools.get(name);
    const audio = pool.find(item => item.paused || item.ended) || pool.reduce((oldest, item) => item.currentTime > oldest.currentTime ? item : oldest);
    audio.pause(); audio.currentTime = 0; audio.playbackRate = clamp(rate, .72, 1.38); audio._gain = clamp(gain); audio.volume = this.effective('sfx', audio._gain);
    this.playElement(audio); return true;
  }
  setAudioLoop(audio, active, gain = 1) {
    if (!audio || !this.unlocked) return;
    if (active) {
      // Updating pitch/gain every simulation tick must not restart the media
      // element or leave old fade callbacks fighting the current value.
      audio._fadeToken += 1; audio._stopping = false; audio._wanted = true; audio._gain = clamp(gain); audio.volume = this.effective('sfx', audio._gain); this.playElement(audio);
    } else if (!audio.paused && !audio._stopping) { audio._stopping = true; this.fade(audio, 0, .06, 'sfx', true); }
    if (!active) audio._wanted = false;
  }
  setLoop(name, active, gain = 1) { this.setAudioLoop(this.loops[name], active, gain); }
  reportCollision(strength) { this.pendingCollision = Math.max(this.pendingCollision, strength); }
  consumeGameplayEvents(powerups, player) {
    for (const event of powerups.consumeEvents?.() || []) {
      if (event.racer !== player) continue;
      if (event.type === 'pickup') this.playSfx('powerupPickup', { gain: .72, cooldown: 90 });
      if (event.type === 'use') {
        // Each item has a purpose-specific cue: Zipcap is propulsion, Halo
        // Guard is an energy shield, and Battle Pod is a forward missile.
        if (event.powerup === 'ZIPCAP') this.playSfx('boost', { gain: .64, rate: 1.06, cooldown: 110 });
        else if (event.powerup === 'HALO GUARD') this.playSfx('shield', { gain: .66, cooldown: 110 });
        else this.playSfx('projectile', { gain: .7, cooldown: 110 });
      }
    }
  }
  getEngineVoice(racer) {
    let voice = this.engineVoices.get(racer.id);
    if (!voice) {
      voice = { engine: new GaplessMotor(this), rate: .82, gain: 0 };
      this.engineVoices.set(racer.id, voice);
    }
    return voice;
  }
  updateEngineVoice(racer, player, input, dt, raceActive) {
    const voice = this.getEngineVoice(racer); const { kart } = racer;
    const moving = Math.abs(kart.speed) > .05 && !racer.retired;
    if (!raceActive || !moving) {
      this.setAudioLoop(voice.engine, false);
      if (racer === player) { this.engineGain = 0; this.engineRate = .72; }
      return;
    }
    const speed = clamp(Math.abs(kart.speed) / Math.max(1, kart.tuning.maxSpeed));
    const throttle = input?.brake > 0 ? 0 : clamp(Math.max(input?.throttle || 0, kart.boostTimer > 0 ? .75 : 0));
    const reversing = kart.speed < -.28;
    // The same motor continues while coasting or reversing. Acceleration
    // raises its pitch and gain; deceleration smoothly drops them instead of
    // stopping/restarting the sound between input changes.
    const targetRate = reversing ? .78 + speed * .16 : .86 + speed * .24 + throttle * .12;
    const playerGain = (.14 + speed * .36 + throttle * .18) * clamp(Math.abs(kart.speed) / .65) * (kart.airborne ? .82 : 1);
    let distanceGain = 1;
    if (racer !== player) {
      const distance = kart.position.distanceTo(player.kart.position);
      distanceGain = .3 * Math.pow(clamp(1 - distance / 30), 2);
    }
    voice.rate = approach(voice.rate, targetRate, 7, dt);
    voice.gain = approach(voice.gain, playerGain * distanceGain, 8, dt);
    voice.engine.playbackRate = clamp(voice.rate, .58, 1.42);
    this.setAudioLoop(voice.engine, true, voice.gain);
    // Reverse uses the same continuous motor in a lower rev range, not a
    // distracting reversing alarm layered over every kart.
    if (racer === player) { this.engineRate = voice.rate; this.engineGain = voice.gain; }
  }
  updateEngines(game, playerInput, dt) {
    const raceActive = game.race.state === 'RACING' || game.race.state === 'PLAYER_FINISHED';
    game.racers.forEach(racer => this.updateEngineVoice(racer, game.player, racer === game.player ? playerInput : racer.lastActions, dt, raceActive));
  }
  update(game, input, dt) {
    if (!game || this.gameplayPaused) return;
    const { race, player, powerups } = game; const kart = player.kart;
    this.consumeGameplayEvents(powerups, player);
    // Finish order is authoritative. The race can go straight to RESULTS if
    // the last active racer finishes; don't depend on seeing an interim state.
    if (!this.finishTriggered && player.finishOrder > 0 && kart.finished) {
      this.finishTriggered = true;
      this.playSfx(player.finishOrder === 1 ? 'victory' : 'raceFinish', { gain: .82 });
      this.setLoop('drift', false);
    }
    if (this.lastRaceState !== race.state) {
      if (race.state === 'COUNTDOWN') this.stopMusic(.18);
      if (race.state === 'RACING') { this.playSfx('go', { gain: .9, cooldown: 300 }); this.playMusic('race', .42); }
      if (race.state === 'RESULTS') { this.engineVoices.forEach(voice => this.setAudioLoop(voice.engine, false)); this.setLoop('drift', false); this.playMusic('results', .6); }
      this.lastRaceState = race.state;
    }
    const countdown = race.displayCountdown;
    if (race.state === 'COUNTDOWN' && countdown !== this.lastCountdown && Number.isInteger(countdown) && countdown >= 1 && countdown <= 3) this.playSfx('countdown', { gain: .7, cooldown: 240 });
    this.lastCountdown = countdown;
    if (player.lap !== this.lastLap) {
      if (player.lap > 0 && player.lap < 3) this.playSfx('lapComplete', { gain: .78 });
      this.lastLap = player.lap;
    }
    if (!this.finalLapTriggered && player.lap >= 2 && race.state !== 'RESULTS') { this.finalLapTriggered = true; this.playMusic('finalLap', .7); }
    if (!this.lastDrift && kart.drift) this.setLoop('drift', true, .24);
    if (this.lastDrift && !kart.drift) this.setLoop('drift', false);
    if (kart.drift) { this.driftGain = approach(this.driftGain, .16 + clamp(kart.driftCharge / 2.1) * .16, 6, dt); this.setLoop('drift', true, this.driftGain); }
    this.lastDrift = kart.drift;
    if (kart.boostTimer > this.lastBoost + .08) this.playSfx('boost', { gain: .6, cooldown: 120 });
    this.lastBoost = kart.boostTimer;
    if (this.lastAirborne && !kart.airborne && this.lastVerticalSpeed < -3) this.playSfx('landing', { gain: clamp(Math.abs(this.lastVerticalSpeed) / 12, .35, .9), cooldown: 180 });
    this.lastAirborne = kart.airborne; this.lastVerticalSpeed = kart.verticalSpeed;
    // Track-edge impacts are emitted by the arcade controller only when it
    // actually corrects a kart back inside the playable road bounds.
    if (kart.wallImpact > 0) { this.reportCollision(kart.wallImpact); kart.wallImpact = 0; }
    if (this.pendingCollision > 3) this.playSfx('collision', { gain: clamp(this.pendingCollision / 17, .3, .9), rate: .94 + Math.random() * .1, cooldown: 150 });
    this.pendingCollision = 0;
    this.updateEngines(game, input, dt);
  }
  handleVisibility() {
    if (document.hidden) {
      this.pausedForVisibility = true;
      Object.values(this.music).forEach(audio => audio.pause()); Object.values(this.loops).forEach(audio => audio.pause());
      this.pools.forEach(pool => pool.forEach(audio => audio.pause()));
      this.engineVoices.forEach(voice => voice.engine.pause());
    } else if (this.pausedForVisibility) {
      this.pausedForVisibility = false;
      if (this.gameplayPaused) return;
      if (this.context && !['running','closed'].includes(this.context.state)) void this.context.resume().catch(() => {});
      if (this.unlocked && this.currentMusic) this.playElement(this.music[this.currentMusic]);
      Object.values(this.loops).forEach(audio => { if (audio._wanted) this.playElement(audio); });
      this.engineVoices.forEach(voice => { if (voice.engine._wanted) this.playElement(voice.engine); });
    }
  }
  getDebug() { return { music: this.currentMusic || 'silent', context: this.context?.state || 'not-created', master: Math.round(this.settings.master * 100), musicVolume: Math.round(this.settings.music * 100), sfx: Math.round(this.settings.sfx * 100), engineRate: this.engineRate.toFixed(2), engineGain: this.engineGain.toFixed(2), engines: [...this.engineVoices.values()].filter(voice => !voice.engine.paused).length, drift: !this.loops.drift.paused, voices: [...this.pools.values()].reduce((sum, pool) => sum + pool.filter(audio => !audio.paused).length, 0) }; }
}
