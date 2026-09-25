export function compareRacers(a, b) {
  if (a.finishOrder || b.finishOrder) return (a.finishOrder || Infinity) - (b.finishOrder || Infinity);
  const progressA = a.lap + a.nextGate / 8 + a.kart.progress / 8;
  const progressB = b.lap + b.nextGate / 8 + b.kart.progress / 8;
  return progressB - progressA;
}

export function nearProgress(a, b, radius = .018) {
  let d = Math.abs(a - b); d = Math.min(d, 1 - d); return d < radius;
}

// True only when forward movement crosses an exact progress plane. Unlike a
// proximity radius, this cannot award a lap while the kart is still short of
// the finish banner.
export function crossedProgress(previous, current, target) {
  let movement = current - previous;
  if (movement < -.5) movement += 1;
  if (movement > .5) movement -= 1;
  if (movement <= 0) return false;
  let distanceToTarget = target - previous;
  if (distanceToTarget < -.5) distanceToTarget += 1;
  if (distanceToTarget > .5) distanceToTarget -= 1;
  return distanceToTarget > 0 && distanceToTarget <= movement + 1e-6;
}
