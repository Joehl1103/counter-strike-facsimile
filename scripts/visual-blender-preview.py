"""Read an authored .blend copy in memory and render repeatable source previews.

Run through `npm run visual:blender -- --source ... --frames 1,15,30`.
Never saves the source file. Camera, world, and lights exist only for this process.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--frames', default='1,15,30')
parser.add_argument('--action')
parser.add_argument('--action-map', help='JSON clip name to armature/action mappings for paired rigs')
parser.add_argument('--objects', help='Comma-separated mesh names; defaults to meshes with armature modifiers when present')
parser.add_argument('--texture-map', help='JSON image datablock name to texture path, relative to JSON location')
parser.add_argument('--source-camera', help='Exact authored camera name; omit for a fixed whole-asset studio view')
parser.add_argument('--width', type=int, default=960)
parser.add_argument('--height', type=int, default=720)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(args.source).resolve(strict=True)
output = Path(args.out).resolve()
output.mkdir(parents=True, exist_ok=False)
if source.suffix.lower() != '.blend':
    raise ValueError('Source must be an editable .blend file')
frames = [int(value) for value in args.frames.split(',')]
if not frames or len(frames) > 120 or any(frame < 0 or frame > 100000 for frame in frames):
    raise ValueError('Provide 1..120 frame numbers in 0..100000')
if not 320 <= args.width <= 4096 or not 320 <= args.height <= 4096:
    raise ValueError('Dimensions must be in 320..4096')
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
scene = bpy.context.scene
authored_camera = scene.objects.get(args.source_camera) if args.source_camera else None
if args.source_camera and (authored_camera is None or authored_camera.type != 'CAMERA'):
    raise ValueError(f'Unknown authored camera: {args.source_camera}')
texture_repairs = []
if args.texture_map:
    mapping_path = Path(args.texture_map).resolve(strict=True)
    for image_name, texture_path in json.loads(mapping_path.read_text()).items():
        image = bpy.data.images.get(image_name)
        if image is None:
            raise ValueError(f'Unknown source image datablock: {image_name}')
        actual = (mapping_path.parent / texture_path).resolve(strict=True)
        texture_repairs.append({'image': image_name, 'original': image.filepath, 'resolved': str(actual)})
        image.source = 'FILE'
        image.filepath = str(actual)
        image.reload()
missing_textures = [{'name': image.name, 'path': image.filepath} for image in bpy.data.images
                    if image.source == 'FILE' and not image.packed_file
                    and (not image.filepath or not Path(bpy.path.abspath(image.filepath)).is_file())]
if missing_textures:
    (output / 'errors.json').write_text(json.dumps({'missingTextures': missing_textures}, indent=2))
    raise ValueError('Missing source textures; see errors.json and supply --texture-map')
mesh_names = set(args.objects.split(',')) if args.objects else {
    obj.name for obj in scene.objects if obj.type == 'MESH'
    and any(modifier.type == 'ARMATURE' for modifier in obj.modifiers)}
if not mesh_names:
    mesh_names = {obj.name for obj in scene.objects if obj.type == 'MESH' and not obj.hide_render}
for name in mesh_names:
    if name not in scene.objects or scene.objects[name].type != 'MESH':
        raise ValueError(f'Unknown mesh: {name}')
for obj in scene.objects:
    if obj.type == 'MESH':
        obj.hide_render = obj.name not in mesh_names
available_actions = [action.name for action in bpy.data.actions]
if args.action:
    if args.action_map:
        action_sets = json.loads(Path(args.action_map).read_text())
        if args.action not in action_sets:
            raise ValueError(f'Unknown paired clip: {args.action}')
        assignments = action_sets[args.action]
    else:
        armatures = [obj for obj in scene.objects if obj.type == 'ARMATURE']
        if len(armatures) != 1:
            raise ValueError('Multi-rig scenes need --action-map for matched animation selection')
        assignments = {armatures[0].name: args.action}
    for rig_name, action_name in assignments.items():
        rig = scene.objects.get(rig_name)
        action = bpy.data.actions.get(action_name)
        if rig is None or rig.type != 'ARMATURE' or action is None:
            raise ValueError(f'Unknown rig/action pair: {rig_name}/{action_name}')
        rig.animation_data_create()
        rig.animation_data.action = action

# The sampled bounds frame the studio view and its lights. An authored camera
# retains its original hierarchy, lens and animation instead of using this fit.
points = []
for frame in frames:
    scene.frame_set(frame)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in scene.objects:
        if obj.type == 'MESH' and not obj.hide_render:
            evaluated = obj.evaluated_get(depsgraph)
            points.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
if not points:
    raise ValueError('Source has no renderable meshes')
lower = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
upper = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
center = (lower + upper) / 2
radius = max((upper - lower).length / 2, 0.1)
for obj in list(scene.objects):
    if obj.type in {'CAMERA', 'LIGHT'} and obj != authored_camera:
        bpy.data.objects.remove(obj, do_unlink=True)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = args.width
scene.render.resolution_y = args.height
scene.render.resolution_percentage = 100
scene.render.use_border = False
scene.render.use_crop_to_border = False
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
world = bpy.data.worlds.new('Visual toolkit neutral world')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.12, 0.12, 0.12, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
scene.world = world
if authored_camera is not None:
    camera = authored_camera
else:
    camera_data = bpy.data.cameras.new('Visual toolkit camera')
    camera = bpy.data.objects.new('Visual toolkit camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = center + Vector((1, -1.8, 0.8)).normalized() * radius * 3.8
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.lens = 42
    camera_data.clip_end = radius * 30
scene.camera = camera
for name, offset, energy in [('Key', (2, -3, 4), 1000), ('Fill', (-3, -1, 2), 500)]:
    data = bpy.data.lights.new('Visual toolkit ' + name, 'AREA')
    data.energy = energy * radius * radius
    data.shape = 'DISK'
    data.size = radius * 3
    light = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(light)
    light.location = center + Vector(offset) * radius
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()


def evaluated_camera_record():
    evaluated = camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = evaluated.data
    return {
        'name': camera.name,
        'policy': 'authored' if authored_camera is not None else 'studio',
        'position': list(evaluated.matrix_world.translation),
        'matrixWorld': [list(row) for row in evaluated.matrix_world],
        'type': data.type,
        'lensMm': data.lens,
        'sensorWidthMm': data.sensor_width,
        'sensorHeightMm': data.sensor_height,
        'sensorFit': data.sensor_fit,
        'shift': [data.shift_x, data.shift_y],
        'clip': [data.clip_start, data.clip_end],
    }


scene.frame_set(frames[0])
manifest = {'schemaVersion': 1, 'operation': 'blender-source-preview', 'source': str(source),
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'blenderVersion': bpy.app.version_string,
            'selectedMeshes': sorted(mesh_names), 'textureRepairs': texture_repairs,
            'actions': available_actions, 'requestedAction': args.action, 'frames': [],
            'camera': evaluated_camera_record(),
            'render': {'width': args.width, 'height': args.height,
                       'pixelAspect': [scene.render.pixel_aspect_x, scene.render.pixel_aspect_y]},
            'lighting': {'policy': 'neutral-studio', 'engine': scene.render.engine,
                         'viewTransform': scene.view_settings.view_transform,
                         'look': scene.view_settings.look,
                         'exposure': scene.view_settings.exposure,
                         'gamma': scene.view_settings.gamma},
            'materials': [{'name': material.name, 'usesNodes': material.use_nodes} for material in bpy.data.materials],
            'visualApproval': 'unreviewed'}
for frame in frames:
    scene.frame_set(frame)
    image = f'frame-{frame:05d}.png'
    scene.render.filepath = str(output / image)
    bpy.ops.render.render(write_still=True)
    skeletons = []
    for obj in scene.objects:
        if obj.type == 'ARMATURE':
            skeletons.append({'name': obj.name, 'bones': [{'name': bone.name,
                'head': list(obj.matrix_world @ bone.head), 'tail': list(obj.matrix_world @ bone.tail)} for bone in obj.pose.bones]})
    manifest['frames'].append({'frame': frame, 'image': image, 'skeletons': skeletons,
                               'camera': evaluated_camera_record()})
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2))
print('SOURCE_PREVIEW_MANIFEST=' + str(output / 'manifest.json'))
