"""Build Dlicom Racers Phase 1 source masters and browser GLB exports.

Designed for Blender 2.83's bundled Python.  The construction is deliberately
modular and palette-driven so future racers can reuse skeleton, exporter, and
validation conventions without inheriting Guatam-specific geometry.
"""
import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHAR_BLEND = os.path.join(ROOT, 'blender', 'characters', 'guatam.blend')
KART_BLEND = os.path.join(ROOT, 'blender', 'vehicles', 'guatam-kart.blend')
CHAR_GLB = os.path.join(ROOT, 'assets', 'characters', 'guatam.glb')
KART_GLB = os.path.join(ROOT, 'assets', 'vehicles', 'guatam-kart.glb')

def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                       bpy.data.cameras, bpy.data.lights, bpy.data.armatures):
        # Materials are retained deliberately; reference counting is unsafe while building.
        if datablocks is not bpy.data.materials:
            for block in list(datablocks):
                datablocks.remove(block)

def mat(name, color, metallic=0.0, roughness=0.75):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return m

SKIN = None
HAIR = None
CHARCOAL = None
BLACK = None
WHITE = None
RED = None
RUBBER = None
METAL = None
PALETTE = None
KART_SURFACE_PALETTE = None

def smooth(obj):
    if obj and obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True

def assign(obj, material):
    obj.data.materials.append(material)
    return obj

def uv(name, loc, scale, material, seg=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material); smooth(obj)
    return obj

def aligned_uv(name, start, end, radius_x, radius_y, material, seg=12, rings=7):
    """A low-poly rounded limb aligned exactly to a rest-pose bone segment."""
    start, end = Vector(start), Vector(end)
    direction=end-start
    obj=uv(name,(start+end)*.5,(radius_x,radius_y,direction.length*.5),material,seg,rings)
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction.normalized())
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    return obj

def hair_lock(name, base, tip, width, thickness, material):
    """A broad, flattened low-poly lock; base is at the crown and tip flows out."""
    base, tip = Vector(base), Vector(tip)
    direction=tip-base
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=1.0, radius2=.11, depth=1.0,
                                   location=(base+tip)*.5)
    obj=bpy.context.object; obj.name=name
    # Flatten the cross-section so the locks read as layered hair clumps rather
    # than a row of round spikes.
    obj.scale=(width,thickness,direction.length)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction.normalized())
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    assign(obj,material); smooth(obj)
    return obj

def cube(name, loc, scale, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('soft_edges', 'BEVEL')
        mod.width = bevel; mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    assign(obj, material)
    return obj

def cyl(name, loc, radius, depth, material, vertices=12, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if rotation: obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material); smooth(obj)
    return obj

def cyl_between(name, start, end, radius, material, vertices=10):
    """Create a low-poly structural bar whose local Z runs from start to end."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    obj = cyl(name, (start + end) * .5, radius, direction.length, material, vertices)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = Vector((0,0,1)).rotation_difference(direction.normalized())
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def cone(name, loc, radius1, radius2, depth, material, vertices=10, rotation=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if rotation: obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, material); smooth(obj)
    return obj

def torus(name, loc, major, minor, material, rotation=(0,0,0), major_segments=12, minor_segments=6):
    bpy.ops.mesh.primitive_torus_add(major_segments=major_segments, minor_segments=minor_segments,
                                     location=loc, major_radius=major, minor_radius=minor, rotation=rotation)
    obj = bpy.context.object; obj.name = name
    assign(obj, material); smooth(obj)
    return obj

def empty(name, loc=(0,0,0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = 'ARROWS'
    obj.empty_display_size = 0.12
    obj.location = loc
    if parent: obj.parent = parent
    return obj

def vertex_palette_material():
    """One glTF PBR material driven by per-vertex palette colors.

    This preserves the reference's color blocking while avoiding a material
    primitive/draw-call per color on six racers and six karts.
    """
    global PALETTE
    try:
        if PALETTE and PALETTE.name in bpy.data.materials:
            return PALETTE
    except ReferenceError:
        # The preceding source file can release an unused Blender material.
        PALETTE = None
    PALETTE = mat('MAT_dlicom_vertex_palette', (1,1,1), 0, 0.72)
    tree = PALETTE.node_tree; bsdf = tree.nodes.get('Principled BSDF')
    vc = tree.nodes.get('DlicomPalette') or tree.nodes.new('ShaderNodeVertexColor')
    vc.name = 'DlicomPalette'; vc.layer_name = 'Col'
    tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    return PALETTE

def collapse_to_vertex_palette(obj):
    """Bake existing palette material colors into a `Col` vertex-color layer."""
    mesh=obj.data
    colors=mesh.vertex_colors.get('Col') or mesh.vertex_colors.new(name='Col')
    source=list(mesh.materials)
    for poly in mesh.polygons:
        rgba=source[poly.material_index].diffuse_color[:] if source else (1,1,1,1)
        for loop_index in poly.loop_indices:
            colors.data[loop_index].color=rgba
    mesh.materials.clear()
    mesh.materials.append(vertex_palette_material())

def kart_surface_palette_material():
    """A one-material kart finish library embedded in the GLB.

    The RGB vertex palette remains responsible for DliKarts' deliberately
    graphic colour blocking.  A 32 x 4 non-colour lookup image supplies only
    roughness (green) and metallic (blue), selected per face through a tiny UV
    strip.  This gives painted metal, exposed metal, plastic and rubber their
    own readable response without adding material primitives/draw calls.
    """
    global KART_SURFACE_PALETTE
    try:
        if KART_SURFACE_PALETTE and KART_SURFACE_PALETTE.name in bpy.data.materials:
            return KART_SURFACE_PALETTE
    except ReferenceError:
        KART_SURFACE_PALETTE = None

    KART_SURFACE_PALETTE = mat('MAT_kart_surface_profiles', (1, 1, 1), 0, 0.6)
    tree = KART_SURFACE_PALETTE.node_tree
    bsdf = tree.nodes.get('Principled BSDF')
    vertex_colour = tree.nodes.get('DlicomPalette') or tree.nodes.new('ShaderNodeVertexColor')
    vertex_colour.name = 'DlicomPalette'
    vertex_colour.layer_name = 'Col'
    tree.links.new(vertex_colour.outputs['Color'], bsdf.inputs['Base Color'])

    image = bpy.data.images.get('TEX_kart_surface_profiles')
    if not image:
        image = bpy.data.images.new('TEX_kart_surface_profiles', width=32, height=4, alpha=True)
    image.colorspace_settings.name = 'Non-Color'
    # R is unused. G is roughness; B is metallic.  The six equal profile bands
    # are intentionally broad so nearest-neighbour sampling is robust in glTF.
    profiles = (
        (0.42, 0.00), # moulded black plastic / body shell
        (0.30, 0.55), # red painted metal
        (0.20, 0.90), # exposed steering / bumper metal
        (0.92, 0.00), # tire sidewall rubber
        (0.80, 0.00), # restrained ash tread channels
        (0.22, 0.00), # glossy lamp and mushroom cream plastic
    )
    pixels = []
    for y in range(4):
        for x in range(32):
            profile_index = min(len(profiles) - 1, int(x * len(profiles) / 32))
            roughness, metallic = profiles[profile_index]
            pixels.extend((0.0, roughness, metallic, 1.0))
    image.pixels = pixels
    image.pack()

    texture = tree.nodes.get('KartSurfaceProfiles') or tree.nodes.new('ShaderNodeTexImage')
    texture.name = 'KartSurfaceProfiles'
    texture.image = image
    texture.interpolation = 'Closest'
    separate = tree.nodes.get('KartSurfaceMR') or tree.nodes.new('ShaderNodeSeparateRGB')
    separate.name = 'KartSurfaceMR'
    tree.links.new(texture.outputs['Color'], separate.inputs['Image'])
    tree.links.new(separate.outputs['G'], bsdf.inputs['Roughness'])
    tree.links.new(separate.outputs['B'], bsdf.inputs['Metallic'])
    return KART_SURFACE_PALETTE

def collapse_to_kart_surface_palette(obj):
    """Bake old construction materials into colour plus physical profile UVs."""
    mesh = obj.data
    colors = mesh.vertex_colors.get('Col') or mesh.vertex_colors.new(name='Col')
    uv_layer = mesh.uv_layers.get('KartSurface') or mesh.uv_layers.new(name='KartSurface')
    source = list(mesh.materials)
    profile_u = {
        'plastic': 2.5 / 32.0,
        'paint': 8.0 / 32.0,
        'metal': 13.5 / 32.0,
        'rubber': 18.5 / 32.0,
        'tread': 24.0 / 32.0,
        'lamp': 29.0 / 32.0,
    }
    for poly in mesh.polygons:
        material = source[poly.material_index] if source else None
        material_name = material.name.lower() if material else ''
        if 'tread' in material_name:
            profile = 'tread'
        elif 'rubber' in material_name:
            profile = 'rubber'
        elif 'metal' in material_name:
            profile = 'metal'
        elif 'red' in material_name:
            profile = 'paint'
        elif 'cream' in material_name or 'white' in material_name:
            profile = 'lamp'
        else:
            profile = 'plastic'
        rgba = material.diffuse_color[:] if material else (1, 1, 1, 1)
        for loop_index in poly.loop_indices:
            colors.data[loop_index].color = rgba
            uv_layer.data[loop_index].uv = (profile_u[profile], 0.5)
    mesh.materials.clear()
    mesh.materials.append(kart_surface_palette_material())

def join_meshes(parts, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    result=bpy.context.object; result.name=name
    collapse_to_vertex_palette(result)
    return result

def join_kart_meshes(parts, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    result=bpy.context.object; result.name=name
    collapse_to_kart_surface_palette(result)
    return result

def parent_bone(obj, arm, bone):
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    obj.matrix_parent_inverse = arm.matrix_world.inverted()

def create_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
    arm = bpy.context.object
    arm.name = 'RIG_guatam_humanoid'
    arm.data.name = 'RIG_guatam_humanoid_data'
    arm.show_in_front = True
    eb = arm.data.edit_bones
    root = eb[0]; root.name = 'ROOT'; root.head=(0,0,0); root.tail=(0,0,0.2)
    specs = [
        ('HIPS', 'ROOT', (0,0,0.2), (0,0,0.72)),
        ('SPINE','HIPS',(0,0,0.72),(0,0,1.00)),
        ('CHEST','SPINE',(0,0,1.00),(0,0,1.25)),
        ('NECK','CHEST',(0,0,1.25),(0,0,1.36)),
        ('HEAD','NECK',(0,0,1.36),(0,0,1.60)),
        # Connected, neutral standing chains.  The old limbs were offset at
        # every joint, so rigid part weights visually folded legs and hands.
        # Relaxed standing arms: a modest natural outward shoulder slope,
        # then mostly vertical forearms and palms beside the thighs.
        ('UPPER_ARM_L','CHEST',(-0.25,0,1.20),(-0.35,0,0.98)),
        ('LOWER_ARM_L','UPPER_ARM_L',(-0.35,0,0.98),(-0.39,0,0.76)),
        ('HAND_L','LOWER_ARM_L',(-0.39,0,0.76),(-0.39,0.07,0.64)),
        ('UPPER_ARM_R','CHEST',(0.25,0,1.20),(0.35,0,0.98)),
        ('LOWER_ARM_R','UPPER_ARM_R',(0.35,0,0.98),(0.39,0,0.76)),
        ('HAND_R','LOWER_ARM_R',(0.39,0,0.76),(0.39,0.07,0.64)),
        ('UPPER_LEG_L','HIPS',(-0.15,0,0.70),(-0.15,0,0.42)),
        ('LOWER_LEG_L','UPPER_LEG_L',(-0.15,0,0.42),(-0.15,0,0.14)),
        ('FOOT_L','LOWER_LEG_L',(-0.15,0,0.14),(-0.15,0.20,0.07)),
        ('UPPER_LEG_R','HIPS',(0.15,0,0.70),(0.15,0,0.42)),
        ('LOWER_LEG_R','UPPER_LEG_R',(0.15,0,0.42),(0.15,0,0.14)),
        ('FOOT_R','LOWER_LEG_R',(0.15,0,0.14),(0.15,0.20,0.07)),
    ]
    made={'ROOT': root}
    for name, parent, head, tail in specs:
        b=eb.new(name); b.head=head; b.tail=tail; b.parent=made[parent]; b.use_connect=(name not in ('HIPS','UPPER_ARM_L','UPPER_ARM_R','UPPER_LEG_L','UPPER_LEG_R')); b.roll=0; made[name]=b
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def weight_part(obj, bone):
    # Rigid per-part weights are intentional: no hidden dense loops are needed
    # for this stylised lightweight prototype.
    obj['bone'] = bone

def join_skinned(parts, arm):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:
        obj.select_set(True)
        vg = obj.vertex_groups.new(name=obj.get('bone', 'HIPS'))
        vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = 'GEO_guatam_body'
    body.data.name = 'MESH_guatam_body'
    collapse_to_vertex_palette(body)
    body.parent = arm
    modifier = body.modifiers.new('ARMATURE_guatam', 'ARMATURE')
    modifier.object = arm
    return body

def key_pose(arm, action_name, frames, loop=False):
    action=bpy.data.actions.new(action_name)
    arm.animation_data_create(); arm.animation_data.action=action
    for frame, rotations, locs in frames:
        bpy.context.scene.frame_set(frame)
        # Full pose keys are intentional. They prevent clip transitions from
        # inheriting stale arm/leg transforms from another action.
        for p in arm.pose.bones:
            p.rotation_mode='XYZ'; p.rotation_euler=rotations.get(p.name,(0,0,0)); p.location=locs.get(p.name,(0,0,0))
            p.keyframe_insert('rotation_euler', frame=frame); p.keyframe_insert('location', frame=frame)
    track=arm.animation_data.nla_tracks.new(); track.name=action_name
    track.strips.new(action_name, 1, action)
    return action

def bake_driving_pose(arm, action_name, hand_l, hand_r, chest_roll=0.0):
    """Bake two arm IK chains plus an authored seated lower-body pose.

    IK is a source-authoring convenience only. Constraints and helper empties
    are removed before export; runtime receives ordinary sampled bone keys.
    """
    scene=bpy.context.scene
    for track in arm.animation_data.nla_tracks: track.mute=True
    action=bpy.data.actions.new(action_name)
    arm.animation_data.action=action
    targets={}
    for name,loc in [('L',hand_l),('R',hand_r)]:
        targets[name]=empty('TMP_IK_'+action_name+'_'+name,loc)
    setup=[('HAND_L','L'),('HAND_R','R')]
    for bone_name,target_name in setup:
        c=arm.pose.bones[bone_name].constraints.new('IK')
        c.name='TMP_BAKED_IK'; c.target=targets[target_name]; c.chain_count=3; c.use_tail=True
    # Key simple torso/head intent; IK solves hands and feet relative to it.
    for frame in (1,12,32,40):
        scene.frame_set(frame)
        for p in arm.pose.bones:
            p.rotation_mode='XYZ'; p.rotation_euler=(0,0,0); p.location=(0,0,0)
        arm.pose.bones['CHEST'].rotation_euler=(math.radians(6),0,chest_roll)
        arm.pose.bones['HEAD'].rotation_euler=(0,math.radians(-chest_roll*.45),0)
        # Compact kart posture from the approved driving references: thighs
        # rise slightly forward from the seated hips, knees sit ahead of the
        # torso, then shins angle forward-and-down to the low pedal area.
        # Explicit rotations are more stable than a leg IK solve for this
        # intentionally rigid low-poly mesh.
        for side in ('L','R'):
            arm.pose.bones['UPPER_LEG_'+side].rotation_euler=(math.radians(100),0,0)
            arm.pose.bones['LOWER_LEG_'+side].rotation_euler=(math.radians(-72),0,0)
        for p in arm.pose.bones:
            p.keyframe_insert('rotation_euler',frame=frame); p.keyframe_insert('location',frame=frame)
        for target in targets.values(): target.keyframe_insert('location',frame=frame)
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active=arm; bpy.ops.object.mode_set(mode='POSE')
    for b in arm.data.bones: b.select=True
    bpy.ops.nla.bake(frame_start=1,frame_end=40,step=1,only_selected=False,visual_keying=True,
                     clear_constraints=True,clear_parents=False,use_current_action=True,bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    # Blender 2.83 may leave unbaked constraints when an operator reports no
    # selected channels; never leave a GLB source with orphan helper links.
    for p in arm.pose.bones:
        for c in list(p.constraints):
            if c.name.startswith('TMP_BAKED_IK'): p.constraints.remove(c)
    for target in targets.values(): bpy.data.objects.remove(target,do_unlink=True)
    track=arm.animation_data.nla_tracks.new(); track.name=action_name; track.strips.new(action_name,1,action)
    for track in arm.animation_data.nla_tracks: track.mute=False
    return action

def bake_victory_pose(arm):
    """Bake two hand targets into a forward/upward celebration arc."""
    scene=bpy.context.scene
    for track in arm.animation_data.nla_tracks: track.mute=True
    action=bpy.data.actions.new('victory'); arm.animation_data.action=action
    left=empty('TMP_IK_victory_L',(-.39,.07,.64)); right=empty('TMP_IK_victory_R',(.39,.07,.64))
    for bone,target in [('HAND_L',left),('HAND_R',right)]:
        c=arm.pose.bones[bone].constraints.new('IK'); c.name='TMP_BAKED_IK'; c.target=target; c.chain_count=3; c.use_tail=True
    for frame,loc_l,loc_r in ((1,(-.39,.07,.64),(.39,.07,.64)),(12,(-.34,.12,1.55),(.34,.12,1.55)),(28,(-.34,.12,1.55),(.34,.12,1.55)),(40,(-.39,.07,.64),(.39,.07,.64))):
        scene.frame_set(frame)
        for p in arm.pose.bones:
            p.rotation_mode='XYZ'; p.rotation_euler=(0,0,0); p.location=(0,0,0)
        arm.pose.bones['CHEST'].rotation_euler=(math.radians(-5),0,0); arm.pose.bones['HEAD'].rotation_euler=(math.radians(-7),0,0)
        for p in arm.pose.bones: p.keyframe_insert('rotation_euler',frame=frame); p.keyframe_insert('location',frame=frame)
        left.location=loc_l; right.location=loc_r; left.keyframe_insert('location',frame=frame); right.keyframe_insert('location',frame=frame)
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active=arm; bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.nla.bake(frame_start=1,frame_end=40,step=1,only_selected=False,visual_keying=True,clear_constraints=True,clear_parents=False,use_current_action=True,bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in arm.pose.bones:
        for c in list(p.constraints):
            if c.name.startswith('TMP_BAKED_IK'): p.constraints.remove(c)
    bpy.data.objects.remove(left,do_unlink=True); bpy.data.objects.remove(right,do_unlink=True)
    track=arm.animation_data.nla_tracks.new(); track.name='victory'; track.strips.new('victory',1,action)
    for track in arm.animation_data.nla_tracks: track.mute=False
    return action

def create_character():
    global SKIN, HAIR, CHARCOAL, BLACK, WHITE, RED
    reset_scene()
    SKIN=mat('MAT_skin',(0.72,0.29,0.09),0,0.85)
    HAIR=mat('MAT_hair',(0.075,0.028,0.012),0,0.9)
    CHARCOAL=mat('MAT_charcoal',(0.025,0.03,0.04),0,0.78)
    BLACK=mat('MAT_black',(0.006,0.008,0.012),0,0.72)
    WHITE=mat('MAT_eye_sole',(0.96,0.92,0.83),0,0.55)
    RED=mat('MAT_mushroom_red',(0.8,0.018,0.008),0,0.55)
    arm=create_armature(); parts=[]
    def add(obj,b): weight_part(obj,b); parts.append(obj); return obj
    # Head and face: big, quiet expression with high-contrast eyes.
    add(uv('GEO_guatam_head',(0,0,1.49),(0.39,0.35,0.39),SKIN,16,10),'HEAD')
    # ears, nose/mouth line and distinctive wide eyes on forward (+Y) face
    add(uv('GEO_guatam_ear_l',(-0.39,0,1.48),(0.075,0.055,0.12),SKIN,10,6),'HEAD')
    add(uv('GEO_guatam_ear_r',(0.39,0,1.48),(0.075,0.055,0.12),SKIN,10,6),'HEAD')
    for x in (-0.16,0.16):
        add(uv('GEO_guatam_eye_outline_'+str(x),(x,0.335,1.53),(0.145,0.030,0.18),BLACK,12,8),'HEAD')
        add(uv('GEO_guatam_eye_'+str(x),(x,0.365,1.53),(0.116,0.024,0.148),WHITE,12,8),'HEAD')
    add(cube('GEO_guatam_mouth',(0,0.357,1.36),(0.10,0.018,0.012),BLACK,0.006),'HEAD')
    # Layered shag haircut from the approved turnaround: rounded crown mass,
    # wide asymmetric fringe, exposed ears, and short overlapping back/nape
    # locks.  These opaque wedges preserve the reference silhouette from all
    # angles without hair cards or transparency.
    add(uv('GEO_guatam_haircap',(0,-0.035,1.72),(.385,.355,.175),HAIR,16,8),'HEAD')
    locks=[
        # Front fringe: broad, uneven clumps sweeping down over the forehead.
        ((-.31,.14,1.78),(-.38,.36,1.49),.135,.058),
        # Keep this left-front lock above the eye line; it frames the face
        # without touching the iris or obscuring Guatam's expression.
        ((-.19,.21,1.84),(-.22,.40,1.54),.150,.066),
        # The centre-left fringe is deliberately shorter than the old long
        # lock so it terminates above Guatam's left eye, like its neighbors.
        ((-.055,.245,1.87),(-.075,.42,1.64),.160,.070),
        ((.095,.23,1.85),(.105,.405,1.47),.145,.066),
        ((.235,.17,1.80),(.285,.35,1.53),.125,.058),
        # Crown layers give the slightly off-centre, swept top silhouette.
        ((-.13,-.01,1.83),(-.31,.01,1.96),.155,.078),
        ((.00,.00,1.85),(.06,.08,2.03),.165,.080),
        ((.13,.00,1.83),(.32,.04,1.95),.155,.078),
        # Temple locks frame the cheeks while keeping both ears readable.
        ((-.36,.03,1.75),(-.44,.18,1.55),.095,.052),
        ((.36,.03,1.75),(.44,.18,1.55),.095,.052),
        # Back and nape layers are visible in the turnaround back/side views.
        ((-.23,-.17,1.80),(-.36,-.37,1.53),.145,.068),
        ((-.08,-.22,1.83),(-.13,-.41,1.52),.155,.072),
        ((.09,-.22,1.83),(.14,-.41,1.52),.155,.072),
        ((.24,-.17,1.80),(.37,-.37,1.53),.145,.068),
    ]
    for i,(base,tip,width,thickness) in enumerate(locks):
        add(hair_lock('GEO_guatam_hair_lock_%02d'%i,base,tip,width,thickness,HAIR),'HEAD')
    # Stylized human proportions: shoulder mass above a slightly narrower
    # hoodie torso and a distinct hip line. This preserves Guatam's compact
    # youth silhouette while giving the standing pose a readable anatomy.
    add(uv('GEO_guatam_hoodie',(0,0,1.04),(0.34,0.245,0.31),CHARCOAL,16,8),'CHEST')
    add(uv('GEO_guatam_shoulders',(0,0,1.18),(0.43,0.255,0.155),CHARCOAL,16,7),'CHEST')
    add(uv('GEO_guatam_pelvis',(0,0,0.76),(0.275,0.225,0.16),CHARCOAL,14,7),'HIPS')
    add(cyl('GEO_guatam_neck',(0,0,1.33),.083,.115,SKIN,10),'NECK')
    add(torus('GEO_guatam_collar',(0,0.01,1.25),.28,.055,BLACK,(math.pi/2,0,0),12,5),'CHEST')
    add(cube('GEO_guatam_pocket',(0,0.245,0.93),(0.28,0.035,0.13),BLACK,0.025),'CHEST')
    # Mushroom badge (cap/spot/stem) on chest, still opaque and atlas-free.
    add(cone('GEO_guatam_badge_cap',(0.22,0.283,1.12),.055,.022,.055,RED,10,(math.pi/2,0,0)),'CHEST')
    for x,z in ((.205,1.122),(.235,1.14)):
        add(uv('GEO_guatam_badge_spot_'+str(x),(x,.314,z),(.012,.012,.012),WHITE,8,5),'CHEST')
    add(cyl('GEO_guatam_badge_stem',(.22,.303,1.08),.018,.045,WHITE,8,(math.pi/2,0,0)),'CHEST')
    # Rounded, bone-aligned limbs: clear shoulder → elbow → wrist and hip →
    # knee → ankle chains instead of oversized vertical capsules.
    for side,sgn in (('L',-1),('R',1)):
        # Simple tapered clothing tubes give a continuous readable silhouette
        # at game distance; oversized spherical limb pieces looked segmented.
        add(cyl_between('GEO_guatam_upper_arm_'+side,(.25*sgn,0,1.20),(.35*sgn,0,.98),.086,CHARCOAL,12),'UPPER_ARM_'+side)
        add(cyl_between('GEO_guatam_lower_arm_'+side,(.35*sgn,0,.98),(.39*sgn,0,.76),.070,CHARCOAL,12),'LOWER_ARM_'+side)
        add(aligned_uv('GEO_guatam_hand_'+side,(.39*sgn,0,.76),(.39*sgn,.07,.64),.061,.071,SKIN,10,6),'HAND_'+side)
        add(cyl_between('GEO_guatam_upper_leg_'+side,(.15*sgn,0,.70),(.15*sgn,0,.42),.125,CHARCOAL,12),'UPPER_LEG_'+side)
        add(cyl_between('GEO_guatam_lower_leg_'+side,(.15*sgn,0,.42),(.15*sgn,0,.14),.102,CHARCOAL,12),'LOWER_LEG_'+side)
        add(cube('GEO_guatam_shoe_'+side,(.15*sgn,.13,.105),(.25,.38,.16),WHITE,0.045),'FOOT_'+side)
        add(cube('GEO_guatam_shoe_upper_'+side,(.15*sgn,.06,.17),(.21,.24,.11),BLACK,0.03),'FOOT_'+side)
        add(cube('GEO_guatam_cargo_'+side,(.245*sgn,.12,.53),(.085,.05,.13),BLACK,0.016),'UPPER_LEG_'+side)
    body=join_skinned(parts,arm)
    # Pose clips share an explicit neutral base, preventing animation leakage.
    zero={}; zloc={}
    key_pose(arm,'standing-idle',[(1,zero,zloc),(20,{'HEAD':(0.015,0,0),'CHEST':(0.008,0,0)},{}),(40,zero,zloc)])
    # Character ROOT snaps to the lower, forward DRIVER_SEAT anchor. The hand
    # targets meet the shortened nose-mounted wheel rim; the lower body is
    # authored in bake_driving_pose as a clear seated thigh/knee/shin chain.
    # The rim sits slightly farther forward than the driver, giving Guatam a
    # small, readable reach rather than placing the wheel against his chest.
    # Place the centre of each chunky cartoon hand just outside the left/right
    # rim.  The palms therefore visibly wrap the circular edge at 9-and-3,
    # instead of overlapping the hub or the three spokes inside the wheel.
    drive_targets=((-0.21,.41,.94),(0.21,.41,.94))
    bake_driving_pose(arm,'seated-idle',*drive_targets)
    # The celebration is target-baked upward/outward from both shoulders;
    # this avoids rotating the old downward-facing local axes backward.
    bake_victory_pose(arm)
    hit={'CHEST':(math.radians(-14),0,0),'HEAD':(math.radians(10),0,0),'UPPER_ARM_L':(math.radians(-20),math.radians(32),0),'UPPER_ARM_R':(math.radians(-20),math.radians(-32),0)}
    key_pose(arm,'hit-react',[(1,zero,zloc),(7,hit,{}),(20,zero,zloc)])
    # Power-up use preserves the seated lower body and left-wheel grip while
    # moving the right hand to a compact, readable forward presentation point.
    bake_driving_pose(arm,'powerup-use',(-.21,.41,.94),(.20,.49,1.14))
    # Small authored steering clips are cheaper and more stable than an IK rig
    # per driver; the runtime wheel still rotates independently.
    # Keep the opposite hand planted and move each grip a short arc. These
    # baked clips are the mobile-friendly steering solution (no runtime IK).
    bake_driving_pose(arm,'steer-left',(-.25,.38,.94),(.20,.43,.94),math.radians(7))
    bake_driving_pose(arm,'steer-right',(-.20,.43,.94),(.25,.38,.94),math.radians(-7))
    defeat={'CHEST':(math.radians(14),0,0),'HEAD':(math.radians(18),0,0),'UPPER_ARM_L':(math.radians(22),0,math.radians(-18)),'UPPER_ARM_R':(math.radians(22),0,math.radians(18))}
    key_pose(arm,'defeat',[(1,zero,zloc),(14,defeat,{}),(34,defeat,{}),(42,zero,zloc)])
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active=arm
    bpy.ops.wm.save_as_mainfile(filepath=CHAR_BLEND)
    bpy.ops.export_scene.gltf(filepath=CHAR_GLB, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_animations=True, export_force_sampling=True,
                              export_nla_strips=True, export_skins=True, export_materials=True)

def make_wheel(name, x, y, z, parent, steer=False):
    # Front wheels have a steering parent plus a roll child. Rear wheels need
    # only the hub-centred roll node; avoiding a duplicate empty preserves the
    # exact runtime names WHEEL_RL and WHEEL_RR.
    if steer:
        pivot=empty('STEER_'+name,(x,y,z),parent)
        root=empty(name,(0,0,0),pivot)
    else:
        pivot=parent
        root=empty(name,(x,y,z),parent)
    # A smooth circular tire profile; tread channels are separate conforming
    # ribbons rather than lugs, so the rolling outline stays round.
    tire=torus('GEO_guatam_kart_'+name+'_tire',(0,0,0),.255,.105,RUBBER,(0,math.pi/2,0),24,8)
    tire.parent=root
    # Four low-profile, dark circumferential channels follow the wheel's
    # curvature. This is a stylized, low-poly interpretation of the uploaded
    # road-tire tread: clear longitudinal grooves, no off-road blocks.
    channels=[]
    for channel_index, lateral_center in enumerate((-.070,-.023,.023,.070)):
        # Narrow, near-flush ash channels: road-tire detail should support the
        # silhouette rather than read as four bold raised hoops.
        half_width=.003
        verts=[]; faces=[]
        for step in range(25):
            angle=math.tau*(step % 24)/24.0
            for lateral in (lateral_center-half_width,lateral_center+half_width):
                radius=.255+math.sqrt(.105*.105-lateral*lateral)+.001
                verts.append((radius*math.cos(angle),radius*math.sin(angle),lateral))
        for step in range(24):
            base=step*2; next_base=(step+1)*2
            faces.append((base,next_base,next_base+1,base+1))
        mesh=bpy.data.meshes.new('MESH_guatam_kart_'+name+'_channel_%d'%channel_index)
        mesh.from_pydata(verts,[],faces); mesh.update()
        channel=bpy.data.objects.new('GEO_guatam_kart_'+name+'_channel_%d'%channel_index,mesh)
        bpy.context.collection.objects.link(channel)
        channel.rotation_euler=(0,math.pi/2,0)
        assign(channel,TREAD); smooth(channel); channel.parent=root
        channels.append(channel)
    hub=cyl('GEO_guatam_kart_'+name+'_hub',(0,0,0),.13,.18,METAL,12,(0,math.pi/2,0)); hub.parent=root
    accent=cyl('GEO_guatam_kart_'+name+'_accent',(0,0.095,0),.058,.015,RED,10,(math.pi/2,0,0)); accent.parent=root
    # Keep the established black/red/cream colour blocking in the runtime GLB.
    # The physical-material lookup experiment did not survive this Blender/glTF
    # export path reliably and washed the vehicle out to white in Three.js.
    join_meshes([tire,hub,accent]+channels, 'GEO_guatam_kart_'+name)
    return pivot,root

def create_kart():
    global BLACK, RED, WHITE, RUBBER, TREAD, METAL
    reset_scene()
    BLACK=mat('MAT_kart_black',(0.012,0.016,0.022),0.05,0.52)
    RED=mat('MAT_kart_red',(0.84,0.025,0.012),0,0.48)
    WHITE=mat('MAT_kart_cream',(0.95,0.89,0.77),0,0.62)
    # Return the casing to black. The channels are restrained ash graphite so
    # the tread is visible only as a subtle road-tire surface detail.
    RUBBER=mat('MAT_rubber',(0.055,0.062,0.078),0,0.93)
    TREAD=mat('MAT_tread_channels',(0.145,0.155,0.185),0,0.95)
    METAL=mat('MAT_metal',(0.17,0.20,0.24),0.72,0.28)
    root=empty('KART_guatam')
    # Main chunky buggy shell: raised dark fenders, red rails and a mushroom bonnet emblem.
    chassis=cube('GEO_guatam_kart_chassis',(0,0,.48),(1.28,2.34,.36),BLACK,.12); chassis.parent=root
    nose=uv('GEO_guatam_kart_nose',(0,.90,.66),(.52,.54,.30),BLACK,14,8); nose.parent=root
    cockpit=uv('GEO_guatam_kart_cockpit',(0,-.24,.72),(.56,.56,.34),BLACK,14,8); cockpit.parent=root
    # A lower moulded-plastic cushion prevents the driver's torso from
    # perching above the backrest while keeping the compact cockpit silhouette.
    seat=cube('GEO_guatam_kart_seat',(0,-.32,.57),(.58,.50,.22),BLACK,.08); seat.parent=root
    # The taller backrest meets the lowered driver's shoulders. Rear views
    # therefore show only the deliberate head-and-shoulder silhouette.
    back=cube('GEO_guatam_kart_seatback',(0,-.60,1.22),(.58,.12,.64),BLACK,.06); back.rotation_euler=(math.radians(-18),0,0); back.parent=root
    for x in (-.60,.60):
        rail=cyl('GEO_guatam_kart_side_rail_'+str(x),(x,0,.58),.045,2.10,RED,10,(math.pi/2,0,0)); rail.parent=root
        fender=uv('GEO_guatam_kart_fender_'+str(x),(x,.16,.62),(.19,1.00,.20),BLACK,12,7); fender.parent=root
    bumper=cyl('GEO_guatam_kart_front_bumper',(0,1.30,.40),.06,1.55,METAL,10,(0,math.pi/2,0)); bumper.parent=root
    spoiler=cube('GEO_guatam_kart_rear_spoiler',(0,-1.20,1.03),(1.15,.10,.18),RED,.035); spoiler.parent=root
    # Symmetric red struts make the rear bar read as a supported spoiler,
    # rather than a floating decoration.
    for side in (-1,1):
        strut=cyl_between('GEO_guatam_kart_rear_support_'+str(side),(side*.43,-.82,.67),(side*.48,-1.18,.97),.038,RED,8)
        strut.parent=root
    for x in (-.44,.44):
        lamp=uv('GEO_guatam_kart_lamp_'+str(x),(x,1.16,.73),(.13,.055,.13),WHITE,10,6); lamp.parent=root
    # Raised mushroom identity on nose, all opaque geometry.
    cap=uv('GEO_guatam_kart_mushroom_cap',(0,.93,.98),(.22,.08,.12),RED,12,6); cap.parent=root
    stem=cyl('GEO_guatam_kart_mushroom_stem',(0,.93,.86),.065,.17,WHITE,10); stem.parent=root
    for x,z in ((-.08,1.01),(.08,.98),(0,1.05)):
        spot=uv('GEO_guatam_kart_mushroom_spot_'+str(x),(x,.999,z),(.032,.018,.032),WHITE,8,5); spot.parent=root
    # The steering column starts in the black rounded nose pod (behind the
    # mushroom badge) and slopes back to the independently rotating rim. The
    # base is deliberately embedded in the nose pod, avoiding a detached
    # floating column while retaining a light cartoon construction.
    steering_base=cyl_between('GEO_guatam_kart_steering_column_base',(0,.62,.86),(0,.14,1.06),.042,METAL,10)
    steering_base.parent=root
    # All non-moving bodywork becomes one vertex-colored mesh/material primitive.
    static_parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==root]
    join_meshes(static_parts, 'GEO_guatam_kart_chassis')
    # Wheels use hub-centred transform nodes, with front steer parents.
    for name,x,y,isfront in [('WHEEL_FL',-.78,.72,True),('WHEEL_FR',.78,.72,True),('WHEEL_RL',-.78,-.78,False),('WHEEL_RR',.78,-.78,False)]:
        make_wheel(name,x,y,.31,root,isfront)
    steering=empty('STEERING_WHEEL',(0,.14,1.06),root)
    # A moderate rake makes the rim readable from the raised gameplay camera
    # while retaining a plausible low-poly kart steering angle.
    steering.rotation_euler=(math.radians(48),0,0)
    # Slightly bolder rim restores clear steering-wheel readability without
    # changing the short, nose-pod-connected fixed column.
    ring=torus('GEO_guatam_kart_steering_ring',(0,0,0),.23,.045,BLACK,(0,0,0),12,5); ring.parent=steering
    # Low-poly spokes make the rotating part unmistakably a steering wheel
    # even while the driver is seated in front of it.  They are local to the
    # same independent runtime node as the rim and hub.
    hub=cyl('GEO_guatam_kart_steering_hub',(0,0,-.025),.055,.06,METAL,10); hub.parent=steering
    spoke_points=((.16,0,-.025),(-.08,.139,-.025),(-.08,-.139,-.025))
    spokes=[]
    for i,end in enumerate(spoke_points):
        spoke=cyl_between('GEO_guatam_kart_steering_spoke_'+str(i),(0,0,-.025),end,.014,METAL,6)
        spoke.parent=steering; spokes.append(spoke)
    join_meshes([ring,hub]+spokes, 'GEO_guatam_kart_steering')
    # Sockets are direct runtime anchors; exporter keeps them as named nodes.
    sockets={
        # Character root snaps directly to this lower, forward seat socket.
        # The seated clip provides the final natural pelvis/limb alignment.
        'DRIVER_SEAT':(0,-.14,.37), 'CAMERA_TARGET':(0,-.48,1.47), 'POWERUP_ORIGIN':(0,.10,1.48),
        'PROJECTILE_ORIGIN':(0,1.42,.62), 'VFX_EXHAUST_LEFT':(-.38,-1.24,.44), 'VFX_EXHAUST_RIGHT':(.38,-1.24,.44)}
    for n,loc in sockets.items(): empty(n,loc,root)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.wm.save_as_mainfile(filepath=KART_BLEND)
    bpy.ops.export_scene.gltf(filepath=KART_GLB, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_animations=False, export_materials=True)

build_target=os.environ.get('DLIKARTS_BUILD', 'all').lower()
if build_target in ('all', 'character'):
    create_character()
if build_target in ('all', 'kart'):
    create_kart()
print('GUATAM BUILD COMPLETE')
