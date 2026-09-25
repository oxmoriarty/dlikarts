export const STEP = 1 / 60;
export const MAX_STEPS = 5;
export const LAPS = 3;

export const KART_TUNING = Object.freeze({
  acceleration: 13.5,
  boostAcceleration: 20,
  brakeDeceleration: 23,
  reverseAcceleration: 7,
  maxSpeed: 20,
  reverseMaxSpeed: 5,
  rollingDrag: 1.5,
  offRoadMaxSpeed: 10,
  offRoadDrag: 5.6,
  steerRate: 1.95,
  highSpeedSteerFactor: 0.38,
  normalGrip: 11,
  driftGrip: 2.4,
  driftSteerMultiplier: 1.25,
  driftMinSpeed: 7,
  driftMinSteer: 0.28,
  driftCancelAngle: 0.84,
  driftTiers: [
    { name: 'SPARK', seconds: 0.45, duration: 0.35, strength: 6.0, color: '#ffcf55' },
    { name: 'FLARE', seconds: 1.15, duration: 0.65, strength: 8.0, color: '#ff7048' },
    { name: 'COMET', seconds: 2.1, duration: 1.0, strength: 10.0, color: '#7edcff' },
  ],
  gravity: 24,
  jumpVelocity: 7.3,
  airSteerRate: 0.6,
  // The approved kart root is its ground projection.  Keep it directly on
  // the road surface so the tire contact reads firmly rather than floating.
  wheelGroundOffset: 0,
  collisionRadius: 0.72,
  cpuFinishExitDelay: 0.8,
  recoverySeconds: 1.2,
});

export const CAMERA = Object.freeze({
  distance: 6.1,
  height: 2.55,
  lookAhead: 2.4,
  smoothing: 5.8,
  minFov: 59,
  maxFov: 66,
});

export const QUALITY_PROFILES = Object.freeze({
  low: { label: 'LOW', dpr: 1, shadows: false, shadowSize: 0, particles: 45, antialias: false },
  medium: { label: 'MEDIUM', dpr: 1.5, shadows: true, shadowSize: 512, particles: 95, antialias: true },
  high: { label: 'HIGH', dpr: 2, shadows: true, shadowSize: 1024, particles: 150, antialias: true },
});

export function chooseQuality() {
  const mobile = matchMedia('(pointer: coarse)').matches;
  if (mobile && devicePixelRatio > 2) return 'medium';
  return mobile ? 'medium' : 'high';
}
