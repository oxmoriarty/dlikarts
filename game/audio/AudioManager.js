const MUSIC = {
  menu: new URL('../../assets/audio/music/menu.ogg', import.meta.url).href,
  race: new URL('../../assets/audio/music/race.ogg', import.meta.url).href,
  finalLap: new URL('../../assets/audio/music/race-final-lap.ogg', import.meta.url).href,
  results: new URL('../../assets/audio/music/results.ogg', import.meta.url).href,
};

const SFX = {
  engine: new URL('../../assets/audio/sfx/engine-loop.ogg', import.meta.url).href,
  drift: new URL('../../assets/audio/sfx/drift.ogg', import.meta.url).href,
  boost: new URL('../../assets/audio/sfx/boost.ogg', import.meta.url).href,
  collision: new URL('../../assets/audio/sfx/collision.ogg', import.meta.url).href,
  landing: new URL('../../assets/audio/sfx/landing.ogg', import.meta.url).href,
  countdown: new URL('../../assets/audio/sfx/countdown.ogg', import.meta.url).href,
  go: new URL('../../assets/audio/sfx/go.ogg', import.meta.url).href,
  powerupPickup: new URL('../../assets/audio/sfx/powerup-pickup.ogg', import.meta.url).href,
  powerupUse: new URL('../../assets/audio/sfx/powerup-use.ogg', import.meta.url).href,
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
  audio.preload = 'auto';
  audio.loop = loop;
  audio.volume = 0;
  audio._gain = 1;
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
    this.loops = { engine: makeAudio(SFX.engine, true), drift: makeAudio(SFX.drift, true) };
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
    Object.keys(SFX).filter(name => !['engine', 'drift'].includes(name)).forEach(name => this.createPool(name, name === 'collision' ? 2 : 3));
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
    this.pools.forEach(pool => pool.forEach(audio => { audio.volume = this.effective('sfx', audio._gain); }));
  }
  setMasterVolume(value) { this.settings.master = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setMusicVolume(value) { this.settings.music = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setSfxVolume(value) { this.settings.sfx = clamp(Number(value)); this.persist(); this.refreshVolumes(); }
  setMuted(muted = !this.settings.muted) { this.settings.muted = Boolean(muted); this.persist(); this.refreshVolumes(); }

  async unlock() {
    if (!this.context && (window.AudioContext || window.webkitAudioContext)) {
      const Context = window.AudioContext || window.webkitAudioContext;
      this.context = new Context();
    }
    try { if (this.context?.state === 'suspended') await this.context.resume(); } catch { /* A browser can still reject a non-gesture resume. */ }
    this.unlocked = true;
    if (!document.hidden && this.desiredMusic) this.playMusic(this.desiredMusic);
  }

  playElement(audio) { if (!this.unlocked || audio._failed || document.hidden) return; audio.play().catch(() => {}); }
  fade(audio, target, seconds = .35, bus = 'music', stopAtEnd = false) {
    const started = performance.now(); const initial = audio._gain;
    const tick = now => {
      const t = clamp((now - started) / (seconds * 1000));
      audio._gain = initial + (target - initial) * t; audio.volume = this.effective(bus, audio._gain);
      if (t < 1) requestAnimationFrame(tick);
      else if (stopAtEnd && target <= 0.001) { audio.pause(); audio.currentTime = 0; }
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
  stopMusic(seconds = .3) { if (!this.currentMusic) return; const audio = this.music[this.currentMusic]; this.fade(audio, 0, seconds, 'music', true); this.currentMusic = null; }

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
  setLoop(name, active, gain = 1) {
    const audio = this.loops[name]; if (!audio || !this.unlocked) return;
    if (active) { audio._gain = clamp(gain); audio.volume = this.effective('sfx', audio._gain); this.playElement(audio); }
    else if (!audio.paused) this.fade(audio, 0, .12, 'sfx', true);
  }
  reportCollision(strength) { this.pendingCollision = Math.max(this.pendingCollision, strength); }
  consumeGameplayEvents(powerups, player) {
    for (const event of powerups.consumeEvents?.() || []) {
      if (event.racer !== player) continue;
      if (event.type === 'pickup') this.playSfx('powerupPickup', { gain: .72, cooldown: 90 });
      if (event.type === 'use') this.playSfx('powerupUse', { gain: event.powerup === 'RATTLE POD' ? .82 : .66, rate: event.powerup === 'ZIPCAP' ? 1.12 : 1, cooldown: 110 });
    }
  }
  updateEngine(kart, input, dt, active) {
    if (!active) { this.engineGain = approach(this.engineGain, 0, 10, dt); this.setLoop('engine', false); return; }
    const speed = clamp(Math.abs(kart.speed) / Math.max(1, kart.tuning.maxSpeed));
    const throttle = clamp(Math.max(input?.throttle || 0, kart.boostTimer > 0 ? .75 : 0));
    const targetRate = .72 + speed * .56 + throttle * .12;
    const targetGain = (.15 + speed * .18 + throttle * .16) * (kart.airborne ? .82 : 1);
    this.engineRate = approach(this.engineRate, targetRate, 7, dt); this.engineGain = approach(this.engineGain, targetGain, 8, dt);
    const engine = this.loops.engine; engine.playbackRate = clamp(this.engineRate, .72, 1.4); this.setLoop('engine', true, this.engineGain);
  }
  update(game, input, dt) {
    if (!game) return;
    const { race, player, powerups } = game; const kart = player.kart;
    this.consumeGameplayEvents(powerups, player);
    if (this.lastRaceState !== race.state) {
      if (race.state === 'COUNTDOWN') this.stopMusic(.18);
      if (race.state === 'RACING') { this.playSfx('go', { gain: .9, cooldown: 300 }); this.playMusic('race', .42); }
      if (race.state === 'PLAYER_FINISHED' && !this.finishTriggered) { this.finishTriggered = true; this.playSfx('raceFinish', { gain: .92 }); this.setLoop('engine', false); this.setLoop('drift', false); }
      if (race.state === 'RESULTS') { this.setLoop('engine', false); this.setLoop('drift', false); this.playMusic('results', .6); }
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
    if (this.pendingCollision > 3) this.playSfx('collision', { gain: clamp(this.pendingCollision / 17, .3, .9), rate: .94 + Math.random() * .1, cooldown: 150 });
    this.pendingCollision = 0;
    this.updateEngine(kart, input, dt, race.state === 'RACING');
  }
  handleVisibility() {
    if (document.hidden) {
      this.pausedForVisibility = true;
      Object.values(this.music).forEach(audio => audio.pause()); Object.values(this.loops).forEach(audio => audio.pause());
    } else if (this.pausedForVisibility) {
      this.pausedForVisibility = false;
      if (this.unlocked && this.currentMusic) this.playElement(this.music[this.currentMusic]);
    }
  }
  getDebug() { return { music: this.currentMusic || 'silent', context: this.context?.state || 'not-created', master: Math.round(this.settings.master * 100), musicVolume: Math.round(this.settings.music * 100), sfx: Math.round(this.settings.sfx * 100), engineRate: this.engineRate.toFixed(2), engineGain: this.engineGain.toFixed(2), drift: !this.loops.drift.paused, voices: [...this.pools.values()].reduce((sum, pool) => sum + pool.filter(audio => !audio.paused).length, 0) }; }
}
