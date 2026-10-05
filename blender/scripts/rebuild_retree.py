"""Reference-led Retree reconstruction. Sources in new-models are never modified.
blender --background --python blender/scripts/rebuild_retree.py -- --render
Reuse the tested closed wheel topology; all Retree bodywork/character is authored here.
"""
import bpy, math, runpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
g=runpy.run_path(str(ROOT/'blender/scripts/rebuild_gautam.py'),run_name='retree_helpers')
uv,cube,cyl,bar,torus,empty,merge,mat,lock=[g[n] for n in ['uv','cube','cyl','bar','torus','empty','merge','mat','flowing_lock']]
limb=g['h']['aligned_uv']
OUT=ROOT/'assets/characters/retree-rebuilt';OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'blender/characters/retree-rebuilt';SRC.mkdir(parents=True,exist_ok=True)
navy=mat('Retree midnight body',(.035,.055,.18),.25,.35)
blue=mat('Retree blue edges',(.018,.16,.75),.2,.3)
cyan=mat('Retree cyan rims',(.015,.38,.94),.25,.3)
cloth=mat('Retree charcoal hoodie',(.018,.021,.03),0,.8)
seam=mat('Retree seams',(.035,.04,.055),0,.8)
hair=mat('Retree dark brown hair',(.21,.105,.062),0,.65)
hairlight=mat('Retree upper hair',(.265,.145,.087),0,.65)
white=mat('Retree eyes gloves soles',(.93,.97,1),0,.4)
skin=mat('Retree standing hands',(.68,.30,.115),0,.65)
black=mat('Retree tire hub',(.008,.009,.012),.1,.6)
g['wheel'].__globals__.update(rim=black,silver=black)

def body_mesh(name,sections,material):
    # Octagonal loft: flat centre with chamfered shoulders, never a remeshed AI shell.
    verts=[]
    for y,w,z,b in sections:
        verts.extend([(-w*.72,y,z),(w*.72,y,z),(w,y,z-.05),(w,y,b+.035),
                      (w*.75,y,b),(-w*.75,y,b),(-w,y,b+.035),(-w,y,z-.05)])
    faces=[tuple(reversed(range(8))),tuple(range((len(sections)-1)*8,len(sections)*8))]
    for j in range(len(sections)-1):
        for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    bm=g['bmesh'].new();bm.from_mesh(mesh);g['bmesh'].ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    return o

logo=bpy.data.images.load(str(ROOT/'assets/environment/branding/dlicom-logo-cutout.png'),check_existing=True)
pixels=list(logo.pixels);lw,lh=logo.size
def badge(name,center,right,up):
    # Official alpha silhouette becomes a small opaque mesh decal, no alpha on tires.
    # Merge contiguous scanline runs to keep the three insignia inexpensive.
    n=64;verts=[];faces=[];c=Vector(center);r=Vector(right);u=Vector(up)
    for row in range(n):
        bits=[]
        for col in range(n):
            x=min(lw-1,int((col+.5)*lw/n));y=min(lh-1,int((row+.5)*lh/n))
            bits.append(pixels[(y*lw+x)*4+3]>.6)
        col=0
        while col<n:
            if not bits[col]:col+=1;continue
            start=col
            while col<n and bits[col]:col+=1
            k=len(verts)
            for x,y in [(start,row),(col,row),(col,row+1),(start,row+1)]:verts.append(c+r*(x/n-.5)+u*(y/n-.5))
            faces.append((k,k+1,k+2,k+3))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(white);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o

def kart():
    p=[cube('Floor pan',(0,.03,.20),(1.10,1.60,.12),navy,.055),
       body_mesh('Wedge bonnet',[(-1.04,.24,.29,.18),(-.83,.34,.40,.18),(-.37,.30,.58,.21)],navy),
       body_mesh('Raised centre bonnet',[(-1.045,.14,.296,.24),(-.83,.20,.414,.35),(-.37,.20,.593,.53)],cloth),
       cube('Rear engine',(0,.64,.30),(.59,.46,.29),black,.08)]
    for s in [-1,1]:
        pod=body_mesh('Long side pod',[(-.24,.15,.39,.19),(.20,.16,.40,.19),(.51,.15,.35,.19)],navy);pod.location.x=s*.44;p.append(pod)
        p.extend([bar('Blue lower chassis',(s*.46,-.62,.22),(s*.46,.68,.22),.029,blue,12),
          bar('Front wishbone',(s*.20,-.59,.27),(s*.62,-.68,.245),.025,black,10),
          bar('Front upper wishbone',(s*.23,-.48,.39),(s*.62,-.68,.28),.019,blue,10),
          bar('Nose edge',(s*.245,-1.02,.28),(s*.34,-.82,.355),.012,blue,10),
          cyl('Headlamp barrel',(s*.355,-.64,.53),.090,.15,navy,24,(math.pi/2,0,0)),
          cyl('Headlamp dark lens',(s*.355,-.719,.53),.073,.008,black,24,(math.pi/2,0,0)),
          torus('Headlamp rim',(s*.355,-.725,.53),.078,.008,blue,(math.pi/2,0,0),24,6),
          bar('Spoiler support',(s*.35,.49,.31),(s*.35,.79,.74),.036,black,10),
          cube('Cyan spoiler end plate',(s*.615,.81,.78),(.057,.28,.22),cyan,.027),
          cyl('Exhaust barrel',(s*.38,.81,.34),.055,.25,navy,20,(math.pi/2,0,0)),
          cyl('Exhaust opening',(s*.38,.94,.34),.039,.008,black,20,(math.pi/2,0,0)),
          badge('Side Dlicom insignia',(s*.605,.15,.34),(0,s*.25,0),(0,0,.17))])
        empty('EXHAUST_SOCKET_'+('LEFT' if s<0 else 'RIGHT'),(s*.38,.948,.34))
    p.extend([cube('Navy rear wing',(0,.81,.78),(1.23,.23,.063),navy,.028),
      cube('Wing leading blue edge',(0,.695,.78),(1.20,.014,.023),blue,.006),
      cube('Seat cushion',(0,.23,.36),(.39,.43,.085),cloth,.045),
      cube('Seat back',(0,.48,.50),(.40,.09,.39),cloth,.055),
      bar('Steering column',(0,-.28,.35),(0,-.24,.64),.023,black,12),
      torus('Steering wheel',(0,-.23,.65),.15,.026,navy,(math.radians(65),0,0),32,8),
      bar('Steering spoke',(-.13,-.23,.65),(.13,-.23,.65),.015,black,10),
      badge('Bonnet Dlicom insignia',(0,-.84,.412),(.24,0,0),(0,.17,.074))])
    merge(p,'CHASSIS')
    for args in [('FL',-.66,-.68,.245,.26),('FR',.66,-.68,.245,.26),('RL',-.69,.59,.29,.31),('RR',.69,.59,.29,.31)]:g['wheel'](*args,rim_ring=cyan)

def character(seated):
    p=[];z=1.06 if seated else 1.39;y=.12 if seated else 0
    def ell(name,loc,scale,material,seg=20,rings=12):
        o=uv(name,loc,scale,material,seg,rings);p.append(o);return o
    ell('Dark face helmet',(0,y,z),(.245,.204,.238),navy,32,18)
    # White eyes and blue framing are separate solid forms, not a transparent face mask.
    for s in [-1,1]:
        ell('Cobalt eye surround',(s*.098,y-.182,z+.005),(.082,.026,.086),blue,24,14)
        ell('Luminous white eye',(s*.098,y-.204,z+.007),(.065,.018,.070),white,24,14)
    ell('Hair crown',(0,y+.034,z+.174),(.256,.205,.143),hair,28,16)
    ell('Back hair cap',(0,y+.132,z+.077),(.233,.114,.181),hair,24,14)
    # Broad overlapping leaf locks: a dense tousled cap with an irregular fringe.
    locks=[((-.06,-.08,.20),(-.18,-.21,-.045),.09,.029),
      ((.04,-.09,.22),(.025,-.23,-.045),.09,.028),
      ((.14,-.065,.20),(.21,-.18,.01),.082,.027),
      ((-.15,0,.19),(-.28,-.12,.055),.083,.025),
      ((.17,.02,.18),(.29,-.075,.045),.085,.03),
      ((-.06,.06,.24),(-.28,.015,.28),.098,.031),
      ((.01,.035,.24),(.24,-.02,.28),.092,.035),
      ((-.055,.11,.24),(-.12,.19,.34),.085,.026),
      ((.065,.12,.24),(.22,.21,.28),.089,.03),
      ((-.17,.09,.17),(-.29,.16,.125),.07,.027),
      ((.18,.11,.16),(.30,.20,.11),.075,.026),
      ((-.13,.18,.14),(-.25,.265,.025),.075,.025),
      ((.10,.20,.15),(.21,.285,.055),.086,.028),
      ((0,.20,.19),(-.065,.32,.09),.09,.028),
      ((-.08,.20,.10),(-.12,.28,-.085),.074,.025),
      ((.11,.19,.09),(.13,.28,-.075),.078,.026),
      ((-.20,.10,.07),(-.255,.13,-.08),.06,.024),
      ((.20,.10,.07),(.26,.14,-.07),.06,.024)]
    for i,(a,b,w,t) in enumerate(locks):
        p.append(lock('Retree layered hair',Vector(a)+Vector((0,y,z)),Vector(b)+Vector((0,y,z)),w,t,hairlight if i in [5,7,8] else hair))
    # Overlapping crown/back shingles cover the spherical foundation rather than
    # leaving isolated spikes protruding from an exposed smooth scalp.
    for row in range(3):
        for j in range(7):
            a=j*math.tau/7+row*.28
            radius=.12+row*.045;zz=.267-row*.049
            base=Vector((math.cos(a)*radius,y+math.sin(a)*radius+.04,z+zz))
            tip=base+Vector((math.cos(a+.28)*.13,math.sin(a+.28)*.12,-.06-row*.014))
            p.append(lock('Overlapping hair shingle',base,tip,.086,.026,hairlight if row==0 and j%3==0 else hair))
    torso=.69 if seated else .98;ty=.20 if seated else .035
    ell('Hoodie torso',(0,ty,torso),(.209,.143,.235),cloth,24,14)
    ell('Folded hood',(0,ty+.065,torso+.17),(.20,.12,.13),cloth)
    p.append(torus('Hood collar',(0,ty,torso+.21),.12,.042,cloth,(0,0,0),24,8))
    p.append(cube('Hoodie hem',(0,ty,torso-.17),(.35,.24,.06),seam,.024))
    p.append(cube('Kangaroo pocket',(0,ty-.136,torso-.045),(.23,.029,.098),seam,.024))
    for s in [-1,1]:
        if seated:
            joints=[((s*.17,.18,.82),(s*.25,-.035,.70),.075),((s*.25,-.035,.70),(s*.13,-.245,.65),.063),
                    ((s*.12,.22,.48),(s*.19,-.10,.40),.086),((s*.19,-.10,.40),(s*.21,-.47,.27),.07)]
            hand=(s*.13,-.258,.66);foot=(s*.21,-.46,.225)
        else:
            joints=[((s*.17,.035,1.095),(s*.275,.02,.91),.077),((s*.275,.02,.91),(s*.295,-.045,.74),.06),
                    ((s*.11,.025,.81),(s*.12,.025,.43),.10),((s*.12,.025,.43),(s*.145,-.01,.15),.083)]
            hand=(s*.295,-.047,.70);foot=(s*.15,-.075,.085)
        for a,b,r in joints:
            a,b=Vector(a),Vector(b);direction=(b-a).normalized()
            p.append(limb('Hoodie sleeve or trouser leg',a-direction*.055,b+direction*.055,r,r,cloth,20,10))
        ell('Glove' if seated else 'Hand',hand,(.064,.053,.055 if seated else .078),white if seated else skin)
        ell('Thumb',Vector(hand)+Vector((-s*.029,-.027,.025)),(.025,.024,.034),white if seated else skin)
        x,fy,fz=foot
        p.append(cube('Black high top shoe',foot,(.165,.265,.11),cloth,.037))
        p.append(cube('White outsole',(x,fy,fz-.044),(.17,.27,.033),white,.012))
        for j in range(3):p.append(bar('White shoelace',(x-.049,fy-.065+j*.029,fz+.058),(x+.049,fy-.060+j*.029,fz+.058),.007,white,6))
        if not seated:p.append(cube('Cargo side pocket',(s*.20,.01,.59),(.032,.15,.14),seam,.02))
    merge(p,'RETREE_SEATED' if seated else 'RETREE_STANDING')

def render(name,card=False):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=64
    scene.render.resolution_x=960;scene.render.resolution_y=640 if card else 800;scene.render.resolution_percentage=100
    scene.world.color=(.08,.10,.16);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
    for loc,energy in [((2,-4,5),650),((-3,-1,3),450),((0,4,4),650)]:
        d=bpy.data.lights.new('Review softbox','AREA');d.energy=energy;d.size=4;o=bpy.data.objects.new('Review softbox',d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Review camera');o=bpy.data.objects.new('Review camera',d);scene.collection.objects.link(o);scene.camera=o;d.type='ORTHO';d.ortho_scale=2.9 if card else 2.7
    for side in ([-1] if card or name=='Retree' else [-1,1]):
        o.location=(2.3,side*4,2.35);o.rotation_euler=(Vector((0,0,.77 if name=='Retree' else .66))-o.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(OUT/'retree-card.png' if card else SRC/(name+('-front.png' if side<0 else '-rear.png')))
        bpy.ops.render.render(write_still=True)

bpy.context.preferences.filepaths.save_version=0
metrics={}
for name in (['Retree','RetreeKart','RetreeDriving'] if __name__ == '__main__' else []):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    if name!='Retree':kart()
    if name!='RetreeKart':character(name=='RetreeDriving')
    # Remove unused primitive UV layers; the palette is opaque vertex color.
    # This also avoids Blender 2.83 trying to compute tangents on ngon caps.
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            for layer in list(o.data.uv_layers):o.data.uv_layers.remove(layer)
    metrics[name]={'triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons)}
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_extras=True,export_texcoords=False,export_tangents=False)
    if '--render' in sys.argv:render(name)
    if name=='RetreeDriving':
        # Remove review lights/camera before creating the dedicated selection thumbnail.
        for o in list(bpy.context.scene.objects):
            if o.type in ['LIGHT','CAMERA']:bpy.data.objects.remove(o,do_unlink=True)
        render(name,card=True)
if __name__ == '__main__':
    metrics['original_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'assets/characters/retree/new-models').glob('*.glb')}
    (SRC/'build-metrics.json').write_text(json.dumps(metrics,indent=2))
    print('RETREE BUILD',json.dumps(metrics),flush=True)
