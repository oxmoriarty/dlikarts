export function compareRacers(a, b) {
  if (a.finishOrder || b.finishOrder) return (a.finishOrder || Infinity) - (b.finishOrder || Infinity);
  const progressA = a.lap + a.nextGate / 8 + a.kart.progress / 8;
  const progressB = b.lap + b.nextGate / 8 + b.kart.progress / 8;
  return progressB - progressA;
}

export function nearProgress(a, b, radius = .018) {
  let d = Math.abs(a - b); d = Math.min(d, 1 - d); return d < radius;
}
