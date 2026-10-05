"""Clean reference-led reconstruction, not a remesh of AI geometry.
Run with Blender 2.83: blender --background --python blender/scripts/rebuild_gautam.py
Optional --render produces review images alongside source .blend files.
"""
import bpy, math, os, runpy, sys, bmesh
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
os.environ['DLIKARTS_BUILD']='helpers'
h=runpy.run_path(str(ROOT/'blender/scripts/build_guatam_assets.py'))
uv,cube,cyl,bar,torus,empty=[h[n] for n in ['uv','cube','cyl','cyl_between','torus','empty']]
join=h['join_meshes'];mat=h['mat'];lock=h['hair_lock']
OUT=ROOT/'assets/characters/gautam-rebuilt';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'blender/characters/gautam-rebuilt';SRC.mkdir(parents=True,exist_ok=True)
black=mat('Rebuilt charcoal',(.018,.021,.028),.1,.42)
cloth=mat('Rebuilt black hoodie',(.028,.031,.038),0,.82)
rubber=mat('Rebuilt rubber',(.012,.014,.017),0,.86)
rim=mat('Rebuilt graphite metal',(.11,.13,.16),.7,.3)
silver=mat('Rebuilt silver',(.36,.40,.46),.8,.25)
red=mat('Rebuilt scarlet',(.72,.014,.02),.25,.28)
white=mat('Rebuilt warm white',(.95,.94,.89),0,.5)
skin=mat('Rebuilt warm skin',(.74,.34,.13),0,.65)
hair=mat('Rebuilt chocolate hair',(.10,.039,.014),0,.62)
hairlight=mat('Rebuilt hair highlights',(.16,.066,.023),0,.62)
lamp=mat('Rebuilt ivory lamp',(.98,.91,.66),0,.25)

def merge(parts,name,parent=None):
    obj=join(parts,name)
    if parent:
        world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world
    return obj

def flowing_lock(name,base,tip,width,thickness,material):
    # Curved tapered clumps instead of straight polygonal cones.
    a,b=Vector(base),Vector(tip);direction=(b-a).normalized()
    across=direction.cross(Vector((0,1,0))).normalized()
    depth=direction.cross(across).normalized();verts=[];faces=[];n=12
    rings=12
    for row in range(rings):
        t=row/(rings-1);r=(.7+.3*math.sin(min(t/.25,1)*math.pi/2))*(1-t)**.7 if row<rings-1 else .003
        c=a.lerp(b,t)+Vector((0,-.022*math.sin(math.pi*t),.055*math.sin(math.pi*t)))
        for i in range(n):
            angle=i*math.tau/n;verts.append(c+across*math.cos(angle)*width*r+depth*math.sin(angle)*thickness*r)
    for row in range(rings-1):
        for i in range(n):faces.append((row*n+i,row*n+(i+1)%n,(row+1)*n+(i+1)%n,(row+1)*n+i))
    faces.extend([tuple(reversed(range(n))),tuple(range((rings-1)*n,rings*n))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for p in mesh.polygons:p.use_smooth=True
    return o

def mushroom(parts,center,scale=1):
    x,y,z=center
    parts.append(uv('Mushroom stem',(x,y,z-.07*scale),(.042*scale,.02*scale,.08*scale),white))
    parts.append(uv('Mushroom cap',(x,y-.006*scale,z+.025*scale),(.13*scale,.035*scale,.07*scale),red,24,12))
    for dx,dz,r in [(-.06,.03,.024),(.048,.04,.026),(0,-.006,.021)]:
        parts.append(uv('Mushroom spot',(x+dx*scale,y-.04*scale,z+.025*scale+dz*scale),(r*scale,.008*scale,r*.7*scale),white))

def wheel(label,x,y,r,width,rim_ring=None):
    center=Vector((x,y,r));pivot=empty(('STEER_WHEEL_' if label.startswith('F') else 'AXLE_')+label,center)
    # Closed barrel: full end caps and continuous sidewalls, no alpha texture.
    vertices=[];faces=[];profile=[(-width/2,0),(-width/2,r*.83),(-width*.40,r*.98)]
    # Three continuous circumferential channels: vertical from the rear view.
    # Recess the actual closed tire surface instead of adding raised crossbars.
    for lane in [-.24,0,.24]:
        profile.extend([(width*(lane-.035),r*.98),(width*(lane-.022),r*.958),(width*(lane+.022),r*.958),(width*(lane+.035),r*.98)])
    profile.extend([(width*.40,r*.98),(width/2,r*.83),(width/2,0)])
    n=64
    for axial,rad in profile:
        for i in range(n):
            a=i*math.tau/n;vertices.append((x+axial,y+math.sin(a)*rad,r+math.cos(a)*rad))
    for ring in range(len(profile)-1):
        for i in range(n):faces.append((ring*n+i,ring*n+(i+1)%n,(ring+1)*n+(i+1)%n,(ring+1)*n+i))
    mesh=bpy.data.meshes.new('Closed tire barrel');mesh.from_pydata(vertices,[],faces);mesh.update()
    tire=bpy.data.objects.new('Tire',mesh);bpy.context.collection.objects.link(tire);mesh.materials.append(rubber)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for p in mesh.polygons:p.use_smooth=True
    parts=[tire]
    for side in [-1,1]:
        face=x+side*(width/2+.001)
        parts.append(cyl('Solid rim',(face,y,r),r*.61,.014,rim,32,(0,math.pi/2,0)))
        if rim_ring:
            parts.append(torus('Colored rim ring',(face+side*.012,y,r),r*.59,r*.035,rim_ring,(0,math.pi/2,0),32,8))
        parts.append(cyl('Hub',(face+side*.012,y,r),r*.19,.027,silver,20,(0,math.pi/2,0)))
        for i in range(6):
            a=i*math.tau/6
            parts.append(cyl('Wheel bolt',(face+side*.012,y+math.sin(a)*r*.4,r+math.cos(a)*r*.4),.012,.012,silver,8,(0,math.pi/2,0)))
    result=merge(parts,'WHEEL_'+label)
    for v in result.data.vertices:v.co=result.matrix_world@v.co-center
    result.matrix_world.identity();result.parent=pivot;result.location=(0,0,0);result['importedWheel']=True
    result['treadPattern']='circumferential-vertical-grooves';result['treadGrooveCount']=3

def kart():
    p=[]
    p.append(cube('Floor pan',(0,.03,.21),(1.12,1.65,.12),black,.06))
    p.append(uv('Rounded nose',(0,-.68,.38),(.44,.47,.21),black,32,16))
    p.append(cube('Front bumper',(0,-1.04,.22),(1.18,.09,.13),rim,.035))
    for s in [-1,1]:
        p.append(uv('Side pod',(s*.40,.05,.33),(.19,.51,.15),black,24,12))
        p.append(bar('Chassis tube',(s*.47,-.65,.19),(s*.47,.65,.19),.04,rim,12))
        p.append(cyl('Lamp housing',(s*.33,-.98,.48),.093,.10,rim,24,(math.pi/2,0,0)))
        p.append(cyl('Lamp lens',(s*.33,-1.039,.48),.076,.014,lamp,24,(math.pi/2,0,0)))
        p.append(bar('Rear spoiler strut',(s*.35,.63,.35),(s*.35,.78,.70),.025,rim,10))
        p.append(cyl('Exhaust',(s*.38,.81,.34),.055,.25,silver,20,(math.pi/2,0,0)))
        p.append(cyl('Exhaust dark opening',(s*.38,.94,.34),.04,.007,black,20,(math.pi/2,0,0)))
    p.append(cube('Red rear wing',(0,.80,.72),(1.20,.21,.065),red,.028))
    for s in [-1,1]:p.append(cube('Wing end plate',(s*.61,.80,.72),(.045,.27,.17),red,.025))
    p.append(cube('Seat cushion',(0,.25,.38),(.40,.44,.09),cloth,.04))
    p.append(cube('Seat back',(0,.51,.53),(.43,.10,.43),cloth,.065))
    p.append(bar('Steering column',(0,-.29,.37),(0,-.20,.65),.025,rim,12))
    ring=torus('Steering rim',(0,-.20,.66),.15,.024,black,(math.radians(65),0,0),32,10);p.append(ring)
    for s in [-1,1]:p.append(bar('Steering spoke',(0,-.20,.66),(s*.13,-.20,.66),.013,rim,8))
    mushroom(p,(0,-1.16,.40),1.1)
    merge(p,'CHASSIS')
    for label,x,y,r,w in [('FL',-.66,-.68,.245,.26),('FR',.66,-.68,.245,.26),('RL',-.69,.59,.29,.31),('RR',.69,.59,.29,.31)]:wheel(label,x,y,r,w)

def character():
    p=[]
    p.append(uv('Hoodie torso',(0,.22,.70),(.235,.17,.28),cloth,24,14))
    p.append(torus('Hood collar',(0,.20,.91),.15,.048,cloth,(0,0,0),24,10))
    p.append(uv('Lower hood',(0,.32,.87),(.22,.14,.14),cloth,24,12))
    p.append(uv('Head',(0,.13,1.11),(.28,.225,.29),skin,32,20))
    for s in [-1,1]:
        p.append(uv('Ear',(s*.27,.12,1.10),(.057,.04,.079),skin,20,12))
        p.append(uv('Inner ear',(s*.285,.085,1.10),(.027,.01,.046),hairlight))
        # Oversized pale eyes are a distinctive feature of supplied Gautam.
        eye=(s*.113,-.071,1.12)
        p.append(uv('Eye outline',eye,(.105,.036,.12),black,24,14))
        p.append(uv('White eye',(eye[0],eye[1]-.018,eye[2]),(.094,.032,.108),white,24,14))
        for a,b,r in [((s*.20,.18,.82),(s*.26,-.015,.70),.077),((s*.26,-.015,.70),(s*.12,-.24,.66),.065),((s*.13,.23,.49),(s*.19,-.10,.41),.09),((s*.19,-.10,.41),(s*.21,-.49,.28),.075)]:p.append(h['aligned_uv']('Sleeve or trousers',a,b,r,r,cloth,20,12))
        p.append(uv('Hand gripping wheel',(s*.13,-.25,.67),(.066,.06,.056),skin,20,12))
        p.append(uv('Thumb',(s*.10,-.268,.705),(.024,.028,.035),skin))
        p.append(cube('Shoe',(s*.21,-.48,.23),(.17,.28,.11),black,.04))
        p.append(cube('White sole',(s*.21,-.48,.184),(.175,.29,.035),white,.014))
        p.append(cube('Shoe trim',(s*.21,-.54,.274),(.13,.04,.022),white,.008))
    p.append(uv('Nose',(0,-.104,1.04),(.025,.028,.024),skin))
    p.append(bar('Small mouth',(-.034,-.087,.985),(.033,-.087,.985),.006,hair,8))
    p.append(uv('Hair crown',(0,.18,1.28),(.28,.235,.145),hair,32,18))
    p.append(uv('Back hair volume',(0,.295,1.17),(.255,.145,.21),hair,32,18))
    # Layered broad locks, asymmetrical tips rather than a uniform spike ring.
    locks=[
      ((-.02,.15,1.34),(-.35,.01,1.41),.115,.035),
      ((.01,.22,1.35),(.34,.09,1.44),.115,.036),
      ((.02,.20,1.35),(.18,.28,1.57),.105,.036),
      ((-.06,.23,1.35),(-.19,.36,1.52),.10,.035),
      ((-.11,.08,1.32),(-.24,-.09,1.12),.083,.026),
      ((-.03,.055,1.33),(.035,-.145,1.16),.096,.028),
      ((.10,.065,1.32),(.245,-.08,1.21),.093,.03),
      ((-.19,.14,1.28),(-.32,.08,1.10),.071,.025),
      ((.19,.22,1.30),(.345,.23,1.18),.077,.028),
      ((0,.29,1.34),(-.10,.44,1.28),.095,.036),
      ((-.06,.17,1.37),(-.29,.22,1.48),.09,.028),
      ((.08,.19,1.36),(.29,.30,1.48),.09,.028),
      ((-.08,.025,1.28),(-.15,-.105,1.14),.055,.023),
      ((.14,.02,1.28),(.20,-.09,1.15),.055,.022),
      ((-.21,.27,1.26),(-.29,.37,1.16),.07,.025),
      ((.17,.31,1.28),(.27,.43,1.22),.075,.025)]
    for i,(a,b,w,t) in enumerate(locks):p.append(flowing_lock('Layered hair lock',a,b,w,t,hairlight if i in [2,4,6] else hair))
    mushroom(p,(.12,.039,.79),.24)
    merge(p,'GAUTAM_SEATED')

render='--render' in sys.argv
bpy.context.preferences.filepaths.save_version=0
for driven in (([True] if '--driving-only' in sys.argv else [False,True]) if __name__ == '__main__' else []):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    kart()
    if driven:character()
    name='GautamDriving' if driven else 'GautamKart'
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_extras=True,export_texcoords=False,export_tangents=False,use_selection=False)
    print('REBUILT',name,flush=True)
    if render:
        scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=64
        scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.world.color=(.18,.18,.18)
        for loc,energy in [((2,-4,5),650),((-3,-1,3),500),((0,4,4),700)]:
            d=bpy.data.lights.new('Review softbox','AREA');d.energy=energy;d.size=4;o=bpy.data.objects.new('Review softbox',d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
        d=bpy.data.cameras.new('Review camera');o=bpy.data.objects.new('Review camera',d);scene.collection.objects.link(o);scene.camera=o;d.type='ORTHO';d.ortho_scale=2.8
        for side in [-1,1]:
            o.location=(2.5,side*4,2.3);o.rotation_euler=(Vector((0,0,.65))-o.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(SRC/(name+('-front.png' if side<0 else '-rear.png')));bpy.ops.render.render(write_still=True)
