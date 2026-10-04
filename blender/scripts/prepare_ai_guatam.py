"""Create lightweight racing derivatives; never modify the supplied GLBs.
Run: blender --background --python blender/scripts/prepare_ai_guatam.py
"""
import bpy
import math
import sys
import bmesh
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/characters/new-models'
OUTPUT = SOURCE / 'runtime'
OUTPUT.mkdir(parents=True, exist_ok=True)

for filename, budget in [('GautamDriving.glb', 45000), ('GautamKart.glb', 30000)]:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / filename))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # The AI exports one mesh with UV seams, not separate wheel objects.
    # Extract wheel faces spatially while retaining their original UV/materials.
    for obj in meshes[:]:
        bpy.context.view_layer.objects.active=obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        driving='Driving' in filename
        configs = [('FL',-.54,-.69,-.41,.235,.34),('FR',.54,-.69,-.41,.235,.34),('RL',-.596,.585,-.365,.27,.40),('RR',.596,.585,-.365,.27,.40)] if driving else [('FL',-.49,-.67,-.195,.205,.32),('FR',.49,-.67,-.195,.205,.32),('RL',-.565,.515,-.13,.28,.36),('RR',.565,.515,-.13,.28,.36)]
        assignments={}
        for poly in obj.data.polygons:
            c=poly.center
            for label,x,y,z,r,w in configs:
                # Keep adjacent lamps/bodywork attached to the chassis.
                if label.startswith('F') and (abs(c.x)<(.405 if driving else .35) or c.z>(-.205 if driving else -.025)):
                    continue
                if abs(c.x-x)<w/2 and (c.y-y)**2+(c.z-z)**2 < (r*1.04)**2:
                    assignments[poly.index]=label;break
        for label,x,y,z,r,w in configs:
            wheel=obj.copy();wheel.data=obj.data.copy();bpy.context.scene.collection.objects.link(wheel)
            bm=bmesh.new();bm.from_mesh(wheel.data);bm.faces.ensure_lookup_table()
            bmesh.ops.delete(bm,geom=[f for f in bm.faces if assignments.get(f.index)!=label],context='FACES')
            bm.to_mesh(wheel.data);bm.free()
            center=Vector((x,y,z))
            for v in wheel.data.vertices:v.co-=center
            wheel.name='WHEEL_'+label;wheel.location=center
            wheel['importedWheel']=True
            pivot=bpy.data.objects.new('STEER_WHEEL_'+label if label.startswith('F') else 'AXLE_'+label,None)
            bpy.context.scene.collection.objects.link(pivot);pivot.location=center
            wheel.parent=pivot;wheel.location=(0,0,0)
            meshes.append(wheel)
        bm=bmesh.new();bm.from_mesh(obj.data);bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index in assignments],context='FACES')
        bm.to_mesh(obj.data);bm.free()
    total=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        triangles = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        modifier = obj.modifiers.new('Browser triangle budget', 'DECIMATE')
        modifier.ratio = min(1.0, budget / max(1, total))
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        # Weld coincident seam vertices without discarding per-loop UVs, then
        # smooth shading while retaining hard silhouette creases.
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free()
        for p in obj.data.polygons:p.use_smooth=True
        obj.data.use_auto_smooth=True;obj.data.auto_smooth_angle=math.radians(55)
    # Export meshes only; source coordinate conversion remains glTF standard.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / filename), export_format='GLB', export_image_format='JPEG', export_extras=True, use_selection=False)
    if '--render' not in sys.argv:
        print('PREPARED', filename, 'triangles', sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons))
        continue
    if '--wheel-preview' in sys.argv:
        for obj in meshes:
            if obj.get('importedWheel'):
                obj.rotation_euler.x=.8
                if obj.parent.name.startswith('STEER_'):obj.parent.rotation_euler.z=.3
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = 700
    scene.render.resolution_y = 550
    scene.render.resolution_percentage = 100
    scene.world.color = (.15, .15, .15)
    for position in [(3,-4,5),(-3,2,4)]:
        light_data = bpy.data.lights.new('Inspection light', 'AREA')
        light_data.energy = 500
        light_data.size = 5
        light = bpy.data.objects.new('Inspection light', light_data)
        scene.collection.objects.link(light)
        light.location = position
        light.rotation_euler = (-light.location).to_track_quat('-Z','Y').to_euler()
    camera_data = bpy.data.cameras.new('Inspection camera')
    camera = bpy.data.objects.new('Inspection camera', camera_data)
    scene.collection.objects.link(camera)
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 3.1
    scene.camera = camera
    for side in [-1,1]:
        camera.location = (2.5, side * 4, 2.0)
        camera.rotation_euler = (-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(OUTPUT / (Path(filename).stem + ('-minus-y.png' if side < 0 else '-plus-y.png')))
        bpy.ops.render.render(write_still=True)
    print('PREPARED', filename, 'triangles', sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons))
