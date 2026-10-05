// Visual asset selection only: all drivers retain the existing player tuning.
export const RACERS = Object.freeze({
  guatam: Object.freeze({ name: 'GUATAM', driving: '../assets/characters/gautam-rebuilt/GautamDriving.glb?v=hair-treads-2' }),
  retree: Object.freeze({ name: 'RETREE', driving: '../assets/characters/retree-rebuilt/RetreeDriving.glb?v=retree-1' }),
  quang: Object.freeze({ name: 'QUANG', driving: '../assets/characters/quang-rebuilt/QuangDriving.glb?v=quang-1' }),
});
export function racerId(value) {
  return Object.hasOwn(RACERS, value) ? value : 'guatam';
}
