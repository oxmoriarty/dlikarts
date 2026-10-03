# Gautam — stylized game-ready character generator
# Reference: user-provided Dlicom Racers character sheet
# Compatible with Blender 2.83.x: Scripting > Open > Run Script, or:
# blender --background --python gautam_model.py
#
# Outputs beside this script:
#   gautam.blend
#   gautam.glb

import bpy, math, os
from mathutils import Vector


# Blender version guard
if bpy.app.version < (2, 83, 0):
    raise RuntimeError("This script requires Blender 2.83 or newer.")
if bpy.app.version >= (3, 0, 0):
    print("Note: this file was prepared specifically for Blender 2.83.x.")

# ---------- reset ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials):
    pass

# ---------- helpers ----------
def mat(name, color, metallic=0.0, roughness=0.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    bs.inputs["Roughness"].default_value = roughness
    bs.inputs["Metallic"].default_value = metallic
    return m

SKIN  = mat("Skin", (0.72, 0.30, 0.10))
HAIR  = mat("Hair_Brown", (0.075, 0.035, 0.020))
BLACK = mat("Hoodie_Black", (0.025, 0.028, 0.030))
PANTS = mat("Cargo_Dark", (0.035, 0.038, 0.040))
WHITE = mat("Eye_Shoe_White", (0.94, 0.93, 0.88))
OUTLN = mat("Eye_Outline", (0.008, 0.006, 0.005))
RED   = mat("Mushroom_Red", (0.90, 0.035, 0.020))
GREY  = mat("Shoe_Grey", (0.18, 0.19, 0.20))
SOLE  = mat("Sole", (0.82, 0.82, 0.78))
BUCKLE= mat("Buckle", (0.45, 0.46, 0.45), metallic=.35, roughness=.4)

def smooth(obj):
    if obj.type == 'MESH':
        for p in obj.data.polygons: p.use_smooth = True
    return obj

def uv(name, loc, scale, material, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=16, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); smooth(o)
    return o

def cube(name, loc, scale, material, bevel=.08, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new("Soft_Bevel",'BEVEL'); mod.width=bevel; mod.segments=3
    o.data.materials.append(material)
    return o

def cyl(name, a, b, radius, material, vertices=20):
    a,b=Vector(a),Vector(b); d=b-a
    mid=(a+b)/2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=d.length, location=mid)
    o=bpy.context.object; o.name=name
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y')
    o.data.materials.append(material); smooth(o)
    return o

def cone(name, loc, radius1, radius2, depth, material, rot=(0,0,0), vertices=16):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2,
                                    depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); smooth(o)
    return o

def torus(name, loc, major, minor, material, rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
        major_segments=32, minor_segments=8, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    return o

# Collections
def collection(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c
BODY=collection("Gautam_Body")
DETAIL=collection("Gautam_Details")

def move_to(obj, col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)

# ---------- body: chibi proportions ----------
# legs / shoes
for side,x in (("L",-0.28),("R",0.28)):
    move_to(cyl(f"{side}_LowerLeg",(x,0,0.78),(x,0,1.45),.19,PANTS), BODY)
    move_to(uv(f"{side}_Shoe",(x,-0.10,0.49),(.34,.48,.20),WHITE), BODY)
    move_to(cube(f"{side}_ShoeBlack",(x,-0.20,0.55),(.26,.28,.10),GREY,.06), DETAIL)
    # chunky sole
    move_to(cube(f"{side}_Sole",(x,-0.08,0.34),(.35,.48,.08),SOLE,.08), DETAIL)
    # white straps
    for yy in (-0.30,-0.16):
        move_to(cube(f"{side}_Strap_{yy}",(x,yy,0.65),(.28,.055,.045),WHITE,.025), DETAIL)

# hips and cargo trousers
move_to(uv("Hips",(0,0,1.52),(.56,.34,.38),PANTS),BODY)
for side,x in (("L",-0.48),("R",0.48)):
    pocket=cube(f"{side}_CargoPocket",(x,-0.02,1.42),(.12,.25,.20),PANTS,.035)
    move_to(pocket,DETAIL)
    buckle=cube(f"{side}_PocketBuckle",(x,-0.285,1.45),(.055,.025,.065),BUCKLE,.015)
    move_to(buckle,DETAIL)

# torso hoodie
move_to(uv("HoodieTorso",(0,0,2.25),(.78,.45,.82),BLACK),BODY)
# waist hem
move_to(cyl("HoodieHem",(-.57,0,1.79),(.57,0,1.79),.075,BLACK),DETAIL)

# arms hanging naturally
for side,x,s in (("L",-0.76,-1),("R",0.76,1)):
    move_to(cyl(f"{side}_UpperArm",(x,0,2.55),(x+s*.08,0,2.08),.20,BLACK),BODY)
    move_to(cyl(f"{side}_Forearm",(x+s*.08,0,2.08),(x+s*.06,-.01,1.76),.17,BLACK),BODY)
    move_to(uv(f"{side}_Hand",(x+s*.06,-.01,1.68),(.18,.15,.22),SKIN),BODY)

# neck/head
move_to(cyl("Neck",(0,0,2.82),(0,0,3.02),.22,SKIN),BODY)
head=uv("Head",(0,-.01,3.63),(1.03,.82,1.02),SKIN,40); move_to(head,BODY)

# ears
for side,x in (("L",-1.00),("R",1.00)):
    e=uv(f"Ear_{side}",(x,0,3.62),(.20,.12,.30),SKIN); move_to(e,BODY)

# eyes face toward -Y
for side,x in (("L",-0.42),("R",0.42)):
    ring=torus(f"EyeOutline_{side}",(x,-.786,3.76),.285,.045,OUTLN)
    ring.scale=(.84,1,1.18); move_to(ring,DETAIL)
    eye=uv(f"EyeWhite_{side}",(x,-.795,3.76),(.235,.055,.34),WHITE)
    move_to(eye,DETAIL)

# tiny neutral mouth
mouth=cube("Mouth",(0,-.826,3.25),(.13,.025,.018),OUTLN,.012); move_to(mouth,DETAIL)

# ---------- hair ----------
# cap mass
haircap=uv("HairCap",(0,.03,4.20),(1.04,.82,.68),HAIR,32); move_to(haircap,BODY)
# spikes distributed around crown
spikes=[
(-.78,-.10,4.55,-.65,0,.55),(-.48,-.18,4.72,-.35,0,.72),
(-.12,-.20,4.82,-.10,0,.80),(.25,-.17,4.78,.20,0,.76),
(.58,-.10,4.65,.48,0,.68),(.83,.02,4.48,.68,0,.55),
(-.90,.18,4.35,-.75,.12,.45),(.88,.22,4.34,.72,.15,.45),
(-.45,.45,4.60,-.35,.35,.55),(.20,.48,4.65,.15,.38,.58),
]
for i,(x,y,z,rx,ry,rz) in enumerate(spikes):
    # cones angled outward
    o=cone(f"HairSpike_{i}",(x,y,z),.25,.035,.72,HAIR)
    o.rotation_euler=(ry,rx,0)
    move_to(o,DETAIL)

# front bangs
for i,x in enumerate((-.68,-.42,-.16,.12,.39,.63)):
    o=cone(f"Bang_{i}",(x,-.64,4.12),.20,.025,.60,HAIR,rot=(math.radians(68),0,0))
    o.rotation_euler[1]=math.radians((x)*18)
    move_to(o,DETAIL)

# ---------- hoodie details ----------
# hood behind head
hood=torus("Hood",(0,.31,2.94),.57,.17,BLACK,rot=(math.pi/2,0,0))
hood.scale=(1.05,1,1.0); move_to(hood,DETAIL)

# V-shaped neckline cords/trim
move_to(cyl("Neckline_L",(-.42,-.43,2.74),(0,-.47,2.48),.045,OUTLN),DETAIL)
move_to(cyl("Neckline_R",(.42,-.43,2.74),(0,-.47,2.48),.045,OUTLN),DETAIL)

# mushroom badge: left chest from character perspective
mx=-.43
stem=cube("MushroomStem",(mx,-.458,2.31),(.055,.025,.10),WHITE,.025); move_to(stem,DETAIL)
cap=uv("MushroomCap",(mx,-.475,2.43),(.16,.045,.105),RED); move_to(cap,DETAIL)
for j,(dx,dz) in enumerate(((-.06,.02),(.045,.045),(.07,-.025))):
    dot=uv(f"MushroomDot_{j}",(mx+dx,-.522,2.43+dz),(.025,.012,.025),WHITE,16); move_to(dot,DETAIL)

# ---------- armature ----------
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm=bpy.context.object; arm.name="Gautam_Rig"
arm.show_in_front=True
eb=arm.data.edit_bones
root=eb[0]; root.name="root"; root.head=(0,0,.25); root.tail=(0,0,.65)

def bone(name, head, tail, parent=None):
    b=eb.new(name); b.head=head; b.tail=tail
    if parent: b.parent=parent; b.use_connect=False
    return b

pelvis=bone("pelvis",(0,0,1.30),(0,0,1.70),root)
spine=bone("spine",(0,0,1.70),(0,0,2.45),pelvis)
neck=bone("neck",(0,0,2.45),(0,0,3.05),spine)
headb=bone("head",(0,0,3.05),(0,0,4.10),neck)
for side,s in (("L",-1),("R",1)):
    thigh=bone(f"thigh.{side}",(.28*s,0,1.45),(.28*s,0,.98),pelvis)
    shin=bone(f"shin.{side}",(.28*s,0,.98),(.28*s,0,.48),thigh)
    foot=bone(f"foot.{side}",(.28*s,0,.48),(.28*s,-.42,.42),shin)
    upper=bone(f"upper_arm.{side}",(.52*s,0,2.55),(.80*s,0,2.18),spine)
    fore=bone(f"forearm.{side}",(.80*s,0,2.18),(.82*s,0,1.80),upper)
    handb=bone(f"hand.{side}",(.82*s,0,1.80),(.82*s,-.01,1.60),fore)
bpy.ops.object.mode_set(mode='OBJECT')

# Parent meshes to rig object (keeps modular stylized pieces; animation-ready hierarchy can be refined)
for col in (BODY,DETAIL):
    for obj in col.objects:
        if obj.type=='MESH':
            obj.parent=arm

# ---------- metadata / presentation ----------
arm["character"]="Gautam"
arm["project"]="Dlicom Racers / Dlikarts"
arm["style"]="stylized chibi, browser-game friendly"
arm["reference_notes"]="Brown spiky hair, large white outlined eyes, black hoodie with mushroom badge, dark cargo pants, chunky black/white sneakers."

# Ground
ground=cyl("DisplayGround",(0,0,.20),(0,0,.21),1.35,OUTLN,48)
ground.scale.z=.25

# camera
bpy.ops.object.camera_add(location=(6,-9,5.2))
cam=bpy.context.object; cam.name="Preview_Camera"
bpy.context.scene.camera=cam
def point_at(obj, target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
point_at(cam,(0,0,2.45))
cam.data.lens=58

# lights
bpy.ops.object.light_add(type='AREA', location=(-4,-5,7))
bpy.context.object.data.energy=900; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
point_at(bpy.context.object,(0,0,2.5))
bpy.ops.object.light_add(type='AREA', location=(4,-2,5))
bpy.context.object.data.energy=650; bpy.context.object.data.size=4
point_at(bpy.context.object,(0,0,2.7))
bpy.ops.object.light_add(type='AREA', location=(0,4,5))
bpy.context.object.data.energy=700; bpy.context.object.data.size=3
point_at(bpy.context.object,(0,0,3))

scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1024; scene.render.resolution_y=1024; scene.render.resolution_percentage=100

# save/export
# Blender 2.83 can fail when the Text Editor's __file__ path is unavailable,
# virtual, read-only, or resolves to an invalid directory. Use a verified
# writable output directory instead.
def get_output_dir():
    candidates = []

    # 1) Folder containing this .py file, if Blender exposes a real path.
    try:
        script_file = os.path.abspath(__file__)
        script_dir = os.path.dirname(script_file)
        if script_dir:
            candidates.append(script_dir)
    except Exception:
        pass

    # 2) Current .blend directory, if one already exists.
    try:
        blend_dir = bpy.path.abspath("//")
        if blend_dir:
            candidates.append(blend_dir)
    except Exception:
        pass

    # 3) User Desktop.
    home = os.path.expanduser("~")
    candidates.append(os.path.join(home, "Desktop"))

    # 4) User home folder.
    candidates.append(home)

    for folder in candidates:
        try:
            if folder and os.path.isdir(folder) and os.access(folder, os.W_OK):
                return folder
        except Exception:
            pass

    raise RuntimeError("Could not find a writable folder for gautam.blend and gautam.glb.")

base = get_output_dir()
blend_path = os.path.join(base, "gautam.blend")
glb_path = os.path.join(base, "gautam.glb")

print("Saving Gautam files to:", base)

# Save a copy rather than relying on the current Blender startup file state.
try:
    bpy.ops.wm.save_as_mainfile(filepath=blend_path, check_existing=False)
except TypeError:
    # Compatibility fallback for Blender builds whose operator signature differs.
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

# Exclude preview camera/lights/ground from GLB
for o in bpy.context.scene.objects: o.select_set(False)
for col in (BODY,DETAIL):
    for o in col.objects: o.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', use_selection=True,
                          export_animations=True)

print("Created:", blend_path)
print("Created:", glb_path)
