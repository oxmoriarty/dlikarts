import test from 'node:test';
import assert from 'node:assert/strict';
import { driftTier, canStartDrift } from '../vehicle/driftMath.js';
import { compareRacers, nearProgress, crossedProgress } from '../race/raceMath.js';
import { RaceSystem } from '../race/RaceSystem.js';
import { POWERUP_TUNING } from '../config/game-config.js';
import { distanceToSegmentSqXZ } from '../powerups/battlePodMath.js';
import { POWERUP_VISUAL_IDENTITY } from '../powerups/powerupIdentity.js';
import { minimumRotatedY, tumbleGroundLift } from '../vehicle/tumbleMath.js';

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
test('lap is awarded only after crossing the finish plane', () => {
  assert.equal(crossedProgress(.985, .998, 0), false);
  assert.equal(crossedProgress(.998, .004, 0), true);
  assert.equal(crossedProgress(.004, .998, 0), false);
});
test('race ordering prefers lap and legal checkpoint progress', () => {
  const ahead = { lap: 1, nextGate: 2, kart:{progress:.2} };
  const behind = { lap: 0, nextGate: 7, kart:{progress:.99} };
  assert.ok(compareRacers(ahead, behind) < 0);
});

test('finished CPU is recorded once and immediately stops participating', () => {
  const track = { checkpoints: [0], width: 12, query: () => ({ lateral: 0 }) };
  const racer = { player: false, kart: { progress: .004, speed: 0, item: 'ZIPCAP', guardTimer: 2, finished: false } };
  const race = new RaceSystem([racer], track);
  race.state = 'RACING'; racer.lap = 2; racer.nextGate = 0; racer.previousProgress = .998;
  race.update(1 / 60);
  assert.equal(racer.kart.finished, true);
  assert.equal(racer.finishOrder, 1);
  assert.equal(racer.kart.item, null);
  assert.equal(racer.kart.guardTimer, 0);
  const completedLaps = racer.lap;
  race.update(1 / 60);
  assert.equal(racer.lap, completedLaps);
});

test('Halo Guard duration stays inside the specified six-to-eight-second window', () => {
  assert.equal(POWERUP_TUNING.haloGuardSeconds, 7);
  assert.ok(POWERUP_TUNING.haloGuardSeconds >= 6 && POWERUP_TUNING.haloGuardSeconds <= 8);
});

test('Battle Pod is a fast, long-range missile with an explicit tumble impact', () => {
  assert.ok(POWERUP_TUNING.battlePodSpeed >= 30);
  assert.ok(POWERUP_TUNING.battlePodSpeed * POWERUP_TUNING.battlePodLifetime >= 100);
  assert.ok(POWERUP_TUNING.battlePodTumbleSeconds >= .75);
  assert.ok(POWERUP_TUNING.battlePodTumbleTurns >= 1);
});

test('power-up identities map blue mascot to Halo Guard and purple halo to Battle Pod', () => {
  assert.equal(POWERUP_VISUAL_IDENTITY['HALO GUARD'], 'blue-mascot');
  assert.equal(POWERUP_VISUAL_IDENTITY['RATTLE POD'], 'purple-halo');
});

test('Battle Pod segment hit testing catches a kart crossed between frames', () => {
  assert.equal(distanceToSegmentSqXZ({ x: 5, z: .5 }, { x: 0, z: 0 }, { x: 10, z: 0 }), .25);
  assert.ok(distanceToSegmentSqXZ({ x: 5, z: 2 }, { x: 0, z: 0 }, { x: 10, z: 0 }) > 1.35 ** 2);
});

test('a tumbling kart is lifted above the solid road for every roll orientation', () => {
  const bounds = { minX: -1.1, maxX: 1.1, minY: 0, maxY: 1.7, minZ: -1.4, maxZ: 1.4 };
  for (const roll of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2]) {
    const lift = tumbleGroundLift(bounds, roll, .16);
    assert.ok(minimumRotatedY(bounds, roll, .16) + lift >= -1e-9);
  }
});

test('player receives a lap marker at race start and at each new valid lap', () => {
  const track = { checkpoints: [0], width: 12, query: () => ({ lateral: 0 }) };
  const racer = { player: true, kart: { progress: .998, speed: 0, finished: false } };
  const race = new RaceSystem([racer], track);
  race.update(4);
  assert.equal(race.lapAnnouncement.lap, 1);
  racer.previousProgress = .998; racer.kart.progress = .004; racer.nextGate = 0;
  race.update(1 / 60);
  assert.equal(race.lapAnnouncement.lap, 2);
});
