import test from 'node:test';
import assert from 'node:assert/strict';

class FakeAudio {
  constructor(src) { this.src = src; this.paused = true; this.ended = true; this.duration = 20; this.currentTime = 0; this.volume = 0; this.playbackRate = 1; this.loop = false; }
  addEventListener() {}
  play() { this.paused = false; this.ended = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

test('AudioManager follows race music states and persists bus preferences', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  globalThis.document = { hidden: false, addEventListener() {} };
  globalThis.window = { AudioContext: class { constructor() { this.state = 'running'; } resume() { return Promise.resolve(); } } };
  globalThis.Audio = FakeAudio;
  globalThis.requestAnimationFrame = callback => { queueMicrotask(() => callback(performance.now() + 1000)); return 0; };
  const { AudioManager } = await import('../audio/AudioManager.js');
  const audio = new AudioManager(); await audio.unlock(); audio.playMusic('menu');
  assert.equal(audio.currentMusic, 'menu');
  audio.stopMusic(0);
  assert.equal(audio.currentMusic, null);
  assert.equal(audio.desiredMusic, null);
  // A later first keyboard input must not bring menu music back over a race.
  await audio.unlock();
  assert.equal(audio.currentMusic, null);
  audio.playMusic('menu');
  const kart = { speed: 0, tuning: { maxSpeed: 20 }, drift: false, driftCharge: 0, boostTimer: 0, airborne: false, verticalSpeed: 0 };
  const game = { race: { state: 'RACING', displayCountdown: 'GO!' }, player: { lap: 0, kart }, powerups: { consumeEvents: () => [] } };
  audio.update(game, { throttle: 1 }, 1 / 60); assert.equal(audio.currentMusic, 'race');
  game.player.lap = 2; audio.update(game, { throttle: 1 }, 1 / 60); assert.equal(audio.currentMusic, 'finalLap');
  game.race.state = 'RESULTS'; audio.update(game, { throttle: 0 }, 1 / 60); assert.equal(audio.currentMusic, 'results');
  audio.setMasterVolume(.4); assert.equal(JSON.parse(store.get('dlikarts.audio.v1')).master, .4);
});

test('AudioManager maps each implemented power-up to a purpose-specific effect', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  globalThis.document = { hidden: false, addEventListener() {} };
  globalThis.window = { AudioContext: class { constructor() { this.state = 'running'; } resume() { return Promise.resolve(); } } };
  globalThis.Audio = FakeAudio;
  globalThis.requestAnimationFrame = callback => { queueMicrotask(() => callback(performance.now() + 1000)); return 0; };
  const { AudioManager } = await import('../audio/AudioManager.js');
  const audio = new AudioManager(); await audio.unlock();
  const kart = { speed: 0, tuning: { maxSpeed: 20 }, drift: false, driftCharge: 0, boostTimer: 0, airborne: false, verticalSpeed: 0, wallImpact: 0 };
  const player = { lap: 0, kart };
  for (const [powerup, effect] of [['ZIPCAP', 'boost'], ['HALO GUARD', 'shield'], ['RATTLE POD', 'projectile']]) {
    const game = { race: { state: 'COUNTDOWN', displayCountdown: 3 }, player, powerups: { consumeEvents: () => [{ racer: player, type: 'use', powerup }] } };
    audio.update(game, {}, 1 / 60);
    assert.ok(audio.pools.get(effect).some(item => !item.paused), `${powerup} should play ${effect}`);
    audio.pools.get(effect).forEach(item => item.pause());
  }
});
