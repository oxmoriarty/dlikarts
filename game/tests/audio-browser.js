import { AudioManager } from '../audio/AudioManager.js';
const button=document.querySelector('#run'), report=document.querySelector('#report');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
button.onclick=async()=>{
  button.disabled=true;const checks=[];
  const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(`PASS ${label}`);report.textContent=checks.join('\n');};
  const audio=new AudioManager();
  try {
    await audio.unlock();check(audio.context.state==='running','AudioContext unlocked from button gesture');
    const names=['engine','drift',...audio.pools.keys()];
    const buffers=await Promise.all(names.map(n=>audio.prepareSound(n)));
    check(buffers.every(Boolean),`All ${names.length} effects decode successfully`);
    check(await audio.prepareSound('engine')===buffers[0],'Decoded motor is cached');
    const player={id:'player',lap:0,finishOrder:0,kart:{speed:10,tuning:{maxSpeed:20},drift:false,boostTimer:0,driftCharge:0,verticalSpeed:0,airborne:false,position:{distanceTo:()=>0}}};
    const game={player,racers:[player],race:{state:'RACING',displayCountdown:''},powerups:{consumeEvents:()=>[]}};
    audio.update(game,{throttle:1},1/60);await sleep(200);
    const voice=audio.engineVoices.get('player'),source=voice.engine.source;
    check(Boolean(source?.loop),'Looping engine source is running');
    for(let i=0;i<80;i++){audio.update(game,{throttle:1},1/60);await sleep(16);}
    const gain=voice.gain;player.kart.speed=3;
    for(let i=0;i<60;i++){audio.update(game,{brake:1},1/60);await sleep(16);}
    check(voice.engine.source===source&&voice.engine.playCount===1,'Acceleration and braking keep the SAME continuous motor source');
    check(voice.gain<gain,'Braking reduces engine gain');
    player.kart.speed=0;audio.update(game,{},1/60);await sleep(150);
    check(voice.engine.paused&&voice.engine.source===null,'Engine stops at rest');
    player.kart.speed=-4;audio.update(game,{brake:1},1/60);await sleep(100);
    check(!voice.engine.paused,'Reverse has engine audio');
    audio.setGameplayPaused(true);check(voice.engine.paused,'Pause stops engine');
    audio.setGameplayPaused(false);await sleep(100);check(!voice.engine.paused,'Resume restores engine');
    check(!audio.playSfx('uiSelect')&&!audio.playSfx('uiBack'),'Race button click sounds are suppressed');
    player.kart.speed=0;audio.update(game,{},1/60);
    for(const [type,powerup,name] of [['pickup','ZIPCAP','powerupPickup'],['use','ZIPCAP','boost'],['use','HALO GUARD','shield'],['use','RATTLE POD','projectile']]){
      game.powerups.consumeEvents=()=>[{racer:player,type,powerup}];audio.update(game,{},1/60);
      await sleep(70);check(audio.pools.get(name).some(s=>s.source&&s.playCount===1),`${name} plays from actual gameplay event`);await sleep(850);
    }
    game.powerups.consumeEvents=()=>[];player.kart.finished=true;player.finishOrder=1;game.race.state='PLAYER_FINISHED';
    audio.update(game,{},1/60);await sleep(70);check(audio.pools.get('victory').some(s=>s.source),'First-place victory plays');
    audio.update(game,{},1/60);check(audio.pools.get('victory').reduce((n,s)=>n+s.playCount,0)===1,'Victory triggers once');
    await sleep(1900);audio.setGameplayPaused(true);
    report.textContent+='\nALL BROWSER CHECKS PASSED';
  }catch(error){report.textContent+=`\nFAIL ${error.message}`;audio.setGameplayPaused(true);}
  button.disabled=false;
};
