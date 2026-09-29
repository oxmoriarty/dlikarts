export function distanceToSegmentSqXZ(point, start, end) {
  const dx = end.x - start.x, dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  const projection = lengthSq > 0
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq))
    : 0;
  const nearestX = start.x + dx * projection, nearestZ = start.z + dz * projection;
  const offsetX = point.x - nearestX, offsetZ = point.z - nearestZ;
  return offsetX * offsetX + offsetZ * offsetZ;
}
