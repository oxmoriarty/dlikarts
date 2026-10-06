// Visual asset selection only: all drivers retain the existing player tuning.
export const RACERS = Object.freeze({
  guatam: Object.freeze({ name: 'GUATAM', driving: '../assets/characters/gautam-rebuilt/GautamDriving.glb?v=hair-treads-2' }),
  retree: Object.freeze({ name: 'RETREE', driving: '../assets/characters/retree-rebuilt/RetreeDriving.glb?v=retree-1' }),
  quang: Object.freeze({ name: 'QUANG', driving: '../assets/characters/quang-rebuilt/QuangDriving.glb?v=quang-1' }),
  justsam: Object.freeze({ name: 'JUST SAM', driving: '../assets/characters/justsam-rebuilt/JustSamDriving.glb?v=justsam-1' }),
});
export function racerId(value) {
  return Object.hasOwn(RACERS, value) ? value : 'guatam';
}

// Character identity is separate from the unique participant/physics identity.
// Fill the temporary fifth slot with a non-player character; no shared AI state.
export function raceLineup(selected) {
  const player = racerId(selected);
  const opponents = Object.keys(RACERS).filter(id => id !== player);
  return [player, ...Array.from({ length: 4 }, (_, i) => opponents[i % opponents.length])];
}
