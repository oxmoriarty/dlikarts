"""Clean reference-led Kapuriya driving asset; original GLB is never modified."""
import bpy, math, runpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
r=runpy.run_path(str(ROOT/'blender/scripts/rebuild_retree.py'),run_name='kapuriya_helpers')
uv,cube,cyl,bar,torus,empty,merge,mat=[r[n] for n in ['uv','cube','cyl','bar','torus','empty','merge','mat']]
g=r['g'];body_mesh=r['body_mesh'];limb=r['limb']
OUT=ROOT/'assets/characters/kapuriya-rebuilt';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'blender/characters/kapuriya-rebuilt';SRC.mkdir(parents=True,exist_ok=True)
blue=mat('Kapuriya bright blue',(.015,.32,.90),.08,.42)
cobalt=mat('Kapuriya cobalt kart',(.014,.08,.92),.22,.3)
white=mat('Kapuriya warm white',(.96,.945,.89),0,.55)
black=mat('Kapuriya dark frame',(.012,.017,.025),.12,.5)
silver=mat('Kapuriya silver',(.57,.62,.70),.7,.28)
red=mat('Kapuriya red',(.92,.015,.012),.2,.3)
gold=mat('Kapuriya bell',(.98,.56,.015),.55,.25)
cyan=mat('Kapuriya cyan lip',(.04,.65,1),.3,.25)
lamp=mat('Kapuriya warm headlamp',(1,.86,.44),0,.2)
g['wheel'].__globals__.update(rim=black,silver=cobalt)

def flat_shape(name,c,a,b,points):
    verts=[c+a*x+b*y for x,y in points];m=bpy.data.meshes.new(name);m.from_pydata(verts,[],[tuple(range(len(verts)))]);m.materials.append(white);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);return o

def paw(center,right,up):
    c,a,b=Vector(center),Vector(right),Vector(up);parts=[]
    pad=[(-.33,-.24),(-.29,-.05),(-.15,.12),(0,.17),(.15,.12),(.29,-.05),(.33,-.24),(.21,-.31),(0,-.26),(-.21,-.31)]
    parts.append(flat_shape('Paw palm',c,a,b,pad))
    for x,y,sx,sy in [(-.34,.20,.105,.12),(-.13,.38,.11,.135),(.13,.38,.11,.135),(.34,.20,.105,.12)]:
        parts.append(flat_shape('Paw toe',c,a,b,[(x+sx*math.cos(i*math.tau/20),y+sy*math.sin(i*math.tau/20)) for i in range(20)]))
    return parts

def kart():
    p=[cube('Floor pan',(0,.05,.19),(1.10,1.65,.12),black,.04),
       body_mesh('Rounded blue bonnet',[(-1.06,.23,.29,.18),(-.87,.34,.40,.18),(-.43,.30,.55,.22),(-.30,.25,.56,.26)],blue),
       cube('Seat cushion',(0,.20,.36),(.42,.43,.085),black,.05),cube('Seat back',(0,.44,.57),(.47,.10,.47),black,.065),
       cube('Engine',(0,.68,.34),(.52,.42,.30),black,.05),cube('Brake housing',(0,.925,.40),(.46,.075,.15),black,.035),
       cube('Red rear lamp',(0,.967,.40),(.33,.012,.061),red,.012),
       bar('Silver front bumper',(-.43,-1.02,.235),(.43,-1.02,.235),.05,silver,20),
       bar('Silver rear bumper',(-.45,.99,.23),(.45,.99,.23),.05,silver,20),
       cube('Cobalt wing',(0,.78,.81),(1.20,.18,.13),cobalt,.025)]
    bevel=p[1].modifiers.new('Rounded bonnet edges','BEVEL');bevel.width=.014;bevel.segments=2;bpy.context.view_layer.objects.active=p[1];bpy.ops.object.modifier_apply(modifier=bevel.name)
    p.extend(paw((0,-.77,.454),(.31,0,0),(0,.20,.084)))
    for s in [-1,1]:
        pod=body_mesh('Cobalt side pod',[(-.22,.15,.38,.18),(.22,.16,.40,.18),(.50,.14,.35,.18)],cobalt);pod.location.x=s*.44;p.append(pod)
        stripe=cube('White side stripe',(s*.606,-.13,.29),(.013,.15,.20),white,.005);stripe.rotation_euler.x=-.35;p.append(stripe)
        stripe=cube('Red side stripe',(s*.615,-.245,.29),(.01,.037,.20),red,.004);stripe.rotation_euler.x=-.35;p.append(stripe)
        p.extend(paw((s*.612,.21,.30),(0,s*.20,0),(0,0,.15)))
        for y in [.684,.876]:p.extend(paw((s*.36,y,.81),(s*.17,0,0),(0,0,.11)))
        p.extend([cube('Silver bumper end',(s*.43,-1.02,.245),(.12,.13,.18),silver,.04),
          cube('Cobalt wing end',(s*.61,.78,.81),(.047,.25,.22),cobalt,.028),
          bar('Silver wing support',(s*.35,.50,.31),(s*.35,.78,.78),.027,silver,10),
          bar('Side frame',(s*.45,-.61,.20),(s*.45,.68,.20),.026,black,10),
          bar('Front wishbone',(s*.19,-.56,.27),(s*.64,-.68,.25),.025,silver,10),
          cyl('Headlamp housing',(s*.35,-.61,.51),.092,.13,silver,24,(math.pi/2,0,0)),
          cyl('Warm lens',(s*.35,-.682,.51),.076,.012,lamp,24,(math.pi/2,0,0)),
          torus('Lamp gold ring',(s*.35,-.69,.51),.083,.008,gold,(math.pi/2,0,0),24,6),
          cyl('Silver exhaust',(s*.39,.87,.54),.08,.27,silver,24,(math.pi/2,0,0)),
          cyl('Black exhaust opening',(s*.39,1.01,.54),.058,.014,black,24,(math.pi/2,0,0)),
          torus('Cyan exhaust lip',(s*.39,1.02,.54),.07,.012,cyan,(math.pi/2,0,0),24,6),
          bar('Rear damper',(s*.36,.45,.59),(s*.54,.64,.27),.024,silver,10)])
        for j in range(6):p.append(torus('Blue spring',(s*(.36+j*.029),.45+j*.03,.59-j*.051),.044,.009,cobalt,(0,.52,0),12,6))
        empty('EXHAUST_SOCKET_'+('LEFT' if s<0 else 'RIGHT'),(s*.39,1.025,.54))
    p.extend([bar('Steering column',(0,-.28,.36),(0,-.23,.64),.022,silver,10),torus('Steering wheel',(0,-.23,.66),.15,.025,black,(math.radians(65),0,0),32,8)])
    merge(p,'CHASSIS')
    for args in [('FL',-.66,-.68,.245,.26),('FR',.66,-.68,.245,.26),('RL',-.69,.59,.29,.31),('RR',.69,.59,.29,.31)]:g['wheel'](*args,rim_ring=cyan)

def driver():
    p=[]
    def ell(n,c,s,m,seg=24,rings=16):
        o=uv(n,c,s,m,seg,rings);p.append(o);return o
    ell('Round blue head',(0,.12,1.08),(.30,.25,.28),blue,40,28)
    ell('White face',(0,-.064,1.035),(.254,.092,.207),white,36,24)
    ell('Blue torso',(0,.20,.675),(.235,.17,.225),blue,28,18)
    ell('White belly',(0,.045,.65),(.152,.032,.15),white,24,16)
    ell('White belly pocket',(0,.012,.603),(.125,.016,.078),white,24,12)
    p.append(torus('Red collar',(0,.15,.845),.165,.021,red,(0,0,0),32,8))
    ell('Gold bell',(0,-.016,.800),(.041,.032,.043),gold,24,16)
    p.append(bar('Bell slit',(0,-.05,.785),(0,-.05,.805),.004,black,8))
    ell('Bell slit hole',(0,-.05,.814),(.006,.003,.006),black,12,8)
    for s in [-1,1]:
        ell('Eye white',(s*.071,-.115,1.173),(.075,.035,.056),white,24,16)
        ell('Eye pupil',(s*.053,-.150,1.19),(.023,.008,.031),black,20,12)
        ell('Pupil highlight',(s*.053-.008,-.16,1.20),(.006,.003,.008),white,12,8)
        p.append(bar('Half-lidded eye edge',(s*.017,-.142,1.204),(s*.139,-.110,1.189),.004,black,8))
        for j in range(3):
            p.append(bar('Whisker',(s*.151,-.144,1.078-j*.03),(s*.224,-.108,1.091-j*.037),.0035,black,8))
        a,b=Vector((s*.185,.16,.77)),Vector((s*.145,-.245,.666));p.append(limb('Blue sleeve',a,b,.085,.066,blue,20,12))
        ell('White paw on wheel',(s*.137,-.255,.67),(.078,.064,.069),white,24,16)
        ell('Blue thigh',(s*.12,.04,.43),(.11,.19,.10),blue,20,14)
        ell('White foot',(s*.19,-.36,.27),(.12,.16,.073),white,24,16)
    ell('Red round nose',(0,-.179,1.11),(.027,.027,.029),red,24,16)
    ell('Nose shine',(-.009,-.200,1.123),(.009,.004,.008),white,12,8)
    p.append(bar('Nose to mouth',(0,-.161,1.083),(0,-.158,.993),.0035,black,8))
    for j in range(24):
        def point(t):
            x=t*.197;z=.978+.084*t*t
            y=-.064-.092*math.sqrt(max(0,1-(x/.254)**2-((z-1.035)/.207)**2))-.005
            return (x,y,z)
        p.append(bar('Curved smile',point(-1+j/12),point(-1+(j+1)/12),.0035,black,8))
    ell('Red tail',(0,.38,.55),(.048,.043,.048),red,20,12)
    o=merge(p,'KAPURIYA_SEATED');o['referenceCharacter']='Kapuriya';o['roundHead']=True

def reviews():
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.eevee.taa_render_samples=64;sc.render.resolution_x=960;sc.render.resolution_y=800;sc.render.resolution_percentage=100;sc.world.color=(.08,.10,.16);sc.view_settings.view_transform='Standard';sc.view_settings.look='Medium High Contrast'
    for loc,energy in [((2,-4,5),650),((-3,-1,3),450),((0,4,4),650)]:
        d=bpy.data.lights.new('Review softbox','AREA');d.energy=energy;d.size=4;o=bpy.data.objects.new('Review softbox',d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Review camera');o=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(o);sc.camera=o;d.type='ORTHO';d.ortho_scale=2.7
    for side,loc in [('front',(2.3,-4,2.2)),('rear',(2.3,4,2.2)),('left',(-4,0,1.7)),('right',(4,0,1.7))]:
        o.location=loc;o.rotation_euler=(Vector((0,0,.67))-o.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(SRC/('KapuriyaDriving-'+side+'.png'));bpy.ops.render.render(write_still=True)
    sc.render.resolution_y=640;d.ortho_scale=3;o.location=(2.3,-4,2.2);o.rotation_euler=(Vector((0,0,.66))-o.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(OUT/'kapuriya-card.png');bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kart();driver()
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
metrics={'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'source_sha256':hashlib.sha256((ROOT/'assets/characters/kapuriya/new-models/KapuriyaDriving.glb').read_bytes()).hexdigest(),'exports':['KapuriyaDriving.glb']}
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'KapuriyaDriving.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'KapuriyaDriving.glb'),export_format='GLB',export_extras=True,export_texcoords=False,export_tangents=False)
(SRC/'build-metrics.json').write_text(json.dumps(metrics,indent=2))
if '--render' in sys.argv:reviews()
print('KAPURIYA REBUILD',json.dumps(metrics),flush=True)
