"""Render the supplied Retree references without modifying their GLBs."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'blender/characters/retree-rebuilt/reference';OUT.mkdir(parents=True,exist_ok=True)
for name in ['Retree','RetreeKart','RetreeDriving']:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/characters/retree/new-models'/(name+'.glb')))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(lo+hi)/2;size=hi-lo
    print('REFERENCE',name,'bounds',tuple(lo),tuple(hi),'triangles',sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),flush=True)
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=32
    scene.render.resolution_x=900;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world.color=(.22,.22,.22);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
    radius=max(size)
    for delta,energy in [((2,-3,4),650),((-3,-1,2),400),((0,4,3),500)]:
        d=bpy.data.lights.new('Reference softbox','AREA');d.energy=energy;d.size=radius*2
        o=bpy.data.objects.new('Reference softbox',d);scene.collection.objects.link(o);o.location=center+Vector(delta)*radius/2;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('Reference camera');o=bpy.data.objects.new('Reference camera',d);scene.collection.objects.link(o);scene.camera=o;d.type='ORTHO';d.ortho_scale=radius*1.35
    for label,delta in [('front',(2,-4,1.7)),('rear',(2,4,1.6))] if name=='RetreeDriving' else [('front',(2,-4,1.7))]:
        o.location=center+Vector(delta)*radius;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(OUT/(name+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
