const MUSIC = {
  menu: new URL('../../assets/audio/music/menu.ogg', import.meta.url).href,
  race: new URL('../../assets/audio/music/race.ogg', import.meta.url).href,
  finalLap: new URL('../../assets/audio/music/race-final-lap.ogg', import.meta.url).href,
  results: new URL('../../assets/audio/music/results.ogg', import.meta.url).href,
};

const SFX = {
  engine: new URL('../../assets/audio/sfx/engine-loop.wav', import.meta.url).href,
  reverseAlert: new URL('../../assets/audio/sfx/reverse-alert.wav', import.meta.url).href,
  drift: new URL('../../assets/audio/sfx/drift.ogg', import.meta.url).href,
  boost: new URL('../../assets/audio/sfx/boost.ogg', import.meta.url).href,
  collision: new URL('../../assets/audio/sfx/collision.ogg', import.meta.url).href,
  landing: new URL('../../assets/audio/sfx/landing.ogg', import.meta.url).href,
  countdown: new URL('../../assets/audio/sfx/countdown.ogg', import.meta.url).href,
  go: new URL('../../assets/audio/sfx/go.ogg', import.meta.url).href,
  powerupPickup: new URL('../../assets/audio/sfx/powerup-pickup.ogg', import.meta.url).href,
  shield: new URL('../../assets/audio/sfx/shield.ogg', import.meta.url).href,
  projectile: new URL('../../assets/audio/sfx/projectile.ogg', import.meta.url).href,
  lapComplete: new URL('../../assets/audio/sfx/lap-complete.ogg', import.meta.url).href,
  raceFinish: new URL('../../assets/audio/sfx/race-finish.ogg', import.meta.url).href,
  uiSelect: new URL('../../assets/audio/sfx/ui-select.ogg', import.meta.url).href,
  uiBack: new URL('../../assets/audio/sfx/ui-back.ogg', import.meta.url).href,
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
    this.unlocked = false;
    this.desiredMusic = null;
    this.currentMusic = null;
    this.music = Object.fromEntries(Object.entries(MUSIC).map(([name, url]) => [name, makeAudio(url, true)]));
    this.loops = { drift: makeAudio(SFX.drift, true) };
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
    Object.keys(SFX).filter(name => !['engine', 'reverseAlert', 'drift'].includes(name)).forEach(name => this.createPool(name, name === 'collision' ? 2 : 3));
    document.addEventListener('visibilitychange', () => this.handleVisibility());
    document.addEventListener('pointerdown', () => this.unlock(), { once: true, passive: true });
    document.addEventListener('keydown', () => this.unlock(), { once: true });
  }

  createPool(name, count) { this.pools.set(name, Array.from({ length: count }, () => makeAudio(SFX[name]))); }
  persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* Private browsing may deny storage. */ } }
  effective(bus, gain = 1) { return this.settings.muted ? 0 : clamp(this.settings.master * this.settings[bus] * gain); }
  refreshVolumes() {
    Object.values(this.music).forEach(audio => { audio.volume = this.effective('music', audio._gain); });
    Object.values(this.loops).forEach(audio => { audio.volume = this.effective('sfx', audio._gain); });
    this.engineVoices.forEach(voice => {
      voice.engine.volume = this.effective('sfx', voice.engine._gain);
      voice.reverseAlert.volume = this.effective('sfx', voice.reverseAlert._gain);
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
      this.engineVoices.forEach(voice => { voice.engine.pause(); voice.reverseAlert.pause(); });
      return;
    }
    if (!this.unlocked || document.hidden) return;
    if (this.currentMusic) this.playElement(this.music[this.currentMusic]);
    Object.values(this.loops).forEach(audio => { if (audio._wanted) this.playElement(audio); });
    this.engineVoices.forEach(voice => { if (voice.engine._wanted) this.playElement(voice.engine); if (voice.reverseAlert._wanted) this.playElement(voice.reverseAlert); });
  }

  async unlock() {
    if (!this.context && (window.AudioContext || window.webkitAudioContext)) {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.context = new Context();
    }
    try { if (this.context?.state === 'suspended') await this.context.resume(); } catch { /* A browser can still reject a non-gesture resume. */ }
    this.unlocked = true;
    if (!document.hidden && this.desiredMusic) this.playMusic(this.desiredMusic);
  }

  playElement(audio) { if (!this.unlocked || audio._failed || document.hidden || !audio.paused) return; audio.play().catch(() => {}); }
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
    if (!this.unlocked || !this.pools.has(name)) return false;
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
    } else if (!audio.paused && !audio._stopping) { audio._stopping = true; this.fade(audio, 0, .12, 'sfx', true); }
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
        // Guard is an energy shield, and Rattle Pod is a forward projectile.
        if (event.powerup === 'ZIPCAP') this.playSfx('boost', { gain: .64, rate: 1.06, cooldown: 110 });
        else if (event.powerup === 'HALO GUARD') this.playSfx('shield', { gain: .66, cooldown: 110 });
        else this.playSfx('projectile', { gain: .7, cooldown: 110 });
      }
    }
  }
  getEngineVoice(racer) {
    let voice = this.engineVoices.get(racer.id);
    if (!voice) {
      voice = { engine: makeAudio(SFX.engine, true), reverseAlert: makeAudio(SFX.reverseAlert, true), rate: .72, gain: 0, reverseGain: 0 };
      this.engineVoices.set(racer.id, voice);
    }
    return voice;
  }
  updateEngineVoice(racer, player, input, dt, raceActive) {
    const voice = this.getEngineVoice(racer); const { kart } = racer;
    const moving = Math.abs(kart.speed) > .28 && !kart.finished && !racer.retired;
    if (!raceActive || !moving) {
      this.setAudioLoop(voice.engine, false); this.setAudioLoop(voice.reverseAlert, false);
      if (racer === player) { this.engineGain = 0; this.engineRate = .72; }
      return;
    }
    const speed = clamp(Math.abs(kart.speed) / Math.max(1, kart.tuning.maxSpeed));
    const throttle = clamp(Math.max(input?.throttle || 0, kart.boostTimer > 0 ? .75 : 0));
    const reversing = kart.speed < -.28;
    // The same motor continues while coasting or reversing. Acceleration
    // raises its pitch and gain; deceleration smoothly drops them instead of
    // stopping/restarting the sound between input changes.
    const targetRate = reversing ? .62 + speed * .26 : .70 + speed * .58 + throttle * .14;
    const playerGain = (reversing ? .18 + speed * .18 : .16 + speed * .24 + throttle * .18) * (kart.airborne ? .82 : 1);
    let distanceGain = 1;
    if (racer !== player) {
      const distance = kart.position.distanceTo(player.kart.position);
      distanceGain = .09 + .48 * Math.pow(clamp(1 - distance / 34), 1.35);
    }
    voice.rate = approach(voice.rate, targetRate, 7, dt);
    voice.gain = approach(voice.gain, playerGain * distanceGain, 8, dt);
    voice.engine.playbackRate = clamp(voice.rate, .58, 1.42);
    this.setAudioLoop(voice.engine, true, voice.gain);
    // A restrained vehicle reverse alert makes negative motion distinct while
    // the lower-pitched engine preserves continuous motor feedback.
    voice.reverseGain = approach(voice.reverseGain, reversing ? .18 * distanceGain : 0, 9, dt);
    this.setAudioLoop(voice.reverseAlert, reversing, voice.reverseGain);
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
    if (this.lastRaceState !== race.state) {
      if (race.state === 'COUNTDOWN') this.stopMusic(.18);
      if (race.state === 'RACING') { this.playSfx('go', { gain: .9, cooldown: 300 }); this.playMusic('race', .42); }
      if (race.state === 'PLAYER_FINISHED' && !this.finishTriggered) { this.finishTriggered = true; this.playSfx('raceFinish', { gain: .92 }); this.setLoop('drift', false); }
      if (race.state === 'RESULTS') { this.engineVoices.forEach(voice => { this.setAudioLoop(voice.engine, false); this.setAudioLoop(voice.reverseAlert, false); }); this.setLoop('drift', false); this.playMusic('results', .6); }
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
      this.engineVoices.forEach(voice => { voice.engine.pause(); voice.reverseAlert.pause(); });
    } else if (this.pausedForVisibility) {
      this.pausedForVisibility = false;
      if (this.unlocked && this.currentMusic) this.playElement(this.music[this.currentMusic]);
      this.engineVoices.forEach(voice => { if (voice.engine._wanted) this.playElement(voice.engine); if (voice.reverseAlert._wanted) this.playElement(voice.reverseAlert); });
    }
  }
  getDebug() { return { music: this.currentMusic || 'silent', context: this.context?.state || 'not-created', master: Math.round(this.settings.master * 100), musicVolume: Math.round(this.settings.music * 100), sfx: Math.round(this.settings.sfx * 100), engineRate: this.engineRate.toFixed(2), engineGain: this.engineGain.toFixed(2), engines: [...this.engineVoices.values()].filter(voice => !voice.engine.paused).length, drift: !this.loops.drift.paused, voices: [...this.pools.values()].reduce((sum, pool) => sum + pool.filter(audio => !audio.paused).length, 0) }; }
}
