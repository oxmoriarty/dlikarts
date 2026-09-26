import * as THREE from 'three';
import { CPU_TUNING } from '../config/game-config.js?v=corner-recovery-1';

const clamp = THREE.MathUtils.clamp;

// The CPU uses a small number of safe lanes rather than blindly following a
// single spline offset.  This is deliberately lightweight: five opponents
// only evaluate four lanes against four other racers each simulation step.
export class RacingLineAI {
  constructor(racer, track, seed) {
    this.racer = racer;
    this.track = track;
    this.seed = seed;
    this.launchOffset = clamp(
      track.query(racer.kart.position, racer.kart.progress).lateral,
      -track.width * .25,
      track.width * .25,
    );
    // A stable, safe cruising lane prevents every CPU driver from collapsing
    // onto the centerline after the countdown. Dynamic lane selection can
    // still override this to pass or avoid traffic.
    this.cruiseOffset = clamp((seed - 2) * 1.15, -track.width * .20, track.width * .20);
    this.laneOffset = this.launchOffset;
    this.elapsed = 0;
    this.offRoadTime = 0;
    this.stuckTime = 0;
    this.itemCooldown = 0;
    this.actions = { throttle: 1, brake: 0, steer: 0, drift: false, useItem: false, recover: false };
  }

  pickupOffset(powerups, kart, preferredOffset) {
    if (kart.item || !powerups) return null;
    let best = null;
    for (const pickup of powerups.pickups) {
      if (pickup.timer > 0) continue;
      const progressAhead = (pickup.progress - kart.progress + 1) % 1;
      if (progressAhead < .008 || progressAhead > CPU_TUNING.pickupLookAhead) continue;
      const sample = this.track.sampleAt(pickup.progress);
      const lateral = pickup.mesh.position.clone().sub(sample.p).setY(0).dot(sample.normal);
      // Never throw a kart across the road for an item.  A nearby, safe item
      // is valuable; one that requires a sudden lane dive is not.
      if (Math.abs(lateral - preferredOffset) > 1.6) continue;
      const score = progressAhead * CPU_TUNING.pickupWeight + Math.abs(lateral - preferredOffset) * .3;
      if (!best || score < best.score) best = { lateral, score };
    }
    return best?.lateral ?? null;
  }

  chooseLane(query, forward, racers, preferredOffset) {
    const kart = this.racer.kart;
    const limit = this.track.width * .255;
    const candidates = [
      clamp(preferredOffset, -limit, limit),
      -limit,
      -limit * .34,
      limit * .34,
      limit,
    ];
    let result = candidates[0];
    let bestCost = Infinity;

    for (const lane of candidates) {
      // Prefer the racing line, then avoid abrupt zig-zags.  During launch we
      // retain separation briefly before converging toward useful lanes.
      let cost = Math.abs(lane - preferredOffset) * 2.2 + Math.abs(lane - this.laneOffset) * .28;
      for (const other of racers) {
        if (other === this.racer || other.kart.finished || other.retired) continue;
        const relative = other.kart.position.clone().sub(kart.position).setY(0);
        const ahead = relative.dot(forward);
        if (ahead < -1.25 || ahead > CPU_TUNING.trafficLookAhead * 1.3) continue;
        const otherQuery = this.track.query(other.kart.position, other.kart.progress);
        const projectedAhead = ahead + (other.kart.speed - kart.speed) * CPU_TUNING.trafficPredictionSeconds;
        if (projectedAhead < -1.1 || projectedAhead > CPU_TUNING.trafficLookAhead) continue;
        const laneGap = Math.abs(lane - otherQuery.lateral);
        const overlap = clamp(1 - laneGap / CPU_TUNING.trafficClearance, 0, 1);
        const closeness = 1 - clamp(Math.max(projectedAhead, 0) / CPU_TUNING.trafficLookAhead, 0, 1);
        // A racer directly in a candidate lane is expensive, so a passing lane
        // wins before the kart reaches a bumper-to-bumper queue.
        cost += overlap * (7 + closeness * 24);
        // World-space proximity catches side-by-side and corner situations
        // where individual kart headings are briefly different. It makes an
        // occupied lane decisively unattractive before collision resolution
        // has to intervene.
        const distance = relative.length();
        if (distance < CPU_TUNING.trafficAvoidDistance) {
          const immediateRisk = 1 - distance / CPU_TUNING.trafficAvoidDistance;
          cost += overlap * (28 + immediateRisk * 62);
        }
      }
      if (cost < bestCost) {
        bestCost = cost;
        result = lane;
      }
    }
    return result;
  }

  nearestBlockingRacer(racers, forward, laneOffset) {
    const kart = this.racer.kart;
    let blocker = null;
    for (const other of racers) {
      if (other === this.racer || other.kart.finished || other.retired) continue;
      const relative = other.kart.position.clone().sub(kart.position).setY(0);
      const ahead = relative.dot(forward);
      if (ahead < -.35 || ahead > 2.15) continue;
      const otherQuery = this.track.query(other.kart.position, other.kart.progress);
      if (Math.abs(laneOffset - otherQuery.lateral) > CPU_TUNING.trafficClearance * .88) continue;
      if (!blocker || ahead < blocker.ahead) blocker = { racer: other, ahead };
    }
    return blocker;
  }

  attackTarget(racers, forward, right) {
    const kart = this.racer.kart;
    let target = null;
    for (const other of racers) {
      if (other === this.racer || other.kart.finished || other.retired) continue;
      const relative = other.kart.position.clone().sub(kart.position).setY(0);
      const ahead = relative.dot(forward);
      const lateral = relative.dot(right);
      if (ahead < 1.6 || ahead > CPU_TUNING.projectileRange || Math.abs(lateral) > 1.45) continue;
      if (!target || ahead < target.ahead) target = { racer: other, ahead, lateral };
    }
    return target;
  }

  shouldUseItem(racers, powerups, forward, right, curve) {
    const kart = this.racer.kart;
    if (!kart.item || this.itemCooldown > 0) return false;
    const target = this.attackTarget(racers, forward, right);
    if (kart.item === 'RATTLE POD') return Boolean(target);
    if (kart.item === 'HALO GUARD') return Boolean(powerups?.isProjectileThreat(this.racer));
    return curve < .11 && kart.speed > 8 && (Boolean(target) || this.racer.position > 2);
  }

  update(dt, racers = [], powerups = null) {
    const kart = this.racer.kart;
    const query = this.track.query(kart.position, kart.progress);
    const forward = kart.forward(new THREE.Vector3());
    const right = kart.right(new THREE.Vector3());
    this.elapsed += dt;
    this.itemCooldown = Math.max(0, this.itemCooldown - dt);

    // Look a short distance ahead at low speed and further ahead on straights.
    // A tighter preview on bends prevents cutting across a curb.
    const baseLook = .017 + Math.min(.038, Math.abs(kart.speed) / 520);
    const first = this.track.sampleAt((kart.progress + baseLook) % 1);
    const second = this.track.sampleAt((kart.progress + baseLook + .042) % 1);
    const third = this.track.sampleAt((kart.progress + baseLook + .10) % 1);
    const curve = Math.max(
      1 - clamp(first.tangent.dot(second.tangent), .4, 1),
      1 - clamp(second.tangent.dot(third.tangent), .4, 1),
    );
    const look = baseLook * (1 - clamp(curve * 2.8, 0, .38));
    let target = this.track.sampleAt((kart.progress + look) % 1);

    // Grid lanes are retained only long enough to clear the start.  Keeping
    // the outer starting lane for a whole race was the root cause of repeated
    // curb strikes; racers now settle onto a safe, adaptive line.
    const launchBlend = clamp(1 - this.elapsed / CPU_TUNING.launchSettleSeconds, 0, 1);
    let preferredOffset = this.launchOffset * launchBlend + this.cruiseOffset * (1 - launchBlend);
    const pickupOffset = this.pickupOffset(powerups, kart, preferredOffset);
    if (pickupOffset !== null) preferredOffset += (pickupOffset - preferredOffset) * .55;

    // Begin steering back toward the center well before the physical curb.
    // Waiting until the outer edge left too little turning room at speed.
    const edgeLimit = this.track.width * CPU_TUNING.edgeLateralRatio;
    const nearEdge = Math.abs(query.lateral) > edgeLimit || !query.onRoad;
    if (nearEdge) preferredOffset = 0;
    const desiredLane = this.chooseLane(query, forward, racers, preferredOffset);
    const laneSpeed = nearEdge ? CPU_TUNING.edgeLaneChangeSpeed : CPU_TUNING.laneChangeSpeed;
    this.laneOffset += (desiredLane - this.laneOffset) * Math.min(1, dt * laneSpeed);

    // When a kart is approaching a curb, aim at a nearby center-line point,
    // not a distant point down the next bend. This makes the correction turn
    // inward immediately and prevents repeated barrier ramming.
    if (nearEdge) target = this.track.sampleAt((kart.progress + CPU_TUNING.rejoinLookAhead) % 1);

    const desired = target.p.clone().addScaledVector(target.normal, this.laneOffset);
    const to = desired.sub(kart.position).setY(0);
    if (to.lengthSq() > .0001) to.normalize();
    const cross = forward.z * to.x - forward.x * to.z;
    const angle = Math.atan2(cross, clamp(forward.dot(to), -1, 1));
    let targetSpeed = clamp(
      CPU_TUNING.baseTargetSpeed - curve * CPU_TUNING.curveSpeedPenalty - Math.abs(angle) * CPU_TUNING.angleSpeedPenalty,
      CPU_TUNING.minimumCornerSpeed,
      kart.tuning.maxSpeed,
    );
    if (nearEdge) targetSpeed = Math.min(targetSpeed, CPU_TUNING.edgeTargetSpeed);
    if (Math.abs(angle) > .7) targetSpeed = Math.min(targetSpeed, CPU_TUNING.tightTurnSpeed);

    const blocker = this.nearestBlockingRacer(racers, forward, this.laneOffset);
    this.actions.steer = clamp(-angle * CPU_TUNING.steeringGain, -1, 1);
    this.actions.throttle = kart.speed < targetSpeed - .3 ? 1 : .18;
    this.actions.brake = kart.speed > targetSpeed + .7 ? .82 : 0;
    // Brake only if every viable lane is still occupied at contact distance.
    // Otherwise the lane evaluation above has already selected an overtake.
    if (blocker && kart.speed > blocker.racer.kart.speed - .15) {
      this.actions.throttle = 0;
      this.actions.brake = Math.max(this.actions.brake, .9);
    }

    this.offRoadTime = nearEdge ? this.offRoadTime + dt : 0;
    const shouldBeMoving = this.elapsed > 4 && targetSpeed > CPU_TUNING.minimumCornerSpeed + 1;
    this.stuckTime = shouldBeMoving && Math.abs(kart.speed) < 1 ? this.stuckTime + dt : 0;
    this.actions.drift = false;
    this.actions.recover = !query.inBounds
      || this.offRoadTime > CPU_TUNING.offRoadRecoverySeconds
      || this.stuckTime > CPU_TUNING.stuckRecoverySeconds;
    this.actions.useItem = this.shouldUseItem(racers, powerups, forward, right, curve);
    if (this.actions.useItem) this.itemCooldown = CPU_TUNING.itemCooldown;
    return this.actions;
  }
}
