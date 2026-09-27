"""Export Kuptchi's matched Rifle_01 first-person pair as offline GLB pilots.

The source blend is never saved.  This script works from the supplied authored
arms/rifle scene, repairs only the staging image datablocks, bakes the existing
evaluated rig result, and uses Blender's normal glTF exporter.  It deliberately
does not pose fingers, alter skin weights, or create handling animation.

Usage:
  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \\
    assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend \\
    --python scripts/export-kuptchi-carbine.py -- --stage export
  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \\
    --python scripts/export-kuptchi-carbine.py -- --stage roundtrip --input <asset.glb> --label budget
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = ROOT / "assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend"
RIFLE_TEXTURE = ROOT / "assets/source/kuptchi-weapons/Guns/Rifle_01/Textures/Rifle_01_Albedo.png"
ARMS_TEXTURE = ROOT / "assets/source/kuptchi-weapons/FP_Arms/Texture/FPS_Arms_Albedo.png"
OUTPUT = ROOT / "outputs/cs16/reuse/kuptchi-carbine"

PAIR_ACTIONS = {
    "Idle": ("Arms_BasePose", "Rifle_Breathing"),
    "Fire": ("Arms_Fire", "Rifle_Fire"),
    "Reload": ("Arms_Reload", "Rifle_Reload"),
    "Equip": ("Arms_Draw", "Rifle_Draw"),
}
ROUNDTRIP_SAMPLES = {
    "idle": ("Idle", 1),
    "fire": ("Fire", 6),
    "midreload": ("Reload", 42),
    "equip": ("Equip", 10),
}
EXPORT_ALL_INFLUENCES = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("export", "roundtrip", "scene-test", "scene-exports", "scene-export-one", "scene-roundtrip", "scene-compare-one"), required=True)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--label", choices=("full", "budget"))
    parser.add_argument("--semantic", choices=tuple(PAIR_ACTIONS))
    parser.add_argument("--tier", choices=("full", "budget"))
    parser.add_argument("--frame", type=int)
    parser.add_argument("--influence-mode", choices=("all", "top4"), default="all")
    return parser.parse_args(args_after_double_dash())


def args_after_double_dash() -> list[str]:
    import sys

    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def triangles(object_: bpy.types.Object) -> int:
    object_.data.calc_loop_triangles()
    return len(object_.data.loop_triangles)


def deselect_all() -> None:
    bpy.ops.object.select_all(action="DESELECT")


def activate(object_: bpy.types.Object) -> None:
    deselect_all()
    object_.select_set(True)
    bpy.context.view_layer.objects.active = object_


def copy_source_for_provenance() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if not SOURCE_BLEND.exists() or not RIFLE_TEXTURE.exists() or not ARMS_TEXTURE.exists():
        raise FileNotFoundError("The frozen Kuptchi source blend or a supplied source texture is missing.")
    # A byte-for-byte immutable source copy makes the editable authored input
    # available beside the derived export staging files.
    shutil.copy2(SOURCE_BLEND, OUTPUT / "FP_Arms_Rifle_01_Anims-source-original.blend")


def repair_staging_textures() -> list[dict[str, str]]:
    repairs = []
    expected = (("Rifle_Albedo.png", RIFLE_TEXTURE), ("Untitled.001", ARMS_TEXTURE))
    for image_name, texture_path in expected:
        image = bpy.data.images.get(image_name)
        if image is None:
            raise RuntimeError(f"Expected image datablock is missing from authored scene: {image_name}")
        original_path = image.filepath
        image.source = "FILE"
        image.filepath = str(texture_path)
        image.reload()
        repairs.append({"image": image_name, "original_filepath": original_path, "staging_filepath": str(texture_path)})
    return repairs


def source_pair() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    arms_rig = bpy.data.objects.get("Arms_Armature")
    rifle_rig = bpy.data.objects.get("Rifle_01_Armature")
    arms_mesh = bpy.data.objects.get("FPS_Arms_Mesh")
    rifle_mesh = bpy.data.objects.get("ChargeHandle_Mesh")
    objects = (arms_rig, rifle_rig, arms_mesh, rifle_mesh)
    if any(object_ is None for object_ in objects):
        raise RuntimeError("The matched authored source does not contain the expected armatures and meshes.")
    return objects  # type: ignore[return-value]


def bake_collection() -> bpy.types.Collection:
    collection = bpy.data.collections.get("KUPTCHI_CARBINE_EXPORT")
    if collection is None:
        collection = bpy.data.collections.new("KUPTCHI_CARBINE_EXPORT")
        bpy.context.scene.collection.children.link(collection)
    return collection


def copy_pair_to_staging() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    source_arms_rig, source_rifle_rig, source_arms_mesh, source_rifle_mesh = source_pair()
    collection = bake_collection()
    rig_copies: dict[bpy.types.Object, bpy.types.Object] = {}
    for source_rig, name in ((source_arms_rig, "Kuptchi_Arms_Armature"), (source_rifle_rig, "Kuptchi_Rifle_Armature")):
        copied_rig = source_rig.copy()
        copied_rig.data = source_rig.data.copy()
        copied_rig.name = name
        copied_rig.data.name = name + "_Data"
        copied_rig.animation_data_clear()
        collection.objects.link(copied_rig)
        rig_copies[source_rig] = copied_rig

    copied_meshes = []
    for source_mesh, name in ((source_arms_mesh, "Kuptchi_Arms_Mesh"), (source_rifle_mesh, "Kuptchi_Rifle_Mesh")):
        copied_mesh = source_mesh.copy()
        copied_mesh.data = source_mesh.data.copy()
        copied_mesh.name = name
        copied_mesh.data.name = name + "_Data"
        copied_mesh.hide_select = False
        # Blender 4.5's native NLA constraint sampler requires the standard
        # mesh-under-armature relationship while exporting a skinned scene.
        # Its own glTF stage performs the transform conversion.
        copied_mesh.parent = rig_copies[source_mesh.parent]
        for modifier in copied_mesh.modifiers:
            if modifier.type == "ARMATURE" and modifier.object in rig_copies:
                modifier.object = rig_copies[modifier.object]
        collection.objects.link(copied_mesh)
        copied_meshes.append(copied_mesh)

    copied_arms_rig = rig_copies[source_arms_rig]
    copied_rifle_rig = rig_copies[source_rifle_rig]
    # Object.copy preserves pose constraints but still points to the original
    # gun.  Redirecting that existing authored relationship is the only rig
    # alteration: no target, pose, weight, or constraint type is invented.
    for pose_bone in copied_arms_rig.pose.bones:
        for constraint in pose_bone.constraints:
            if getattr(constraint, "target", None) == source_rifle_rig:
                constraint.target = copied_rifle_rig
    return copied_arms_rig, copied_rifle_rig, copied_meshes[0], copied_meshes[1]


def make_skinned_mesh_nodes_scene_roots(*meshes: bpy.types.Object) -> None:
    """Avoid glTF's invalid armature-parent transform on skinned mesh nodes."""
    for mesh in meshes:
        world_matrix = mesh.matrix_world.copy()
        mesh.parent = None
        mesh.matrix_world = world_matrix


def assign_source_actions(
    arms_rig: bpy.types.Object,
    rifle_rig: bpy.types.Object,
    arms_action_name: str,
    rifle_action_name: str,
) -> None:
    arms_action = bpy.data.actions.get(arms_action_name)
    rifle_action = bpy.data.actions.get(rifle_action_name)
    if arms_action is None or rifle_action is None:
        raise RuntimeError(f"Missing native action pair: {arms_action_name}, {rifle_action_name}")
    arms_rig.animation_data_create().action = arms_action
    rifle_rig.animation_data_create().action = rifle_action


def bake_visual_action(rig: bpy.types.Object, start: int, end: int, action_name: str) -> bpy.types.Action:
    activate(rig)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(
        frame_start=start,
        frame_end=end,
        step=1,
        # Match Blender's ordinary Bake Action "Only Selected Bones" disabled
        # mode: IK and Copy Rotation chains must all be written as evaluated
        # transforms, not just their keyed controller subset.
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        clear_parents=False,
        use_current_action=False,
        clean_curves=False,
        bake_types={"POSE", "OBJECT"},
        channel_types={"LOCATION", "ROTATION", "SCALE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    baked = rig.animation_data.action
    if baked is None:
        raise RuntimeError(f"Blender did not create an evaluated baked action for {rig.name}")
    baked.name = action_name
    return baked


def make_nla_strip(rig: bpy.types.Object, semantic_name: str, action: bpy.types.Action) -> bpy.types.NlaStrip:
    animation_data = rig.animation_data_create()
    animation_data.action = None
    track = animation_data.nla_tracks.new()
    track.name = semantic_name
    action_start = int(action.frame_range[0])
    action_end = int(action.frame_range[1])
    strip = track.strips.new(semantic_name, 1, action)
    strip.action_frame_start = action_start
    strip.action_frame_end = action_end
    strip.frame_end = action_end
    # Preserve the native shorter arm action's final authored transform while
    # its paired gun action may continue for several more source frames.
    strip.extrapolation = "HOLD_FORWARD"
    return strip


def bake_pair_actions(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object) -> dict[str, dict]:
    """Bake only the constraint-dependent arms through Blender's Bake Action.

    Blender 4.5.9's direct NLA evaluated sampler throws an internal exporter
    error for this cross-armature Child Of setup.  The standard alternative is
    Bake Action with ``visual_keying`` and ``clear_constraints`` enabled.  Each
    short-lived sampler retains the untouched source constraint graph while its
    paired rifle action is active; that produces a clean evaluated arms action
    without changing source data, rest matrices, poses, or weights.
    """
    action_report: dict[str, dict] = {}
    source_arms_rig = bpy.data.objects["Arms_Armature"]
    for semantic_name, (arms_action_name, rifle_action_name) in PAIR_ACTIONS.items():
        arms_action = bpy.data.actions[arms_action_name]
        rifle_action = bpy.data.actions[rifle_action_name]
        start = int(min(arms_action.frame_range[0], rifle_action.frame_range[0]))
        end = int(max(arms_action.frame_range[1], rifle_action.frame_range[1]))
        sampler = source_arms_rig.copy()
        sampler.data = source_arms_rig.data.copy()
        sampler.name = f"Kuptchi_Arms_BakeSampler_{semantic_name}"
        sampler.animation_data_clear()
        bake_collection().objects.link(sampler)
        for pose_bone in sampler.pose.bones:
            for constraint in pose_bone.constraints:
                if getattr(constraint, "target", None) == source_arms_rig:
                    constraint.target = sampler
                elif getattr(constraint, "target", None) == bpy.data.objects["Rifle_01_Armature"]:
                    constraint.target = rifle_rig
        assign_source_actions(sampler, rifle_rig, arms_action_name, rifle_action_name)
        bpy.context.scene.frame_set(start)
        baked_arms = bake_visual_action(sampler, start, end, f"Kuptchi_Arms_{semantic_name}_VisualBaked")
        make_nla_strip(arms_rig, semantic_name, baked_arms)
        make_nla_strip(rifle_rig, semantic_name, rifle_action)
        bpy.data.objects.remove(sampler, do_unlink=True)
        action_report[semantic_name] = {
            "source": {"arms": arms_action_name, "rifle": rifle_action_name},
            "frame_range": [start, end],
            "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
            "export_action": {"arms": baked_arms.name, "rifle": rifle_action.name},
            "export_sampling": "Arms: Blender Bake Action visual-keying with source Child Of/IK constraints active, then clear constraints on sampler. Rifle: unchanged native source NLA action including its object transform and nine bone tracks.",
        }
    for pose_bone in arms_rig.pose.bones:
        for constraint in list(pose_bone.constraints):
            pose_bone.constraints.remove(constraint)
    return action_report


def socket_surface_records(rifle_rig: bpy.types.Object, rifle_mesh: bpy.types.Object) -> tuple[dict, dict]:
    """Measure two ordinary Main-bone child markers against evaluated geometry.

    Rifle_01 points along its local +X in the camera-authored source.  The muzzle
    candidate is the furthest positive X surface sample.  A source-side visual
    review confirms the ejection cover on the local +Z receiver face; its marker
    is the nearest measured surface point to the cover's visible center.
    The measurements are stored in Main-bone local coordinates, so sockets stay
    on the animated weapon without authoring any additional weapon motion.
    """
    bpy.context.scene.frame_set(1)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = rifle_mesh.evaluated_get(depsgraph)
    main = rifle_rig.pose.bones.get("Main")
    if main is None:
        raise RuntimeError("Rifle_01 rig does not contain required Main bone.")
    world_from_main = rifle_rig.matrix_world @ main.matrix
    main_from_world = world_from_main.inverted()
    points = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
    local_points = [main_from_world @ point for point in points]
    x_values = [point.x for point in local_points]
    y_values = [point.y for point in local_points]
    z_values = [point.z for point in local_points]
    max_x = max(x_values)
    muzzle_candidates = [point for point in local_points if point.x >= max_x - 0.006]
    muzzle = sum(muzzle_candidates, Vector()) / len(muzzle_candidates)
    # The rendered +Z side shows the dust-cover/ejection opening just forward
    # of the rear receiver.  This target lies at 40% of gun length, on the
    # raised receiver band, then snaps to an actual +Z surface vertex.
    min_x, max_x = min(x_values), max(x_values)
    ejection_target = Vector((min_x + 0.40 * (max_x - min_x), 15.0, max(z_values)))
    receiver_candidates = [
        point for point in local_points
        if min_x + 0.28 * (max_x - min_x) <= point.x <= min_x + 0.52 * (max_x - min_x)
        and point.z >= max(z_values) - 1.0
    ]
    if not receiver_candidates:
        raise RuntimeError("Unable to locate a measured +Z receiver-side ejection surface.")
    ejection = min(receiver_candidates, key=lambda point: (point - ejection_target).length_squared)
    basis = {"forward": [1.0, 0.0, 0.0], "up": [0.0, 1.0, 0.0], "right": [0.0, 0.0, 1.0]}
    context = {
        "main_bone": "Main",
        "coordinate_space": "Rifle_01_Armature/Main bone local, Blender Z-up",
        "basis": basis,
        "measured_mesh_bounds_main_local": {
            "min": [min_x, min(y_values), min(z_values)],
            "max": [max_x, max(y_values), max(z_values)],
        },
    }
    return (
        {**context, "name": "muzzle-socket", "kind": "muzzle", "location": list(muzzle), "surface_rule": "mean of vertices within 6 mm of maximum Main-local +X barrel tip"},
        {**context, "name": "ejection-socket", "kind": "ejection", "location": list(ejection), "surface_rule": "nearest +Z receiver-side surface vertex to the visually reviewed dust-cover center"},
    )


def add_socket(rifle_rig: bpy.types.Object, record: dict) -> bpy.types.Object:
    socket = bpy.data.objects.new(record["name"], None)
    socket.empty_display_type = "ARROWS"
    socket.empty_display_size = 0.03
    socket.parent = rifle_rig
    socket.parent_type = "BONE"
    socket.parent_bone = "Main"
    socket.matrix_parent_inverse.identity()
    socket.location = record["location"]
    socket.rotation_mode = "QUATERNION"
    socket["socketKind"] = record["kind"]
    socket["coordinateSpace"] = record["coordinate_space"]
    bake_collection().objects.link(socket)
    return socket


def make_source_camera_reference() -> dict:
    # Evidence rendering replaces scene.camera with the fixed 74-degree review
    # camera.  The named native source camera remains the authoritative record.
    source_camera = bpy.data.objects.get("Camera")
    if source_camera is None:
        raise RuntimeError("The authored source does not contain its camera.")
    reference = bpy.data.objects.new("source-camera-reference", None)
    reference.empty_display_type = "PLAIN_AXES"
    reference.matrix_world = source_camera.matrix_world.copy()
    reference["sourceCameraName"] = source_camera.name
    reference["sourceCameraType"] = source_camera.data.type
    reference["sourceLensMillimeters"] = source_camera.data.lens
    reference["sourceFps"] = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    reference["purpose"] = "authored source-camera transform reference; root NodeIO wrapper owns camera-relative runtime normalization"
    bake_collection().objects.link(reference)
    return {
        "node": reference.name,
        "source_camera": source_camera.name,
        "matrix_world_blender_zup": [[round(value, 9) for value in row] for row in source_camera.matrix_world],
        "lens_mm": source_camera.data.lens,
        "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
        "export_axis": "Blender glTF exporter: source Blender Z-up (x,y,z) converts to glTF Y-up (x,z,-y).",
    }


def hide_non_export_objects() -> None:
    source_names = {"Arms_Armature", "Rifle_01_Armature", "FPS_Arms_Mesh", "ChargeHandle_Mesh"}
    for object_ in bpy.context.scene.objects:
        if object_.name in source_names or object_.type in {"CAMERA", "LIGHT"} or object_.name.startswith("Ctrl_") or object_.name == "Cube":
            object_.hide_render = True
            object_.hide_viewport = True


def select_export_objects(objects: list[bpy.types.Object]) -> None:
    deselect_all()
    for object_ in objects:
        object_.hide_select = False
        object_.hide_set(False)
        object_.hide_viewport = False
        object_.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def export_glb(path: Path, export_objects: list[bpy.types.Object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    select_export_objects(export_objects)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_nla_strips=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_range=True,
        export_frame_step=1,
        export_lights=False,
        export_cameras=False,
        export_extras=True,
        export_image_format="AUTO",
        export_influence_nb=4,
        export_all_influences=EXPORT_ALL_INFLUENCES,
    )


def export_scene_sample(path: Path, export_objects: list[bpy.types.Object]) -> None:
    """Use Blender's native single-track NLA sampler for one action pair."""
    select_export_objects(export_objects)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_range=True,
        export_frame_step=1,
        # Keep every raw per-clip export on the authored armature rest bind.
        # Scene sampling then contributes only animation channels; it must not
        # use whichever action pose happened to be evaluated when export began.
        export_current_frame=False,
        export_rest_position_armature=True,
        export_reset_pose_bones=True,
        export_lights=False,
        export_cameras=False,
        export_extras=True,
        export_image_format="AUTO",
        export_influence_nb=4,
        export_all_influences=EXPORT_ALL_INFLUENCES,
    )


def matrix_values(matrix: Matrix) -> list[list[float]]:
    """Serialize an evaluated Blender matrix for the staging audit."""
    return [[round(float(value), 8) for value in row] for row in matrix]


def neutral_export_snapshot(
    arms_rig: bpy.types.Object,
    rifle_rig: bpy.types.Object,
    arms_mesh: bpy.types.Object,
    rifle_mesh: bpy.types.Object,
) -> dict:
    """Record state immediately before each raw clip leaves Blender.

    Mesh vertex coordinates and the armature object transforms are expected to
    be invariant between semantic exports.  The pose matrices are intentionally
    recorded separately: they are authored clip state, not bind state.
    """
    return {
        "scene_frame": bpy.context.scene.frame_current,
        "mesh_data": {
            arms_mesh.name: {
                "vertex0": [round(float(value), 8) for value in arms_mesh.data.vertices[0].co],
                "matrix_local": matrix_values(arms_mesh.matrix_local),
                "matrix_world": matrix_values(arms_mesh.matrix_world),
                "parent_inverse": matrix_values(arms_mesh.matrix_parent_inverse),
            },
            rifle_mesh.name: {
                "vertex0": [round(float(value), 8) for value in rifle_mesh.data.vertices[0].co],
                "matrix_local": matrix_values(rifle_mesh.matrix_local),
                "matrix_world": matrix_values(rifle_mesh.matrix_world),
                "parent_inverse": matrix_values(rifle_mesh.matrix_parent_inverse),
            },
        },
        "armature_objects": {
            arms_rig.name: matrix_values(arms_rig.matrix_world),
            rifle_rig.name: matrix_values(rifle_rig.matrix_world),
        },
        "main_pose_world": matrix_values(rifle_rig.matrix_world @ rifle_rig.pose.bones["Main"].matrix),
    }


def apply_budget_decimate(arms_mesh: bpy.types.Object, rifle_mesh: bpy.types.Object) -> dict:
    report = {}
    for mesh, ceiling in ((arms_mesh, 4000), (rifle_mesh, 3500)):
        before = triangles(mesh)
        if before <= ceiling:
            report[mesh.name] = {"before": before, "after": before, "ceiling": ceiling, "operation": "none; source already inside budget"}
            continue
        modifier = mesh.modifiers.new("Conservative_Budget_Decimate", "DECIMATE")
        modifier.ratio = min(1.0, (ceiling - 10) / before)
        modifier.decimate_type = "COLLAPSE"
        # Required modifier order: reduction acts on source geometry before skin.
        while mesh.modifiers.find(modifier.name) > mesh.modifiers.find(next(item.name for item in mesh.modifiers if item.type == "ARMATURE")):
            activate(mesh)
            bpy.ops.object.modifier_move_up(modifier=modifier.name)
        activate(mesh)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        after = triangles(mesh)
        if after > ceiling:
            raise RuntimeError(f"Conservative budget copy exceeds frozen ceiling: {mesh.name} {after}>{ceiling}")
        report[mesh.name] = {"before": before, "after": after, "ceiling": ceiling, "operation": "Blender DECIMATE collapse, applied before Armature"}
    return report


def setup_evidence_camera() -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("offline-review-camera-74-vertical")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.sensor_height = 24.0
    camera_data.lens = 24.0 / (2.0 * math.tan(math.radians(74.0) / 2.0))
    camera = bpy.data.objects.new("offline-review-camera-74-vertical", camera_data)
    reference = bpy.data.objects.get("Camera") or bpy.data.objects.get("source-camera-reference")
    if reference is not None:
        # The native camera supplies authored framing; 74-degree vertical FOV
        # supplies the fixed review lens after that transform is recorded.
        camera.matrix_world = reference.matrix_world.copy()
    else:
        camera.location = (0.0, 0.0, 0.0)
        camera.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.scene.collection.objects.link(camera)
    rifle = bpy.data.objects.get("Kuptchi_Rifle_Mesh") or bpy.data.objects.get("ChargeHandle_Mesh")
    if rifle is None:
        raise RuntimeError("Evidence renderer cannot locate the rifle mesh.")
    target = sum((rifle.matrix_world @ Vector(corner) for corner in rifle.bound_box), Vector()) / 8
    camera_rotation = camera.matrix_world.to_quaternion()
    right = camera_rotation @ Vector((1.0, 0.0, 0.0))
    forward = camera_rotation @ Vector((0.0, 0.0, -1.0))
    up = camera_rotation @ Vector((0.0, 1.0, 0.0))
    bpy.context.scene.camera = camera
    for name, location, energy, size in (
        ("review-key", target + right * 11 + up * 8 - forward * 6, 4400.0, 6.0),
        ("review-fill", target - right * 10 + up * 3 - forward * 3, 2800.0, 7.0),
        ("review-rim", target + forward * 8 + up * 7, 3200.0, 5.0),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.collection.objects.link(light)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("offline-review-world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.012, 0.017, 0.027, 1.0)
    background.inputs["Strength"].default_value = 0.16
    scene.view_settings.look = "AgX - Medium High Contrast"
    return camera


def render_frame(filename: str, frame: int, width: int, height: int) -> None:
    scene = bpy.context.scene
    scene.frame_set(frame)
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.filepath = str(OUTPUT / filename)
    bpy.ops.render.render(write_still=True)


def render_source_evidence() -> list[str]:
    arms_rig, rifle_rig, _, _ = source_pair()
    setup_evidence_camera()
    outputs = []
    for name, (arms_action_name, rifle_action_name), frame in (
        ("source-idle", PAIR_ACTIONS["Idle"], 1),
        ("source-fire", PAIR_ACTIONS["Fire"], 6),
        ("source-midreload", PAIR_ACTIONS["Reload"], 42),
        ("source-equip", PAIR_ACTIONS["Equip"], 10),
    ):
        assign_source_actions(arms_rig, rifle_rig, arms_action_name, rifle_action_name)
        for suffix, width, height in (("4x3", 1024, 768), ("16x9", 1280, 720)):
            filename = f"{name}-{suffix}.png"
            render_frame(filename, frame, width, height)
            outputs.append(filename)
    return outputs


def reset_source_pair_to_base_pose() -> None:
    """Copy staging rigs from the source's declared neutral frame, not a prior review sample."""
    arms_rig, rifle_rig, _, _ = source_pair()
    assign_source_actions(arms_rig, rifle_rig, "Arms_BasePose", "Rifle_BasePose")
    bpy.context.scene.frame_set(1)


def export_stage() -> None:
    copy_source_for_provenance()
    texture_repairs = repair_staging_textures()
    # A directly copied stage retains the source before any derived output work.
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "kuptchi-carbine-authored-staging.blend"), copy=True)
    source_renders = render_source_evidence()
    reset_source_pair_to_base_pose()
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = copy_pair_to_staging()
    make_skinned_mesh_nodes_scene_roots(arms_mesh, rifle_mesh)
    # Node extras are the thin runtime-facing interface.  Geometry, materials,
    # UVs, rigs, and the authored action source remain otherwise unchanged.
    arms_mesh["viewmodelArm"] = True
    arms_mesh["assetCategory"] = "viewmodelArm"
    rifle_mesh["primaryWeaponGeometry"] = True
    rifle_mesh["assetCategory"] = "primaryWeaponGeometry"
    action_report = bake_pair_actions(arms_rig, rifle_rig)
    muzzle_record, ejection_record = socket_surface_records(rifle_rig, rifle_mesh)
    muzzle = add_socket(rifle_rig, muzzle_record)
    ejection = add_socket(rifle_rig, ejection_record)
    camera_reference = make_source_camera_reference()
    hide_non_export_objects()
    export_objects = [arms_rig, rifle_rig, arms_mesh, rifle_mesh, muzzle, ejection, bpy.data.objects["source-camera-reference"]]
    full_glb = OUTPUT / "kuptchi-carbine-full.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "kuptchi-carbine-full.blend"), copy=True)
    export_glb(full_glb, export_objects)
    budget_report = apply_budget_decimate(arms_mesh, rifle_mesh)
    budget_glb = OUTPUT / "kuptchi-carbine-budget.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "kuptchi-carbine-budget.blend"), copy=True)
    export_glb(budget_glb, export_objects)
    manifest = {
        "status": "offline-export-candidate-awaiting-root-visual-gate",
        "authoring": "Blender 4.5.9 LTS background mode with --disable-autoexec",
        "source": {
            "blend": str(SOURCE_BLEND.relative_to(ROOT)),
            "blend_sha256": sha256(SOURCE_BLEND),
            "rifle_texture": {"path": str(RIFLE_TEXTURE.relative_to(ROOT)), "sha256": sha256(RIFLE_TEXTURE), "size": [512, 512]},
            "arms_texture": {"path": str(ARMS_TEXTURE.relative_to(ROOT)), "sha256": sha256(ARMS_TEXTURE), "size": [256, 256]},
            "texture_repairs_staging_only": texture_repairs,
        },
        "source_camera_reference": camera_reference,
        "clips": action_report,
        "sockets": {"muzzle": muzzle_record, "ejection": ejection_record},
        "exports": {
            "full": {"glb": full_glb.name, "sha256": sha256(full_glb), "triangles": {"arms": triangles(arms_mesh), "gun": 7469}, "draws": 2},
            "budget": {"glb": budget_glb.name, "sha256": sha256(budget_glb), "triangles": {"arms": triangles(arms_mesh), "gun": triangles(rifle_mesh)}, "draws": 2, "decimate": budget_report},
        },
        "source_renders": source_renders,
        "runtime_boundary": "Root owns NodeIO camera-relative normalization and all app/public integration. GLBs keep source-authored coordinates, paired semantic clips, and an unanimated source-camera-reference node.",
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


def scene_test_stage() -> None:
    """Preserve a native Blender Scene-export diagnostic for the source Idle pair."""
    copy_source_for_provenance()
    repair_staging_textures()
    reset_source_pair_to_base_pose()
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = copy_pair_to_staging()
    make_skinned_mesh_nodes_scene_roots(arms_mesh, rifle_mesh)
    arms_mesh["viewmodelArm"] = True
    rifle_mesh["primaryWeaponGeometry"] = True
    assign_source_actions(arms_rig, rifle_rig, *PAIR_ACTIONS["Idle"])
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 120
    muzzle_record, ejection_record = socket_surface_records(rifle_rig, rifle_mesh)
    muzzle = add_socket(rifle_rig, muzzle_record)
    ejection = add_socket(rifle_rig, ejection_record)
    make_source_camera_reference()
    hide_non_export_objects()
    asset = OUTPUT / "scene-evaluated-idle-diagnostic.glb"
    export_scene_sample(asset, [arms_rig, rifle_rig, arms_mesh, rifle_mesh, muzzle, ejection, bpy.data.objects["source-camera-reference"]])
    report = {"asset": asset.name, "sha256": sha256(asset), "source_pair": PAIR_ACTIONS["Idle"], "method": "Blender glTF Scene animation force sampling with cross-armature source constraints active"}
    (OUTPUT / "scene-evaluated-idle-diagnostic.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def scene_exports_stage() -> None:
    """Create raw, per-semantic Scene-sampled sources for root's NodeIO merge.

    This is a Blender 4.5.9 exporter workaround, not a second authoring method:
    each GLB has exactly the native matching arms/rifle pair active in the
    source scene and is force-sampled by Blender before any clip merger sees it.
    """
    copy_source_for_provenance()
    texture_repairs = repair_staging_textures()
    source_renders = render_source_evidence()
    reset_source_pair_to_base_pose()
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = copy_pair_to_staging()
    # Rifle_Draw animates the rifle armature object from its off-screen entry.
    # A child mesh therefore changes the exported primitive's bind extraction
    # frame by frame.  Retain its world transform as a scene-root skin node;
    # the unchanged Armature modifier still evaluates the authored rig motion.
    make_skinned_mesh_nodes_scene_roots(arms_mesh, rifle_mesh)
    arms_mesh["viewmodelArm"] = True
    arms_mesh["assetCategory"] = "viewmodelArm"
    rifle_mesh["primaryWeaponGeometry"] = True
    rifle_mesh["assetCategory"] = "primaryWeaponGeometry"
    muzzle_record, ejection_record = socket_surface_records(rifle_rig, rifle_mesh)
    muzzle = add_socket(rifle_rig, muzzle_record)
    ejection = add_socket(rifle_rig, ejection_record)
    camera_reference = make_source_camera_reference()
    hide_non_export_objects()
    export_objects = [arms_rig, rifle_rig, arms_mesh, rifle_mesh, muzzle, ejection, bpy.data.objects["source-camera-reference"]]
    report = {
        "status": "raw-scene-sampled-inputs-awaiting-root-nodeio-merge",
        "authoring": "Blender 4.5.9 LTS --background --disable-autoexec; glTF Scene animation mode with force sampling",
        "source": {"blend": str(SOURCE_BLEND.relative_to(ROOT)), "blend_sha256": sha256(SOURCE_BLEND), "texture_repairs_staging_only": texture_repairs},
        "source_camera_reference": camera_reference,
        "sockets": {"muzzle": muzzle_record, "ejection": ejection_record},
        "clips": {},
        "source_renders": source_renders,
        "pre_export_neutral_snapshots": {},
    }
    for tier in ("full", "budget"):
        if tier == "budget":
            report["budget_decimate"] = apply_budget_decimate(arms_mesh, rifle_mesh)
        tier_report = {}
        for semantic_name, pair in PAIR_ACTIONS.items():
            arms_action = bpy.data.actions[pair[0]]
            rifle_action = bpy.data.actions[pair[1]]
            # Blender 4.5.9 crashes if several overlapping cross-armature NLA
            # tracks are exported together.  One matching source track per
            # GLB takes its normal evaluated sampling path without that bug.
            for rig in (arms_rig, rifle_rig):
                animation_data = rig.animation_data_create()
                for track in list(animation_data.nla_tracks):
                    animation_data.nla_tracks.remove(track)
                animation_data.action = None
            make_nla_strip(arms_rig, semantic_name, arms_action)
            make_nla_strip(rifle_rig, semantic_name, rifle_action)
            start = int(min(arms_action.frame_range[0], rifle_action.frame_range[0]))
            end = int(max(arms_action.frame_range[1], rifle_action.frame_range[1]))
            bpy.context.scene.frame_start = start
            bpy.context.scene.frame_end = end
            # NLA track construction does not itself evaluate the scene.  Force
            # the declared action's first source frame before gathering meshes,
            # inverse bind matrices, and force-sampled animation channels.
            bpy.context.scene.frame_set(start)
            bpy.context.view_layer.update()
            report["pre_export_neutral_snapshots"].setdefault(tier, {})[semantic_name] = neutral_export_snapshot(
                arms_rig, rifle_rig, arms_mesh, rifle_mesh
            )
            output_path = OUTPUT / "scene-force-sampled" / tier / f"{semantic_name}.glb"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            export_scene_sample(output_path, export_objects)
            tier_report[semantic_name] = {"path": str(output_path.relative_to(OUTPUT)), "sha256": sha256(output_path), "frame_range": [start, end], "seconds": [(start - 1) / 24, (end - 1) / 24]}
        report["clips"][tier] = tier_report
    report["resource_cost"] = {"full": {"arms_triangles": 1798, "gun_triangles": 7469, "draws": 2}, "budget": {"arms_triangles": triangles(arms_mesh), "gun_triangles": triangles(rifle_mesh), "draws": 2}}
    (OUTPUT / "scene-force-sampled" / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def scene_export_one_stage(semantic_name: str, tier: str) -> None:
    """Export one semantic pair in a fresh Blender process for bind diagnosis."""
    copy_source_for_provenance()
    texture_repairs = repair_staging_textures()
    reset_source_pair_to_base_pose()
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = copy_pair_to_staging()
    make_skinned_mesh_nodes_scene_roots(arms_mesh, rifle_mesh)
    arms_mesh["viewmodelArm"] = True
    arms_mesh["assetCategory"] = "viewmodelArm"
    rifle_mesh["primaryWeaponGeometry"] = True
    rifle_mesh["assetCategory"] = "primaryWeaponGeometry"
    if tier == "budget":
        budget_report = apply_budget_decimate(arms_mesh, rifle_mesh)
    else:
        budget_report = None
    muzzle_record, ejection_record = socket_surface_records(rifle_rig, rifle_mesh)
    muzzle = add_socket(rifle_rig, muzzle_record)
    ejection = add_socket(rifle_rig, ejection_record)
    camera_reference = make_source_camera_reference()
    hide_non_export_objects()
    arms_action_name, rifle_action_name = PAIR_ACTIONS[semantic_name]
    arms_action = bpy.data.actions[arms_action_name]
    rifle_action = bpy.data.actions[rifle_action_name]
    make_nla_strip(arms_rig, semantic_name, arms_action)
    make_nla_strip(rifle_rig, semantic_name, rifle_action)
    start = int(min(arms_action.frame_range[0], rifle_action.frame_range[0]))
    end = int(max(arms_action.frame_range[1], rifle_action.frame_range[1]))
    bpy.context.scene.frame_start = start
    bpy.context.scene.frame_end = end
    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    pre_export_snapshot = neutral_export_snapshot(arms_rig, rifle_rig, arms_mesh, rifle_mesh)
    diagnostic_root = "scene-fresh-process" if EXPORT_ALL_INFLUENCES else "scene-top4-influence"
    output_path = OUTPUT / diagnostic_root / tier / f"{semantic_name}.glb"
    export_scene_sample(output_path, [arms_rig, rifle_rig, arms_mesh, rifle_mesh, muzzle, ejection, bpy.data.objects["source-camera-reference"]])
    report = {
        "method": "one fresh Blender 4.5.9 process per standard Scene/NLA force-sampled action pair",
        "semantic": semantic_name,
        "tier": tier,
        "source_actions": {"arms": arms_action_name, "rifle": rifle_action_name},
        "frame_range": [start, end],
        "sha256": sha256(output_path),
        "texture_repairs_staging_only": texture_repairs,
        "camera_reference": camera_reference,
        "sockets": {"muzzle": muzzle_record, "ejection": ejection_record},
        "pre_export_snapshot": pre_export_snapshot,
        "budget_decimate": budget_report,
    }
    output_path.with_suffix(".json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def scene_roundtrip_stage() -> None:
    """Render the individual force-sampled GLB inputs after Blender re-import."""
    renders = {}
    for tier in ("full", "budget"):
        for sample_name, (semantic_name, frame) in ROUNDTRIP_SAMPLES.items():
            asset = OUTPUT / "scene-force-sampled" / tier / f"{semantic_name}.glb"
            if not asset.exists():
                raise FileNotFoundError(f"Run scene-exports before scene-roundtrip: {asset}")
            bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.ops.import_scene.gltf(filepath=str(asset))
            setup_evidence_camera()
            files = []
            for suffix, width, height in (("4x3", 1024, 768), ("16x9", 1280, 720)):
                filename = f"scene-roundtrip-{tier}-{sample_name}-{suffix}.png"
                render_frame(filename, frame, width, height)
                files.append(filename)
            renders[f"{tier}/{semantic_name}"] = {"asset": str(asset.relative_to(OUTPUT)), "frame": frame, "renders": files}
    report = {"importer": "Blender 4.5.9 LTS glTF importer", "renders": renders}
    (OUTPUT / "scene-force-sampled" / "roundtrip.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def scene_compare_one_stage(asset_path: Path, semantic_name: str, frame: int) -> None:
    """Compare source and imported GLB evaluated landmarks at one authored frame."""
    source_arms_rig, source_rifle_rig, source_arms_mesh, source_rifle_mesh = source_pair()
    assign_source_actions(source_arms_rig, source_rifle_rig, *PAIR_ACTIONS[semantic_name])
    # The source blend declares centimeters (scale_length 0.01); import into
    # the same scene otherwise applies a 100x display conversion to the glTF
    # meter values, obscuring an evaluated-landmark comparison.
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.ops.import_scene.gltf(filepath=str(asset_path))
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()

    def object_named(name: str) -> bpy.types.Object:
        object_ = bpy.data.objects.get(name)
        if object_ is None:
            raise RuntimeError(f"Roundtrip GLB missing expected object {name}")
        return object_

    imported_arms_rig = object_named("Kuptchi_Arms_Armature")
    imported_rifle_rig = object_named("Kuptchi_Rifle_Armature")
    imported_arms_mesh = object_named("Kuptchi_Arms_Mesh")
    imported_rifle_mesh = object_named("Kuptchi_Rifle_Mesh")

    def points(mesh: bpy.types.Object, indices: tuple[int, ...]) -> dict[str, list[float]]:
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        return {
            str(index): [round(float(value), 6) for value in (evaluated.matrix_world @ evaluated.data.vertices[index].co)]
            for index in indices if index < len(evaluated.data.vertices)
        }

    def bones(rig: bpy.types.Object, names: tuple[str, ...]) -> dict[str, list[list[float]]]:
        return {name: matrix_values(rig.matrix_world @ rig.pose.bones[name].matrix) for name in names}

    def evaluated_world_vertices(mesh: bpy.types.Object) -> list[Vector]:
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        return [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]

    def nearest_vertex_distances(first: bpy.types.Object, second: bpy.types.Object) -> dict[str, float | int]:
        """Compare split/reordered GLB geometry without assuming index identity."""
        first_points = evaluated_world_vertices(first)
        second_points = evaluated_world_vertices(second)
        tree = KDTree(len(second_points))
        for index, point in enumerate(second_points):
            tree.insert(point, index)
        tree.balance()
        distances = sorted(tree.find(point)[2] for point in first_points)
        return {
            "sample_count": len(distances),
            "mean": round(sum(distances) / len(distances), 6),
            "p95": round(distances[int((len(distances) - 1) * 0.95)], 6),
            "max": round(distances[-1], 6),
        }

    source = {
        "arms_points": points(source_arms_mesh, (0, 100, 400, 800)),
        "gun_points": points(source_rifle_mesh, (0, 100, 1000, 4000)),
        "arms_bones": bones(source_arms_rig, ("ctrl_HandIK_l", "hand_item_l", "hand_item_r")),
        "gun_bones": bones(source_rifle_rig, ("Main", "Magazine")),
    }
    imported = {
        "arms_points": points(imported_arms_mesh, (0, 100, 400, 800)),
        "gun_points": points(imported_rifle_mesh, (0, 100, 1000, 4000)),
        "arms_bones": bones(imported_arms_rig, ("ctrl_HandIK_l", "hand_item_l", "hand_item_r")),
        "gun_bones": bones(imported_rifle_rig, ("Main", "Magazine")),
    }
    report = {
        "asset": str(asset_path),
        "semantic": semantic_name,
        "frame": frame,
        "source": source,
        "roundtrip": imported,
        "nearest_vertex_landmarks": {
            "arms_source_to_roundtrip": nearest_vertex_distances(source_arms_mesh, imported_arms_mesh),
            "arms_roundtrip_to_source": nearest_vertex_distances(imported_arms_mesh, source_arms_mesh),
            "gun_source_to_roundtrip": nearest_vertex_distances(source_rifle_mesh, imported_rifle_mesh),
            "gun_roundtrip_to_source": nearest_vertex_distances(imported_rifle_mesh, source_rifle_mesh),
        },
    }
    output_path = asset_path.with_name(f"compare-{asset_path.parent.name}-{semantic_name}-frame-{frame}.json")
    output_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def imported_semantic_tracks() -> dict[str, list[tuple[bpy.types.Object, bpy.types.NlaTrack]]]:
    tracks: dict[str, list[tuple[bpy.types.Object, bpy.types.NlaTrack]]] = {}
    for object_ in bpy.context.scene.objects:
        if object_.type != "ARMATURE" or object_.animation_data is None:
            continue
        for track in object_.animation_data.nla_tracks:
            tracks.setdefault(track.name, []).append((object_, track))
    return tracks


def render_roundtrip(asset_path: Path, label: str) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(asset_path))
    tracks = imported_semantic_tracks()
    expected = set(PAIR_ACTIONS)
    if set(tracks) != expected or any(len(tracks[name]) != 2 for name in expected):
        found = {name: [object_.name for object_, _ in owners] for name, owners in tracks.items()}
        raise RuntimeError(f"Round-trip import did not preserve paired semantic NLA tracks: {found}")
    setup_evidence_camera()
    render_files = []
    for sample_name, (semantic_name, frame) in ROUNDTRIP_SAMPLES.items():
        for candidate_name, owner_tracks in tracks.items():
            for _, track in owner_tracks:
                track.mute = candidate_name != semantic_name
        sample_start = min(track.strips[0].frame_start for _, track in tracks[semantic_name])
        source_frame = int(sample_start + frame - 1)
        for suffix, width, height in (("4x3", 1024, 768), ("16x9", 1280, 720)):
            filename = f"roundtrip-{label}-{sample_name}-{suffix}.png"
            render_frame(filename, source_frame, width, height)
            render_files.append(filename)
    report = {
        "asset": str(asset_path),
        "sha256": sha256(asset_path),
        "importer": "Blender 4.5.9 LTS glTF importer",
        "semantic_tracks": {name: [object_.name for object_, _ in owners] for name, owners in tracks.items()},
        "renders": render_files,
        "samples": ROUNDTRIP_SAMPLES,
    }
    (OUTPUT / f"roundtrip-{label}.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def main() -> None:
    args = parse_args()
    global EXPORT_ALL_INFLUENCES
    EXPORT_ALL_INFLUENCES = args.influence_mode == "all"
    if args.stage == "export":
        export_stage()
        return
    if args.stage == "scene-test":
        scene_test_stage()
        return
    if args.stage == "scene-exports":
        scene_exports_stage()
        return
    if args.stage == "scene-export-one":
        if args.semantic is None or args.tier is None:
            raise RuntimeError("scene-export-one requires --semantic and --tier")
        scene_export_one_stage(args.semantic, args.tier)
        return
    if args.stage == "scene-roundtrip":
        scene_roundtrip_stage()
        return
    if args.stage == "scene-compare-one":
        if args.input is None or args.semantic is None or args.frame is None:
            raise RuntimeError("scene-compare-one requires --input, --semantic, and --frame")
        scene_compare_one_stage(args.input, args.semantic, args.frame)
        return
    if args.input is None or args.label is None:
        raise RuntimeError("roundtrip requires --input <GLB> and --label full|budget")
    render_roundtrip(args.input.resolve(), args.label)


if __name__ == "__main__":
    main()
