import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SwitchbackYard } from '../track/SwitchbackYard.js';
import { ArcadeKart } from '../vehicle/ArcadeKart.js';
import { RacingLineAI } from '../ai/RacingLineAI.js';
import { KART_TUNING } from '../config/game-config.js';
import { PowerupSystem } from '../powerups/PowerupSystem.js';
import { RaceSystem } from '../race/RaceSystem.js';
import { readFileSync } from 'node:fs';

// Headless simulation uses the production track geometry/query/constrain,
// controller and AI; omit only visual creation and asset loading.
const track = Object.create(SwitchbackYard.prototype);
track.width = 14.4; track.gridLaneSpacing = 2.65; track.kartWheelGroundOffset = 0; track.roadSurfaceOffset = .02; track.samples = []; track.checkpoints = [];
track.jumpStart = .43; track.jumpEnd = .47;
track.curve = new THREE.CatmullRomCurve3([
  [0,0,-58],[35,0,-58],[58,.35,-45],[70,.2,-18],[68,0,10],[48,.3,36],[68,.65,62],[30,.75,76],
  [0,.4,58],[-27,.6,50],[-56,.75,72],[-80,.3,40],[-72,0,5],[-85,.3,-30],[-55,.2,-58],[-20,0,-58],
].map(p => new THREE.Vector3(...p)), true, 'centripetal');
track.buildSamples();
const racers = Array.from({length:5}, (_, i) => {
  const tuning = {...KART_TUNING, maxSpeed:22, acceleration:15.5, steerRate:2.14, highSpeedSteerFactor:.52};
  const racer = {id:`pilot-${i}`, kart:new ArcadeKart(`cpu-${i}`,tuning,track.getGridPose(i)), player:i===0};
  racer.ai = new RacingLineAI(racer, track, i);
  return racer;
});
// Execute the production collision resolver without starting browser/render code.
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const collisionCode = main.slice(main.indexOf('function resolveKartCollisions('), main.indexOf('function retireFinishedCpuVisuals('));
const resolveCollisions = new Function('game','audio', `${collisionCode}; return resolveKartCollisions;`)(null,{reportCollision(){}});
const powerups = new PowerupSystem(new THREE.Scene(), track);
const events = {pickup:0,use:0,types:{}};
const stats = racers.map(()=>({distance:0,recoveries:0,walls:0,maxSpeed:0,offRoad:0,speedSum:0}));
for(let frame=0;frame<60*120;frame++) {
  racers.forEach((racer,i)=>{
    const previous=racer.kart.progress;
    const action=racer.ai.update(1/60,racers,powerups);
    if(action.useItem)powerups.use(racer);
    if(action.recover) stats[i].recoveries++;
    racer.kart.update(1/60,action,track,true);
    assert.equal(racer.kart.airborne,false,'No point on the road may launch a kart');
    assert.equal(racer.kart.verticalSpeed,0,'Road driving must have no ballistic jump velocity');
    const ground=track.query(racer.kart.position,racer.kart.progress).p.y+track.roadSurfaceOffset+racer.kart.wheelGroundOffset;
    assert.ok(Math.abs(racer.kart.position.y-ground)<.00001,'Kart root must follow the road surface');
    let delta=racer.kart.progress-previous;if(delta<-.5)delta++;if(delta>.5)delta--;
    stats[i].distance+=delta;
    stats[i].maxSpeed=Math.max(stats[i].maxSpeed,racer.kart.speed);
    stats[i].speedSum+=Math.abs(racer.kart.speed);
    if(racer.kart.wallImpact){stats[i].walls++;racer.kart.wallImpact=0;}
    if(racer.kart.offRoad)stats[i].offRoad++;
  });
  resolveCollisions(racers);
  powerups.update(1/60,racers);
  for(const event of powerups.consumeEvents()){events[event.type]++;if(event.type==='use')events.types[event.powerup]=(events.types[event.powerup]||0)+1;}
}
stats.forEach(stat=>{stat.meanSpeed=stat.speedSum/7200;delete stat.speedSum;});
console.log(JSON.stringify(stats,null,2));
console.log(events);
for(const stat of stats){assert.ok(stat.distance>3, 'CPU must complete more than three circuits');assert.ok(stat.maxSpeed>21,'CPU must accelerate competitively');assert.equal(stat.walls,0,'CPU must not ram road edges');assert.equal(stat.recoveries,0,'CPU must not depend on recovery to finish');}
assert.ok(events.pickup>0 && events.use>0,'CPU must collect and use production powerups');

// Independent item tactics, including attacks on other CPU pilots.
const driver = racers[1], rival = racers[2];
driver.kart.position.set(0,0,0);driver.kart.yaw=0;driver.kart.speed=18;driver.ai.itemCooldown=0;
rival.kart.position.set(0,0,15);rival.kart.yaw=0;rival.kart.speed=16;rival.kart.guardTimer=0;
driver.kart.item='RATTLE POD';
assert.equal(driver.ai.shouldUseItem([driver,rival],powerups,driver.kart.forward(),driver.kart.right(),0),true);
rival.kart.guardTimer=7;
assert.equal(driver.ai.shouldUseItem([driver,rival],powerups,driver.kart.forward(),driver.kart.right(),0),false);
driver.kart.item='HALO GUARD';
assert.equal(driver.ai.shouldUseItem([], {isProjectileThreat:()=>true},driver.kart.forward(),driver.kart.right(),0),true);
assert.equal(driver.ai.shouldUseItem([], {isProjectileThreat:()=>false},driver.kart.forward(),driver.kart.right(),0),false);
driver.kart.item='ZIPCAP';driver.ai.blocked=false;driver.position=1;
assert.equal(driver.ai.shouldUseItem([],powerups,driver.kart.forward(),driver.kart.right(),0),true);
assert.equal(driver.ai.shouldUseItem([],powerups,driver.kart.forward(),driver.kart.right(),.1),false);

const pose = track.sampleAt(.02);
driver.kart.position.copy(pose.p);driver.kart.progress=.02;driver.kart.yaw=Math.atan2(pose.tangent.x,pose.tangent.z);driver.kart.speed=18;driver.kart.item=null;driver.ai.laneOffset=0;driver.ai.cruiseOffset=0;
rival.kart.position.copy(pose.p).addScaledVector(pose.tangent,8);rival.kart.progress=.035;rival.kart.speed=0;rival.kart.guardTimer=0;
const lane=driver.ai.chooseLane(track.query(driver.kart.position,.02),driver.kart.forward(),[driver,rival],0);
assert.ok(Math.abs(lane)>2,'CPU must choose a passing lane around a stopped opponent');
for(let frame=0;frame<300;frame++){
  driver.kart.update(1/60,driver.ai.update(1/60,[driver,rival]),track);
  resolveCollisions([driver,rival]);
}
assert.ok(driver.kart.progress-rival.kart.progress>.025,'CPU must physically pass the stopped rival instead of queuing indefinitely');
console.log('Independent attacks, shield timing, leader boost and overtaking decisions passed.');

// Full race rules, same one-player/four-CPU tuning as the browser. The player
// is driven by the smoke-test AI only to exercise finish/checkpoint flow.
racers.forEach((racer,i)=>{
  racer.kart=new ArcadeKart(`race-${i}`,i===0?KART_TUNING:{...KART_TUNING,maxSpeed:22,acceleration:15.5,steerRate:2.14,highSpeedSteerFactor:.52},track.getGridPose(i));
  racer.ai=new RacingLineAI(racer,track,i);
});
const race=new RaceSystem(racers,track);race.state='RACING';
const racePowerups=new PowerupSystem(new THREE.Scene(),track);
for(let frame=0;frame<60*150 && race.state!=='RESULTS';frame++){
  for(const racer of racers){if(racer.kart.finished)continue;const actions=racer.ai.update(1/60,racers,racePowerups);if(actions.useItem)racePowerups.use(racer);racer.kart.update(1/60,actions,track);}
  resolveCollisions(racers);racePowerups.update(1/60,racers);race.update(1/60);
}
console.log('Race results',racers.map(r=>({id:r.id,lap:r.lap,place:r.finishOrder,time:r.lapStart})));
assert.equal(race.state,'RESULTS');
assert.ok(racers.filter(r=>!r.player).every(r=>r.kart.finished && r.lap===3),'Every CPU must legally finish all three laps');

// Reachable obstacle must change the intended lane before contact.
const avoiding=racers.find(r=>!r.player);avoiding.kart.finished=false;avoiding.kart.item=null;avoiding.kart.position.copy(pose.p);avoiding.kart.progress=.02;avoiding.kart.speed=18;avoiding.kart.yaw=Math.atan2(pose.tangent.x,pose.tangent.z);avoiding.ai.laneOffset=0;
track.obstacles=[{position:pose.p.clone().addScaledVector(pose.tangent,8),radius:1.2}];
assert.ok(Math.abs(avoiding.ai.chooseLane(track.query(avoiding.kart.position,.02),avoiding.kart.forward(),[avoiding],0))>2,'Obstacle requires a clear lane');
track.obstacles=[];
