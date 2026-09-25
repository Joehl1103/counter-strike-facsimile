"""Offline Blender authoring for the Counter-Strike CT pilot.

The pilot starts from MakeHuman's CC0 hm08 topology, rather than assembling a
character from primitives.  Its output keeps Vanguard's Mixamo armature and
animation clips so the game can evaluate it using the existing character path.

Usage from the repository root:
  Blender --background --python scripts/author-ct-pilot.py -- --stage tooling
  Blender --background --python scripts/author-ct-pilot.py -- --stage pilot
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BODY = ROOT / "assets/source/makehuman/base.obj"
VANGUARD = ROOT / "public/assets/characters/vanguard.glb"
SOURCE_DIR = ROOT / "assets/source/characters"
PUBLIC_DIR = ROOT / "public/assets/characters"
OUTPUT_DIR = ROOT / "outputs/cs16/recovery/ct-pilot"


def command_line_arguments() -> argparse.Namespace:
    arguments = sys_argv_after_double_dash()
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("tooling", "pilot"), required=True)
    return parser.parse_args(arguments)


def sys_argv_after_double_dash() -> list[str]:
    import sys

    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_vanguard() -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    bpy.ops.import_scene.gltf(filepath=str(VANGUARD))
    armature = next(item for item in bpy.context.scene.objects if item.type == "ARMATURE")
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    return armature, meshes


def import_makehuman_body() -> bpy.types.Object:
    bpy.ops.wm.obj_import(filepath=str(SOURCE_BODY))
    body = bpy.context.object
    body.name = "CT_Pilot_Continuous_Base"
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return body


def configure_render(width: int = 720, height: int = 900) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Recovery_Studio")
    scene.world.color = (0.035, 0.045, 0.06)


def add_area_light(location: tuple[float, float, float], energy: float, size: float) -> None:
    light_data = bpy.data.lights.new("Studio_Key", "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new("Studio_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, Vector((0.0, 0.0, 0.85)))


def look_at(object_: bpy.types.Object, target: Vector) -> None:
    direction = target - object_.location
    object_.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera(location: tuple[float, float, float], target: tuple[float, float, float]) -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("Recovery_Review_Camera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("Recovery_Review_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = location
    look_at(camera, Vector(target))
    bpy.context.scene.camera = camera
    return camera


def render(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def source_metadata() -> dict[str, object]:
    return {
        "asset": "ct-pilot",
        "base_topology": "MakeHuman hm08 base.obj",
        "base_license": "CC0; retained at assets/source/makehuman/LICENSE.md",
        "base_commit": "a8bc2d54ff0ac92e78ff71431b1023eda42bf482",
        "rig_and_clips": "public/assets/characters/vanguard.glb (existing retained game source)",
        "authoring": "Blender 4.5.9 LTS ARM64; generated offline by scripts/author-ct-pilot.py",
        "materials": "one UV-mapped painted cloth atlas plus one skin/eye material",
    }


def tooling_proof() -> None:
    """Prove both inputs can be imported, rendered, saved and exported."""
    reset_scene()
    configure_render()
    armature, vanguard_meshes = import_vanguard()
    body = import_makehuman_body()
    # The MakeHuman OBJ is intentionally in authoring units.  Normalize it to
    # Vanguard's approximately 1.7 m scene height before rendering.
    body.scale = (0.1, 0.1, 0.1)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    body.location = (0.0, 0.0, -min(vertex.co.z for vertex in body.data.vertices))
    # The two source assets have different authoring axes, so this stage renders
    # the normalized MakeHuman input alone. Vanguard stays in the export sample.
    for source_mesh in vanguard_meshes:
        source_mesh.hide_render = True
        source_mesh.select_set(True)
    body.select_set(True)
    add_area_light((3.0, -4.0, 5.0), 900.0, 4.0)
    add_area_light((-4.0, -1.0, 2.0), 500.0, 3.0)
    add_camera((3.2, -6.0, 1.7), (0.0, 0.0, 0.85))
    render(OUTPUT_DIR / "tooling-import-render.png")
    blend_path = OUTPUT_DIR / "tooling-proof.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT_DIR / "tooling-proof.glb"), export_format="GLB")
    payload = source_metadata() | {
        "stage": "tooling",
        "imported": [item.name for item in bpy.context.scene.objects],
        "render": "tooling-import-render.png",
        "blend": "tooling-proof.blend",
        "export": "tooling-proof.glb",
        "note": "The sample proves the installed Blender pipeline can import MakeHuman and Vanguard, render, save a .blend, and export GLB. The actual CT is built in the pilot stage.",
    }
    (OUTPUT_DIR / "tooling-proof.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))


def create_painted_cloth_atlas() -> Path:
    """Create a small, deliberately painted-looking weave atlas for the uniform."""
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    atlas_path = SOURCE_DIR / "ct-pilot-atlas.png"
    image = bpy.data.images.new("CT_Pilot_Painted_Cloth_Atlas", width=512, height=512)
    pixels: list[float] = []
    for vertical in range(512):
        for horizontal in range(512):
            weave = 0.84 + (((horizontal // 4 + vertical // 3) % 7) / 100.0)
            seam = 0.76 if horizontal % 96 in range(0, 2) or vertical % 112 in range(0, 2) else 1.0
            pixels.extend((weave * seam, weave * seam, weave * seam, 1.0))
    image.pixels = pixels
    image.filepath_raw = str(atlas_path)
    image.file_format = "PNG"
    image.save()
    return atlas_path


def painted_material(atlas_path: Path) -> bpy.types.Material:
    material = bpy.data.materials.new("CT_Pilot_Painted_Navy_Atlas")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    output = nodes.get("Material Output")
    principled = nodes.get("Principled BSDF")
    image_node = nodes.new("ShaderNodeTexImage")
    image_node.image = bpy.data.images.load(str(atlas_path), check_existing=True)
    vertex_color = nodes.new("ShaderNodeAttribute")
    vertex_color.attribute_name = "CT_Paint"
    multiply = nodes.new("ShaderNodeMixRGB")
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1.0
    links.new(vertex_color.outputs["Color"], multiply.inputs[1])
    links.new(image_node.outputs["Color"], multiply.inputs[2])
    links.new(multiply.outputs["Color"], principled.inputs["Base Color"])
    principled.inputs["Roughness"].default_value = 0.79
    principled.inputs["Metallic"].default_value = 0.0
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return material


def set_paint(object_: bpy.types.Object, color: tuple[float, float, float, float]) -> None:
    colors = object_.data.color_attributes.get("CT_Paint")
    if colors is None:
        colors = object_.data.color_attributes.new("CT_Paint", "BYTE_COLOR", "CORNER")
    for datum in colors.data:
        datum.color = color


def normalize_human_proportions(body: bpy.types.Object) -> None:
    """Turn the neutral CC0 base into an adult tactical silhouette at 1.7 m."""
    body.scale = (0.1, 0.1, 0.1)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lowest = min(vertex.co.z for vertex in body.data.vertices)
    body.location.z = -lowest
    # Broad shoulders and a restrained waist give the cloth a useful CT silhouette
    # while retaining the source mesh's continuous anatomical topology.
    for vertex in body.data.vertices:
        local = vertex.co
        height = local.z + body.location.z
        if 1.0 < height < 1.45:
            local.x *= 1.08
        elif 0.55 < height < 1.0:
            local.x *= 0.94


def decimate_body(body: bpy.types.Object) -> None:
    modifier = body.modifiers.new("Controlled_Low_Poly_Reduction", "DECIMATE")
    modifier.ratio = 0.11
    modifier.use_symmetry = True
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def duplicate_surface_region(
    source: bpy.types.Object,
    name: str,
    predicate,
    thickness: float,
    paint: tuple[float, float, float, float],
) -> bpy.types.Object:
    """Make a clothing panel from the body surface, retaining its organic contour."""
    part = source.copy()
    part.data = source.data.copy()
    part.name = name
    bpy.context.collection.objects.link(part)
    bpy.context.view_layer.objects.active = part
    bpy.ops.object.select_all(action="DESELECT")
    part.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    mesh = bmesh.from_edit_mesh(part.data)
    for face in mesh.faces:
        center = face.calc_center_median() + source.location
        face.select = not predicate(center)
    bmesh.update_edit_mesh(part.data)
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    if thickness:
        modifier = part.modifiers.new("Padded_Cloth_Thickness", "SOLIDIFY")
        modifier.thickness = thickness
        modifier.offset = 1.0
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    set_paint(part, paint)
    return part


def curve_strap(name: str, points: list[tuple[float, float, float]], radius: float, material: bpy.types.Material) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name, "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 1
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 1
    spline = curve_data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for knot, location in zip(spline.points, points):
        knot.co = (*location, 1.0)
    strap = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(strap)
    strap.data.materials.append(material)
    bpy.context.view_layer.objects.active = strap
    strap.select_set(True)
    bpy.ops.object.convert(target="MESH")
    set_paint(strap, (0.045, 0.06, 0.075, 1.0))
    return strap


def create_eye_slits(material: bpy.types.Material) -> bpy.types.Object:
    """Flat stitched eye openings: deliberate clothing detail, not floating spheres."""
    vertices = []
    faces = []
    for index, center_x in enumerate((-0.16, 0.16)):
        base = len(vertices)
        vertices.extend(
            [
                (center_x - 0.075, -0.337, 1.49),
                (center_x + 0.075, -0.337, 1.49),
                (center_x + 0.06, -0.341, 1.535),
                (center_x - 0.06, -0.341, 1.535),
            ]
        )
        faces.append((base, base + 1, base + 2, base + 3))
    mesh = bpy.data.meshes.new("CT_Pilot_Eye_Slits_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    eye_slits = bpy.data.objects.new("CT_Pilot_Balaclava_Eye_Slits", mesh)
    bpy.context.collection.objects.link(eye_slits)
    set_paint(eye_slits, (0.42, 0.56, 0.63, 1.0))
    return eye_slits


def join_as_one_character(parts: list[bpy.types.Object], material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    body = parts[0]
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = "CT_Pilot_Authored_Continuous_Character"
    if not body.data.materials:
        body.data.materials.append(material)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.12, island_margin=0.025)
    bpy.ops.object.mode_set(mode="OBJECT")
    return body


def add_mixamo_weights(mesh: bpy.types.Object, armature: bpy.types.Object) -> None:
    """Author simple blended joint weights against the retained Vanguard skeleton."""
    bone_names = {bone.name for bone in armature.data.bones}
    groups = {name: mesh.vertex_groups.new(name=name) for name in bone_names}

    def put(vertex_index: int, weights: list[tuple[str, float]]) -> None:
        total = sum(weight for _, weight in weights)
        for bone_name, weight in weights:
            if bone_name in groups and weight:
                groups[bone_name].add([vertex_index], weight / total, "REPLACE")

    for vertex in mesh.data.vertices:
        point = mesh.matrix_world @ vertex.co
        x, _, z = point
        side = "Left" if x < 0.0 else "Right"
        absolute_x = abs(x)
        if z > 1.46:
            put(vertex.index, [("mixamorig:Head", 0.85), ("mixamorig:Neck", 0.15)])
        elif z > 1.34:
            put(vertex.index, [("mixamorig:Neck", 0.55), ("mixamorig:Spine2", 0.45)])
        elif absolute_x > 0.37 and z > 0.88:
            if absolute_x > 0.57:
                put(vertex.index, [(f"mixamorig:{side}ForeArm", 0.72), (f"mixamorig:{side}Hand", 0.28)])
            elif absolute_x > 0.47:
                put(vertex.index, [(f"mixamorig:{side}Arm", 0.38), (f"mixamorig:{side}ForeArm", 0.62)])
            else:
                put(vertex.index, [(f"mixamorig:{side}Shoulder", 0.28), (f"mixamorig:{side}Arm", 0.72)])
        elif z > 1.13:
            put(vertex.index, [("mixamorig:Spine2", 0.7), ("mixamorig:Neck", 0.3)])
        elif z > 0.85:
            put(vertex.index, [("mixamorig:Spine1", 0.65), ("mixamorig:Spine2", 0.35)])
        elif z > 0.63:
            put(vertex.index, [("mixamorig:Spine", 0.55), ("mixamorig:Spine1", 0.45)])
        elif z > 0.17:
            put(vertex.index, [(f"mixamorig:{side}UpLeg", 0.75), ("mixamorig:Hips", 0.25)])
        elif z > 0.08:
            put(vertex.index, [(f"mixamorig:{side}Leg", 0.68), (f"mixamorig:{side}UpLeg", 0.32)])
        else:
            put(vertex.index, [(f"mixamorig:{side}Foot", 0.75), (f"mixamorig:{side}ToeBase", 0.25)])
    modifier = mesh.modifiers.new("Vanguard_Mixamo_Skin", "ARMATURE")
    modifier.object = armature
    mesh.parent = armature
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()


def triangle_count(mesh: bpy.types.Object) -> int:
    mesh.data.calc_loop_triangles()
    return len(mesh.data.loop_triangles)


def prepare_studio() -> None:
    configure_render()
    add_area_light((-3.5, -4.5, 5.0), 950.0, 3.5)
    add_area_light((3.0, -2.0, 2.3), 500.0, 2.0)
    add_area_light((0.0, 3.0, 3.0), 350.0, 3.0)
    floor = bpy.data.meshes.new("Review_Floor_Mesh")
    floor.from_pydata([(-4, -4, 0), (4, -4, 0), (4, 4, 0), (-4, 4, 0)], [], [(0, 1, 2, 3)])
    floor_object = bpy.data.objects.new("Review_Floor", floor)
    bpy.context.collection.objects.link(floor_object)
    floor_material = bpy.data.materials.new("Review_Floor_Material")
    floor_material.diffuse_color = (0.055, 0.075, 0.10, 1.0)
    floor.materials.append(floor_material)


def review_render(name: str, location: tuple[float, float, float]) -> None:
    camera = bpy.context.scene.camera
    if camera is None:
        camera = add_camera(location, (0.0, 0.0, 0.88))
    else:
        camera.location = location
        look_at(camera, Vector((0.0, 0.0, 0.88)))
    render(OUTPUT_DIR / f"ct-pilot-{name}.png")


def pilot() -> None:
    reset_scene()
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    armature, vanguard_meshes = import_vanguard()
    body = import_makehuman_body()
    normalize_human_proportions(body)
    decimate_body(body)
    atlas_path = create_painted_cloth_atlas()
    material = painted_material(atlas_path)
    body.data.materials.append(material)
    set_paint(body, (0.075, 0.14, 0.22, 1.0))

    # Every clothing shell starts as a conforming selection of the continuous body
    # surface. This keeps shoulder, elbow, wrist and knee transitions organic.
    vest = duplicate_surface_region(body, "CT_Fitted_Ballistic_Vest", lambda p: 0.77 < p.z < 1.37, 0.026, (0.035, 0.05, 0.065, 1.0))
    balaclava = duplicate_surface_region(body, "CT_Coherent_Balaclava", lambda p: p.z > 1.37, 0.012, (0.03, 0.045, 0.06, 1.0))
    boots = duplicate_surface_region(body, "CT_Reinforced_Boots", lambda p: p.z < 0.155, 0.02, (0.025, 0.035, 0.045, 1.0))
    knee_pads = duplicate_surface_region(body, "CT_Knee_Pads", lambda p: 0.24 < p.z < 0.36 and abs(p.x) < 0.3 and p.y < -0.12, 0.018, (0.04, 0.055, 0.07, 1.0))
    elbow_pads = duplicate_surface_region(body, "CT_Elbow_Pads", lambda p: 0.88 < p.z < 1.02 and abs(p.x) > 0.38 and p.y < -0.12, 0.014, (0.04, 0.055, 0.07, 1.0))
    straps = [
        curve_strap("CT_Chest_Webbing_Left", [(-0.3, -0.34, 1.32), (-0.1, -0.38, 0.9)], 0.011, material),
        curve_strap("CT_Chest_Webbing_Right", [(0.3, -0.34, 1.32), (0.1, -0.38, 0.9)], 0.011, material),
        curve_strap("CT_Waist_Webbing", [(-0.34, -0.34, 0.88), (0.0, -0.40, 0.84), (0.34, -0.34, 0.88)], 0.012, material),
    ]
    eyes = create_eye_slits(material)
    character = join_as_one_character([body, vest, balaclava, boots, knee_pads, elbow_pads, *straps, eyes], material)
    add_mixamo_weights(character, armature)
    # The imported source opens on one of its animation actions.  Review and
    # export the pilot in its genuine rest pose; the actions remain retained.
    if armature.animation_data:
        armature.animation_data.action = None
    armature.data.pose_position = "REST"
    for polygon in character.data.polygons:
        polygon.use_smooth = True

    for old_mesh in vanguard_meshes:
        bpy.data.objects.remove(old_mesh, do_unlink=True)
    prepare_studio()
    add_camera((0.0, -4.0, 1.05), (0.0, 0.0, 0.88))
    review_render("front", (0.0, -4.0, 1.05))
    review_render("side", (4.0, 0.0, 1.05))
    review_render("three-quarter", (3.3, -3.3, 1.45))

    triangle_total = triangle_count(character)
    if triangle_total > 12000:
        raise RuntimeError(f"CT pilot exceeds the 12,000 triangle ceiling: {triangle_total}")
    # A separate wireframe render makes topology visible without contaminating the
    # exported production asset.
    wire = character.modifiers.new("Review_Only_Wireframe", "WIREFRAME")
    wire.thickness = 0.003
    wire.use_replace = False
    review_render("wireframe", (3.3, -3.3, 1.45))
    character.modifiers.remove(wire)
    blend_path = OUTPUT_DIR / "ct-pilot.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    # Review lights, camera and floor are evidence-only. Keep the exported GLB to
    # the retained armature, its actions, and the authored character mesh.
    for item in list(bpy.context.scene.objects):
        if item not in (armature, character):
            bpy.data.objects.remove(item, do_unlink=True)
    glb_path = PUBLIC_DIR / "ct-pilot.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", export_animations=True)
    shutil.copy2(glb_path, OUTPUT_DIR / "ct-pilot.glb")
    source_copy = SOURCE_DIR / "ct-pilot-authoring.py"
    shutil.copy2(Path(__file__), source_copy)
    metadata = source_metadata() | {
        "stage": "pilot",
        "triangle_count": triangle_total,
        "material_count": len(character.data.materials),
        "mesh": "CT_Pilot_Authored_Continuous_Character",
        "outputs": {
            "glb": "public/assets/characters/ct-pilot.glb",
            "blend": "outputs/cs16/recovery/ct-pilot/ct-pilot.blend",
            "front": "ct-pilot-front.png",
            "side": "ct-pilot-side.png",
            "three_quarter": "ct-pilot-three-quarter.png",
            "wireframe": "ct-pilot-wireframe.png",
        },
        "rig": {
            "armature": armature.name,
            "action_count": len(bpy.data.actions),
            "vertex_groups": len(character.vertex_groups),
            "method": "authored blended weights mapped to the retained Mixamo bone names",
        },
        "limitation": "This is an offline visual pilot. Runtime replacement and animation-motion review remain intentionally outside this asset-only handoff.",
    }
    (OUTPUT_DIR / "ct-pilot-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    (SOURCE_DIR / "CT-PILOT-SOURCE.md").write_text(
        "# CT pilot source\n\n"
        "The CT pilot is an offline Blender asset authored from MakeHuman hm08 CC0 base topology. "
        "See `../makehuman/LICENSE.md`, `ct-pilot-authoring.py`, and the recovery metadata for provenance and review renders.\n"
    )
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    stage = command_line_arguments().stage
    if stage == "tooling":
        tooling_proof()
    else:
        pilot()
