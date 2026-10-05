import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { RACERS, racerId } from '../../shared/racers.js';

test('Retree selection persists, changes the launch label, and launches the selected model',()=>{
  const source=readFileSync(new URL('../../landing/menu.js',import.meta.url),'utf8');
  const selection=source.slice(source.indexOf("let selectedRacer = 'guatam';"),source.indexOf("document.addEventListener('keydown'"));
  function fixture(blocked=false) {
    const storage=new Map([['dlikarts.racer','retree']]),message={},launch={listeners:{},addEventListener(n,fn){this.listeners[n]=fn;}};
    const cards=['guatam','retree'].map(id=>({dataset:{racer:id},selected:false,attrs:{},listeners:{},
      classList:{toggle(_,value){cards.find(c=>c.dataset.racer===id).selected=value;}},
      setAttribute(n,v){this.attrs[n]=v;},addEventListener(n,fn){this.listeners[n]=fn;}}));
    const context={RACERS,racerId,playSelect(){},location:{href:''},
      document:{querySelector(s){return s==='#launch-game'?launch:message;},querySelectorAll(){return cards;}},
      localStorage:{getItem(k){if(blocked)throw Error('Storage blocked');return storage.get(k);},setItem(k,v){if(blocked)throw Error('Storage blocked');storage.set(k,v);}}};
    vm.runInNewContext(selection,context);return {context,storage,cards,message,launch};
  }
  const f=fixture();
  assert.equal(f.cards[1].attrs['aria-pressed'],'true');assert.match(f.launch.innerHTML,/RACE AS RETREE/);
  f.cards[0].listeners.click();assert.match(f.message.textContent,/GUATAM/);assert.equal(f.storage.get('dlikarts.racer'),'guatam');
  f.cards[1].listeners.click();assert.equal(f.cards[0].selected,false);f.launch.listeners.click();
  assert.equal(f.context.location.href,'../game/?racer=retree');
  const privateMode=fixture(true);privateMode.cards[1].listeners.click();privateMode.launch.listeners.click();
  assert.equal(privateMode.context.location.href,'../game/?racer=retree');
  for(const value of [null,'unknown','__proto__','constructor'])assert.equal(racerId(value),'guatam');
  for(const racer of Object.values(RACERS))assert.ok(existsSync(new URL('../../landing/'+racer.driving.split('?')[0],import.meta.url)));
});

test('Retree standing export is bounded, lightweight, opaque, and source uploads are untouched',()=>{
  const root=new URL('../../',import.meta.url),bytes=readFileSync(new URL('assets/characters/retree-rebuilt/Retree.glb',root));
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  assert.equal(json.meshes.length,1);assert.ok(json.nodes.some(n=>n.name==='RETREE_STANDING'));
  const tris=json.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+json.accessors[p.indices].count/3,0);
  assert.ok(tris<25000);assert.ok(bytes.length<600000);
  assert.ok(json.materials.every(m=>!m.alphaMode||m.alphaMode==='OPAQUE'));
  assert.equal(json.images?.length||0,0);
  for(const a of json.accessors.filter(a=>a.type==='VEC3'&&a.min))assert.ok([...a.min,...a.max].every(Number.isFinite));
  const metrics=JSON.parse(readFileSync(new URL('blender/characters/retree-rebuilt/build-metrics.json',root)));
  for(const [name,hash] of Object.entries(metrics.original_sha256)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('assets/characters/retree/new-models/'+name,root))).digest('hex'),hash);
  }
});
