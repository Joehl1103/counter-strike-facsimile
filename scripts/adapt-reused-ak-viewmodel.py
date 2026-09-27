"""Build an offline, source-preserving AK + FPS-arms reuse pilot.

Inputs stay under assets/source.  This script copies the selected CC0 source
files, keeps the unmodified WRAD rig in the editable blend, and only exports
the reduced, posed candidate from the VIEWMODEL collection.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path.cwd()
OUTPUT = ROOT / "outputs/cs16/reuse/ak-arms"
if "--contact-frame-pilot" in sys.argv:
    # This measured repair is isolated so the accepted runtime-v1 source and
    # current candidate remain immutable evidence.
    OUTPUT = ROOT / "outputs/cs16/reuse/ak-arms/contact-frame-pilot"
SOURCE_COPY = ROOT / "assets/source/reused-ak"
WRAD_BLEND_ORIGINAL = ROOT / "assets/source/wrad-arms/arms.blend"
WRAD_SOURCE = ROOT / "assets/source/wrad-arms/source.json"
AK_ORIGINAL_DIR = ROOT / "assets/source/stein-classic-weapons/original/WeaponsPack/AK47"
AK_SOURCE = ROOT / "assets/source/stein-classic-weapons/source.json"
AK_LICENSE = ROOT / "assets/source/stein-classic-weapons/original/WeaponsPack/license.txt"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def reset_output_directories() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    SOURCE_COPY.mkdir(parents=True, exist_ok=True)


def copy_selected_sources() -> None:
    # The selected subset is deliberately small: only the adapted AK inputs,
    # their upstream license, and exact provenance manifests.
    selected = [
        (AK_ORIGINAL_DIR / "SKM_AK47.fbx", "SKM_AK47.fbx"),
        (AK_ORIGINAL_DIR / "T_AK47_C.png", "T_AK47_C.png"),
        (AK_ORIGINAL_DIR / "T_AK47_N.png", "T_AK47_N.png"),
        (AK_ORIGINAL_DIR / "T_AK47_RMAO.png", "T_AK47_RMAO.png"),
        (AK_LICENSE, "stein-license.txt"),
        (AK_SOURCE, "stein-source.json"),
        (WRAD_BLEND_ORIGINAL, "arms.blend"),
        (WRAD_SOURCE, "wrad-source.json"),
        (ROOT / "assets/source/wrad-arms/LICENSE", "wrad-license.txt"),
        (ROOT / "assets/source/wrad-arms/arm_albedo_pale.png", "arm_albedo_pale.png"),
        (ROOT / "assets/source/wrad-arms/arm_albedo_dark.png", "arm_albedo_dark.png"),
    ]
    for source, destination_name in selected:
        destination = SOURCE_COPY / destination_name
        shutil.copy2(source, destination)


def clear_non_wrad_scene_objects() -> None:
    for scene_object in list(bpy.context.scene.objects):
        if scene_object.name not in {"arms", "arms_mesh"}:
            bpy.data.objects.remove(scene_object, do_unlink=True)


def ensure_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def relink_only(scene_object: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for old_collection in list(scene_object.users_collection):
        old_collection.objects.unlink(scene_object)
    collection.objects.link(scene_object)


def duplicate_wrad_source_for_editable_reference() -> tuple[bpy.types.Object, bpy.types.Object]:
    """Keep the actual imported source rig and geometry inside the .blend."""
    source_rig = bpy.data.objects["arms"]
    source_mesh = bpy.data.objects["arms_mesh"]
    source_collection = ensure_collection("SOURCE_WRAD_FULL")
    relink_only(source_rig, source_collection)
    relink_only(source_mesh, source_collection)
    source_collection.hide_render = True
    source_collection.hide_viewport = True
    source_rig.hide_render = True
    source_mesh.hide_render = True

    output_rig = source_rig.copy()
    output_rig.data = source_rig.data.copy()
    output_rig.name = "fps_arms_rig"
    output_rig.hide_render = False
    output_rig.hide_viewport = False
    output_mesh = source_mesh.copy()
    output_mesh.data = source_mesh.data.copy()
    output_mesh.name = "fps_arms_mesh"
    output_mesh.hide_render = False
    output_mesh.hide_viewport = False
    for modifier in output_mesh.modifiers:
        if modifier.type == "ARMATURE":
            modifier.object = output_rig

    viewmodel_collection = ensure_collection("VIEWMODEL")
    viewmodel_collection.objects.link(output_rig)
    viewmodel_collection.objects.link(output_mesh)
    return output_rig, output_mesh


def make_mount() -> bpy.types.Object:
    mount = bpy.data.objects.new("viewmodel_mount", None)
    mount.empty_display_type = "ARROWS"
    mount.matrix_world = scene_mount_matrix()
    ensure_collection("VIEWMODEL").objects.link(mount)
    return mount


def parent_with_local_transform(scene_object: bpy.types.Object, parent: bpy.types.Object) -> None:
    """Parent a new viewmodel object so its matrix_basis stays mount-local."""
    scene_object.parent = parent


def scene_mount_matrix() -> Matrix:
    """Convert the frozen game mount into one Blender Z-up authoring scene."""
    game_to_blender = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    game_rotation = (
        Matrix.Rotation(0.08, 4, "X")
        @ Matrix.Rotation(0.14, 4, "Y")
        @ Matrix.Rotation(0.0, 4, "Z")
    )
    game_mount = Matrix.Translation(Vector((0.43, -0.34, -0.59))) @ game_rotation @ Matrix.Scale(0.82, 4)
    return game_to_blender @ game_mount @ game_to_blender.inverted()


def configure_arm_materials(arms_mesh: bpy.types.Object) -> None:
    for image in bpy.data.images:
        filename = Path(bpy.path.abspath(image.filepath)).name
        local_image = SOURCE_COPY / filename
        if local_image.exists():
            image.filepath = str(local_image)
            image.reload()

    glove = bpy.data.materials.get("dark_fingerless_glove")
    if glove is None:
        glove = bpy.data.materials.new("dark_fingerless_glove")
    glove.use_nodes = True
    shader = glove.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.018, 0.024, 0.032, 1.0)
    shader.inputs["Roughness"].default_value = 0.62
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Alpha"].default_value = 1.0
    if arms_mesh.data.materials.get(glove.name) is None:
        arms_mesh.data.materials.append(glove)
    glove_slot = arms_mesh.data.materials.find(glove.name)

    # Paint the already-skinned mesh faces through its existing wrist/finger
    # weights. Third finger segments remain skin so the glove reads fingerless.
    group_names = {group.index: group.name for group in arms_mesh.vertex_groups}
    for polygon in arms_mesh.data.polygons:
        votes: dict[str, float] = {}
        for vertex_index in polygon.vertices:
            vertex = arms_mesh.data.vertices[vertex_index]
            for assignment in vertex.groups:
                name = group_names.get(assignment.group, "")
                votes[name] = votes.get(name, 0.0) + assignment.weight
        dominant = max(votes, key=votes.get, default="")
        is_wrist = dominant.startswith("wrist.")
        is_glove_finger = dominant.startswith("finger_") and (
            "1." in dominant or "2." in dominant
        )
        if is_wrist or is_glove_finger:
            polygon.material_index = glove_slot

    # Preserve the WRAD UV texture while giving the exposed source skin the
    # warmer tan cast used by the fixed first-person reference.
    pale_material = arms_mesh.data.materials.get("arm_mat_pale")
    if pale_material is not None and pale_material.use_nodes:
        shader = pale_material.node_tree.nodes.get("Principled BSDF")
        tint = pale_material.node_tree.nodes.get("reference_tan_tint")
        if tint is None:
            tint = pale_material.node_tree.nodes.new("ShaderNodeMixRGB")
            tint.name = "reference_tan_tint"
            tint.label = "Warm source texture tint"
            tint.blend_type = "MULTIPLY"
            tint.inputs[0].default_value = 1.0
            tint.inputs[2].default_value = (0.88, 0.62, 0.39, 1.0)
            existing_links = list(shader.inputs["Base Color"].links)
            for existing_link in existing_links:
                color_source = existing_link.from_socket
                pale_material.node_tree.links.remove(existing_link)
                pale_material.node_tree.links.new(color_source, tint.inputs[1])
            pale_material.node_tree.links.new(tint.outputs[0], shader.inputs["Base Color"])


def mount_local_to_rig_space(
    arms_rig: bpy.types.Object, mount: bpy.types.Object, mount_local: Vector
) -> Vector:
    """Turn an approved mount-local contact into the native rig's space."""
    world_target = mount.matrix_world @ mount_local.to_4d()
    return (arms_rig.matrix_world.inverted() @ world_target).to_3d()


def weapon_surface_nearest(
    weapon_meshes: list[bpy.types.Object], mount: bpy.types.Object, mount_point: Vector
) -> tuple[Vector, Vector, float, str]:
    """Return the measured nearest evaluated AK surface in mount-local space."""
    from mathutils.bvhtree import BVHTree

    target_world = mount.matrix_world @ mount_point
    depsgraph = bpy.context.evaluated_depsgraph_get()
    closest = None
    for weapon in weapon_meshes:
        evaluated = weapon.evaluated_get(depsgraph)
        bvh = BVHTree.FromPolygons(
            [vertex.co.copy() for vertex in evaluated.data.vertices],
            [polygon.vertices[:] for polygon in evaluated.data.polygons],
        )
        result = bvh.find_nearest(evaluated.matrix_world.inverted() @ target_world)
        if result is None:
            continue
        point, normal, _, distance = result
        world_point = evaluated.matrix_world @ point
        world_normal = (evaluated.matrix_world.to_3x3().inverted().transposed() @ normal).normalized()
        if closest is None or distance < closest[2]:
            closest = (
                (mount.matrix_world.inverted() @ world_point).to_3d(),
                (mount.matrix_world.to_3x3().inverted() @ world_normal).normalized(),
                distance,
                weapon.name,
            )
    if closest is None:
        raise RuntimeError("No evaluated AK surface was available for the native support-hand frame")
    return closest


def left_hand_groups(arms_mesh: bpy.types.Object) -> set[str]:
    return {
        "wrist.l",
        *(f"finger_{finger}{segment}.l" for finger in ("index", "middle", "ring", "pinky", "thumb") for segment in (1, 2, 3)),
    }


def measured_left_palm_patch(
    arms_rig: bpy.types.Object, arms_mesh: bpy.types.Object, mount: bpy.types.Object
) -> tuple[Vector, Vector, int]:
    """Measure the source palm-side patch using its native weights and socket frame.

    WRAD's evaluated rest hand identifies local -Z as the palm-facing side.
    This selects only existing hand-weighted faces facing that source semantic
    axis; it does not create or reshape a hand surface.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = arms_mesh.evaluated_get(depsgraph)
    group_names = {group.index: group.name for group in arms_mesh.vertex_groups}
    groups = left_hand_groups(arms_mesh)
    socket_rotation_mount = (
        mount.matrix_world.to_3x3().inverted()
        @ arms_rig.matrix_world.to_3x3()
        @ arms_rig.pose.bones["socket.l"].matrix.to_3x3()
    )
    expected_normal_mount = (socket_rotation_mount @ Vector((0.0, 0.0, -1.0))).normalized()
    weighted_center = Vector()
    weighted_normal = Vector()
    total_area = 0.0
    count = 0
    for polygon in evaluated.data.polygons:
        hand_vertices = 0
        for index in polygon.vertices:
            if any(group_names.get(item.group, "") in groups for item in arms_mesh.data.vertices[index].groups):
                hand_vertices += 1
        if hand_vertices < 3:
            continue
        normal_world = (evaluated.matrix_world.to_3x3().inverted().transposed() @ polygon.normal).normalized()
        normal_mount = (mount.matrix_world.to_3x3().inverted() @ normal_world).normalized()
        if normal_mount.dot(expected_normal_mount) < 0.55:
            continue
        center_mount = (mount.matrix_world.inverted() @ (evaluated.matrix_world @ polygon.center)).to_3d()
        weighted_center += center_mount * polygon.area
        weighted_normal += normal_mount * polygon.area
        total_area += polygon.area
        count += 1
    if not count:
        raise RuntimeError("Could not select an evaluated WRAD palm patch from native source weights")
    return weighted_center / total_area, weighted_normal.normalized(), count


def pose_wrad_ik(
    arms_rig: bpy.types.Object, mount: bpy.types.Object, arms_mesh: bpy.types.Object, weapon_meshes: list[bpy.types.Object]
) -> dict[str, list[float]]:
    bpy.context.view_layer.objects.active = arms_rig
    arms_rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")

    idle = bpy.data.actions.new("AK_Arms_Idle")
    idle.use_fake_user = True
    arms_rig.animation_data_create()
    arms_rig.animation_data.action = idle

    # The player-visible contact targets are mount-local Blender coordinates.
    # They are mapped through the actual transformed armature rather than
    # guessed as armature coordinates.
    previous_muzzle = Vector((0.0, 0.972287, 0.006152))
    weapon_scale_factor = 1.22
    previous_targets = {
        "palm.r": Vector((0.045, 0.080, -0.120)),
        "palm.l": Vector((-0.050, 0.520, -0.075)),
        "elbow.r": Vector((0.25, -0.12, -0.50)),
        # This scaled native pole keeps the support forearm travelling down
        # and left to the bottom-centre entry, rather than standing vertical.
        "elbow.l": Vector((-0.45, -0.02, -0.48)),
    }
    mount_targets = {
        name: previous_muzzle + weapon_scale_factor * (target - previous_muzzle)
        for name, target in previous_targets.items()
    }
    rig_targets = {name: mount_local_to_rig_space(arms_rig, mount, target) for name, target in mount_targets.items()}

    palm_orientations = {
        "r": (Vector((-1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0))),
        "l": (Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0))),
    }
    wrist_rotations = {}
    hand_targets = {}
    for side in ("r", "l"):
        palm_normal, finger_direction = palm_orientations[side]
        local_z = palm_normal.cross(finger_direction).normalized()
        mount_rotation = Matrix((palm_normal, finger_direction, local_z)).transposed()
        wrist_rotations[side] = (
            arms_rig.matrix_world.to_3x3().inverted()
            @ mount.matrix_world.to_3x3()
            @ mount_rotation
        )
        # The first solve starts from the measured source wrist-to-palm offset.
        # A second correction below uses the evaluated socket, so constraints
        # and the control's oriented space are accounted for exactly.
        palm_offset = (
            arms_rig.data.bones[f"socket.{side}"].head_local
            - arms_rig.data.bones[f"wrist_ik.{side}"].head_local
        )
        hand_targets[f"wrist_ik.{side}"] = rig_targets[f"palm.{side}"] - palm_offset
        hand_targets[f"arm_target.{side}"] = rig_targets[f"elbow.{side}"]

    for bone_name, target in hand_targets.items():
        control = arms_rig.pose.bones[bone_name]
        if bone_name.startswith("wrist_ik"):
            side = bone_name[-1]
            pose_matrix = wrist_rotations[side].to_4x4()
        else:
            pose_matrix = control.matrix.copy()
        pose_matrix.translation = target
        control.matrix = pose_matrix
        control.keyframe_insert(data_path="location", frame=1)

    bpy.ops.object.mode_set(mode="OBJECT")
    arms_rig.select_set(False)
    bpy.context.view_layer.update()
    # Right-hand translation remains the existing trigger contact solve.
    correction_rig_space = {}
    for side in ("r",):
        socket_position = arms_rig.pose.bones[f"socket.{side}"].matrix.translation
        socket_world = arms_rig.matrix_world @ socket_position.to_4d()
        socket_mount_local = (mount.matrix_world.inverted() @ socket_world).to_3d()
        correction_mount_local = mount_targets[f"palm.{side}"] - socket_mount_local
        correction_rig_space[side] = (
            arms_rig.matrix_world.to_3x3().inverted()
            @ mount.matrix_world.to_3x3()
            @ correction_mount_local
        )
    bpy.context.view_layer.objects.active = arms_rig
    arms_rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    for side, correction in correction_rig_space.items():
        control = arms_rig.pose.bones[f"wrist_ik.{side}"]
        corrected_matrix = control.matrix.copy()
        corrected_matrix.translation += correction
        control.matrix = corrected_matrix
        control.keyframe_insert(data_path="location", frame=1)
    bpy.ops.object.mode_set(mode="OBJECT")
    arms_rig.select_set(False)
    bpy.context.view_layer.update()

    # Build the support hand from the *evaluated* source socket-rest frame to
    # a measured AK fore-end frame.  Local -Z was established from the
    # native WRAD palm-side weighted faces, so it is not an assumed hand axis.
    surface_point, surface_normal, _, surface_mesh = weapon_surface_nearest(
        weapon_meshes, mount, mount_targets["palm.l"]
    )
    desired_palm_normal = -surface_normal
    ejection_mount = Vector((0.043996, 0.105911, 0.045071))
    weapon_forward = (previous_muzzle - ejection_mount).normalized()
    desired_finger_axis = (weapon_forward - desired_palm_normal * weapon_forward.dot(desired_palm_normal)).normalized()
    desired_socket_z = -desired_palm_normal
    desired_socket_x = desired_finger_axis.cross(desired_socket_z).normalized()
    desired_socket_y = desired_socket_z.cross(desired_socket_x).normalized()
    desired_socket_mount = Matrix((desired_socket_x, desired_socket_y, desired_socket_z)).transposed()
    mount_from_rig = mount.matrix_world.to_3x3().inverted() @ arms_rig.matrix_world.to_3x3()
    socket_current_mount = mount_from_rig @ arms_rig.pose.bones["socket.l"].matrix.to_3x3()
    wrist_current_mount = mount_from_rig @ arms_rig.pose.bones["wrist_ik.l"].matrix.to_3x3()
    socket_from_wrist = wrist_current_mount.inverted() @ socket_current_mount
    desired_wrist_mount = desired_socket_mount @ socket_from_wrist.inverted()
    desired_wrist_rig = (
        arms_rig.matrix_world.to_3x3().inverted()
        @ mount.matrix_world.to_3x3()
        @ desired_wrist_mount
    )
    bpy.context.view_layer.objects.active = arms_rig
    arms_rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    left_control = arms_rig.pose.bones["wrist_ik.l"]
    left_matrix = desired_wrist_rig.to_4x4()
    left_matrix.translation = left_control.matrix.translation
    left_control.matrix = left_matrix
    left_control.keyframe_insert(data_path="rotation_quaternion", frame=1)
    bpy.ops.object.mode_set(mode="OBJECT")
    arms_rig.select_set(False)
    bpy.context.view_layer.update()

    # The target is a 3 mm outside offset from the measured fore-end surface.
    # Correct the native control translation from the evaluated palm patch,
    # never from the socket anchor alone.
    palm_target = surface_point + surface_normal * 0.003
    palm_center, palm_normal, palm_face_count = measured_left_palm_patch(arms_rig, arms_mesh, mount)
    palm_correction_mount = palm_target - palm_center
    palm_correction_rig = (
        arms_rig.matrix_world.to_3x3().inverted()
        @ mount.matrix_world.to_3x3()
        @ palm_correction_mount
    )
    bpy.context.view_layer.objects.active = arms_rig
    arms_rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    left_control = arms_rig.pose.bones["wrist_ik.l"]
    corrected_left_matrix = left_control.matrix.copy()
    corrected_left_matrix.translation += palm_correction_rig
    left_control.matrix = corrected_left_matrix
    left_control.keyframe_insert(data_path="location", frame=1)
    bpy.ops.object.mode_set(mode="OBJECT")
    arms_rig.select_set(False)
    bpy.context.view_layer.update()

    # Aim existing distal native finger bones at their nearest evaluated AK
    # surface.  Each matrix is built from the measured point and normal in
    # that bone's own pose frame; there are no Euler curl guesses or new rigs.
    finger_targets = {}
    bpy.context.view_layer.objects.active = arms_rig
    arms_rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    for finger in ("index", "middle", "ring", "pinky", "thumb"):
        for segment in (2, 3):
            bone_name = f"finger_{finger}{segment}.l"
            control = arms_rig.pose.bones[bone_name]
            head_mount = (mount.matrix_world.inverted() @ (arms_rig.matrix_world @ control.head)).to_3d()
            finger_surface, finger_normal, _, finger_mesh = weapon_surface_nearest(weapon_meshes, mount, head_mount)
            direction = (finger_surface - head_mount).normalized()
            z_axis = -finger_normal
            x_axis = direction.cross(z_axis)
            if x_axis.length < 0.001:
                x_axis = desired_socket_x.copy()
            x_axis.normalize()
            y_axis = z_axis.cross(x_axis).normalized()
            finger_mount = Matrix((x_axis, y_axis, z_axis)).transposed()
            finger_rig = (
                arms_rig.matrix_world.to_3x3().inverted()
                @ mount.matrix_world.to_3x3()
                @ finger_mount
            )
            pose_matrix = finger_rig.to_4x4()
            pose_matrix.translation = control.matrix.translation
            control.matrix = pose_matrix
            control.keyframe_insert(data_path="rotation_quaternion", frame=1)
            finger_targets[bone_name] = {"surface_mount_local": list(finger_surface), "surface_mesh": finger_mesh}
            bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    arms_rig.select_set(False)
    bpy.context.view_layer.update()
    palm_center, palm_normal, palm_face_count = measured_left_palm_patch(arms_rig, arms_mesh, mount)
    measured_surface, measured_surface_normal, palm_distance, _ = weapon_surface_nearest(weapon_meshes, mount, palm_center)
    distal_contacts = {}
    for finger in ("index", "middle", "ring", "pinky", "thumb"):
        control = arms_rig.pose.bones[f"finger_{finger}3.l"]
        tail_mount = (mount.matrix_world.inverted() @ (arms_rig.matrix_world @ control.tail)).to_3d()
        point, normal, distance, mesh_name = weapon_surface_nearest(weapon_meshes, mount, tail_mount)
        distal_contacts[finger] = {
            "tail_mount_local": list(tail_mount),
            "nearest_surface_mount_local": list(point),
            "distance_m": distance,
            "surface_mesh": mesh_name,
            "tail_to_surface_direction": list((point - tail_mount).normalized()),
        }
    contact = {}
    for side in ("r", "l"):
        socket_position = arms_rig.pose.bones[f"socket.{side}"].matrix.translation
        socket_world = arms_rig.matrix_world @ socket_position.to_4d()
        socket_mount_local = (mount.matrix_world.inverted() @ socket_world).to_3d()
        intended = mount_targets[f"palm.{side}"]
        contact[side] = {
            "palm_surface_mount_local": list(socket_mount_local),
            "target_mount_local": list(intended),
            "distance_m": (socket_mount_local - intended).length,
        }
    return {
        "mount_local_targets": {name: list(value) for name, value in mount_targets.items()},
        "rig_space_control_targets": {name: list(value) for name, value in hand_targets.items()},
        "measured_control_correction_rig_space": {side: list(value) for side, value in correction_rig_space.items()},
        "weapon_muzzle_mount_local": list(previous_muzzle),
        "weapon_contact_scale_about_muzzle": weapon_scale_factor,
        "support_contact_frame": {
            "surface_mesh": surface_mesh,
            "surface_point_mount_local": list(surface_point),
            "surface_normal_mount_local": list(surface_normal),
            "desired_palm_normal_mount_local": list(desired_palm_normal),
            "desired_finger_axis_mount_local": list(desired_socket_y),
            "palm_patch_face_count": palm_face_count,
            "palm_patch_center_mount_local": list(palm_center),
            "palm_patch_normal_mount_local": list(palm_normal),
            "palm_patch_to_nearest_surface_m": palm_distance,
            "palm_normal_dot_opposed_surface_normal": palm_normal.dot(-measured_surface_normal),
            "wrist_method": "evaluated socket rest-to-fore-end frame delta",
        },
        "native_finger_surface_targets": finger_targets,
        "native_finger_distal_contacts": distal_contacts,
        "palm_contact": contact,
    }


def import_and_configure_ak(mount: bpy.types.Object) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    bpy.ops.import_scene.fbx(filepath=str(SOURCE_COPY / "SKM_AK47.fbx"))
    imported = list(bpy.context.selected_objects)
    for scene_object in imported:
        if scene_object.name == "Cube":
            bpy.data.objects.remove(scene_object, do_unlink=True)
    skeleton = next(obj for obj in imported if obj.type == "ARMATURE")
    skeleton.name = "ak47_source_rig"
    # Stein's source forward axis is -Y. A Z half-turn points it toward the
    # Blender camera at +Y without a reflection or a mixed coordinate scene.
    skeleton.rotation_euler = (0.0, 0.0, math.pi)
    # Enlarge about the fixed actual muzzle mount-local position.  The source
    # muzzle is (0, -.701, .096); after the Z half-turn this preserves
    # Blender mount-local (0, .972287, .006152) exactly.
    skeleton.location = (0.0, -0.21390314, -0.15629344)
    skeleton.scale = (1.69214, 1.69214, 1.69214)
    parent_with_local_transform(skeleton, mount)
    relink_only(skeleton, ensure_collection("VIEWMODEL"))
    meshes = [obj for obj in imported if obj.type == "MESH" and obj.name in bpy.data.objects]
    for mesh in meshes:
        mesh.name = "ak47_" + mesh.name.lower()
        relink_only(mesh, ensure_collection("VIEWMODEL"))
        for material in mesh.data.materials:
            material.use_nodes = True
            shader = material.node_tree.nodes.get("Principled BSDF")
            shader.inputs["Metallic"].default_value = 0.0
            shader.inputs["Roughness"].default_value = 0.75
            shader.inputs["Alpha"].default_value = 1.0
            image_node = material.node_tree.nodes.get("AK47_Color")
            if image_node is None:
                image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
                image_node.name = "AK47_Color"
                image_node.label = "T_AK47_C CC0 source"
            image_node.image = bpy.data.images.load(str(SOURCE_COPY / "T_AK47_C.png"), check_existing=True)
            material.node_tree.links.new(image_node.outputs["Color"], shader.inputs["Base Color"])
            normal_node = material.node_tree.nodes.get("AK47_Normal")
            if normal_node is None:
                normal_node = material.node_tree.nodes.new("ShaderNodeTexImage")
                normal_node.name = "AK47_Normal"
                normal_node.image = bpy.data.images.load(str(SOURCE_COPY / "T_AK47_N.png"), check_existing=True)
                normal_map = material.node_tree.nodes.new("ShaderNodeNormalMap")
                material.node_tree.links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
                material.node_tree.links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])

    return skeleton, meshes


def preserve_full_ak_source(weapon_rig: bpy.types.Object, meshes: list[bpy.types.Object]) -> None:
    """Keep a complete, untrimmed source-copy assembly inside the .blend."""
    source_collection = ensure_collection("SOURCE_STEIN_FULL")
    source_collection.hide_render = True
    source_collection.hide_viewport = True
    source_rig = weapon_rig.copy()
    source_rig.data = weapon_rig.data.copy()
    source_rig.name = "ak47_full_source_rig"
    source_rig.hide_render = True
    source_rig.hide_viewport = True
    source_collection.objects.link(source_rig)
    for mesh in meshes:
        source_mesh = mesh.copy()
        source_mesh.data = mesh.data.copy()
        source_mesh.name = "ak47_full_source_" + mesh.name.removeprefix("ak47_")
        source_mesh.parent = source_rig
        source_mesh.matrix_parent_inverse = Matrix.Identity(4)
        source_mesh.hide_render = True
        source_mesh.hide_viewport = True
        source_collection.objects.link(source_mesh)


def reduce_ak_after_visual_pass(meshes: list[bpy.types.Object]) -> None:
    """Apply the conservative copy-only reduction only after visual approval."""
    dense_mesh = max(meshes, key=lambda item: len(item.data.polygons))
    decimate = dense_mesh.modifiers.new("source_copy_conservative_reduction", "DECIMATE")
    decimate.ratio = 0.17
    bpy.context.view_layer.objects.active = dense_mesh
    dense_mesh.select_set(True)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    dense_mesh.select_set(False)


def add_weapon_sockets(weapon_rig: bpy.types.Object) -> None:
    for name, location in {
        "muzzle-socket": (0.0, -0.701, 0.096),
        "ejection-socket": (-0.026, -0.189, 0.119),
    }.items():
        socket = bpy.data.objects.new(name, None)
        socket.empty_display_type = "SPHERE"
        socket.empty_display_size = 0.025
        ensure_collection("VIEWMODEL").objects.link(socket)
        socket.parent = weapon_rig
        socket.location = location


def set_arm_viewmodel_transform(arms_rig: bpy.types.Object, arms_mesh: bpy.types.Object, mount: bpy.types.Object) -> None:
    parent_with_local_transform(arms_rig, mount)
    # Lower the source shoulder cutoff below the presentation frame while the
    # measured wrist targets keep both palms on the retained weapon surfaces.
    arms_rig.location = (-0.20, 0.0, -0.32)
    arms_rig.rotation_euler = (0.0, 0.0, 0.0)
    arms_rig.scale = (0.20, 0.20, 0.20)
    # Keep the skinned mesh in the armature's local frame during the pose pass.
    arms_mesh.parent = arms_rig
    arms_mesh.matrix_parent_inverse = Matrix.Identity(4)
    arms_mesh.location = (0.0, 0.0, 0.0)
    arms_mesh.rotation_euler = (0.0, 0.0, 0.0)
    arms_mesh.scale = (1.0, 1.0, 1.0)


def add_studio_lighting() -> None:
    studio = ensure_collection("STUDIO")
    for name, location, energy, size in (
        ("key_light", (1.5, 1.6, 0.9), 75.0, 3.0),
        ("fill_light", (-1.4, 0.6, -0.4), 30.0, 2.5),
        ("rim_light", (0.0, -0.4, 1.0), 50.0, 2.0),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        studio.objects.link(light)

    camera_data = bpy.data.cameras.new("reference_camera_74deg")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.sensor_height = 24.0
    camera_data.lens = 24.0 / (2.0 * math.tan(math.radians(74.0) / 2.0))
    camera = bpy.data.objects.new("reference_camera_74deg", camera_data)
    camera.location = (0.0, 0.0, 0.0)
    camera.rotation_euler = Vector((0.0, 1.0, 0.0)).to_track_quat("-Z", "Y").to_euler()
    camera.data.clip_start = 0.02
    studio.objects.link(camera)
    bpy.context.scene.camera = camera


def configure_render(width: int, height: int, filepath: Path) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(filepath)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.023, 0.031, 1.0)
    background.inputs["Strength"].default_value = 0.16
    scene.view_settings.look = "AgX - Medium High Contrast"


def render_evidence(arms_mesh: bpy.types.Object, weapon_meshes: list[bpy.types.Object]) -> None:
    configure_render(1024, 768, OUTPUT / "composed-reference-4x3.png")
    bpy.ops.render.render(write_still=True)
    configure_render(1280, 720, OUTPUT / "composed-reference-16x9.png")
    bpy.ops.render.render(write_still=True)
    configure_render(1600, 900, OUTPUT / "composed-reference-native.png")
    bpy.ops.render.render(write_still=True)
    camera = bpy.context.scene.camera
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_lens = camera.data.lens
    camera.location = (0.25, 0.0, -0.25)
    camera.data.lens = 29.0
    configure_render(1024, 768, OUTPUT / "grip-contact-close.png")
    bpy.ops.render.render(write_still=True)
    camera.location = (0.38, 0.0, -0.08)
    camera.rotation_euler = (Vector((0.0, 0.46, -0.07)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    configure_render(1024, 768, OUTPUT / "grip-contact-side.png")
    bpy.ops.render.render(write_still=True)
    camera.location = original_location
    camera.rotation_euler = original_rotation
    camera.data.lens = original_lens

    for mesh in weapon_meshes:
        mesh.hide_render = True
    configure_render(1024, 768, OUTPUT / "arms-isolated.png")
    bpy.ops.render.render(write_still=True)
    for mesh in weapon_meshes:
        mesh.hide_render = False
    arms_mesh.hide_render = True
    configure_render(1024, 768, OUTPUT / "weapon-isolated.png")
    bpy.ops.render.render(write_still=True)
    arms_mesh.hide_render = False

    shutil.copy2(ROOT / "outputs/cs16/reuse/stein-source.png", OUTPUT / "source-gun-original.png")
    shutil.copy2(ROOT / "outputs/cs16/reuse/wrad-source.png", OUTPUT / "source-arms-original.png")


def measure_reference_projection(mount: bpy.types.Object) -> dict:
    """Record exact source-camera projections for the fixed framing gate."""
    from bpy_extras.object_utils import world_to_camera_view

    scene = bpy.context.scene
    camera = scene.camera
    bpy.context.view_layer.update()
    # These source-space landmarks are also the pose targets measured in
    # pose_calibration.palm_contact; use mount @ Vector3 so translation is
    # applied with homogeneous w=1.
    points = {
        "muzzle": mount.matrix_world @ Vector((0.0, 0.972287, 0.006152)),
        "support_palm": mount.matrix_world @ Vector((-0.061, 0.42049686, -0.09285344)),
    }
    original = (scene.render.resolution_x, scene.render.resolution_y)
    results = {}
    for label, resolution in (("4x3", (1024, 768)), ("16x9", (1280, 720))):
        scene.render.resolution_x, scene.render.resolution_y = resolution
        results[label] = {
            # Image-space y grows downward, matching the reference metrics.
            name: [round(value.x, 6), round(1.0 - value.y, 6), round(value.z, 6)]
            for name, point in points.items()
            for value in [world_to_camera_view(scene, camera, point)]
        }
    scene.render.resolution_x, scene.render.resolution_y = original
    return results


def measure_palm_mesh_surface_contact(
    arms_mesh: bpy.types.Object, weapon_meshes: list[bpy.types.Object]
) -> dict[str, float]:
    """Measure native wrist-weighted palm vertices against actual AK triangles."""
    from mathutils.bvhtree import BVHTree

    depsgraph = bpy.context.evaluated_depsgraph_get()
    weapon_bvhs = []
    for weapon_mesh in weapon_meshes:
        evaluated = weapon_mesh.evaluated_get(depsgraph)
        vertices = [vertex.co.copy() for vertex in evaluated.data.vertices]
        polygons = [polygon.vertices[:] for polygon in evaluated.data.polygons]
        weapon_bvhs.append((evaluated, BVHTree.FromPolygons(vertices, polygons)))
    evaluated_arms = arms_mesh.evaluated_get(depsgraph)
    group_names = {group.index: group.name for group in arms_mesh.vertex_groups}
    contact_distances = {"r": [], "l": []}
    for vertex_index, source_vertex in enumerate(arms_mesh.data.vertices):
        weights = {group_names.get(group.group, ""): group.weight for group in source_vertex.groups}
        dominant = max(weights, key=weights.get, default="")
        for side in ("r", "l"):
            if dominant != f"wrist.{side}":
                continue
            world_point = evaluated_arms.matrix_world @ evaluated_arms.data.vertices[vertex_index].co
            for evaluated_weapon, bvh in weapon_bvhs:
                local_point = evaluated_weapon.matrix_world.inverted() @ world_point
                nearest = bvh.find_nearest(local_point)
                if nearest is not None:
                    nearest_world = evaluated_weapon.matrix_world @ nearest[0]
                    contact_distances[side].append((world_point - nearest_world).length)
    return {side: min(distances) if distances else float("inf") for side, distances in contact_distances.items()}


def triangle_count(scene_object: bpy.types.Object) -> int:
    scene_object.data.calc_loop_triangles()
    return len(scene_object.data.loop_triangles)


def crop_static_baked_weapon_for_camera_clearance(baked: bpy.types.Object) -> dict:
    """Crop only a transient static weapon mesh in actual mounted camera space.

    Root's retained-envelope measurement establishes that all affected
    triangles are offscreen at both frozen aspects through the 41 reload
    poses.  The editable source stays whole; this uses the same mounted world
    transform as the runtime check before static weapon pieces are parented.
    """
    import bmesh

    world_from_baked = scene_mount_matrix() @ baked.matrix_world
    plane_co = world_from_baked.inverted() @ Vector((0.0, 0.3205, 0.0))
    plane_no = (world_from_baked.transposed().to_3x3() @ Vector((0.0, 1.0, 0.0))).normalized()
    edit_mesh = bmesh.new()
    edit_mesh.from_mesh(baked.data)
    before_faces = len(edit_mesh.faces)
    bmesh.ops.bisect_plane(
        edit_mesh,
        geom=list(edit_mesh.verts) + list(edit_mesh.edges) + list(edit_mesh.faces),
        plane_co=plane_co,
        plane_no=plane_no,
        dist=0.000001,
        clear_inner=True,
        clear_outer=False,
    )
    # No cap: root established the new open boundary is fully offscreen.
    loose_verts = [vertex for vertex in edit_mesh.verts if not vertex.link_faces]
    if loose_verts:
        bmesh.ops.delete(edit_mesh, geom=loose_verts, context="VERTS")
    after_faces = len(edit_mesh.faces)
    edit_mesh.to_mesh(baked.data)
    edit_mesh.free()
    baked.data.update()
    return {
        "status": "static_baked_copy_only",
        "method": "bmesh bisect_plane clear_inner=True in mounted camera/world space before static child parenting",
        "camera_plane_blender_world_y": 0.3205,
        "game_camera_z_equivalent": -0.3205,
        "faces_before": before_faces,
        "faces_after": after_faces,
        "faces_removed_or_split": before_faces - after_faces,
        "source_preserved": "editable first-person and SOURCE_STEIN_FULL meshes are unchanged",
        "visibility_evidence": "outputs/cs16/reuse/integration/actual-camera-crop-check.json (root measured all 41 retained reload poses)",
    }


def create_static_export_copy(
    mount: bpy.types.Object,
    arms_mesh: bpy.types.Object,
    weapon_meshes: list[bpy.types.Object],
) -> tuple[list[bpy.types.Object], list[dict]]:
    """Bake evaluated meshes without the display-only game mount hierarchy."""
    static_collection = ensure_collection("EXPORT_STATIC_BAKED")
    static_objects = []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    glove_image = bpy.data.images.new("export_glove_black", width=1, height=1, alpha=True)
    glove_image.pixels = (0.018, 0.024, 0.032, 1.0)
    common_weapon_material = None
    static_crop_reports = []
    for source_mesh in [arms_mesh, *weapon_meshes]:
        evaluated = source_mesh.evaluated_get(depsgraph)
        baked_data = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        while len(baked_data.uv_layers) > 1:
            baked_data.uv_layers.remove(baked_data.uv_layers[-1])
        for material_index, source_material in enumerate(list(baked_data.materials)):
            export_material = source_material.copy()
            export_material.name = "export_" + source_material.name
            shader = export_material.node_tree.nodes.get("Principled BSDF") if export_material.use_nodes else None
            if shader is not None:
                for link in list(shader.inputs["Normal"].links):
                    export_material.node_tree.links.remove(link)
            if source_material.name == "dark_fingerless_glove" and shader is not None:
                color_node = export_material.node_tree.nodes.new("ShaderNodeTexImage")
                color_node.name = "glove_uv_color"
                color_node.image = glove_image
                export_material.node_tree.links.new(color_node.outputs["Color"], shader.inputs["Base Color"])
            baked_data.materials[material_index] = export_material
        if source_mesh != arms_mesh:
            if common_weapon_material is None:
                common_weapon_material = baked_data.materials[0]
            baked_data.materials.clear()
            baked_data.materials.append(common_weapon_material)
            for polygon in baked_data.polygons:
                polygon.material_index = 0
        baked = bpy.data.objects.new("static_" + source_mesh.name, baked_data)
        baked.matrix_world = mount.matrix_world.inverted() @ evaluated.matrix_world
        if source_mesh != arms_mesh:
            static_crop_reports.append(crop_static_baked_weapon_for_camera_clearance(baked))
        baked["assetTag"] = "viewmodelArm" if source_mesh == arms_mesh else "primaryWeaponGeometry"
        static_collection.objects.link(baked)
        static_objects.append(baked)

    # Use real mesh nodes as export anchors so the glTF remains warning-free;
    # source Blender empties remain named socket empties in the editable scene.
    static_arms = static_objects[0]
    static_weapon_meshes = static_objects[1:]
    static_arms["viewmodelArm"] = True
    static_arms["assetCategory"] = "viewmodelArm"
    weapon_group = static_weapon_meshes[0]
    weapon_group["primaryWeaponGeometry"] = True
    weapon_group["assetCategory"] = "primaryWeaponGeometry"
    for socket_name, socket_kind in (("muzzle-socket", "muzzle"), ("ejection-socket", "ejection")):
        source_socket = bpy.data.objects[socket_name]
        socket_position = (mount.matrix_world.inverted() @ source_socket.matrix_world).translation
        weapon_group[socket_kind + "SocketName"] = socket_name
        weapon_group[socket_kind + "SocketKind"] = socket_kind
        weapon_group[socket_kind + "SocketPosition"] = list(socket_position)
    for child_mesh in static_weapon_meshes[1:]:
        child_mesh.parent = weapon_group
        child_mesh.matrix_parent_inverse = weapon_group.matrix_world.inverted()

    return static_objects, static_crop_reports


def export_glb(
    mount: bpy.types.Object,
    arms_mesh: bpy.types.Object,
    weapon_meshes: list[bpy.types.Object],
) -> tuple[Path, list[dict]]:
    static_objects, static_crop_reports = create_static_export_copy(mount, arms_mesh, weapon_meshes)
    for scene_object in bpy.context.scene.objects:
        scene_object.select_set(False)
    for scene_object in static_objects:
        scene_object.select_set(True)
    output_path = OUTPUT / "reused-ak-fps-arms-static.glb"
    bpy.context.view_layer.objects.active = static_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_normals=True,
        export_tangents=False,
        export_animations=False,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )
    return output_path, static_crop_reports


def write_reports(
    arms_mesh: bpy.types.Object,
    weapon_meshes: list[bpy.types.Object],
    glb_path: Path,
    pose_calibration: dict,
    stock_crop: dict,
) -> None:
    arm_triangles = triangle_count(arms_mesh)
    weapon_triangles = sum(triangle_count(mesh) for mesh in weapon_meshes)
    report = {
        "candidate": "offline reused AK + WRAD FPS arms pilot",
        "status": "offline candidate only; no production or visual acceptance claim",
        "blender": bpy.app.version_string,
        "coordinate_system": "Blender Z-up authoring: C @ game-mount @ C^-1, with C(game x,y,z)=(x,-z,y). Stein source alone rotates Z=180 degrees; WRAD remains forward +Y.",
        "mount_calibration": {"location": [0.43, -0.34, -0.59], "rotation": [0.08, 0.14, 0.0], "scale": 0.82},
        "mesh_triangles": {"weapon": weapon_triangles, "arms": arm_triangles, "combined": weapon_triangles + arm_triangles, "static_socket_markers": 0, "static_export_total": weapon_triangles + arm_triangles},
        "draw_materials": sorted({material.name for mesh in weapon_meshes + [arms_mesh] for material in mesh.data.materials if material}),
        "sockets": ["muzzle-socket", "ejection-socket"],
        "socket_export_contract": "Editable blend retains named Blender empties. Static GLB stores each socket's name, kind, and mount-local position on the primaryWeaponGeometry parent extras; no marker geometry or draw cost.",
        "export_categories": {"weapon_parent": "primaryWeaponGeometry: true", "arms_parent": "viewmodelArm: true"},
        "palm_contact_m": pose_calibration["palm_contact"],
        "static_export_stock_camera_clearance_crop": stock_crop,
        "export_coordinate_contract": "Static evaluated meshes are exported in mount-local Blender coordinates with the game mount removed. Blender glTF Y-up conversion produces unmounted game-root coordinates; runtime applies the frozen game mount exactly once. The editable blend retains native rigs and named sockets.",
        "editable_source_preserved_in_blend": "SOURCE_WRAD_FULL collection",
        "adaptations": [
            "conservative Blender Decimate modifier applied only to AK body copy at ratio 0.17",
            "existing WRAD wrist and first/two finger mesh faces assigned dark fingerless glove material by existing bone weights",
            "native WRAD IK controls posed for trigger and fore-end targets; no custom hand mesh created",
            "AK source color and normal textures retained; FBX material alpha forced to 1.0 for preview",
        ],
        "gltf": {"path": glb_path.name, "sha256": sha256(glb_path), "validity": "run node scripts/validate-gltf.mjs after export; static baked mesh qualification only, no animation claim"},
    }
    provenance = {
        "selected_sources": [
            {"asset": "Stein Games Classic Weapons Pack v1.1", "license": "CC0-1.0", "source": "https://stein-indie.itch.io/classic-weapons-pack", "fileId": "15953723", "files": ["SKM_AK47.fbx", "T_AK47_C.png", "T_AK47_N.png", "T_AK47_RMAO.png", "license.txt"]},
            {"asset": "wrad-arms", "license": "CC0-1.0", "source": "https://github.com/wwwriks/wrad-arms", "revision": "f3987244176c33d2c20d4f9e139980af12684d87", "files": ["arms.blend", "arm_albedo_pale.png", "arm_albedo_dark.png", "LICENSE"]},
        ],
        "source_manifests": {"stein": str(AK_SOURCE.relative_to(ROOT)), "wrad": str(WRAD_SOURCE.relative_to(ROOT))},
        "copied_file_hashes": {path.name: sha256(path) for path in sorted(SOURCE_COPY.iterdir()) if path.is_file()},
    }
    command_log = "\n".join([
        "Blender 4.5.9 LTS background --disable-autoexec",
        "scripts/adapt-reused-ak-viewmodel.py",
        "node scripts/validate-gltf.mjs outputs/cs16/reuse/ak-arms/reused-ak-fps-arms-static.glb outputs/cs16/reuse/ak-arms/gltf-validator.json",
    ]) + "\n"
    (OUTPUT / "geometry-stats.json").write_text(json.dumps(report, indent=2) + "\n")
    (OUTPUT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    (OUTPUT / "command.log").write_text(command_log)


def render_static_roundtrip() -> None:
    """Reimport the static GLB into a clean Blender scene and freeze a render."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUTPUT / "reused-ak-fps-arms-static.glb"))
    imported_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    imported_roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
    roundtrip_mount = bpy.data.objects.new("roundtrip_game_mount", None)
    roundtrip_mount.matrix_world = scene_mount_matrix()
    bpy.context.scene.collection.objects.link(roundtrip_mount)
    # Preserve glTF's own mesh-parent hierarchy. Parenting every mesh would
    # apply the mount to children a second time and invert the composed rifle.
    for imported_root in imported_roots:
        imported_root.parent = roundtrip_mount
    camera_data = bpy.data.cameras.new("roundtrip_camera_74deg")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.sensor_height = 24.0
    camera_data.lens = 24.0 / (2.0 * math.tan(math.radians(74.0) / 2.0))
    camera = bpy.data.objects.new("roundtrip_camera_74deg", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.rotation_euler = Vector((0.0, 1.0, 0.0)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    for name, location, energy in (("roundtrip_key", (1.5, 1.6, 0.9), 75.0), ("roundtrip_fill", (-1.4, 0.6, -0.4), 30.0)):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.size = 3.0
        light = bpy.data.objects.new(name, light_data)
        light.location = location
        bpy.context.scene.collection.objects.link(light)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUTPUT / "roundtrip-preview.png")
    if scene.world is None:
        scene.world = bpy.data.worlds.new("roundtrip_world")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.023, 0.031, 1.0)
    background.inputs["Strength"].default_value = 0.16
    bpy.ops.render.render(write_still=True)
    (OUTPUT / "roundtrip.json").write_text(json.dumps({
        "mesh_count": len(imported_meshes),
        "triangles": sum(triangle_count(mesh) for mesh in imported_meshes),
        "materials": sorted({material.name for mesh in imported_meshes for material in mesh.data.materials if material}),
        "vertical_angle_degrees": math.degrees(camera.data.angle_y),
    }, indent=2) + "\n")


def main() -> None:
    reset_output_directories()
    copy_selected_sources()
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_COPY / "arms.blend"))
    clear_non_wrad_scene_objects()
    arms_rig, arms_mesh = duplicate_wrad_source_for_editable_reference()
    mount = make_mount()
    set_arm_viewmodel_transform(arms_rig, arms_mesh, mount)
    configure_arm_materials(arms_mesh)
    weapon_rig, weapon_meshes = import_and_configure_ak(mount)
    preserve_full_ak_source(weapon_rig, weapon_meshes)
    pose_calibration = pose_wrad_ik(arms_rig, mount, arms_mesh, weapon_meshes)
    pose_calibration["native_wrist_weighted_mesh_to_weapon_surface_m"] = measure_palm_mesh_surface_contact(arms_mesh, weapon_meshes)
    add_weapon_sockets(weapon_rig)
    add_studio_lighting()
    pose_calibration["reference_projection"] = measure_reference_projection(mount)
    render_evidence(arms_mesh, weapon_meshes)
    camera = bpy.context.scene.camera
    pose_calibration["camera"] = {
        "sensor_fit": camera.data.sensor_fit,
        "sensor_height": camera.data.sensor_height,
        "vertical_angle_degrees": math.degrees(camera.data.angle_y),
    }
    (OUTPUT / "pose-calibration.json").write_text(json.dumps(pose_calibration, indent=2) + "\n")
    if "--render-only" in sys.argv:
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "reused-ak-fps-arms.blend"))
        return
    reduce_ak_after_visual_pass(weapon_meshes)
    arms_mesh["assetTag"] = "viewmodelArm"
    for weapon_mesh in weapon_meshes:
        weapon_mesh["assetTag"] = "primaryWeaponGeometry"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "reused-ak-fps-arms.blend"))
    glb_path, stock_crop = export_glb(mount, arms_mesh, weapon_meshes)
    (OUTPUT / "stock-camera-clearance-crop.json").write_text(json.dumps(stock_crop, indent=2) + "\n")
    write_reports(arms_mesh, weapon_meshes, glb_path, pose_calibration, stock_crop)


if __name__ == "__main__":
    if "--roundtrip-render" in sys.argv:
        render_static_roundtrip()
    else:
        main()
