import * as THREE from 'three';

// Shared low-poly geometry/materials; no particles, lights, textures or shadows.
const shape = new THREE.ConeGeometry(1, 1, 10, 1).translate(0, .5, 0).rotateX(-Math.PI / 2);
const outer = new THREE.MeshBasicMaterial({color:0xff651c,transparent:true,opacity:.82,blending:THREE.AdditiveBlending,depthWrite:false});
const core = new THREE.MeshBasicMaterial({color:0xffedb0,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false});

export class ExhaustFlames {
  constructor(model) {
    this.time=0;this.intensity=0;this.jets=[];
    const asset=model.children[0];
    if(!asset?.getObjectByName('CHASSIS'))return;
    // Authored rebuilt-model coordinates: exact outlets of the twin exhausts.
    for(const x of [-.38,.38]) {
      const jet=new THREE.Group();jet.name=x<0?'EXHAUST_FLAME_LEFT':'EXHAUST_FLAME_RIGHT';jet.position.set(x,.34,-.948);
      const shell=new THREE.Mesh(shape,outer),inner=new THREE.Mesh(shape,core);
      jet.add(shell,inner);asset.add(jet);jet.visible=false;this.jets.push(jet);
    }
  }
  update(dt,kart) {
    this.time+=dt;
    const boost=kart.boostTimer>0,throttle=THREE.MathUtils.clamp(kart.visualThrottle||0,0,1);
    const active=!kart.finished && !(kart.tumbleTimer>0) && (Math.abs(kart.speed)>.5||throttle>0||boost);
    const target=active?(boost?2.4:.3+throttle*.9):0;
    this.intensity+=(target-this.intensity)*(1-Math.exp(-18*dt));
    this.jets.forEach((jet,i)=>{
      jet.visible=active||this.intensity>.015;
      const flicker=1+.07*Math.sin(this.time*43+i*2)+.04*Math.sin(this.time*71+i);
      const radius=(.022+.016*this.intensity)*flicker,length=.40*this.intensity*flicker;
      jet.children[0].scale.set(radius,radius,length);
      jet.children[1].scale.set(radius*.54,radius*.54,length*.72);
    });
  }
}
