export function minimumRotatedY(bounds, roll, pitch = 0) {
  const sinRoll = Math.sin(roll), cosRoll = Math.cos(roll);
  const sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
  let minimum = Infinity;
  for (const x of [bounds.minX, bounds.maxX]) for (const y of [bounds.minY, bounds.maxY]) for (const z of [bounds.minZ, bounds.maxZ]) {
    const rolledY = x * sinRoll + y * cosRoll;
    const rotatedY = rolledY * cosPitch - z * sinPitch;
    minimum = Math.min(minimum, rotatedY);
  }
  return minimum;
}

export function tumbleGroundLift(bounds, roll, pitch = 0) {
  return Math.max(0, -minimumRotatedY(bounds, roll, pitch));
}

// Time-based impact pose: a fast launch, slowing rotation and a small damped
// suspension rebound after the wheels return to the road. No physics timers.
export function impactTumblePose(progress, direction = 1, turns = 1) {
  const t = Math.max(0, Math.min(1, progress));
  const flight = Math.min(1, t / .82);
  const rotation = 1 - Math.pow(1 - flight, 1.35);
  const settle = Math.max(0, (t - .82) / .18);
  return {
    roll: direction * turns * Math.PI * 2 * rotation,
    pitch: Math.sin(Math.PI * flight) * -.22,
    lift: 4 * flight * (1 - flight),
    settle: Math.sin(settle * Math.PI * 2) * (1 - settle) * .035,
  };
}
