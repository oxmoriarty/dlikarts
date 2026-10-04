import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AudioManager } from '../audio/AudioManager.js';
import { seamlessMotorBuffer } from '../audio/GaplessMotor.js';

class FakeAudio {
  constructor(src) { Object.assign(this, {src, paused:true, ended:true, duration:20, currentTime:0, volume:0, playbackRate:1}); }
  addEventListener() {}
  play() { this.paused=false; this.ended=false; return Promise.resolve(); }
  pause() { this.paused=true; }
}
class Param {
  value=0;
  setTargetAtTime(value) { this.value=value; }
  cancelScheduledValues() {}
}
class Context {
  state='running'; currentTime=0; destination={}; sources=[]; decodes=0;
  resume() { this.state='running'; return Promise.resolve(); }
  createBuffer(channels,length,sampleRate) {
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {length,sampleRate,numberOfChannels:channels,getChannelData:i=>data[i]};
  }
  async decodeAudioData() { this.decodes++; const b=this.createBuffer(1,4410,44100); b.getChannelData(0).fill(.2); return b; }
  createGain() { return {gain:new Param(),connect(){},disconnect(){}}; }
  createBufferSource() {
    const source={playbackRate:new Param(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};
    this.sources.push(source); return source;
  }
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function environment() {
  const store=new Map(), requests=[];
  globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  globalThis.document={hidden:false,addEventListener(){}};
  globalThis.window={AudioContext:Context}; globalThis.Audio=FakeAudio;
  globalThis.fetch=async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  globalThis.requestAnimationFrame=callback=>{queueMicrotask(()=>callback(performance.now()+2000));return 0;};
  return {store,requests};
}
function fixture() {
  const make=(id,distance)=>({id,lap:0,finishOrder:0,lastActions:{throttle:1},kart:{speed:10,tuning:{maxSpeed:20},drift:false,driftCharge:0,boostTimer:0,airborne:false,verticalSpeed:0,position:{distanceTo:()=>distance}}});
  const player=make('player',0), racers=[player,...[5,10,20,40].map((d,i)=>make(`cpu-${i}`,d))];
  return {race:{state:'RACING',displayCountdown:'GO!'},player,racers,powerups:{consumeEvents:()=>[]}};
}

test('five karts share one decoded engine and maintain one source while accelerating, coasting and braking',async()=>{
  const {requests}=environment();const audio=new AudioManager();await audio.unlock();const game=fixture();
  audio.update(game,{throttle:1},1/60);await flush();
  assert.equal(audio.engineVoices.size,5);
  const voice=audio.engineVoices.get('player'),source=voice.engine.source;
  assert.ok(source?.loop);assert.equal(voice.engine.playCount,1);
  for(let i=0;i<120;i++)audio.update(game,{throttle:1},1/60);
  const fastGain=voice.gain,fastRate=voice.rate;
  game.player.kart.speed=3;
  for(let i=0;i<120;i++)audio.update(game,{brake:1,throttle:1},1/60);
  assert.ok(voice.gain<fastGain);assert.ok(voice.rate<fastRate);
  assert.equal(voice.engine.source,source);assert.equal(voice.engine.playCount,1);
  assert.equal(requests.filter(url=>url.endsWith('engine-loop.wav')).length,1);
  assert.ok(audio.engineVoices.get('cpu-0').gain<fastGain);
  assert.ok(audio.engineVoices.get('cpu-3').gain<1e-5);
  game.player.kart.speed=0;audio.update(game,{},1/60);await flush();assert.equal(voice.engine.paused,true);
  game.player.kart.speed=-4;audio.update(game,{brake:1},1/60);await flush();
  assert.equal(voice.engine.paused,false);assert.equal(voice.engine.playCount,2);
  assert.ok(voice.engine.playbackRate>=.58&&voice.engine.playbackRate<=1.42);
});

test('pickup and each power-up activation are distinct; Zipcap does not double-trigger boost',async()=>{
  environment();const audio=new AudioManager();await audio.unlock();const game=fixture();
  for(const [type,powerup,effect] of [['pickup','ZIPCAP','powerupPickup'],['use','ZIPCAP','boost'],['use','HALO GUARD','shield'],['use','RATTLE POD','projectile']]) {
    game.powerups.consumeEvents=()=>[{racer:game.player,type,powerup}];
    if(powerup==='ZIPCAP'&&type==='use')game.player.kart.boostTimer=4;
    audio.update(game,{},1/60);await flush();
    assert.equal(audio.pools.get(effect).reduce((n,a)=>n+a.playCount,0),1,effect);
  }
});

test('victory fires once for first place only, including a direct transition to results',async()=>{
  for(const position of [1,2,5]) {
    environment();const audio=new AudioManager();await audio.unlock();const game=fixture();
    game.player.finishOrder=position;game.player.kart.finished=true;game.race.state='RESULTS';
    for(let i=0;i<10;i++)audio.update(game,{},1/60);await flush();
    assert.equal(audio.pools.get('victory').reduce((n,a)=>n+a.playCount,0),position===1?1:0);
    assert.equal(audio.pools.get('raceFinish').reduce((n,a)=>n+a.playCount,0),position===1?0:1);
  }
});

test('race UI sounds are suppressed; menu clicks work; focus changes cannot unpause a paused race',async()=>{
  environment();const audio=new AudioManager();await audio.unlock();
  assert.equal(audio.playSfx('uiSelect'),true);await flush();assert.equal(audio.pools.get('uiSelect')[0].playCount,1);
  const game=fixture();audio.update(game,{},1/60);await flush();
  assert.equal(audio.playSfx('uiSelect'),false);assert.equal(audio.playSfx('uiBack'),false);
  audio.setGameplayPaused(true);assert.ok([...audio.engineVoices.values()].every(v=>v.engine.paused));
  document.hidden=true;audio.handleVisibility();document.hidden=false;audio.handleVisibility();await flush();
  assert.ok([...audio.engineVoices.values()].every(v=>v.engine.paused));
  audio.setGameplayPaused(false);await flush();assert.ok([...audio.engineVoices.values()].every(v=>!v.engine.paused));
  audio.setSfxVolume(0);assert.ok([...audio.engineVoices.values()].every(v=>v.engine.volume===0));
  audio.setSfxVolume(.8);assert.ok(audio.engineVoices.get('player').engine.volume>0);
});

test('a stop during decoding cannot start a delayed ghost engine',async()=>{
  environment();let complete;const audio=new AudioManager();await audio.unlock();
  audio.prepareSound=()=>new Promise(resolve=>{complete=resolve;});
  const voice=audio.getEngineVoice(fixture().player).engine;voice.play();voice.pause();
  complete(audio.context.createBuffer(1,100,44100));await flush();
  assert.equal(voice.source,null);assert.equal(voice.paused,true);
});

test('engine loop has no silent blocks and a continuous splice',()=>{
  const wav=readFileSync(new URL('../../assets/audio/sfx/engine-loop.wav',import.meta.url));
  const context=new Context();let offset=12,pcm;
  while(offset<wav.length){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
  const original=context.createBuffer(1,pcm.length/2,44100);
  for(let i=0;i<original.length;i++)original.getChannelData(0)[i]=pcm.readInt16LE(i*2)/32768;
  const buffer=seamlessMotorBuffer(context,original),data=buffer.getChannelData(0);
  for(let i=0;i<data.length-1000;i+=1000){let sum=0;for(let j=i;j<i+1000;j++)sum+=data[j]**2;assert.ok(Math.sqrt(sum/1000)>.05);}
  assert.ok(Math.abs(data.at(-1)-data[0])<.05,'no discontinuity at repeat boundary');
});

test('failed sound downloads fail quietly and do not retry every frame',async()=>{
  environment();let requests=0;globalThis.fetch=async()=>{requests++;throw new Error('offline');};
  const audio=new AudioManager();await audio.unlock();const game=fixture();
  for(let i=0;i<30;i++){audio.update(game,{},1/60);await flush();}
  assert.equal(requests,2); // one engine buffer, one GO cue
  assert.ok([...audio.engineVoices.values()].every(v=>v.engine.paused));
});

test('mobile interrupted contexts resume on a later gesture',async()=>{
  environment();const listeners=new Map();document.addEventListener=(name,fn)=>listeners.set(name,fn);
  const audio=new AudioManager();await audio.unlock();audio.context.state='interrupted';
  listeners.get('pointerdown')();await flush();assert.equal(audio.context.state,'running');
  audio.context.state='suspended';listeners.get('keydown')();await flush();assert.equal(audio.context.state,'running');
});

test('race controls have no click-effect handlers while the menu keeps them',()=>{
  const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
  // Ready-to-race Start is the only direct UI cue in the game entry point.
  const lines=main.split('\n').filter(line=>line.includes("audio.playSfx('ui"));
  assert.equal(lines.length,1);assert.ok(lines[0].includes("'#start-race'"));
  for(const file of ['../input/TouchControls.js','../input/KeyboardInput.js']){
    assert.ok(!readFileSync(new URL(file,import.meta.url),'utf8').includes('playSfx'));
  }
});
