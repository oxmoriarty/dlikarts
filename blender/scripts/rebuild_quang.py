"""Clean Quang driving model from the uploaded GLB and four-view image sheets.
Run: blender --background --python blender/scripts/rebuild_quang.py -- --render
One combined runtime export; driver and wheels have distinct inspectable nodes.
"""
import bpy, math, runpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
r=runpy.run_path(str(ROOT/'blender/scripts/rebuild_retree.py'),run_name='quang_helpers')
uv,cube,cyl,bar,torus,empty,merge,mat=[r[n] for n in ['uv','cube','cyl','bar','torus','empty','merge','mat']]
body_mesh=r['body_mesh'];badge=r['badge'];limb=r['limb'];g=r['g']
OUT=ROOT/'assets/characters/quang-rebuilt';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'blender/characters/quang-rebuilt';SRC.mkdir(parents=True,exist_ok=True)
skin=mat('Quang uniform bald skin',(.93,.66,.45),0,.56)
inner_skin=mat('Quang inner ear',(.85,.40,.24),0,.62)
white=mat('Quang ivory white',(.94,.96,1),0,.48)
blue=mat('Quang cobalt blue',(.015,.105,.85),.18,.3)
cyan=mat('Quang cyan trim',(.04,.68,1),.2,.3)
orange=mat('Quang orange trim',(1,.36,.035),.12,.35)
black=mat('Quang black frame',(.018,.022,.032),.25,.35)
pants=mat('Quang black cargo cloth',(.032,.034,.04),0,.8)
metal=mat('Quang gunmetal',(.18,.20,.25),.7,.28)
iris=mat('Quang blue eyes',(.025,.35,.80),0,.35)
red=mat('Quang rear red lamp',(.96,.025,.01),0,.28)
warm_lamp=mat('Quang warm headlights',(1,.83,.42),0,.25)
mouth=mat('Quang smile',(.07,.014,.012),0,.8)
tongue=mat('Quang tongue',(.9,.11,.075),0,.7)
g['wheel'].__globals__.update(rim=black,silver=metal)
r['badge'].__globals__['white']=white

def striped_panel(name,center,size,base=blue,axis='x'):
    parts=[cube(name,center,size,base,.023)]
    # Broad orange and ivory bands follow the source's rear-wing/side-pod palette.
    return parts

def spring(name,start,end):
    a,b=Vector(start),Vector(end);direction=(b-a).normalized()
    across=direction.cross(Vector((0,1,0))).normalized();depth=direction.cross(across).normalized()
    pts=[]
    for i in range(49):
        t=i/48;angle=t*math.tau*4
        pts.append(a.lerp(b,t)+across*(math.cos(angle)*.043)+depth*(math.sin(angle)*.043))
    return [bar(name,pts[i],pts[i+1],.009,blue,6) for i in range(len(pts)-1)]

def kart():
    p=[cube('Floor pan',(0,.04,.20),(1.12,1.65,.12),black,.04),
       body_mesh('White sculpted bonnet',[(-1.08,.235,.29,.18),(-.88,.36,.40,.18),(-.47,.31,.57,.21),(-.30,.25,.59,.27)],white),
       body_mesh('Blue bonnet inset',[(-1.082,.18,.297,.25),(-.87,.225,.414,.36),(-.49,.20,.582,.54)],blue),
       cube('Seat cushion',(0,.21,.37),(.40,.43,.085),black,.04),
       cube('Seat back',(0,.46,.56),(.45,.09,.43),black,.06),
       cube('Rear engine',(0,.68,.34),(.56,.38,.34),black,.055),
       cube('Engine blue rear cover',(0,.895,.40),(.38,.055,.30),blue,.035),
       cube('Engine orange surround',(0,.879,.40),(.44,.03,.34),orange,.026),
       cube('Rear white bumper',(0,.88,.20),(1.04,.14,.17),white,.045),
       cube('Rear lamp housing',(0,.964,.29),(.58,.045,.12),black,.02),
       cube('Rear red lamp',(0,.991,.29),(.48,.012,.045),red,.014),
       cube('Rear lamp core',(0,.999,.29),(.44,.005,.016),warm_lamp,.005)]
    for z in [.32,.385,.45]:p.append(cube('Cyan engine vent',(0,.929,z),(.28,.012,.012),cyan,.005))
    p.append(badge('Bonnet Dlicom insignia',(0,-.82,.442),(.25,0,0),(0,.17,.073)))
    for s in [-1,1]:
        # Sculpted side pods with clean, readable white/orange/blue color blocking.
        pod=body_mesh('Blue side pod',[(-.20,.14,.39,.19),(.25,.16,.44,.18),(.50,.14,.37,.18)],blue);pod.location.x=s*.44;p.append(pod)
        panel=cube('Ivory side panel',(s*.598,-.05,.30),(.024,.29,.21),white,.015);p.append(panel)
        stripe=cube('Orange side stripe',(s*.615,.095,.305),(.008,.060,.215),orange,.005);stripe.rotation_euler.x=math.radians(-15);p.append(stripe)
        p.append(badge('Side pod Dlicom insignia',(s*.608,.285,.31),(0,s*.23,0),(0,0,.15)))
        p.extend([bar('Front lower wishbone',(s*.18,-.59,.23),(s*.62,-.68,.245),.023,metal,10),
          bar('Front upper wishbone',(s*.23,-.47,.37),(s*.62,-.68,.275),.018,metal,10),
          bar('Side chassis',(s*.47,-.55,.21),(s*.47,.64,.21),.027,blue,10),
          cyl('Headlight housing',(s*.345,-.56,.535),.100,.12,metal,24,(math.pi/2,0,0)),
          cyl('Headlight ivory lens',(s*.345,-.628,.535),.079,.012,warm_lamp,24,(math.pi/2,0,0)),
          torus('Headlight orange ring',(s*.345,-.64,.535),.087,.009,orange,(math.pi/2,0,0),24,6),
          cube('Front marker housing',(s*.28,-1.034,.27),(.073,.036,.13),blue,.015),
          cube('Front cyan marker',(s*.28,-1.056,.27),(.017,.008,.099),cyan,.005),
          bar('Orange bonnet shoulder',(s*.255,-.94,.31),(s*.30,-.66,.44),.016,orange,10),
          bar('Rear spoiler strut',(s*.36,.52,.31),(s*.36,.80,.78),.029,black,10),
          cube('Blue spoiler end plate',(s*.62,.80,.82),(.045,.26,.24),blue,.026),
          cube('Cyan spoiler edge',(s*.646,.80,.82),(.012,.235,.215),cyan,.018),
          cyl('Exhaust metal housing',(s*.40,.905,.535),.076,.28,metal,24,(math.pi/2,0,0)),
          cyl('Dark exhaust aperture',(s*.40,1.052,.535),.057,.012,black,24,(math.pi/2,0,0)),
          torus('Blue exhaust lip',(s*.40,1.062,.535),.065,.009,cyan,(math.pi/2,0,0),24,6)])
        p.extend(spring('Rear coilover',(s*.365,.46,.57),(s*.54,.67,.27)))
        p.extend(spring('Front coilover',(s*.35,-.39,.47),(s*.53,-.65,.29)))
        empty('EXHAUST_SOCKET_'+('LEFT' if s<0 else 'RIGHT'),(s*.40,1.065,.535))
    p.extend([cube('Blue rear wing',(0,.80,.82),(1.22,.23,.070),blue,.025),
      bar('Steering column',(0,-.27,.36),(0,-.22,.65),.023,metal,12),
      torus('Steering wheel',(0,-.22,.66),.151,.025,black,(math.radians(65),0,0),32,8),
      bar('Steering cross spoke',(-.12,-.22,.66),(.12,-.22,.66),.015,metal,8),
      cube('Steering blue marker',(0,-.285,.792),(.035,.025,.02),cyan,.006)])
    for s in [-1,1]:
        p.append(cube('Wing orange band',(s*.51,.80,.858),(.135,.20,.010),orange,.004))
        p.append(cube('Wing ivory band',(s*.408,.80,.858),(.060,.20,.010),white,.003))
    p.append(badge('Wing Dlicom insignia',(0,.921,.82),(.22,0,0),(0,0,.065)))
    merge(p,'CHASSIS')
    for args in [('FL',-.66,-.68,.245,.26),('FR',.66,-.68,.245,.26),('RL',-.69,.59,.29,.31),('RR',.69,.59,.29,.31)]:g['wheel'](*args,rim_ring=cyan)

def rounded_frame(name,cx,y,z,wx,hz,corner,material):
    pts=[]
    for dx,dz,start in [(wx-corner,hz-corner,0),(-wx+corner,hz-corner,90),(-wx+corner,-hz+corner,180),(wx-corner,-hz+corner,270)]:
        for i in range(5):
            a=math.radians(start+i*90/4)
            pts.append((cx+dx+corner*math.cos(a),y,z+dz+corner*math.sin(a)))
    return [bar(name,pts[i],pts[(i+1)%len(pts)],.0105,material,8) for i in range(len(pts))]

def driver():
    p=[]
    # Keep the entire scalp as a distinct single-color mesh so its correction
    # is verifiable after packing; glasses/brows belong to the separate face.
    head=uv('QUANG_HEAD',(0,.10,1.115),(.265,.219,.270),skin,40,24)
    head['bald']=True;head['surface']='uniform-skin';head['skinColor']=list(skin.diffuse_color[:3])
    r['g']['h']['collapse_to_vertex_palette'](head)
    def ell(name,loc,scale,material,seg=20,rings=12):
        o=uv(name,loc,scale,material,seg,rings);p.append(o);return o
    ell('White hoodie',(0,.205,.695),(.225,.158,.23),white,24,14)
    ell('White folded hood',(0,.30,.86),(.228,.132,.13),white,24,12)
    p.extend([torus('Blue collar',(0,.17,.923),.128,.041,blue,(0,0,0),24,8),
      torus('Ivory hood seam',(0,.18,.916),.155,.031,white,(0,0,0),24,8),
      cube('Blue hoodie hem',(0,.205,.52),(.36,.26,.055),blue,.022),
      cube('Ivory kangaroo pocket',(0,.043,.64),(.24,.033,.11),white,.026),
      cube('Blue chest patch',(.12,.035,.797),(.085,.026,.082),blue,.014),
      badge('Hoodie Dlicom insignia',(.12,.019,.797),(.075,0,0),(0,0,.051))])
    for s in [-1,1]:
        ell('Ear',(s*.265,.087,1.086),(.056,.041,.073),skin)
        ell('Inner ear',(s*.282,.054,1.086),(.024,.013,.043),inner_skin,16,10)
        ell('White eye',(s*.108,-.108,1.131),(.087,.040,.09),white,24,14)
        ell('Blue iris',(s*.108,-.147,1.13),(.047,.012,.061),iris,20,12)
        ell('Dark pupil',(s*.108,-.159,1.13),(.026,.007,.043),black,20,12)
        ell('Eye glint',(s*.108-.013,-.166,1.153),(.011,.004,.014),white,12,8)
        p.extend(rounded_frame('Black glasses',s*.110,-.175,1.135,.103,.095,.035,black))
        p.append(bar('Glasses temple',(s*.207,-.172,1.17),(s*.269,.126,1.142),.009,black,10))
        brow=[(s*.079,-.107,1.245),(s*.114,-.102,1.255),(s*.153,-.082,1.244)]
        for j in range(2):p.append(bar('Eyebrow',brow[j],brow[j+1],.012,black,10))
        for a,b,rr,material in [((s*.19,.18,.83),(s*.269,-.035,.715),.078,white),
          ((s*.269,-.035,.715),(s*.135,-.245,.664),.064,white),
          ((s*.12,.23,.49),(s*.20,-.12,.40),.085,pants),
          ((s*.20,-.12,.40),(s*.21,-.46,.26),.072,pants)]:
            a,b=Vector(a),Vector(b);d=(b-a).normalized();p.append(limb('Sleeve or cargo leg',a-d*.05,b+d*.05,rr,rr,material,20,10))
        ell('Blue sleeve cuff',(s*.153,-.216,.673),(.069,.045,.066),blue)
        ell('Hand gripping wheel',(s*.132,-.264,.666),(.063,.056,.055),skin)
        ell('Thumb',(s*.10,-.282,.699),(.026,.027,.033),skin,16,10)
        p.append(cube('Cargo pocket',(s*.255,-.08,.425),(.036,.14,.12),pants,.019))
        p.append(cube('Cargo blue tab',(s*.276,-.10,.437),(.006,.02,.065),blue,.004))
        p.append(cube('Blue white sneaker',(s*.21,-.46,.225),(.17,.275,.115),blue,.035))
        p.append(cube('Ivory sneaker sole',(s*.21,-.46,.178),(.18,.282,.034),white,.012))
        p.append(cube('Ivory toe cap',(s*.21,-.553,.24),(.15,.06,.065),white,.019))
        for j in range(3):p.append(bar('White shoelace',(s*.21-.049,-.51+j*.025,.286),(s*.21+.049,-.507+j*.025,.286),.006,white,6))
        p.append(bar('Blue hood drawstring',(s*.078,.02,.87),(s*.065,-.001,.745),.008,blue,8))
        p.append(cube('Blue shoulder patch',(s*.249,.108,.811),(.018,.080,.092),blue,.015))
    p.append(bar('Glasses bridge',(-.019,-.178,1.143),(.019,-.178,1.143),.0095,black,10))
    ell('Nose',(0,-.137,1.045),(.033,.031,.027),skin)
    ell('Happy smile',(0,-.088,1.005),(.067,.023,.036),mouth,24,12)
    ell('Tongue',(0,-.109,.994),(.038,.005,.012),tongue,16,10)
    p.append(cube('Upper smile teeth',(0,-.11,1.02),(.094,.009,.013),white,.005))
    merge(p,'QUANG_SEATED')

def render_reviews():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=64
    scene.render.resolution_x=960;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world.color=(.08,.10,.16);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
    for loc,energy in [((2,-4,5),650),((-3,-1,3),450),((0,4,4),650)]:
        d=bpy.data.lights.new('Review softbox','AREA');d.energy=energy;d.size=4;o=bpy.data.objects.new('Review softbox',d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Review camera');o=bpy.data.objects.new('Review camera',d);scene.collection.objects.link(o);scene.camera=o;d.type='ORTHO';d.ortho_scale=2.7
    for side,loc in [('front',(2.3,-4,2.2)),('rear',(2.3,4,2.2)),('left',(-4,0,1.7)),('right',(4,0,1.7))]:
        o.location=loc;o.rotation_euler=(Vector((0,0,.67))-o.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(SRC/('QuangDriving-'+side+'.png'));bpy.ops.render.render(write_still=True)
    scene.render.resolution_y=640;d.ortho_scale=3.0;o.location=(2.3,-4,2.2);o.rotation_euler=(Vector((0,0,.66))-o.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/'quang-card.png');bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kart();driver()
for o in bpy.context.scene.objects:
    if o.type=='MESH':
        for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
metrics={'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),
         'source_sha256':hashlib.sha256((ROOT/'assets/characters/quang/new-models/QuangDriving.glb').read_bytes()).hexdigest(),
         'bald_skin_rgb':list(skin.diffuse_color[:3]),'exports':['QuangDriving.glb']}
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'QuangDriving.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'QuangDriving.glb'),export_format='GLB',export_extras=True,export_texcoords=False,export_tangents=False)
(SRC/'build-metrics.json').write_text(json.dumps(metrics,indent=2))
if '--render' in sys.argv:render_reviews()
print('QUANG REBUILD',json.dumps(metrics),flush=True)
