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
