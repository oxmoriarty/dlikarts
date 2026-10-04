// Generated-asset optimization only: preserve geometry/normals, remove unused
// texture coordinates and compact the opaque vertex palette to normalized bytes.
import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve('assets/characters/gautam-rebuilt');
for(const name of ['GautamKart','GautamDriving']) {
  const file=path.join(folder,name+'.glb'),bytes=fs.readFileSync(file);
  const jsonSize=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonSize));
  const oldAccess=json.accessors,oldViews=json.bufferViews,base=28+jsonSize;
  const accessors=[],views=[],chunks=[];let offset=0;
  function read(index) {
    const a=oldAccess[index],v=oldViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const size={5126:4,5125:4,5123:2,5121:1}[a.componentType],start=base+(v.byteOffset||0)+(a.byteOffset||0);
    return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>{
      const p=start+i*(v.byteStride||n*size)+k*size;
      let x=a.componentType===5126?bytes.readFloatLE(p):a.componentType===5125?bytes.readUInt32LE(p):a.componentType===5123?bytes.readUInt16LE(p):bytes[p];
      if(a.normalized)x/=a.componentType===5121?255:65535;return x;
    }));
  }
  function store(data,componentType,type,target,min,max) {
    const b=Buffer.from(data.buffer,data.byteOffset,data.byteLength),padding=(4-offset%4)%4;
    if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
    const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length,target});chunks.push(b);offset+=b.length;
    const a={bufferView:view,componentType,count:data.length/({SCALAR:1,VEC3:3,VEC4:4}[type]),type};
    if(componentType===5121)a.normalized=true;
    if(min)a.min=min;if(max)a.max=max;accessors.push(a);return accessors.length-1;
  }
  for(const mesh of json.meshes) for(const p of mesh.primitives) {
    const positions=read(p.attributes.POSITION),normals=read(p.attributes.NORMAL),colors=read(p.attributes.COLOR_0);
    const unique=new Map(),pos=[],nor=[],col=[],mapping=[];
    for(let i=0;i<positions.length;i++) {
      const c=colors[i].map(v=>Math.round(Math.max(0,Math.min(1,v))*255));
      const key=[...positions[i],...normals[i],...c].join(',');let index=unique.get(key);
      if(index===undefined){index=pos.length/3;unique.set(key,index);pos.push(...positions[i]);nor.push(...normals[i]);col.push(...c);}
      mapping.push(index);
    }
    const source=read(p.indices).map(v=>mapping[v[0]]),large=pos.length/3>65535;
    const min=[0,1,2].map(k=>positions.reduce((m,v)=>Math.min(m,v[k]),Infinity));
    const max=[0,1,2].map(k=>positions.reduce((m,v)=>Math.max(m,v[k]),-Infinity));
    p.attributes={POSITION:store(new Float32Array(pos),5126,'VEC3',34962,min,max),NORMAL:store(new Float32Array(nor),5126,'VEC3',34962),COLOR_0:store(new Uint8Array(col),5121,'VEC4',34962)};
    p.indices=store(large?new Uint32Array(source):new Uint16Array(source),large?5125:5123,'SCALAR',34963);
  }
  json.accessors=accessors;json.bufferViews=views;json.buffers=[{byteLength:offset}];
  let j=Buffer.from(JSON.stringify(json));j=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
  let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
  const head=Buffer.alloc(20);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+j.length+bin.length,8);head.writeUInt32LE(j.length,12);head.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(file,Buffer.concat([head,j,bh,bin]));console.log(name,bytes.length,'->',fs.statSync(file).size);
}
