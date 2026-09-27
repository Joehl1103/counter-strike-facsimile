"""Bounded offline classic-M4 adaptation pilot.

This script is intentionally a one-off, source-preserving authoring pass. It
opens the native Kuptchi rifle scene supplied on Blender's command line,
appends the CC0 Tabasco donor only in that in-memory derived scene, and writes
all evidence below ``outputs/cs16/reuse/classic-carbine-adaptation``.

Run the inventory stage first:

  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \\
    assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend \\
    --python scripts/adapt-classic-carbine.py -- --stage inspect

The derive stage is deliberately guarded by the inventory result. It must stop
instead of cutting, reweighting, posing, or numerically compensating a poor fit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import defaultdict, deque
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs/cs16/reuse/classic-carbine-adaptation"
DONOR_BLEND = ROOT / "assets/source/tabasco-smallarms/original/m4.blend"
NATIVE_BLEND = ROOT / "assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend"

NATIVE_ARMS = "Arms_Armature"
NATIVE_RIFLE = "Rifle_01_Armature"
NATIVE_ARMS_MESH = "FPS_Arms_Mesh"
NATIVE_RIFLE_MESH = "ChargeHandle_Mesh"
PAIR_ACTIONS = {
    "Idle": ("Arms_BasePose", "Rifle_Breathing", 1, 120),
    "Fire": ("Arms_Fire", "Rifle_Fire", 1, 12),
    "Reload": ("Arms_Reload", "Rifle_Reload", 1, 83),
    "Equip": ("Arms_Draw", "Rifle_Draw", 1, 20),
}
MUZZLE_MAIN_LOCAL = Vector((60.016502, 16.543610, -0.000022))
EJECTION_MAIN_LOCAL = Vector((13.264349, 13.212073, 3.008369))
DONOR_TO_BONE = {"Magazine": "Magazine", "ChargingHandle": "ChargeHandle"}


def after_double_dash() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("inspect", "audit-native", "derive"), required=True)
    return parser.parse_args(after_double_dash())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def rounded(vector: Vector) -> list[float]:
    return [round(float(value), 6) for value in vector]


def evaluated_triangles(mesh: bpy.types.Object) -> int:
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    evaluated_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    try:
        evaluated_mesh.calc_loop_triangles()
        return len(evaluated_mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def material_draws(mesh: bpy.types.Object) -> list[dict]:
    """Count only material slots referenced by polygons as offline draw proxies."""
    used = sorted({polygon.material_index for polygon in mesh.data.polygons})
    return [
        {
            "slot": index,
            "material": mesh.data.materials[index].name if index < len(mesh.data.materials) and mesh.data.materials[index] else None,
            "polygons": sum(polygon.material_index == index for polygon in mesh.data.polygons),
        }
        for index in used
    ]


def require_native_scene() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    required = (NATIVE_ARMS, NATIVE_RIFLE, NATIVE_ARMS_MESH, NATIVE_RIFLE_MESH)
    objects = tuple(bpy.data.objects.get(name) for name in required)
    if any(object_ is None for object_ in objects):
        raise RuntimeError(f"Native source is missing required objects: {required}")
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = objects
    if arms_rig.type != "ARMATURE" or rifle_rig.type != "ARMATURE":
        raise RuntimeError("Native arm or rifle rig is not an armature.")
    if arms_mesh.type != "MESH" or rifle_mesh.type != "MESH":
        raise RuntimeError("Native arm or rifle mesh is not a mesh.")
    return arms_rig, rifle_rig, arms_mesh, rifle_mesh  # type: ignore[return-value]


def loose_components(mesh: bpy.types.Mesh) -> list[dict]:
    """Return disconnected polygon islands without changing the donor mesh."""
    polygon_neighbors: dict[int, set[int]] = defaultdict(set)
    edge_polygons: dict[tuple[int, int], list[int]] = defaultdict(list)
    for polygon in mesh.polygons:
        vertices = polygon.vertices[:]
        for index, vertex in enumerate(vertices):
            edge = tuple(sorted((vertex, vertices[(index + 1) % len(vertices)])))
            edge_polygons[edge].append(polygon.index)
    for polygons in edge_polygons.values():
        for polygon in polygons:
            polygon_neighbors[polygon].update(other for other in polygons if other != polygon)

    remaining = set(range(len(mesh.polygons)))
    components = []
    while remaining:
        first = min(remaining)
        queue = deque((first,))
        polygons = set()
        remaining.remove(first)
        while queue:
            polygon_index = queue.popleft()
            polygons.add(polygon_index)
            for neighbor in polygon_neighbors[polygon_index]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    queue.append(neighbor)
        vertex_indices = sorted({vertex for polygon_index in polygons for vertex in mesh.polygons[polygon_index].vertices})
        points = [mesh.vertices[vertex_index].co for vertex_index in vertex_indices]
        lower = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
        upper = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
        components.append({
            "polygon_indices": sorted(polygons),
            "polygon_count": len(polygons),
            "triangle_count": sum(len(mesh.polygons[index].vertices) - 2 for index in polygons),
            "vertex_count": len(vertex_indices),
            "bounds_min": rounded(lower),
            "bounds_max": rounded(upper),
            "dimensions": rounded(upper - lower),
            "centroid": rounded(sum((point for point in points), Vector()) / len(points)),
        })
    components = sorted(components, key=lambda component: (-component["triangle_count"], component["polygon_indices"][0]))
    for component_index, component in enumerate(components):
        component["component_index"] = component_index
    return components


def classify_donor_components(donor: bpy.types.Object, components: list[dict]) -> None:
    """Attach source-authored vertex-group evidence to each loose island."""
    group_names = {group.index: group.name for group in donor.vertex_groups}
    for component in components:
        totals: dict[str, float] = defaultdict(float)
        vertex_indices = {vertex for polygon_index in component["polygon_indices"] for vertex in donor.data.polygons[polygon_index].vertices}
        for vertex_index in vertex_indices:
            for assignment in donor.data.vertices[vertex_index].groups:
                totals[group_names[assignment.group]] += assignment.weight
        ordered = sorted(totals.items(), key=lambda item: (-item[1], item[0]))
        component["vertex_group_weight_totals"] = {name: round(weight, 6) for name, weight in ordered}
        component["dominant_vertex_group"] = ordered[0][0] if ordered else None
        component["dominant_group_fraction"] = round(ordered[0][1] / sum(totals.values()), 6) if ordered else 0.0


def donor_inventory() -> dict:
    if not DONOR_BLEND.is_file():
        raise FileNotFoundError(f"Missing donor blend: {DONOR_BLEND}")
    with bpy.data.libraries.load(str(DONOR_BLEND), link=False) as (data_from, data_to):
        object_names = list(data_from.objects)
        mesh_names = list(data_from.meshes)
        data_to.objects = [name for name in object_names if name]
    appended_objects = [object_ for object_ in data_to.objects if object_ is not None]
    meshes = [object_ for object_ in appended_objects if object_.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected exactly one Tabasco donor mesh, found {[object_.name for object_ in meshes]}")
    donor = meshes[0]
    components = loose_components(donor.data)
    classify_donor_components(donor, components)
    result = {
        "source": str(DONOR_BLEND.relative_to(ROOT)),
        "source_sha256": sha256(DONOR_BLEND),
        "available_objects": object_names,
        "available_meshes": mesh_names,
        "appended_mesh": donor.name,
        "vertex_groups": [group.name for group in donor.vertex_groups],
        "triangles": sum(len(polygon.vertices) - 2 for polygon in donor.data.polygons),
        "loose_components": components,
    }
    # This stage runs in a disposable Blender process.  Do not try to clean up
    # linked legacy-library dependencies here: removing the mesh may already
    # free its owning legacy object, and the process exits without saving.
    return result


def native_inventory() -> dict:
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = require_native_scene()
    action_inventory = {}
    for semantic, (arms_action, rifle_action, start, end) in PAIR_ACTIONS.items():
        action_inventory[semantic] = {
            "arms_action": arms_action,
            "rifle_action": rifle_action,
            "arms_present": bpy.data.actions.get(arms_action) is not None,
            "rifle_present": bpy.data.actions.get(rifle_action) is not None,
            "frame_range": [start, end],
        }
    hand_constraints = []
    for rig in (arms_rig, rifle_rig):
        for pose_bone in rig.pose.bones:
            for constraint in pose_bone.constraints:
                if constraint.type == "CHILD_OF":
                    hand_constraints.append({
                        "rig": rig.name,
                        "bone": pose_bone.name,
                        "type": constraint.type,
                        "target": getattr(constraint.target, "name", None),
                        "subtarget": constraint.subtarget,
                    })
    rifle_bones = {}
    for bone in rifle_rig.pose.bones:
        rifle_bones[bone.name] = {
            "head_main_local": rounded(bone.head),
            "tail_main_local": rounded(bone.tail),
            "pose_matrix_main_local": [[round(float(value), 6) for value in row] for row in bone.matrix],
        }
    return {
        "source": str(NATIVE_BLEND.relative_to(ROOT)),
        "source_sha256": sha256(NATIVE_BLEND),
        "scene_unit_scale": bpy.context.scene.unit_settings.scale_length,
        "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
        "arms": {"object": arms_mesh.name, "raw_triangles": sum(len(polygon.vertices) - 2 for polygon in arms_mesh.data.polygons), "evaluated_triangles": evaluated_triangles(arms_mesh)},
        "rifle": {"object": rifle_mesh.name, "triangles": sum(len(polygon.vertices) - 2 for polygon in rifle_mesh.data.polygons)},
        "rigs": {
            arms_rig.name: {"bone_count": len(arms_rig.pose.bones), "bones": [bone.name for bone in arms_rig.pose.bones]},
            rifle_rig.name: {"bone_count": len(rifle_rig.pose.bones), "bones": [bone.name for bone in rifle_rig.pose.bones]},
        },
        "rifle_bones_at_frame_1": rifle_bones,
        "child_of_constraints": hand_constraints,
        "actions": action_inventory,
    }


def inspect_stage() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {
        "stage": "inspect",
        "authoring": "Blender background --disable-autoexec; read-only source inventory",
        "native": native_inventory(),
        "donor": donor_inventory(),
    }
    (OUTPUT / "inspect.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def current_glove_scores(arms_mesh: bpy.types.Object) -> list[float]:
    glove_groups = {group.index for group in arms_mesh.vertex_groups if group.name.startswith(("hand_", "index", "middle", "ring", "pinky", "thumb"))}
    scores = []
    for polygon in arms_mesh.data.polygons:
        total = sum(assignment.weight for vertex_index in polygon.vertices for assignment in arms_mesh.data.vertices[vertex_index].groups)
        glove = sum(assignment.weight for vertex_index in polygon.vertices for assignment in arms_mesh.data.vertices[vertex_index].groups if assignment.group in glove_groups)
        scores.append(glove / total if total else 0.0)
    return scores


def dominant_glove_face_counts(arms_mesh: bpy.types.Object) -> dict[str, int]:
    glove_groups = {group.index for group in arms_mesh.vertex_groups if group.name.startswith(("hand_", "index", "middle", "ring", "pinky", "thumb"))}
    counts = defaultdict(int)
    for polygon in arms_mesh.data.polygons:
        dominant = [max(arms_mesh.data.vertices[index].groups, key=lambda assignment: assignment.weight).group in glove_groups for index in polygon.vertices]
        counts[str(sum(dominant))] += 1
    return dict(counts)


def glove_deform_group_audit(arms_mesh: bpy.types.Object, arms_rig: bpy.types.Object) -> dict:
    expected_names = ("hand_", "index", "middle", "ring", "pinky", "thumb")
    weights_by_group = defaultdict(float)
    for vertex in arms_mesh.data.vertices:
        for assignment in vertex.groups:
            weights_by_group[assignment.group] += assignment.weight
    records = []
    eligible_indices = set()
    deform_indices = set()
    for group in arms_mesh.vertex_groups:
        bone = arms_rig.data.bones.get(group.name)
        record = {"group": group.name, "weight_sum": round(weights_by_group[group.index], 6), "matches_hand_or_finger_name": group.name.startswith(expected_names), "is_deform_bone": bool(bone and bone.use_deform)}
        if record["is_deform_bone"] and record["weight_sum"] > 0:
            deform_indices.add(group.index)
        record["eligible_glove_group"] = record["matches_hand_or_finger_name"] and record["is_deform_bone"] and record["weight_sum"] > 0
        if record["eligible_glove_group"]:
            eligible_indices.add(group.index)
        records.append(record)
    return {
        "groups": records,
        "deform_indices": sorted(deform_indices),
        "deform_group_names": [arms_mesh.vertex_groups[index].name for index in sorted(deform_indices)],
        "eligible_indices": sorted(eligible_indices),
        "eligible_group_names": [arms_mesh.vertex_groups[index].name for index in sorted(eligible_indices)],
    }


def glove_face_classification(arms_mesh: bpy.types.Object, deform_audit: dict) -> dict:
    """Select existing glove faces from the winning *deform* influence only.

    Legacy control groups coexist with the true deform groups on this source
    mesh.  They must not participate in the dominant-influence competition;
    doing so makes a control weight hide the real hand/finger or forearm
    influence and corrupts a material-only coverage conclusion.
    """
    deform_indices = set(deform_audit["deform_indices"])
    eligible_indices = set(deform_audit["eligible_indices"])
    selected = []
    prior_selected = []
    gained = []
    lost = []
    no_deform = []
    rejected_by_deform_competitor = defaultdict(int)
    for polygon in arms_mesh.data.polygons:
        old_winners = [max(arms_mesh.data.vertices[index].groups, key=lambda assignment: assignment.weight).group for index in polygon.vertices]
        old_selected = bool(old_winners) and all(index in eligible_indices for index in old_winners)
        if old_selected:
            prior_selected.append(polygon.index)
        winners = []
        for vertex_index in polygon.vertices:
            deform_assignments = [
                assignment for assignment in arms_mesh.data.vertices[vertex_index].groups
                if assignment.group in deform_indices
            ]
            if not deform_assignments:
                winners = []
                break
            winners.append(max(deform_assignments, key=lambda assignment: assignment.weight).group)
        if not winners:
            no_deform.append(polygon.index)
            continue
        selected_now = all(index in eligible_indices for index in winners)
        if selected_now:
            selected.append(polygon.index)
            if not old_selected:
                gained.append(polygon.index)
        else:
            if old_selected:
                lost.append(polygon.index)
            for index in winners:
                if index not in eligible_indices:
                    rejected_by_deform_competitor[arms_mesh.vertex_groups[index].name] += 1
    return {
        "selected_polygon_indices": selected,
        "selected_polygon_count": len(selected),
        "prior_all_assignment_dominant_count": len(prior_selected),
        "gained_by_excluding_non_deform_competitors": gained,
        "lost_after_deform_competition": lost,
        "no_deform_influence_polygon_indices": no_deform,
        "rejected_deform_competitor_face_counts": dict(sorted(rejected_by_deform_competitor.items())),
        "rule": "all existing face vertices must have an eligible hand/finger group as their highest positive actual-deform influence; other actual deform groups, including forearm, remain competitors",
    }


def sampled_native_charge_motion(rifle_rig: bpy.types.Object, rifle_mesh: bpy.types.Object) -> dict:
    charge_vertices = authored_group_vertices(rifle_mesh, "ChargeHandle")
    if not charge_vertices:
        raise RuntimeError("Untouched native rifle has no ChargeHandle mesh vertices.")
    measurements = {}
    for semantic in PAIR_ACTIONS:
        start, end = assign_actions(bpy.data.objects[NATIVE_ARMS], rifle_rig, semantic)
        points = []
        bones = []
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            points.append(evaluated_average(rifle_mesh, charge_vertices))
            bones.append((rifle_rig.matrix_world @ rifle_rig.pose.bones["ChargeHandle"].matrix).translation.copy())
        def motion(values: list[Vector]) -> float:
            return max((first - second).length for first in values for second in values)
        measurements[semantic] = {"frames": [start, end], "mesh_centroid_motion_cm": round(motion(points), 8), "bone_origin_motion_cm": round(motion(bones), 8)}
    return measurements


def rig_world_bone_motion(rifle_rig: bpy.types.Object, start_rig_world: Matrix, start_pose: Matrix, pose: Matrix, start_world: Vector) -> Vector:
    """Apply the evaluated armature bone delta in world space.

    ``pose_bone.matrix`` lives in the armature object's coordinate system.  A
    candidate or native mesh point lives in world space, so the rig world
    transform must surround the pose delta.  Leaving out those terms happens
    to look plausible for a mostly-static Main bone, but corrupts animated
    child bones such as Magazine during Reload.
    """
    return rifle_rig.matrix_world @ pose @ start_pose.inverted() @ start_rig_world.inverted() @ start_world


def native_component_bone_motion_audit(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object, rifle_mesh: bpy.types.Object) -> dict:
    """Read-only control: establish how the untouched source uses its bones."""
    component_bones = {"Main": "Main", "Magazine": "Magazine", "ChargeHandle": "ChargeHandle"}
    group_indices = {name: rifle_mesh.vertex_groups[name].index for name in component_bones}
    components = {}
    for group_name, bone_name in component_bones.items():
        vertices = authored_group_vertices(rifle_mesh, group_name)
        if not vertices:
            raise RuntimeError(f"Untouched native rifle has no {group_name} vertices.")
        components[group_name] = {
            "bone": bone_name,
            "vertex_count": len(vertices),
            "all_vertices_exclusive_full_weight": all(
                len(rifle_mesh.data.vertices[index].groups) == 1
                and rifle_mesh.data.vertices[index].groups[0].group == group_indices[group_name]
                and abs(rifle_mesh.data.vertices[index].groups[0].weight - 1.0) <= 1e-6
                for index in vertices
            ),
            "actions": {},
        }
        for semantic in PAIR_ACTIONS:
            start, end = assign_actions(arms_rig, rifle_rig, semantic)
            bpy.context.scene.frame_set(start)
            bpy.context.view_layer.update()
            start_rig_world = rifle_rig.matrix_world.copy()
            start_pose = rifle_rig.pose.bones[bone_name].matrix.copy()
            start_actual = evaluated_average(rifle_mesh, vertices)
            errors = []
            for frame in range(start, end + 1):
                bpy.context.scene.frame_set(frame)
                bpy.context.view_layer.update()
                expected = rig_world_bone_motion(rifle_rig, start_rig_world, start_pose, rifle_rig.pose.bones[bone_name].matrix, start_actual)
                errors.append((evaluated_average(rifle_mesh, vertices) - expected).length)
            components[group_name]["actions"][semantic] = {
                "frames": [start, end],
                "max_error_cm": round(max(errors), 8),
            }
    return components


def native_receiver_landmark(rifle_rig: bpy.types.Object, rifle_mesh: bpy.types.Object) -> dict:
    main_rest = rifle_rig.data.bones["Main"].matrix_local
    main_group_vertices = authored_group_vertices(rifle_mesh, "Main")
    # The source rifle mesh is parented to the non-identity rifle rig.  Raw
    # mesh coordinates must first be neutralized into that rig's object frame;
    # otherwise a world-space translation/rotation contaminates this landmark.
    all_points = [main_rest.inverted() @ rifle_rig.matrix_world.inverted() @ rifle_mesh.matrix_world @ rifle_mesh.data.vertices[index].co for index in main_group_vertices]
    ejection = EJECTION_MAIN_LOCAL
    magwell = main_rest.inverted() @ rifle_rig.data.bones["Magazine"].matrix_local.translation
    # The receiver is the static-Main geometry closest to the midpoint between
    # the physical ejection port and magwell.  This intentionally avoids using
    # the ejection socket itself as a centroid proxy.
    seed = (ejection + magwell) / 2
    closest = sorted(all_points, key=lambda point: (point - seed).length)[: max(16, len(all_points) // 12)]
    centroid = sum(closest, Vector()) / len(closest)
    return {"main_local_centroid": rounded(centroid), "sample_count": len(closest), "seed_midpoint": rounded(seed), "source": "closest native Main-group geometry around ejection-port/magwell midpoint"}


def audit_native_stage() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    arms_rig, rifle_rig, arms_mesh, rifle_mesh = require_native_scene()
    scores = current_glove_scores(arms_mesh)
    report = {
        "stage": "audit-native",
        "arms_geometry": {"raw_triangles": sum(len(polygon.vertices) - 2 for polygon in arms_mesh.data.polygons), "evaluated_triangles": evaluated_triangles(arms_mesh), "modifiers": [{"name": modifier.name, "type": modifier.type, "show_viewport": modifier.show_viewport} for modifier in arms_mesh.modifiers]},
        "native_charge_motion": sampled_native_charge_motion(rifle_rig, rifle_mesh),
        "native_component_bone_motion_audit": native_component_bone_motion_audit(arms_rig, rifle_rig, rifle_mesh),
        "glove_face_score": {"min": min(scores), "max": max(scores), "at_or_above_0_75": sum(score >= 0.75 for score in scores), "at_or_above_0_50": sum(score >= 0.50 for score in scores), "at_or_above_0_25": sum(score >= 0.25 for score in scores)},
        "dominant_glove_vertices_per_face": dominant_glove_face_counts(arms_mesh),
        "glove_deform_group_audit": glove_deform_group_audit(arms_mesh, arms_rig),
        "native_receiver_landmark": native_receiver_landmark(rifle_rig, rifle_mesh),
    }
    (OUTPUT / "native-audit.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def authored_group_vertices(mesh: bpy.types.Object, group_name: str) -> set[int]:
    group = mesh.vertex_groups.get(group_name)
    if group is None:
        return set()
    return {vertex.index for vertex in mesh.data.vertices if any(assignment.group == group.index and assignment.weight > 0 for assignment in vertex.groups)}


def average_points(mesh: bpy.types.Object, vertex_indices: set[int]) -> Vector:
    if not vertex_indices:
        raise RuntimeError("A required donor landmark has no source vertices.")
    return sum((mesh.data.vertices[index].co for index in vertex_indices), Vector()) / len(vertex_indices)


def donor_landmarks(donor: bpy.types.Object) -> tuple[dict[str, Vector], dict[str, set[int]]]:
    barrel_vertices = authored_group_vertices(donor, "Barrel")
    barrel_minimum = min(donor.data.vertices[index].co.x for index in barrel_vertices)
    muzzle_vertices = {index for index in barrel_vertices if donor.data.vertices[index].co.x <= barrel_minimum + 0.002}
    magazine_vertices = authored_group_vertices(donor, "Magazine")
    magazine_maximum = max(donor.data.vertices[index].co.z for index in magazine_vertices)
    magwell_vertices = {index for index in magazine_vertices if donor.data.vertices[index].co.z >= magazine_maximum - 0.02}
    receiver_vertices = authored_group_vertices(donor, "Receiver")
    return (
        {
            "muzzle": average_points(donor, muzzle_vertices),
            "magwell": average_points(donor, magwell_vertices),
            "receiver": average_points(donor, receiver_vertices),
        },
        {"muzzle": muzzle_vertices, "magwell": magwell_vertices, "receiver": receiver_vertices},
    )


def donor_to_main_matrix(sources: dict[str, Vector], targets: dict[str, Vector]) -> tuple[Matrix, dict]:
    """Fit one uniform-scale rigid transform using the donor's reviewed axes."""
    def oriented(point: Vector) -> Vector:
        # Tabasco barrel points -X; Kuptchi Main points +X.  Both authoring
        # spaces are right-handed, so Y maps to Main-right and Z to Main-up.
        return Vector((-point.x, point.z, point.y))

    ordered = ("muzzle", "magwell", "receiver")
    source_points = [oriented(sources[name]) for name in ordered]
    target_points = [targets[name] for name in ordered]
    source_center = sum(source_points, Vector()) / len(source_points)
    target_center = sum(target_points, Vector()) / len(target_points)
    numerator = sum((source - source_center).dot(target - target_center) for source, target in zip(source_points, target_points))
    denominator = sum((source - source_center).length_squared for source in source_points)
    if denominator == 0:
        raise RuntimeError("Donor landmarks cannot define a uniform rigid scale.")
    scale = numerator / denominator
    if scale <= 0:
        raise RuntimeError(f"Rigid landmark fit produced invalid scale {scale}.")
    translation = target_center - scale * source_center
    transform = Matrix(((-scale, 0.0, 0.0, translation.x), (0.0, 0.0, scale, translation.y), (0.0, scale, 0.0, translation.z), (0.0, 0.0, 0.0, 1.0)))
    residuals = {name: (transform @ sources[name] - targets[name]).length for name in ordered}
    return transform, {"scale": scale, "translation_main_local": rounded(translation), "residual_centimeters": {name: round(value, 6) for name, value in residuals.items()}}


def append_donor() -> bpy.types.Object:
    with bpy.data.libraries.load(str(DONOR_BLEND), link=False) as (data_from, data_to):
        data_to.objects = ["Cube"]
    donor = next((object_ for object_ in data_to.objects if object_ and object_.type == "MESH"), None)
    if donor is None:
        raise RuntimeError("Could not append Tabasco donor mesh Cube.")
    bpy.context.scene.collection.objects.link(donor)
    donor.name = "Tabasco_Classic_M4_Derived"
    donor.data.name = "Tabasco_Classic_M4_Derived_Mesh"
    return donor


def assign_native_rifle_groups(donor: bpy.types.Object, rifle_rig: bpy.types.Object) -> dict:
    original_groups = {group.name: authored_group_vertices(donor, group.name) for group in donor.vertex_groups}
    if not original_groups.get("Magazine") or not original_groups.get("ChargingHandle"):
        raise RuntimeError("Donor lacks the unambiguous Magazine or ChargingHandle source grouping.")
    for group in list(donor.vertex_groups):
        donor.vertex_groups.remove(group)
    target_groups = {name: donor.vertex_groups.new(name=name) for name in ("Main", "Magazine", "ChargeHandle")}
    for original_name, vertices in original_groups.items():
        target_name = DONOR_TO_BONE.get(original_name, "Main")
        target_groups[target_name].add(sorted(vertices), 1.0, "REPLACE")
    modifier = donor.modifiers.new("Native_Rifle_Armature", "ARMATURE")
    modifier.object = rifle_rig
    return {
        "source_group_to_native_bone": {name: DONOR_TO_BONE.get(name, "Main") for name in sorted(original_groups)},
        "native_group_vertex_counts": {name: len(authored_group_vertices(donor, name)) for name in target_groups},
    }


def apply_glove_material(arms_mesh: bpy.types.Object, arms_rig: bpy.types.Object) -> dict:
    before = {
        "vertices": len(arms_mesh.data.vertices), "polygons": len(arms_mesh.data.polygons),
        "triangles": sum(len(polygon.vertices) - 2 for polygon in arms_mesh.data.polygons),
        "uv_layers": len(arms_mesh.data.uv_layers),
        "coordinate_sha256": hashlib.sha256(b"".join(vertex.co.to_tuple().__repr__().encode() for vertex in arms_mesh.data.vertices)).hexdigest(),
    }
    glove = bpy.data.materials.new("Derived_Black_Glove_Material")
    glove.use_nodes = True
    principled = glove.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.012, 0.016, 0.021, 1.0)
    principled.inputs["Roughness"].default_value = 0.52
    arms_mesh.data.materials.append(glove)
    glove_index = len(arms_mesh.data.materials) - 1
    deform_audit = glove_deform_group_audit(arms_mesh, arms_rig)
    classification = glove_face_classification(arms_mesh, deform_audit)
    gloved = classification["selected_polygon_indices"]
    for polygon_index in gloved:
        arms_mesh.data.polygons[polygon_index].material_index = glove_index
    after = {**before, "coordinate_sha256": hashlib.sha256(b"".join(vertex.co.to_tuple().__repr__().encode() for vertex in arms_mesh.data.vertices)).hexdigest()}
    return {"before": before, "after": after, "glove_groups": deform_audit["eligible_group_names"], "deform_group_audit": deform_audit["groups"], "classification_audit": classification, "classification": classification["rule"], "gloved_polygon_count": len(gloved), "glove_material_index": glove_index}


def assign_actions(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object, semantic: str) -> tuple[int, int]:
    arms_action, rifle_action, start, end = PAIR_ACTIONS[semantic]
    for rig, action_name in ((arms_rig, arms_action), (rifle_rig, rifle_action)):
        rig.animation_data_create().action = bpy.data.actions[action_name]
    return start, end


def evaluated_average(mesh: bpy.types.Object, vertex_indices: set[int]) -> Vector:
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    evaluated_mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
    try:
        return sum((evaluated.matrix_world @ evaluated_mesh.vertices[index].co for index in vertex_indices), Vector()) / len(vertex_indices)
    finally:
        evaluated.to_mesh_clear()


def evaluated_main_local(rifle_rig: bpy.types.Object, donor: bpy.types.Object, vertices: set[int]) -> Vector:
    main_world = rifle_rig.matrix_world @ rifle_rig.pose.bones["Main"].matrix
    return main_world.inverted() @ evaluated_average(donor, vertices)


def assert_idle_landmarks(rifle_rig: bpy.types.Object, donor: bpy.types.Object, original: dict[str, Vector], indices: dict[str, set[int]], transform: Matrix) -> dict:
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    errors = {}
    for name, vertices in indices.items():
        expected = transform @ original[name]
        actual = evaluated_main_local(rifle_rig, donor, vertices)
        error = (actual - expected).length
        errors[name] = {"expected_main_local_cm": rounded(expected), "actual_main_local_cm": rounded(actual), "error_cm": round(error, 8)}
    return errors


def assert_animated_landmarks(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object, donor: bpy.types.Object, original: dict[str, Vector], indices: dict[str, set[int]], transform: Matrix) -> dict:
    """Prove the unparented donor follows the evaluated native bone transforms."""
    bone_for_landmark = {"muzzle": "Main", "magwell": "Magazine", "receiver": "Main", "charge_handle": "ChargeHandle"}
    report = {}
    for semantic in PAIR_ACTIONS:
        start, end = assign_actions(arms_rig, rifle_rig, semantic)
        for name, vertices in indices.items():
            bone_name = bone_for_landmark[name]
            bpy.context.scene.frame_set(start)
            bpy.context.view_layer.update()
            start_rig_world = rifle_rig.matrix_world.copy()
            start_pose = rifle_rig.pose.bones[bone_name].matrix.copy()
            start_actual = evaluated_average(donor, vertices)
            errors = []
            for frame in range(start, end + 1):
                bpy.context.scene.frame_set(frame)
                bpy.context.view_layer.update()
                pose = rifle_rig.pose.bones[bone_name].matrix
                actual = evaluated_average(donor, vertices)
                expected = rig_world_bone_motion(rifle_rig, start_rig_world, start_pose, pose, start_actual)
                errors.append((actual - expected).length)
            maximum = max(errors)
            report[f"{semantic}:{name}"] = {"bone": bone_name, "frames": [start, end], "reference_world_cm": rounded(start_actual), "expected_transform": "rig.matrix_world(frame) @ pose_bone.matrix(frame) @ pose_bone.matrix(start)^-1 @ rig.matrix_world(start)^-1 @ evaluated_start_world", "max_error_cm": round(maximum, 8)}
            if maximum > 1e-4:
                (OUTPUT / "derived-animation-assertion-debug.json").write_text(json.dumps(report, indent=2) + "\n")
                raise RuntimeError(f"Derived {semantic} {name} bone-motion assertion has {maximum:.6f} cm error; stop before preview.")
    return report


def sample_actions(arms_rig: bpy.types.Object, rifle_rig: bpy.types.Object, donor: bpy.types.Object, landmark_vertices: dict[str, set[int]]) -> tuple[dict, dict]:
    charge_vertices = authored_group_vertices(donor, "ChargeHandle")
    samples = {}
    for semantic in PAIR_ACTIONS:
        start, end = assign_actions(arms_rig, rifle_rig, semantic)
        full_charge_points = []
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            full_charge_points.append(evaluated_average(donor, charge_vertices))
        action_motion = max((first - second).length for first in full_charge_points for second in full_charge_points)
        samples[f"{semantic}:full_action_charge_motion_cm"] = round(action_motion, 6)
        for label, frame in (("start", start), ("mid", (start + end) // 2), ("end", end)):
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            samples[f"{semantic}:{label}"] = {
                "frame": frame,
                "muzzle_world_cm": rounded(evaluated_average(donor, landmark_vertices["muzzle"])),
                "magwell_world_cm": rounded(evaluated_average(donor, landmark_vertices["magwell"])),
                "receiver_world_cm": rounded(evaluated_average(donor, landmark_vertices["receiver"])),
                "charge_handle_world_cm": rounded(evaluated_average(donor, charge_vertices)),
            }
    return samples, {semantic: samples[f"{semantic}:full_action_charge_motion_cm"] for semantic in PAIR_ACTIONS}


def derive_stage() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    arms_rig, rifle_rig, arms_mesh, source_rifle = require_native_scene()
    # The source opens on Rifle_AimStart.  The frozen fit and the independent
    # audit are defined at the Idle pair's frame 1, so establish it before any
    # pose-dependent placement assertion.
    assign_actions(arms_rig, rifle_rig, "Idle")
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    donor = append_donor()
    # Match the native rifle mesh's evaluated hierarchy.  Keep the appended
    # object visually/world-identical at the reviewed Idle start while letting
    # the source rifle rig's animated object transform carry it thereafter.
    # This is a hierarchy relation only: no rig is copied and no mesh is
    # detached, reweighted, or pose-baked.
    donor.parent = rifle_rig
    donor.matrix_parent_inverse = rifle_rig.matrix_world.inverted()
    donor_components = loose_components(donor.data)
    classify_donor_components(donor, donor_components)
    preserved_constraints = native_inventory()["child_of_constraints"]
    landmarks, landmark_vertices = donor_landmarks(donor)
    charge_handle_vertices = authored_group_vertices(donor, "ChargingHandle")
    action_landmarks = {**landmarks, "charge_handle": average_points(donor, charge_handle_vertices)}
    action_landmark_vertices = {**landmark_vertices, "charge_handle": charge_handle_vertices}
    main_rest = rifle_rig.data.bones["Main"].matrix_local.copy()
    magazine_rest = rifle_rig.data.bones["Magazine"].matrix_local.copy()
    receiver_landmark = native_receiver_landmark(rifle_rig, source_rifle)
    targets = {
        "muzzle": MUZZLE_MAIN_LOCAL,
        "magwell": main_rest.inverted() @ magazine_rest.translation,
        "receiver": Vector(receiver_landmark["main_local_centroid"]),
    }
    transform, fit = donor_to_main_matrix(landmarks, targets)
    for vertex in donor.data.vertices:
        # The appended donor has identity world transform and no parent.  Put
        # its raw points in the Armature modifier's expected rig-world frame.
        vertex.co = rifle_rig.matrix_world @ main_rest @ transform @ vertex.co
    mapping = assign_native_rifle_groups(donor, rifle_rig)
    glove = apply_glove_material(arms_mesh, arms_rig)
    idle_landmark_assertion = assert_idle_landmarks(rifle_rig, donor, landmarks, landmark_vertices, transform)
    maximum_idle_error = max(item["error_cm"] for item in idle_landmark_assertion.values())
    if maximum_idle_error > 1e-4:
        failure = {"stage": "derive-rig-world-coordinate-assertion", "fit": fit, "evaluated_idle_landmark_assertion": idle_landmark_assertion, "status": "blocked_coordinate_assertion_before_preview"}
        (OUTPUT / "derive-rig-world-coordinate-failure.json").write_text(json.dumps(failure, indent=2) + "\n")
        raise RuntimeError(f"Derived landmark assertion has {maximum_idle_error:.6f} cm error; stop before preview.")
    animated_landmark_assertion = assert_animated_landmarks(arms_rig, rifle_rig, donor, action_landmarks, action_landmark_vertices, transform)
    bpy.data.objects.remove(source_rifle, do_unlink=True)
    derived_blend = OUTPUT / "classic-carbine-derived-rig-world-repaired.blend"
    samples, charge_motion = sample_actions(arms_rig, rifle_rig, donor, landmark_vertices)
    bpy.ops.wm.save_as_mainfile(filepath=str(derived_blend), check_existing=False)
    expected_constraints = 2
    checks = {
        "donor_component_mapping_unambiguous": all(component["dominant_group_fraction"] == 1.0 for component in donor_components if component["dominant_vertex_group"]),
        "native_rifle_bone_count": len(rifle_rig.pose.bones) == 9,
        "both_hand_child_of_constraints_retained": len(preserved_constraints) == expected_constraints,
        "arms_geometry_unchanged": glove["before"] == glove["after"],
        "glove_has_existing_hand_faces": glove["gloved_polygon_count"] > 0,
        "gun_triangle_budget": sum(len(polygon.vertices) - 2 for polygon in donor.data.polygons) <= 3500,
        "arms_triangle_budget": evaluated_triangles(arms_mesh) <= 4000,
        "combined_draw_budget": len(material_draws(arms_mesh)) + len(material_draws(donor)) <= 6,
        "charging_handle_moves": max(charge_motion.values()) > 0.01,
    }
    report = {
        "stage": "derive",
        "derived_blend": str(derived_blend.relative_to(ROOT)),
        "provenance": {"tabasco_m4": {"path": str(DONOR_BLEND.relative_to(ROOT)), "sha256": sha256(DONOR_BLEND), "license": "CC0-1.0"}, "kuptchi_native": {"path": str(NATIVE_BLEND.relative_to(ROOT)), "sha256": sha256(NATIVE_BLEND)}},
        "fit": {"landmarks_donor": {name: rounded(point) for name, point in landmarks.items()}, "landmarks_main_local": {name: rounded(point) for name, point in targets.items()}, "receiver_target": receiver_landmark, **fit},
        "mapping": mapping,
        "glove": glove,
        "resource_cost": {
            "gun_triangles": sum(len(polygon.vertices) - 2 for polygon in donor.data.polygons),
            "arms_evaluated_triangles": evaluated_triangles(arms_mesh),
            "combined_triangles": sum(len(polygon.vertices) - 2 for polygon in donor.data.polygons) + evaluated_triangles(arms_mesh),
            "gun_material_draws": material_draws(donor),
            "arms_material_draws": material_draws(arms_mesh),
            "combined_draws": len(material_draws(arms_mesh)) + len(material_draws(donor)),
        },
        "samples": samples,
        "charge_handle_motion_centimeters": charge_motion,
        "checks": checks,
        "status": "pending_source_preview" if all(checks.values()) else "blocked_internal_gate",
    }
    report["evaluated_idle_landmark_assertion"] = idle_landmark_assertion
    report["evaluated_animated_landmark_assertion"] = animated_landmark_assertion
    (OUTPUT / "derive-rig-world-repaired.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def main() -> None:
    args = arguments()
    if args.stage == "inspect":
        inspect_stage()
        return
    if args.stage == "audit-native":
        audit_native_stage()
        return
    derive_stage()


if __name__ == "__main__":
    main()
