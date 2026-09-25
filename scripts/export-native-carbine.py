"""Export one direct-source Kuptchi Rifle_01 action pair with Blender's glTF exporter.

The source .blend is opened afresh for each pair/tier invocation and is never
saved.  The two authored armatures and their two original mesh objects remain
selected in their original hierarchy.  This deliberately avoids staging copies,
mesh detachment, and visual-action baking.

Example:
  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \\
    assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend \\
    --python scripts/export-native-carbine.py -- --semantic Idle --tier full
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs/cs16/reuse/native-carbine"
SOURCE_BLEND = ROOT / "assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend"
RIFLE_TEXTURE = ROOT / "assets/source/kuptchi-weapons/Guns/Rifle_01/Textures/Rifle_01_Albedo.png"
ARMS_TEXTURE = ROOT / "assets/source/kuptchi-weapons/FP_Arms/Texture/FPS_Arms_Albedo.png"

PAIR_ACTIONS = {
    "Idle": ("Arms_BasePose", "Rifle_Breathing", 1, 120),
    "Fire": ("Arms_Fire", "Rifle_Fire", 1, 12),
    "Reload": ("Arms_Reload", "Rifle_Reload", 1, 83),
    "Equip": ("Arms_Draw", "Rifle_Draw", 1, 20),
}
SOURCE_OBJECTS = ("Arms_Armature", "Rifle_01_Armature", "FPS_Arms_Mesh", "ChargeHandle_Mesh")
ARM_BONES = ("ctrl_HandIK_l", "hand_item_l", "hand_item_r")
RIFLE_BONES = ("Main", "Magazine")
MUZZLE_MAIN_LOCAL = Vector((60.016502, 16.543610, -0.000022))
EJECTION_MAIN_LOCAL = Vector((13.264349, 13.212073, 3.008369))
SUSPEND_ARMATURE_MODIFIERS = False
INCLUDE_SOCKETS = False


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--semantic", choices=tuple(PAIR_ACTIONS))
    parser.add_argument("--tier", choices=("full", "budget"))
    parser.add_argument("--stage", choices=("export", "audit"), default="export")
    parser.add_argument("--suspend-armature-modifiers", action="store_true")
    parser.add_argument("--include-sockets", action="store_true")
    return parser.parse_args(after_double_dash())


def after_double_dash() -> list[str]:
    import sys

    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def matrix_values(matrix: Matrix) -> list[list[float]]:
    return [[round(float(value), 8) for value in row] for row in matrix]


def triangles(mesh: bpy.types.Object) -> int:
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    evaluated_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    try:
        evaluated_mesh.calc_loop_triangles()
        return len(evaluated_mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def require_source_pair() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    objects = tuple(bpy.data.objects.get(name) for name in SOURCE_OBJECTS)
    if any(object_ is None for object_ in objects):
        raise RuntimeError(f"Expected direct source objects are missing: {SOURCE_OBJECTS}")
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = objects
    if arms_rig.type != "ARMATURE" or rifle_rig.type != "ARMATURE":
        raise RuntimeError("The direct source rig objects are not armatures.")
    if arms_mesh.type != "MESH" or rifle_mesh.type != "MESH":
        raise RuntimeError("The direct source geometry objects are not meshes.")
    return arms_rig, rifle_rig, arms_mesh, rifle_mesh  # type: ignore[return-value]


def repair_texture_paths_in_memory() -> list[dict[str, str]]:
    repairs = []
    for image_name, filepath in (("Rifle_Albedo.png", RIFLE_TEXTURE), ("Untitled.001", ARMS_TEXTURE)):
        image = bpy.data.images.get(image_name)
        if image is None:
            raise RuntimeError(f"Expected image datablock is missing: {image_name}")
        original = image.filepath
        image.source = "FILE"
        image.filepath = str(filepath)
        image.reload()
        repairs.append({"image": image_name, "original_filepath": original, "staging_filepath": str(filepath)})
    return repairs


def assign_pair_actions(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object, semantic: str) -> tuple[int, int]:
    arms_name, rifle_name, start, end = PAIR_ACTIONS[semantic]
    for rig, action_name in ((arms_rig, arms_name), (rifle_rig, rifle_name)):
        action = bpy.data.actions.get(action_name)
        if action is None:
            raise RuntimeError(f"Missing authored action: {action_name}")
        animation = rig.animation_data_create()
        for track in animation.nla_tracks:
            track.mute = True
        animation.action = action
    return start, end


def add_source_camera_reference() -> tuple[bpy.types.Object, dict]:
    source_camera = bpy.data.objects.get("Camera")
    if source_camera is None or source_camera.type != "CAMERA":
        raise RuntimeError("Expected authored Camera is missing.")
    reference = bpy.data.objects.new("source-camera-reference", None)
    reference.empty_display_type = "PLAIN_AXES"
    reference.matrix_world = source_camera.matrix_world.copy()
    reference["sourceCameraName"] = source_camera.name
    reference["sourceCameraType"] = source_camera.data.type
    reference["sourceLensMillimeters"] = source_camera.data.lens
    reference["sourceFps"] = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    reference["purpose"] = "authored source-camera transform reference; runtime owns common mount normalization"
    bpy.context.scene.collection.objects.link(reference)
    return reference, {
        "node": reference.name,
        "source_camera": source_camera.name,
        "matrix_world_blender_zup": matrix_values(source_camera.matrix_world),
        "lens_mm": source_camera.data.lens,
        "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
        "export_axis": "Blender source (x,y,z) exports as glTF (x,z,-y).",
    }


def socket_local_orientation() -> Matrix:
    """Map runtime socket +X/+Y/+Z to source Main right/up/back respectively."""
    return Matrix(((0.0, 0.0, -1.0, 0.0), (0.0, 1.0, 0.0, 0.0), (1.0, 0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0)))


def add_socket_nodes(rifle_rig: bpy.types.Object) -> dict[str, bpy.types.Object]:
    """Bone-parent world-space reviewed landmarks without changing the source rig.

    Assigning the node's world matrix after bone parenting lets Blender derive
    its proper child transform from the currently evaluated Main bone.  This
    avoids inferring a glTF bone-local basis from raw node transforms.
    """
    main_world = rifle_rig.matrix_world @ rifle_rig.pose.bones["Main"].matrix
    sockets = {}
    for name, local_point in (("muzzle-socket", MUZZLE_MAIN_LOCAL), ("ejection-socket", EJECTION_MAIN_LOCAL)):
        socket = bpy.data.objects.new(name, None)
        socket.empty_display_type = "ARROWS"
        socket.empty_display_size = 2.0
        bpy.context.scene.collection.objects.link(socket)
        socket.parent = rifle_rig
        socket.parent_type = "BONE"
        socket.parent_bone = "Main"
        socket.matrix_parent_inverse.identity()
        bpy.context.view_layer.update()
        socket.matrix_world = main_world @ Matrix.Translation(local_point) @ socket_local_orientation()
        sockets[name] = socket
    bpy.context.view_layer.update()
    return sockets


def source_socket_metadata(rifle_rig: bpy.types.Object, sockets: dict[str, bpy.types.Object] | None = None) -> dict:
    """Record reviewed Main-local landmarks and optional ordinary bone child nodes."""
    return {
        "status": "ordinary Main-bone child empties are exported" if sockets else "metadata-only; no socket nodes are exported in this direct-source pass",
        "main_bone": "Main",
        "coordinate_space": "Rifle_01_Armature/Main local, source Blender centimeters, Z-up",
        "muzzle_main_local": list(MUZZLE_MAIN_LOCAL),
        "ejection_main_local": list(EJECTION_MAIN_LOCAL),
        "local_axes_for_runtime": {
            "source_forward": "+X",
            "source_up": "+Y",
            "source_right": "+Z",
            "runtime_socket_axes": "+X right, +Y up, -Z forward",
            "source_basis_columns_runtime_xyz": {"right": "+Z", "up": "+Y", "back": "-X"},
        },
        "world_formula": "Rifle_01_Armature.matrix_world @ pose_bones['Main'].matrix @ landmark_main_local",
        "at_current_frame": {
            "muzzle_world": [round(float(value), 8) for value in (rifle_rig.matrix_world @ rifle_rig.pose.bones['Main'].matrix @ MUZZLE_MAIN_LOCAL)],
            "ejection_world": [round(float(value), 8) for value in (rifle_rig.matrix_world @ rifle_rig.pose.bones['Main'].matrix @ EJECTION_MAIN_LOCAL)],
        },
        "nodes": {name: {"name": socket.name, "parent_bone": socket.parent_bone} for name, socket in (sockets or {}).items()},
    }


def add_budget_decimate(rifle_mesh: bpy.types.Object) -> dict:
    """Temporarily reduce only the rifle's source geometry in this process."""
    before = triangles(rifle_mesh)
    modifier = rifle_mesh.modifiers.new("Native_Budget_Decimate", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = 3480 / before
    return {
        "target": rifle_mesh.name,
        "before_triangles": before,
        "requested_ratio": modifier.ratio,
        "target_triangles": 3480,
        "operation": "temporary Blender DECIMATE modifier; exporter applies it; source blend is never saved",
    }


def evaluated_points(mesh: bpy.types.Object) -> list[list[float]]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        return [
            [round(float(value), 8) for value in (evaluated.matrix_world @ vertex.co)]
            for vertex in evaluated_mesh.vertices
        ]
    finally:
        evaluated.to_mesh_clear()


def named_bone_world_matrices(rig: bpy.types.Object) -> dict[str, list[list[float]]]:
    return {
        bone.name: matrix_values(rig.matrix_world @ bone.matrix)
        for bone in rig.pose.bones
    }


def capture_source_samples(
    arms_rig: bpy.types.Object,
    rifle_rig: bpy.types.Object,
    arms_mesh: bpy.types.Object,
    rifle_mesh: bpy.types.Object,
    start: int,
    end: int,
    sockets: dict[str, bpy.types.Object] | None = None,
) -> dict:
    samples = {}
    for label, frame in (("start", start), ("mid", (start + end) // 2), ("end", end)):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        main_world = rifle_rig.matrix_world @ rifle_rig.pose.bones["Main"].matrix
        socket_checks = {}
        for name, local_point in (("muzzle-socket", MUZZLE_MAIN_LOCAL), ("ejection-socket", EJECTION_MAIN_LOCAL)):
            expected_matrix = main_world @ Matrix.Translation(local_point) @ socket_local_orientation()
            actual_matrix = sockets[name].matrix_world if sockets else None
            socket_checks[name] = {
                "expected_world_matrix": matrix_values(expected_matrix),
                "expected_world_point": [round(float(value), 8) for value in (expected_matrix @ Vector((0.0, 0.0, 0.0)))],
                "actual_world_matrix": matrix_values(actual_matrix) if actual_matrix else None,
                "actual_world_point": [round(float(value), 8) for value in (actual_matrix @ Vector((0.0, 0.0, 0.0)))] if actual_matrix else None,
                "position_error": (expected_matrix.translation - actual_matrix.translation).length if actual_matrix else None,
            }
        samples[label] = {
            "frame": frame,
            "source_coordinate_space": "Blender Z-up centimeters; convert world point (x,y,z) to glTF (x,z,-y) before runtime scale",
            "meshes": {
                arms_mesh.name: {"world_evaluated_vertices": evaluated_points(arms_mesh)},
                rifle_mesh.name: {"world_evaluated_vertices": evaluated_points(rifle_mesh)},
            },
            "bone_world_matrices": {
                arms_rig.name: named_bone_world_matrices(arms_rig),
                rifle_rig.name: named_bone_world_matrices(rifle_rig),
            },
            "reviewed_landmark_world": {
                "muzzle": [round(float(value), 8) for value in (main_world @ MUZZLE_MAIN_LOCAL)],
                "ejection": [round(float(value), 8) for value in (main_world @ EJECTION_MAIN_LOCAL)],
            },
            "socket_world_checks": socket_checks,
        }
    return samples


def select_for_export(objects: tuple[bpy.types.Object, ...]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for object_ in objects:
        object_.hide_set(False)
        object_.hide_select = False
        object_.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def export_pair(path: Path, objects: tuple[bpy.types.Object, ...]) -> None:
    # Blender's ``export_apply`` normally disables Armature modifiers itself,
    # but obtains the evaluated mesh from a dependency graph that still carries
    # the action pose selected at export entry.  Suspending those two modifiers
    # before that graph is read makes the exporter apply only the required
    # Triangulate/Mirror/Decimate geometry modifiers.  The original vertex
    # groups and Armature modifier objects remain present for skin discovery,
    # then are restored immediately after export.
    armature_modifiers = []
    if SUSPEND_ARMATURE_MODIFIERS:
        for object_ in objects:
            if object_.type != "MESH":
                continue
            for modifier in object_.modifiers:
                if modifier.type == "ARMATURE":
                    armature_modifiers.append((modifier, modifier.show_viewport))
                    modifier.show_viewport = False
        bpy.context.view_layer.update()
    select_for_export(objects)
    try:
        bpy.ops.export_scene.gltf(
            filepath=str(path),
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=True,
            export_animations=True,
            export_animation_mode="SCENE",
            export_force_sampling=True,
            export_frame_range=True,
            export_frame_step=1,
            export_current_frame=False,
            export_rest_position_armature=True,
            export_reset_pose_bones=True,
            export_all_influences=False,
            export_influence_nb=4,
            export_lights=False,
            export_cameras=False,
            export_extras=True,
            export_image_format="AUTO",
        )
    finally:
        if SUSPEND_ARMATURE_MODIFIERS:
            for modifier, visible in armature_modifiers:
                modifier.show_viewport = visible
            bpy.context.view_layer.update()


def export_stage(semantic: str, tier: str) -> None:
    if not SOURCE_BLEND.exists() or not RIFLE_TEXTURE.exists() or not ARMS_TEXTURE.exists():
        raise FileNotFoundError("Frozen source blend or supplied source textures are missing.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = require_source_pair()
    repairs = repair_texture_paths_in_memory()
    arms_mesh["viewmodelArm"] = True
    arms_mesh["assetCategory"] = "viewmodelArm"
    rifle_mesh["primaryWeaponGeometry"] = True
    rifle_mesh["assetCategory"] = "primaryWeaponGeometry"
    start, end = assign_pair_actions(arms_rig, rifle_rig, semantic)
    bpy.context.scene.frame_start = start
    bpy.context.scene.frame_end = end
    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    decimate = add_budget_decimate(rifle_mesh) if tier == "budget" else None
    camera_reference, camera_metadata = add_source_camera_reference()
    sockets = add_socket_nodes(rifle_rig) if INCLUDE_SOCKETS else None
    source_samples = capture_source_samples(arms_rig, rifle_rig, arms_mesh, rifle_mesh, start, end, sockets)
    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    output_directory = OUTPUT / "socket-candidate" if INCLUDE_SOCKETS else OUTPUT
    destination = output_directory / tier / f"{semantic}.glb"
    destination.parent.mkdir(parents=True, exist_ok=True)
    export_objects = (arms_rig, rifle_rig, arms_mesh, rifle_mesh, camera_reference, *(sockets or {}).values())
    export_pair(destination, export_objects)
    arms_triangles = triangles(arms_mesh)
    rifle_triangles = triangles(rifle_mesh)
    if tier == "budget" and (arms_triangles > 4000 or rifle_triangles > 3500):
        raise RuntimeError(f"Budget export exceeds triangle ceiling: arms {arms_triangles}, rifle {rifle_triangles}")
    source_record = {
        "authoring": "Blender background --disable-autoexec; direct source objects only; no rig/mesh copies, detachment, or action bake",
        "semantic": semantic,
        "tier": tier,
        "source": {
            "blend": str(SOURCE_BLEND.relative_to(ROOT)),
            "blend_sha256": sha256(SOURCE_BLEND),
            "unit_scale_meters_per_source_unit": bpy.context.scene.unit_settings.scale_length,
            "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
            "objects": list(SOURCE_OBJECTS),
            "texture_repairs_in_memory_only": repairs,
        },
        "source_actions": {"arms": PAIR_ACTIONS[semantic][0], "rifle": PAIR_ACTIONS[semantic][1]},
        "frame_range": [start, end],
        "camera_reference": camera_metadata,
        "sockets": source_socket_metadata(rifle_rig, sockets),
        "resource_cost": {"arms_triangles": arms_triangles, "rifle_triangles": rifle_triangles, "draws_expected": 2},
        "budget_decimate": decimate,
        "export": {
            "path": str(destination.relative_to(OUTPUT)),
            "sha256": sha256(destination),
            "export_apply": True,
            "influences": "top4",
            "temporary_armature_modifier_suspension": SUSPEND_ARMATURE_MODIFIERS,
        },
    }
    (output_directory / tier / f"{semantic}.json").write_text(json.dumps(source_record, indent=2) + "\n")
    evidence_path = output_directory / "source-evaluated" / tier / f"{semantic}.json"
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps({**source_record, "samples": source_samples}, indent=2) + "\n")
    print(json.dumps(source_record, indent=2))


def glb_json_and_binary(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    magic, version, _ = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67 or version != 2:
        raise RuntimeError(f"Not a glTF 2.0 binary: {path}")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError(f"Missing JSON chunk: {path}")
    json_data = json.loads(data[20 : 20 + json_length].decode("utf-8"))
    binary_offset = 20 + json_length
    binary_length, binary_type = struct.unpack_from("<II", data, binary_offset)
    if binary_type != 0x004E4942:
        raise RuntimeError(f"Missing binary chunk: {path}")
    return json_data, data[binary_offset + 8 : binary_offset + 8 + binary_length]


def accessor_hash(document: dict, binary: bytes, accessor_index: int) -> str:
    accessor = document["accessors"][accessor_index]
    view = document["bufferViews"][accessor["bufferView"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    length = accessor["count"] * {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[accessor["componentType"]] * {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[accessor["type"]]
    return hashlib.sha256(binary[offset : offset + length]).hexdigest()


ACCESSOR_COMPONENTS = {
    5120: ("b", 1),
    5121: ("B", 1),
    5122: ("h", 2),
    5123: ("H", 2),
    5125: ("I", 4),
    5126: ("f", 4),
}
ACCESSOR_WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def accessor_values(document: dict, binary: bytes, accessor_index: int) -> list[tuple[float, ...]]:
    """Read a dense glTF accessor without altering its source coordinate space."""
    accessor = document["accessors"][accessor_index]
    view = document["bufferViews"][accessor["bufferView"]]
    component_format, component_size = ACCESSOR_COMPONENTS[accessor["componentType"]]
    width = ACCESSOR_WIDTHS[accessor["type"]]
    element_size = component_size * width
    stride = view.get("byteStride", element_size)
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    values = [
        tuple(float(value) for value in struct.unpack_from("<" + component_format * width, binary, offset + index * stride))
        for index in range(accessor["count"])
    ]
    if not accessor.get("normalized"):
        return values
    component_type = accessor["componentType"]
    if component_type in (5121, 5123, 5125):
        limit = {5121: 255.0, 5123: 65535.0, 5125: 4294967295.0}[component_type]
        return [tuple(value / limit for value in row) for row in values]
    limit = {5120: 127.0, 5122: 32767.0}[component_type]
    return [tuple(max(value / limit, -1.0) for value in row) for row in values]


def matrix_point(matrix: tuple[float, ...], point: tuple[float, float, float]) -> tuple[float, float, float]:
    homogeneous = (*point, 1.0)
    return tuple(sum(matrix[column * 4 + row] * homogeneous[column] for column in range(4)) for row in range(3))


def normalized_inverse_transpose_direction(matrix: tuple[float, ...], normal: tuple[float, float, float]) -> tuple[float, float, float]:
    # glTF matrices are column-major.  Surface directions use the inverse
    # transpose of the per-joint bind transform, then unit normalization.
    a00, a01, a02 = matrix[0], matrix[4], matrix[8]
    a10, a11, a12 = matrix[1], matrix[5], matrix[9]
    a20, a21, a22 = matrix[2], matrix[6], matrix[10]
    determinant = a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
    if abs(determinant) < 1e-12:
        raise RuntimeError("Encountered a singular inverse bind matrix while auditing normals.")
    inverse_transpose = (
        (a11 * a22 - a12 * a21) / determinant,
        (a12 * a20 - a10 * a22) / determinant,
        (a10 * a21 - a11 * a20) / determinant,
        (a02 * a21 - a01 * a22) / determinant,
        (a00 * a22 - a02 * a20) / determinant,
        (a01 * a20 - a00 * a21) / determinant,
        (a01 * a12 - a02 * a11) / determinant,
        (a02 * a10 - a00 * a12) / determinant,
        (a00 * a11 - a01 * a10) / determinant,
    )
    transformed = (
        inverse_transpose[0] * normal[0] + inverse_transpose[1] * normal[1] + inverse_transpose[2] * normal[2],
        inverse_transpose[3] * normal[0] + inverse_transpose[4] * normal[1] + inverse_transpose[5] * normal[2],
        inverse_transpose[6] * normal[0] + inverse_transpose[7] * normal[1] + inverse_transpose[8] * normal[2],
    )
    length = math.sqrt(sum(value * value for value in transformed))
    return tuple(value / length for value in transformed)


def euclidean_distance(first: tuple[float, float, float], second: tuple[float, float, float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(first, second)))


def percentile(values: list[float], fraction: float) -> float:
    values.sort()
    return values[round((len(values) - 1) * fraction)] if values else 0.0


def coordinate_invariant_mesh_error(reference: tuple[dict, bytes], candidate: tuple[dict, bytes], mesh_name: str) -> dict:
    """Compare IBM_j * POSITION and IBM normal directions per nonzero weight.

    Raw POSITION and inverse-bind buffers may legitimately differ when Blender
    rebases a source action.  Their per-joint bind-local values must agree for
    the clips to share one runtime mesh/skin safely.
    """
    reference_document, reference_binary = reference
    candidate_document, candidate_binary = candidate
    reference_mesh = next(mesh for mesh in reference_document["meshes"] if mesh.get("name") == mesh_name)
    candidate_mesh = next(mesh for mesh in candidate_document["meshes"] if mesh.get("name") == mesh_name)
    reference_primitive = reference_mesh["primitives"][0]
    candidate_primitive = candidate_mesh["primitives"][0]
    required = ("POSITION", "NORMAL", "JOINTS_0", "WEIGHTS_0")
    if any(name not in reference_primitive["attributes"] or name not in candidate_primitive["attributes"] for name in required):
        raise RuntimeError(f"Missing skin attributes for coordinate audit: {mesh_name}")
    reference_values = {name: accessor_values(reference_document, reference_binary, reference_primitive["attributes"][name]) for name in required}
    candidate_values = {name: accessor_values(candidate_document, candidate_binary, candidate_primitive["attributes"][name]) for name in required}
    counts = {name: len(values) for name, values in reference_values.items()} | {"candidate_position": len(candidate_values["POSITION"])}
    if len(set(counts.values())) != 1:
        return {"status": "incompatible-vertex-count", "counts": counts}
    skin_name = "Arms_Armature" if mesh_name == "Circle.003" else "Rifle_01_Armature"
    reference_skin = next(skin for skin in reference_document["skins"] if skin.get("name") == skin_name)
    candidate_skin = next(skin for skin in candidate_document["skins"] if skin.get("name") == skin_name)
    reference_ibms = accessor_values(reference_document, reference_binary, reference_skin["inverseBindMatrices"])
    candidate_ibms = accessor_values(candidate_document, candidate_binary, candidate_skin["inverseBindMatrices"])
    if len(reference_ibms) != len(candidate_ibms):
        return {"status": "incompatible-skin-joint-count", "reference": len(reference_ibms), "candidate": len(candidate_ibms)}
    position_errors = []
    normal_errors = []
    joint_indices_match = reference_values["JOINTS_0"] == candidate_values["JOINTS_0"]
    weights_match = reference_values["WEIGHTS_0"] == candidate_values["WEIGHTS_0"]
    if not joint_indices_match or not weights_match:
        return {"status": "incompatible-joint-layout", "joint_indices_match": joint_indices_match, "weights_match": weights_match}
    for vertex_index, joints in enumerate(reference_values["JOINTS_0"]):
        for influence_index, weight in enumerate(reference_values["WEIGHTS_0"][vertex_index]):
            if weight == 0:
                continue
            joint_index = int(joints[influence_index])
            position_errors.append(euclidean_distance(
                matrix_point(reference_ibms[joint_index], reference_values["POSITION"][vertex_index]),
                matrix_point(candidate_ibms[joint_index], candidate_values["POSITION"][vertex_index]),
            ))
            normal_errors.append(euclidean_distance(
                normalized_inverse_transpose_direction(reference_ibms[joint_index], reference_values["NORMAL"][vertex_index]),
                normalized_inverse_transpose_direction(candidate_ibms[joint_index], candidate_values["NORMAL"][vertex_index]),
            ))
    return {
        "status": "compared",
        "nonzero_influence_samples": len(position_errors),
        "position": {"p95": percentile(position_errors, 0.95), "max": max(position_errors, default=0.0)},
        "normal_direction": {"p95": percentile(normal_errors, 0.95), "max": max(normal_errors, default=0.0)},
    }


def glb_fingerprint(path: Path) -> dict:
    document, binary = glb_json_and_binary(path)
    mesh_fingerprints = {}
    for mesh in document.get("meshes", []):
        attributes = {}
        for primitive in mesh.get("primitives", []):
            for name, accessor_index in primitive.get("attributes", {}).items():
                attributes[name] = accessor_hash(document, binary, accessor_index)
            if "indices" in primitive:
                attributes["indices"] = accessor_hash(document, binary, primitive["indices"])
        mesh_fingerprints[mesh.get("name", "unnamed")] = attributes
    skins = []
    for skin in document.get("skins", []):
        skins.append({
            "name": skin.get("name", "unnamed"),
            "joints": skin.get("joints", []),
            "inverse_bind_matrices": accessor_hash(document, binary, skin["inverseBindMatrices"]),
        })
    return {"meshes": mesh_fingerprints, "skins": skins, "animations": [animation.get("name", "unnamed") for animation in document.get("animations", [])]}


def audit_stage() -> None:
    report = {"tiers": {}, "status": "pending", "method": "per-nonzero-influence IBM_j * POSITION and inverse-transpose NORMAL comparison"}
    for tier in ("full", "budget"):
        fingerprints = {}
        documents = {}
        for semantic in PAIR_ACTIONS:
            path = OUTPUT / tier / f"{semantic}.glb"
            if not path.exists():
                raise FileNotFoundError(f"Missing direct export: {path}")
            fingerprints[semantic] = glb_fingerprint(path)
            documents[semantic] = glb_json_and_binary(path)
        baseline = fingerprints["Idle"]
        consistency = {
            semantic: {
                "stable_mesh_accessors": fingerprint["meshes"] == baseline["meshes"],
                "stable_skins_and_inverse_bind_matrices": fingerprint["skins"] == baseline["skins"],
                "bind_local_equivalence": {
                    mesh_name: coordinate_invariant_mesh_error(documents["Idle"], documents[semantic], mesh_name)
                    for mesh_name in baseline["meshes"]
                },
            }
            for semantic, fingerprint in fingerprints.items()
        }
        report["tiers"][tier] = {"fingerprints": fingerprints, "consistency": consistency}
    report["status"] = "reported; root owns merge acceptance with this coordinate-invariant evidence"
    (OUTPUT / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def main() -> None:
    args = arguments()
    global SUSPEND_ARMATURE_MODIFIERS, INCLUDE_SOCKETS
    SUSPEND_ARMATURE_MODIFIERS = args.suspend_armature_modifiers
    INCLUDE_SOCKETS = args.include_sockets
    if args.stage == "audit":
        audit_stage()
        return
    if args.semantic is None or args.tier is None:
        raise RuntimeError("export requires --semantic and --tier")
    export_stage(args.semantic, args.tier)


if __name__ == "__main__":
    main()
