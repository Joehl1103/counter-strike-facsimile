"""Derive a Glock-shaped pistol from the licensed matched Kuptchi source rig.
All new positions are measured Main-local centimetres, converted through the
actual Main rest matrix into pistol-armature space before skinning.
"""
import argparse, json, math, sys, hashlib
from pathlib import Path
import bpy, bmesh
from mathutils import Vector, Matrix

IDLE_PAIR = ("Arms_BasePose", "Pistol_Breathing", 1, 200)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--project-root",
    type=Path,
    required=True,
    help="Project containing the licensed Kuptchi source pack.",
)
parser.add_argument(
    "--source",
    type=Path,
    required=True,
    help="Original FP_Arms_Pistol_01_Anims.blend to adapt.",
)
parser.add_argument(
    "--output",
    type=Path,
    required=True,
    help="New directory for the frozen Idle source and preview evidence.",
)
parser.add_argument(
    "--preview",
    action="store_true",
    help="Also render native and inspection camera previews.",
)
args = parser.parse_args(
    sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
)
ROOT = args.project_root.expanduser().resolve(strict=True)
SOURCE = args.source.expanduser().resolve(strict=True)
OUT = args.output.expanduser().resolve()
if SOURCE.suffix.lower() != ".blend":
    parser.error("--source must be an original .blend file")
if OUT.exists():
    parser.error(
        "--output must be a new directory; existing evidence is never overwritten"
    )
OUT.mkdir(parents=True, exist_ok=False)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE), load_ui=False, use_scripts=False)
scene = bpy.context.scene
rig = bpy.data.objects["Pistol_01_Armature"]
arms_rig = bpy.data.objects["Arms_Armature"]
donor = bpy.data.objects["Pistol_Mesh"]
arms = bpy.data.objects["FPS_Arms_Mesh"]
source_camera = bpy.data.objects["Camera"]
rest_main = rig.data.bones["Main"].matrix_local.copy()
inverse_main = rest_main.inverted()
for image_name, path in [
    (
        "Pistol_01_Albedo.png",
        ROOT
        / "assets/source/kuptchi-weapons/Guns/Pistol_01/Textures/Pistol_01_Albedo.png",
    ),
    (
        "Untitled.001",
        ROOT / "assets/source/kuptchi-weapons/FP_Arms/Texture/FPS_Arms_Albedo.png",
    ),
]:
    image = bpy.data.images.get(image_name)
    image.source = "FILE"
    image.filepath = str(path)
    image.reload()
for obj, action_name in [(arms_rig, IDLE_PAIR[0]), (rig, IDLE_PAIR[1])]:
    obj.animation_data_create()
    obj.animation_data.action = bpy.data.actions[action_name]
    for track in obj.animation_data.nla_tracks:
        track.mute = True
scene.frame_start = IDLE_PAIR[2]
scene.frame_end = IDLE_PAIR[3]
scene.frame_set(1)
bpy.context.view_layer.update()


def material(name, color, roughness, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return mat


metal = material("Glock charcoal steel", (0.022, 0.027, 0.032), 0.64, 0.35)
polymer = material("Glock textured polymer", (0.015, 0.018, 0.019), 0.88)
black = material("Glock recess and serrations", (0.004, 0.006, 0.008), 0.92)
edge = material("Glock exposed barrel steel", (0.043, 0.05, 0.06), 0.52, 0.4)
# Preview uses a Multiply node. The glTF exporter drops this multiplier;
# the production material-factor processor restores the documented factors.
def multiplied_material(original, name, color):
    mat = original.copy()
    mat.name = name
    shader = mat.node_tree.nodes.get("Principled BSDF")
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    connection = shader.inputs["Base Color"].links[0]
    texture_socket = connection.from_socket
    links.remove(connection)
    multiply = nodes.new("ShaderNodeMixRGB")
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1
    multiply.inputs[2].default_value = (*color, 1)
    links.new(texture_socket, multiply.inputs[1])
    links.new(multiply.outputs[0], shader.inputs["Base Color"])
    shader.inputs["Roughness"].default_value = 0.86
    return mat


skin = multiplied_material(
    arms.data.materials[0], "Warm source skin", (0.70, 0.51, 0.34)
)
glove = multiplied_material(
    arms.data.materials[0], "Dark fingerless glove", (0.032, 0.043, 0.04)
)
arms.data.materials.clear()
arms.data.materials.append(skin)
arms.data.materials.append(glove)


def dominant_group(vertex, obj):
    active_rig = arms_rig if obj == arms else rig
    valid = [
        g
        for g in vertex.groups
        if g.weight > 0
        and obj.vertex_groups[g.group].name in active_rig.data.bones
        and active_rig.data.bones[obj.vertex_groups[g.group].name].use_deform
    ]
    return obj.vertex_groups[max(valid, key=lambda g: g.weight).group].name


# Cut the existing low-poly surface at measured skeletal wrist/finger planes.
# Bisect interpolates existing UVs and deform weights; animation remains authored.
mesh_from_rig = arms.matrix_world.inverted() @ arms_rig.matrix_world
hand_frame = mesh_from_rig @ arms_rig.data.bones["hand_l"].matrix_local
finger_frames = {
    finger: mesh_from_rig @ arms_rig.data.bones[finger + "_02_l"].matrix_local
    for finger in ("index", "middle", "ring", "pinky", "thumb")
}
bm = bmesh.new()
bm.from_mesh(arms.data)
deform = bm.verts.layers.deform.active
valid_groups = {
    g.index: g.name
    for g in arms.vertex_groups
    if g.name in arms_rig.data.bones and arms_rig.data.bones[g.name].use_deform
}


def bm_winner(vertex):
    valid = [
        (index, weight)
        for index, weight in vertex[deform].items()
        if index in valid_groups and weight > 0
    ]
    return valid_groups[max(valid, key=lambda pair: pair[1])[0]]


for finger, frame in [("wrist", hand_frame), *finger_frames.items()]:
    if finger == "wrist":
        geometry = list(bm.verts) + list(bm.edges) + list(bm.faces)
    else:
        faces = [
            face
            for face in bm.faces
            if any(bm_winner(vertex).startswith(finger) for vertex in face.verts)
        ]
        geometry = (
            list({vertex for face in faces for vertex in face.verts})
            + list({edge for face in faces for edge in face.edges})
            + faces
        )
    bmesh.ops.bisect_plane(
        bm,
        geom=geometry,
        dist=0.0001,
        plane_co=frame.translation,
        plane_no=frame.to_3x3() @ Vector((0, 1, 0)),
        clear_inner=False,
        clear_outer=False,
    )
bm.to_mesh(arms.data)
bm.free()
arms.data.update()
for polygon in arms.data.polygons:
    center = sum(
        (arms.data.vertices[index].co for index in polygon.vertices), Vector()
    ) / len(polygon.vertices)
    groups = [
        dominant_group(arms.data.vertices[index], arms) for index in polygon.vertices
    ]
    families = [
        finger
        for finger in finger_frames
        if any(group.startswith(finger) for group in groups)
    ]
    if families:
        finger = max(
            families, key=lambda name: sum(group.startswith(name) for group in groups)
        )
        in_glove = (finger_frames[finger].inverted() @ center).y < -0.0001
    else:
        in_glove = (hand_frame.inverted() @ center).y >= -0.0001
    polygon.material_index = 1 if in_glove else 0
arms["viewmodelArm"] = True
arms["assetCategory"] = "viewmodelArm"
parts = []


def register(obj, bone, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for vertex in obj.data.vertices:
        vertex.co = rest_main @ vertex.co
    obj.vertex_groups.clear()
    obj.vertex_groups.new(name=bone).add(
        list(range(len(obj.data.vertices))), 1, "REPLACE"
    )
    obj.matrix_world = rig.matrix_world.copy()
    obj.parent = rig
    obj.matrix_parent_inverse = rig.matrix_world.inverted()
    obj.matrix_world = rig.matrix_world.copy()
    modifier = obj.modifiers.new("Matched pistol skin", "ARMATURE")
    modifier.object = rig
    parts.append(obj)
    return obj


def apply_modifier(obj, modifier):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def box(name, lo, hi, mat, bone="Main", bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.location = Vector(lo) + (Vector(hi) - Vector(lo)) * 0.5
    obj.dimensions = Vector(hi) - Vector(lo)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if bevel:
        mod = obj.modifiers.new("Small machined bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        apply_modifier(obj, mod)
    return register(obj, bone, mat)


def cylinder(name, center, radius, depth, mat, bone="Main", sides=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides,
        radius=radius,
        depth=depth,
        location=center,
        rotation=(0, math.pi / 2, 0),
    )
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return register(obj, bone, mat)


# Keep the lower donor frame/contact surface, trigger, and animated magazine.
# Reject Slide, Hammer and high barrel polys; they are replaced by Glock geometry.
local_positions = [inverse_main @ vertex.co for vertex in donor.data.vertices]
kept = []
for polygon in donor.data.polygons:
    groups = {
        dominant_group(donor.data.vertices[index], donor) for index in polygon.vertices
    }
    if groups <= {"Trigger", "Magazine"} or (
        groups == {"Main"}
        and max(local_positions[index].y for index in polygon.vertices) < 10.15
        and not any(
            local_positions[index].x < -0.65 and local_positions[index].y > 8.3
            for index in polygon.vertices
        )
    ):
        kept.append(polygon)
used = sorted({i for p in kept for i in p.vertices})
mapping = {old: new for new, old in enumerate(used)}
mesh = bpy.data.meshes.new("Retained matched lower frame mesh")
mesh.from_pydata(
    [donor.data.vertices[index].co for index in used],
    [],
    [[mapping[index] for index in polygon.vertices] for polygon in kept],
)
mesh.update()
obj = bpy.data.objects.new("Matched lower frame", mesh)
scene.collection.objects.link(obj)
obj.matrix_world = donor.matrix_world.copy()
obj.parent = rig
obj.matrix_world = donor.matrix_world.copy()
for source_group in donor.vertex_groups:
    obj.vertex_groups.new(name=source_group.name)
for original_index in used:
    for influence in donor.data.vertices[original_index].groups:
        obj.vertex_groups[influence.group].add(
            [mapping[original_index]], influence.weight, "REPLACE"
        )
obj.data.materials.append(polymer)
modifier = obj.modifiers.new("Matched pistol skin", "ARMATURE")
modifier.object = rig
parts.append(obj)
donor.hide_render = True
donor.hide_set(True)
# Main polymer rails and tang fill the measured source contact envelope.
box("Polymer dust cover", (-0.7, 9.05, -1.43), (18.05, 10.4, 1.43), polymer, bevel=0.18)
box("Rear polymer tang", (-0.70, 8.85, -1.38), (1.2, 10.15, 1.38), polymer, bevel=0.16)
box(
    "Closed rear backstrap",
    (-0.88, 7.85, -1.31),
    (-0.57, 10.15, 1.31),
    polymer,
    bevel=0.09,
)
# Broad bevelled rectangular Glock slide with a true top/right-side opening.
slide = box(
    "Broad Glock slide",
    (-0.65, 10.28, -1.52),
    (18.9, 13.05, 1.52),
    metal,
    bone="Slide",
    bevel=0.24,
)
# Boolean cutter is made in the same rig-rest space as the skinned slide.
bpy.ops.mesh.primitive_cube_add(size=1)
cutter = bpy.context.object
cutter.name = "Temporary ejection recess cutter"
for vertex in cutter.data.vertices:
    vertex.co = rest_main @ Vector(
        (9.1 + vertex.co.x * 4.3, 12.78 + vertex.co.y * 1.9, -0.87 + vertex.co.z * 2.12)
    )
cutter.matrix_world = rig.matrix_world.copy()
boolean = slide.modifiers.new("Open ejection recess", "BOOLEAN")
boolean.operation = "DIFFERENCE"
boolean.solver = "EXACT"
boolean.object = cutter
# Apply boolean before armature deformation; modifier must precede skin.
bpy.context.view_layer.objects.active = slide
bpy.ops.object.modifier_move_up(modifier=boolean.name)
apply_modifier(slide, boolean)
bpy.data.objects.remove(cutter, do_unlink=True)
# Boolean vertices inherit interpolation; make slide weight explicit after topology edit.
slide.vertex_groups["Slide"].add(list(range(len(slide.data.vertices))), 1, "REPLACE")
box("Recess floor", (6.91, 11.89, -1.40), (11.29, 11.98, 0.37), black, bone="Main")
box(
    "Barrel chamber",
    (7.30, 11.98, -0.81),
    (10.85, 12.32, 0.76),
    edge,
    bone="Main",
    bevel=0.10,
)
# Three pieces form the actual U-notch rear sight; open center is visible.
box(
    "Rear sight base",
    (-0.16, 13.03, -1.10),
    (0.84, 13.21, 1.10),
    black,
    bone="Slide",
    bevel=0.05,
)
for side in [-1, 1]:
    lo, hi = (-1.1, -0.38) if side == -1 else (0.38, 1.1)
    box(
        "Rear sight left" if side < 0 else "Rear sight right",
        (-0.13, 13.16, lo),
        (0.67, 13.77, hi),
        metal,
        bone="Slide",
        bevel=0.06,
    )
box(
    "Front sight",
    (17.58, 13.05, -0.20),
    (18.19, 13.58, 0.20),
    black,
    bone="Slide",
    bevel=0.055,
)
# Dark inset strips sit just above each flat slide side, retaining the top bevel.
for side in [-1, 1]:
    for index in range(7):
        x = 0.9 + index * 0.58
        z = side * 1.525
        box(
            "Rear serration %s %s" % (side, index),
            (x, 10.65, z - 0.018),
            (x + 0.16, 12.77, z + 0.018),
            black,
            bone="Slide",
            bevel=0.015,
        )
# The barrel extends continuously into the chamber. Its front remains fixed
# to Main while the authored Slide retracts during fire and reload; a shallow
# muzzle cap alone would float when that motion exposes the barrel.
cylinder("Muzzle barrel rim", (14.80875, 11.75, 0), 0.62, 8.3175, edge)
cylinder("Muzzle dark bore", (18.981, 11.75, 0), 0.43, 0.03, black)
# Polymer slide-release tab and frame pins give scale without extra materials.
box("Slide release", (2.55, 9.67, -1.57), (4.1, 10.04, -1.40), black, bevel=0.05)
for x, y in [(3.35, 9.18), (5.1, 9.45)]:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10, radius=0.105, depth=0.035, location=(x, y, -1.45)
    )
    pin = bpy.context.object
    pin.name = "Frame pin"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    register(pin, "Main", black)
# One skinned weapon object and four material primitives at most.
bpy.ops.object.select_all(action="DESELECT")
for part in parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
gun = bpy.context.object
gun.name = "Glock_Mesh"
gun.data.name = "Glock_Source_Derived_Mesh"
gun["secondaryWeaponGeometry"] = True
gun["assetCategory"] = "secondaryWeaponGeometry"
# Recalculate winding after primitive transforms and booleans.
bm = bmesh.new()
bm.from_mesh(gun.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(gun.data)
bm.free()
gun.data.update()
# Reuse a clean, worn-steel portion of the licensed source atlas. Explicit
# Main-local planar UVs map every surface into the same checked source patch;
# they introduce grain without importing its 1911 lettering or wood panels.
texture = bpy.data.images["Pistol_01_Albedo.png"]
for mat, factor in [
    (metal, (0.105, 0.12, 0.135)),
    (polymer, (0.066, 0.073, 0.075)),
    (edge, (0.18, 0.21, 0.25)),
]:
    shader = mat.node_tree.nodes.get("Principled BSDF")
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node.image = texture
    multiply = mat.node_tree.nodes.new("ShaderNodeMixRGB")
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1
    multiply.inputs[2].default_value = (*factor, 1)
    mat.node_tree.links.new(node.outputs["Color"], multiply.inputs[1])
    mat.node_tree.links.new(multiply.outputs[0], shader.inputs["Base Color"])
uv = gun.data.uv_layers.active or gun.data.uv_layers.new(name="Source metal patch")
for polygon in gun.data.polygons:
    normal = inverse_main.to_3x3() @ polygon.normal
    for loop_index in polygon.loop_indices:
        point = (
            inverse_main @ gun.data.vertices[gun.data.loops[loop_index].vertex_index].co
        )
        along = (
            (point.z + 1.55) / 3.1 if abs(normal.x) > 0.6 else (point.x + 3.2) / 22.3
        )
        across = (
            (point.z + 1.55) / 3.1 if abs(normal.y) > 0.6 else (point.y + 0.36) / 14.3
        )
        uv.data[loop_index].uv = (0.225 + along * 0.19, 0.725 + across * 0.038)
# Preserve source-camera and Main-parented effect landmarks.
reference = bpy.data.objects.new("source-camera-reference", None)
scene.collection.objects.link(reference)
reference.matrix_world = source_camera.matrix_world.copy()
reference["sourceLensMillimeters"] = source_camera.data.lens
orientation = Matrix(((0, 0, -1, 0), (0, 1, 0, 0), (1, 0, 0, 0), (0, 0, 0, 1)))
sockets = []
for name, point in [
    ("muzzle-socket", (19.0, 11.75, 0)),
    ("ejection-socket", (9.1, 12.35, -1.60)),
]:
    socket = bpy.data.objects.new(name, None)
    scene.collection.objects.link(socket)
    socket.parent = rig
    socket.parent_type = "BONE"
    socket.parent_bone = "Main"
    socket.matrix_parent_inverse.identity()
    bpy.context.view_layer.update()
    socket.matrix_world = (
        rig.matrix_world
        @ rig.pose.bones["Main"].matrix
        @ Matrix.Translation(Vector(point))
        @ orientation
    )
    sockets.append(socket)
for obj in list(scene.objects):
    if obj.type == "MESH":
        obj.hide_render = obj not in (gun, arms)
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.use_border = False
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("Neutral preview world")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (
    0.23,
    0.25,
    0.28,
    1,
)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
center = Vector((36, -8, -16))
for name, offset, energy in [
    ("Key", (-25, 20, 45), 65000),
    ("Fill", (-15, -35, 25), 30000),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 35
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = center + Vector(offset)
    light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = source_camera
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = 0


def counts(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    triangles = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return triangles


record = {
    "clip": "Idle",
    "source": str(SOURCE),
    "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "pairs": IDLE_PAIR,
    "sourceUnitMetres": scene.unit_settings.scale_length,
    "armsTriangles": counts(arms),
    "gunTriangles": counts(gun),
    "gunMaterials": len(gun.data.materials),
    "localAxes": "Main-local cm +X barrel +Y up +Z lateral",
    "retainedLowerPolygons": len(kept),
    "sourceRestMain": list(map(list, rest_main)),
}
assert record["armsTriangles"] <= 4000, record
assert record["gunTriangles"] <= 2500, record
assert record["gunMaterials"] <= 4, record
(OUT / ("record-" + "Idle" + ".json")).write_text(json.dumps(record, indent=2))
if args.preview:
    scene.render.filepath = str(OUT / "candidate-idle-native.png")
    bpy.ops.render.render(write_still=True)
    camera_data = bpy.data.cameras.new("Inspection camera")
    camera = bpy.data.objects.new("Inspection camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (18, 8, -1)
    camera.rotation_euler = (
        (Vector((39, -8, -16)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    )
    camera.data.lens = 36
    scene.camera = camera
    scene.render.filepath = str(OUT / "candidate-idle-inspection.png")
    bpy.ops.render.render(write_still=True)
    scene.camera = source_camera
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "glock-rig-source.blend"))
print(json.dumps(record))
