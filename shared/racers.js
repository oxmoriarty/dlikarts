// Visual asset selection only: all drivers retain the existing player tuning.
export const RACERS = Object.freeze({
  guatam: Object.freeze({ name: 'GUATAM', driving: '../assets/characters/gautam-rebuilt/GautamDriving.glb?v=hair-treads-2' }),
  retree: Object.freeze({ name: 'RETREE', driving: '../assets/characters/retree-rebuilt/RetreeDriving.glb?v=retree-1' }),
  quang: Object.freeze({ name: 'QUANG', driving: '../assets/characters/quang-rebuilt/QuangDriving.glb?v=quang-1' }),
  justsam: Object.freeze({ name: 'JUST SAM', driving: '../assets/characters/justsam-rebuilt/JustSamDriving.glb?v=justsam-1' }),
  kapuriya: Object.freeze({ name: 'KAPURIYA', driving: '../assets/characters/kapuriya-rebuilt/KapuriyaDriving.glb?v=kapuriya-1' }),
});
export function racerId(value) {
  return Object.hasOwn(RACERS, value) ? value : 'guatam';
}

// Character identity is separate from the unique participant/physics identity.
// Five available characters: every race uses each exactly once.
export function raceLineup(selected) {
  const player = racerId(selected);
  const opponents = Object.keys(RACERS).filter(id => id !== player);
  return [player, ...opponents.slice(0, 4)];
}

export function racerCard(selected) {
  const id = racerId(selected);
  return `../assets/characters/${id}-card.png`;
}
