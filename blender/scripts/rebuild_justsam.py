"""Reference-led Just Sam rebuild; original source GLB remains untouched."""
import bpy, math, runpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
r=runpy.run_path(str(ROOT/'blender/scripts/rebuild_retree.py'),run_name='sam_helpers')
uv,cube,cyl,bar,torus,empty,merge,mat=[r[n] for n in ['uv','cube','cyl','bar','torus','empty','merge','mat']]
g=r['g'];body_mesh=r['body_mesh'];limb=r['limb']
OUT=ROOT/'assets/characters/justsam-rebuilt';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'blender/characters/justsam-rebuilt';SRC.mkdir(parents=True,exist_ok=True)
yellow=mat('Sam golden yellow',(.98,.53,.018),.12,.34)
hair=mat('Sam gold hair',(.98,.49,.035),0,.58)
hairlight=mat('Sam hair highlight',(1,.65,.10),0,.55)
skin=mat('Sam warm skin',(.93,.57,.29),0,.6)
black=mat('Sam black frame',(.018,.020,.026),.15,.5)
cloth=mat('Sam charcoal uniform',(.025,.025,.028),0,.8)
white=mat('Sam ivory',(.95,.95,.91),0,.5)
silver=mat('Sam silver bumper',(.62,.65,.7),.65,.3)
red=mat('Sam red housings',(.85,.018,.012),.25,.3)
lamp=mat('Sam warm lamps',(1,.88,.51),0,.25)
brown=mat('Sam brows',(.30,.13,.04),0,.7)
g['wheel'].__globals__.update(rim=black,silver=yellow)

def triangle(name,center,right,up,material=white):
    c,a,b=Vector(center),Vector(right),Vector(up)
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([c-a*.5-b*.4,c+a*.5-b*.4,c+b*.6],[],[(0,1,2)]);mesh.materials.append(material);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o

def emblem(center,right,up):
    c,a,b=Vector(center),Vector(right),Vector(up);normal=a.cross(b).normalized()
    # Original reference's white D on a black round field; cheap opaque geometry.
    verts=[c]+[c+a*.5*math.cos(i*math.tau/32)+b*.5*math.sin(i*math.tau/32) for i in range(32)]
    faces=[(0,i+1,(i+1)%32+1) for i in range(32)]
    m=bpy.data.meshes.new('D badge field');m.from_pydata(verts,[],faces);m.materials.append(black);m.update()
    o=bpy.data.objects.new('D badge field',m);bpy.context.collection.objects.link(o)
    pts=[(-.22,-.30),(-.10,.30),(.10,.30),(.24,.21),(.28,0),(.18,-.22),(-.22,-.30)]
    parts=[o]
    for i in range(len(pts)-1):
        u,v=pts[i],pts[i+1];parts.append(bar('White D',c+a*u[0]+b*u[1]+normal*.002,c+a*v[0]+b*v[1]+normal*.002,.009,white,8))
    return parts

def kart():
    p=[cube('Floor',(0,.05,.19),(1.10,1.65,.12),black,.04),
       body_mesh('Golden rounded bonnet',[(-1.06,.23,.29,.18),(-.87,.34,.40,.18),(-.43,.30,.55,.22),(-.30,.25,.56,.26)],yellow),
       cube('Seat cushion',(0,.20,.36),(.42,.43,.085),black,.05),cube('Seat back',(0,.44,.57),(.47,.10,.47),black,.065),
       cube('Engine',(0,.68,.34),(.52,.42,.30),black,.05),cube('Red brake housing',(0,.925,.40),(.46,.075,.15),red,.035),
       cube('Brake lamp',(0,.967,.40),(.33,.012,.061),lamp,.012),
       bar('Silver front bumper',(-.43,-1.02,.235),(.43,-1.02,.235),.05,silver,20),
       bar('Silver rear bumper',(-.45,.99,.23),(.45,.99,.23),.05,silver,20),
       cube('Gold wing',(0,.78,.81),(1.20,.18,.085),yellow,.028)]
    p.extend(emblem((0,-.79,.444),(.24,0,0),(0,.16,.069)))
    p.extend(emblem((0,.877,.81),(.17,0,0),(0,0,.073)))
    for s in [-1,1]:
        pod=body_mesh('Golden side pod',[(-.22,.15,.38,.18),(.22,.16,.40,.18),(.50,.14,.35,.18)],yellow);pod.location.x=s*.44;p.append(pod)
        p.extend(emblem((s*.603,.08,.30),(0,s*.21,0),(0,0,.16)))
        p.extend([cube('Silver bumper end',(s*.43,-1.02,.245),(.12,.13,.18),silver,.04),
          cube('Red wing end',(s*.61,.78,.81),(.047,.25,.22),red,.028),
          bar('Wing support',(s*.35,.50,.31),(s*.35,.78,.78),.027,black,10),
          bar('Side frame',(s*.45,-.61,.20),(s*.45,.68,.20),.026,black,10),
          bar('Front wishbone',(s*.19,-.56,.27),(s*.64,-.68,.25),.025,silver,10),
          cyl('Headlamp housing',(s*.35,-.61,.51),.092,.13,silver,24,(math.pi/2,0,0)),
          cyl('Warm lens',(s*.35,-.682,.51),.076,.012,lamp,24,(math.pi/2,0,0)),
          torus('Lamp gold ring',(s*.35,-.69,.51),.083,.008,yellow,(math.pi/2,0,0),24,6),
          cyl('Red exhaust housing',(s*.39,.87,.54),.08,.27,red,24,(math.pi/2,0,0)),
          cyl('Black exhaust opening',(s*.39,1.01,.54),.058,.014,black,24,(math.pi/2,0,0)),
          torus('Silver exhaust lip',(s*.39,1.02,.54),.070,.012,silver,(math.pi/2,0,0),24,6),
          bar('Rear damper',(s*.36,.45,.59),(s*.54,.64,.27),.024,silver,10)])
        for j in range(6):p.append(torus('Gold spring',(s*(.36+j*.029),.45+j*.03,.59-j*.051),.044,.009,yellow,(0,.52,0),12,6))
        empty('EXHAUST_SOCKET_'+('LEFT' if s<0 else 'RIGHT'),(s*.39,1.025,.54))
    p.extend([bar('Steering column',(0,-.28,.36),(0,-.23,.64),.022,silver,10),
      torus('Steering wheel',(0,-.23,.66),.15,.025,black,(math.radians(65),0,0),32,8),
      bar('Steering spoke',(-.12,-.23,.66),(.12,-.23,.66),.013,silver,8)])
    merge(p,'CHASSIS')
    for args in [('FL',-.66,-.68,.245,.26),('FR',.66,-.68,.245,.26),('RL',-.69,.59,.29,.31),('RR',.69,.59,.29,.31)]:g['wheel'](*args,rim_ring=yellow)

def hair_lock(theta):
    # A closed tapered ribbon follows the round crown into a blunt bowl fringe.
    rear=max(0,math.cos(theta));tip=1.125-.055*rear+.007*math.sin(theta*7)
    levels=[(.040,1.407,.018),(.145,1.375,.041),(.235,1.29,.049),(.277,1.18,.048),(.277,tip,.040)]
    verts=[];faces=[]
    radial=Vector((math.sin(theta),math.cos(theta),0));tangent=Vector((math.cos(theta),-math.sin(theta),0))
    for radius,z,w in levels:
        c=Vector((0,.10,z))+radial*radius
        for a,d in [(-1,-1),(1,-1),(1,1),(-1,1)]:verts.append(c+tangent*w*a+radial*.012*d)
    for j in range(len(levels)-1):
        for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
    faces.extend([(3,2,1,0),tuple(range(16,20))])
    m=bpy.data.meshes.new('Gold bowl lock');m.from_pydata(verts,[],faces);m.materials.append(hairlight if int(theta*100)%3==0 else hair);m.update()
    o=bpy.data.objects.new('Gold bowl lock',m);bpy.context.collection.objects.link(o)
    bm=g['bmesh'].new();bm.from_mesh(m);g['bmesh'].ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(m);bm.free()
    bevel=o.modifiers.new('Soft strand corners','BEVEL');bevel.width=.006;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
    return o

def driver():
    p=[uv('Skin head',(0,.10,1.12),(.254,.211,.256),skin,32,20),
       uv('Gold hair foundation',(0,.12,1.19),(.26,.223,.225),hair,32,20),
       uv('Gold nape hair',(0,.245,1.085),(.205,.115,.16),hair,24,16),
       uv('Black shirt',(0,.20,.70),(.21,.15,.23),cloth,24,14),
       cube('Yellow jacket back',(0,.335,.72),(.34,.055,.32),yellow,.04)]
    for i in range(22):p.append(hair_lock(i*math.tau/22))
    # Yellow open jacket panels, sleeves, and original triangle pattern.
    for s in [-1,1]:
        p.append(uv('Yellow jacket panel',(s*.132,.18,.72),(.105,.16,.21),yellow,20,12))
        p.append(bar('Jacket front seam',(s*.072,.009,.52),(s*.067,.01,.90),.010,black,8))
        p.append(uv('Ear',(s*.25,.075,1.10),(.046,.034,.060),skin,16,10))
        p.append(uv('Narrow white eye',(s*.098,-.096,1.075),(.072,.022,.032),white,24,12))
        p.append(uv('Brown iris',(s*.105,-.119,1.073),(.019,.006,.025),brown,16,10))
        p.append(uv('Pupil',(s*.105,-.125,1.074),(.009,.003,.018),black,12,8))
        p.append(bar('Upper eyelid',(s*.04,-.12,1.106),(s*.16,-.086,1.093),.010,brown,10))
        p.append(bar('Angled brow',(s*.045,-.10,1.155),(s*.17,-.063,1.167),.012,brown,10))
        for a,b,rr,material in [((s*.18,.17,.83),(s*.26,-.04,.72),.080,yellow),((s*.26,-.04,.72),(s*.135,-.24,.664),.064,yellow),((s*.12,.23,.49),(s*.20,-.12,.40),.085,cloth),((s*.20,-.12,.40),(s*.21,-.46,.26),.072,cloth)]:
            a,b=Vector(a),Vector(b);d=(b-a).normalized();p.append(limb('Sleeve or leg',a-d*.04,b+d*.04,rr,rr,material,18,10))
        p.append(uv('Black cuff',(s*.153,-.216,.675),(.068,.044,.060),black,16,10))
        p.append(uv('Gripping hand',(s*.13,-.264,.666),(.062,.057,.054),skin,20,12))
        p.append(uv('Thumb',(s*.105,-.282,.697),(.025,.027,.033),skin,16,10))
        p.append(cube('Cargo pocket',(s*.253,-.085,.427),(.032,.14,.12),cloth,.016))
        p.append(cube('Gold pocket tab',(s*.273,-.10,.43),(.007,.022,.047),yellow,.003))
        p.append(cube('Black gold sneaker',(s*.21,-.46,.224),(.17,.27,.11),black,.032))
        p.append(cube('Ivory sole',(s*.21,-.46,.178),(.18,.282,.034),white,.012))
        p.append(cube('Gold sneaker accent',(s*.29,-.46,.23),(.01,.19,.045),yellow,.009))
        for j in range(3):p.append(bar('Shoelace',(s*.21-.05,-.51+j*.025,.282),(s*.21+.05,-.507+j*.025,.282),.006,white,6))
        for z in [.60,.72,.83]:
            p.append(triangle('Jacket front triangle',(s*.13,.006,z),(.054,0,0),(0,0,.052)))
            p.append(triangle('Jacket back triangle',(s*.11,.367,z),(-.054,0,0),(0,0,.052)))
        for y,z in [(.06,.79),(-.06,.74)]:p.append(triangle('Sleeve triangle',(s*.318,y,z),(0,s*.045,0),(0,0,.05)))
    p.append(uv('Nose',(0,-.124,1.013),(.025,.025,.019),skin,16,10))
    p.append(bar('Small mouth',(-.027,-.093,.977),(.037,-.093,.973),.006,brown,8))
    p.append(bar('Reference mouth stick',(.027,-.104,.977),(.111,-.155,.941),.0045,white,8))
    for z in [.60,.69,.78]:p.append(uv('Uniform button',(0,.038,z),(.009,.006,.009),silver,12,8))
    d=merge(p,'JUSTSAM_SEATED');d['noBlueHeadAccessory']=True;d['hairstyle']='complete-golden-bowl-cut'

def reviews():
    sc=bpy.context.scene;sc.render.engine='BLENDER_EEVEE';sc.eevee.taa_render_samples=64
    sc.render.resolution_x=960;sc.render.resolution_y=800;sc.render.resolution_percentage=100;sc.world.color=(.08,.10,.16)
    sc.view_settings.view_transform='Standard';sc.view_settings.look='Medium High Contrast'
    for loc,energy in [((2,-4,5),650),((-3,-1,3),450),((0,4,4),650)]:
        d=bpy.data.lights.new('Review softbox','AREA');d.energy=energy;d.size=4;o=bpy.data.objects.new('Review softbox',d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Review camera');o=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(o);sc.camera=o;d.type='ORTHO';d.ortho_scale=2.7
    for side,loc in [('front',(2.3,-4,2.2)),('rear',(2.3,4,2.2)),('left',(-4,0,1.7)),('right',(4,0,1.7))]:
        o.location=loc;o.rotation_euler=(Vector((0,0,.67))-o.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(SRC/('JustSamDriving-'+side+'.png'));bpy.ops.render.render(write_still=True)
    sc.render.resolution_y=640;d.ortho_scale=3;o.location=(2.3,-4,2.2);o.rotation_euler=(Vector((0,0,.66))-o.location).to_track_quat('-Z','Y').to_euler();sc.render.filepath=str(OUT/'justsam-card.png');bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kart();driver()
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
metrics={'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'source_sha256':hashlib.sha256((ROOT/'assets/characters/justsam/new-models/JustSamDriving.glb').read_bytes()).hexdigest(),'exports':['JustSamDriving.glb'],'blue_head_accessory':False}
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'JustSamDriving.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'JustSamDriving.glb'),export_format='GLB',export_extras=True,export_texcoords=False,export_tangents=False)
(SRC/'build-metrics.json').write_text(json.dumps(metrics,indent=2))
if '--render' in sys.argv:reviews()
print('JUST SAM REBUILD',json.dumps(metrics),flush=True)
