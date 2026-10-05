import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { RACERS, racerId } from '../../shared/racers.js';

for(const selectedId of ['retree','quang','justsam'])test(`${selectedId} selection persists, changes the launch label, and launches the selected model`,()=>{
  const source=readFileSync(new URL('../../landing/menu.js',import.meta.url),'utf8');
  const selection=source.slice(source.indexOf("let selectedRacer = 'guatam';"),source.indexOf("document.addEventListener('keydown'"));
  function fixture(blocked=false) {
    const storage=new Map([['dlikarts.racer',selectedId]]),message={},launch={listeners:{},addEventListener(n,fn){this.listeners[n]=fn;}};
    const cards=Object.keys(RACERS).map(id=>({dataset:{racer:id},selected:false,attrs:{},listeners:{},
      classList:{toggle(_,value){cards.find(c=>c.dataset.racer===id).selected=value;}},
      setAttribute(n,v){this.attrs[n]=v;},addEventListener(n,fn){this.listeners[n]=fn;}}));
    const context={RACERS,racerId,playSelect(){},location:{href:''},
      document:{querySelector(s){return s==='#launch-game'?launch:message;},querySelectorAll(){return cards;}},
      localStorage:{getItem(k){if(blocked)throw Error('Storage blocked');return storage.get(k);},setItem(k,v){if(blocked)throw Error('Storage blocked');storage.set(k,v);}}};
    vm.runInNewContext(selection,context);return {context,storage,cards,message,launch};
  }
  const f=fixture();
  const selected=f.cards.find(c=>c.dataset.racer===selectedId);
  assert.equal(selected.attrs['aria-pressed'],'true');assert.ok(f.launch.innerHTML.includes('RACE AS '+RACERS[selectedId].name));
  f.cards[0].listeners.click();assert.match(f.message.textContent,/GUATAM/);assert.equal(f.storage.get('dlikarts.racer'),'guatam');
  selected.listeners.click();assert.equal(f.cards[0].selected,false);f.launch.listeners.click();
  assert.equal(f.context.location.href,'../game/?racer='+selectedId);
  const privateMode=fixture(true);privateMode.cards.find(c=>c.dataset.racer===selectedId).listeners.click();privateMode.launch.listeners.click();
  assert.equal(privateMode.context.location.href,'../game/?racer='+selectedId);
  for(const value of [null,'unknown','__proto__','constructor'])assert.equal(racerId(value),'guatam');
  for(const racer of Object.values(RACERS))assert.ok(existsSync(new URL('../../landing/'+racer.driving.split('?')[0],import.meta.url)));
});

test('Just Sam omits the blue head accessory and preserves the uploaded source',()=>{
  const root=new URL('../../',import.meta.url),bytes=readFileSync(new URL('assets/characters/justsam-rebuilt/JustSamDriving.glb',root));
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
  const driver=json.nodes.find(n=>n.name==='JUSTSAM_SEATED');assert.ok(driver);
  assert.ok(driver.extras.noBlueHeadAccessory);assert.equal(driver.extras.hairstyle,'complete-golden-bowl-cut');
  assert.equal(json.images?.length||0,0);
  const p=json.meshes[driver.mesh].primitives[0],color=json.accessors[p.attributes.COLOR_0],view=json.bufferViews[color.bufferView];
  const start=28+length+(view.byteOffset||0)+(color.byteOffset||0),stride=view.byteStride||4;
  for(let i=0;i<color.count;i++){
    const at=start+i*stride;assert.equal(bytes[at+3],255);
    assert.ok(!(bytes[at+2]>bytes[at]+30 && bytes[at+2]>bytes[at+1]+30),'No blue vertex color on the driver/head');
  }
  const source=readFileSync(new URL('assets/characters/justsam/new-models/JustSamDriving.glb',root));
  assert.equal(createHash('sha256').update(source).digest('hex'),'10cb0c57846738152e6424f37db67c4e2e74e3e9d8daff7255b0eb72110bb9d8');
});

test('Quang has a uniformly skin-colored opaque bald head and keeps the source GLB unchanged',()=>{
  const root=new URL('../../',import.meta.url),bytes=readFileSync(new URL('assets/characters/quang-rebuilt/QuangDriving.glb',root));
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength));
  const head=json.nodes.find(n=>n.name==='QUANG_HEAD');assert.ok(head);
  assert.ok(head.extras.bald===true||head.extras.bald===1);assert.equal(head.extras.surface,'uniform-skin');
  const primitives=json.meshes[head.mesh].primitives;assert.equal(primitives.length,1);
  const color=json.accessors[primitives[0].attributes.COLOR_0],view=json.bufferViews[color.bufferView];
  assert.equal(color.componentType,5121);assert.equal(color.normalized,true);assert.equal(color.type,'VEC4');
  const start=28+jsonLength+(view.byteOffset||0)+(color.byteOffset||0),stride=view.byteStride||4;
  const skin=Array.from(bytes.subarray(start,start+4));
  assert.ok(skin[0]>128&&skin[1]>50&&skin[2]>20&&skin[0]>skin[1]&&skin[1]>skin[2],'Head color is warm skin, not black');
  assert.equal(skin[3],255);
  for(let i=0;i<color.count;i++)assert.deepEqual(Array.from(bytes.subarray(start+i*stride,start+i*stride+4)),skin,'No black scalp vertices');
  const material=json.materials[primitives[0].material];assert.ok(!material.alphaMode||material.alphaMode==='OPAQUE');
  assert.ok(!material.pbrMetallicRoughness?.baseColorTexture);
  assert.equal(json.images?.length||0,0);
  const reference=JSON.parse(readFileSync(new URL('blender/characters/quang-rebuilt/reference/source-metrics.json',root)));
  assert.equal(createHash('sha256').update(readFileSync(new URL('assets/characters/quang/new-models/QuangDriving.glb',root))).digest('hex'),reference.sha256);
  assert.equal(existsSync(new URL('assets/characters/quang-rebuilt/Quang.glb',root)),false);
  assert.equal(existsSync(new URL('assets/characters/quang-rebuilt/QuangKart.glb',root)),false);
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
