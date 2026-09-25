import test from 'node:test';
import assert from 'node:assert/strict';
import { driftTier, canStartDrift } from '../vehicle/driftMath.js';
import { compareRacers, nearProgress } from '../race/raceMath.js';
import { RaceSystem } from '../race/RaceSystem.js';

const tiers = [{ name:'SPARK', seconds:.45 },{ name:'FLARE', seconds:1.15 },{ name:'COMET', seconds:2.1 }];
test('drift tiers use threshold data', () => {
  assert.equal(driftTier(.1, tiers), null);
  assert.equal(driftTier(.45, tiers).name, 'SPARK');
  assert.equal(driftTier(1.2, tiers).name, 'FLARE');
  assert.equal(driftTier(4, tiers).name, 'COMET');
});
test('drift requires grounded speed and steer input', () => {
  const tuning = { driftMinSpeed: 7, driftMinSteer: .28 };
  assert.equal(canStartDrift({speed:8,steer:.4,grounded:true,tuning}), true);
  assert.equal(canStartDrift({speed:6,steer:.4,grounded:true,tuning}), false);
  assert.equal(canStartDrift({speed:8,steer:.1,grounded:true,tuning}), false);
  assert.equal(canStartDrift({speed:8,steer:.4,grounded:false,tuning}), false);
});
test('track progress wraps at the start finish line', () => {
  assert.equal(nearProgress(.995, .005), true);
  assert.equal(nearProgress(.90, .05), false);
});
test('race ordering prefers lap and legal checkpoint progress', () => {
  const ahead = { lap: 1, nextGate: 2, kart:{progress:.2} };
  const behind = { lap: 0, nextGate: 7, kart:{progress:.99} };
  assert.ok(compareRacers(ahead, behind) < 0);
});

test('finished CPU is recorded once and immediately stops participating', () => {
  const track = { checkpoints: [0], width: 12, query: () => ({ lateral: 0 }) };
  const racer = { player: false, kart: { progress: 0, speed: 0, item: 'ZIPCAP', guardTimer: 2, finished: false } };
  const race = new RaceSystem([racer], track);
  race.state = 'RACING'; racer.lap = 2; racer.nextGate = 0;
  race.update(1 / 60);
  assert.equal(racer.kart.finished, true);
  assert.equal(racer.finishOrder, 1);
  assert.equal(racer.kart.item, null);
  assert.equal(racer.kart.guardTimer, 0);
  const completedLaps = racer.lap;
  race.update(1 / 60);
  assert.equal(racer.lap, completedLaps);
});
