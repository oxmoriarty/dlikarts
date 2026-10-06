import test from 'node:test';
import assert from 'node:assert/strict';
import { RACERS, raceLineup } from '../../shared/racers.js';
import * as THREE from 'three';
import { prepareImportedKart } from '../vehicle/importedModel.js';

for (const selected of Object.keys(RACERS)) test(`${selected}: all other characters race independently with one non-player duplicate`, () => {
  const lineup = raceLineup(selected);
  assert.equal(lineup.length, 5); assert.equal(lineup[0], selected);
  const opponents = lineup.slice(1); assert.ok(opponents.every(id => id !== selected));
  assert.deepEqual(new Set(opponents), new Set(Object.keys(RACERS).filter(id => id !== selected)));
  assert.equal(new Set(opponents).size, 3);
});
test('invalid selection falls back to Gautam', () => assert.equal(raceLineup('unknown')[0], 'guatam'));
test('duplicate visual instances share resources but not wheel transforms', () => {
  const source = new THREE.Group(); const wheel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  wheel.name = 'WHEEL_FL'; source.add(wheel);
  const first = prepareImportedKart(source), second = prepareImportedKart(source);
  const a = first.getObjectByName('WHEEL_FL'), b = second.getObjectByName('WHEEL_FL');
  assert.notEqual(a, b); assert.equal(a.geometry, b.geometry); assert.equal(a.material, b.material);
  a.rotation.x = 2; assert.ok(Math.abs(b.rotation.x) < 1e-12); assert.ok(Math.abs(wheel.rotation.x) < 1e-12);
});
