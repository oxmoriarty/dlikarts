export function driftTier(charge, tiers) {
  let tier = null;
  for (const candidate of tiers) if (charge >= candidate.seconds) tier = candidate;
  return tier;
}

export function canStartDrift({ speed, steer, grounded, tuning }) {
  return grounded && speed >= tuning.driftMinSpeed && Math.abs(steer) >= tuning.driftMinSteer;
}
