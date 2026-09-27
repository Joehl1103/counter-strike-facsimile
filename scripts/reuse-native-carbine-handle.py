"""Replace the fitted Tabasco donor's handle with the native Kuptchi surface.

This is a deliberately narrow, offline Blender pilot.  It opens the frozen
classic-carbine derivative passed to Blender, removes only the donor's complete
``ChargeHandle`` component, and copies the native source's complete rigidly
``ChargeHandle``-weighted component without changing vertices, UVs, materials,
weights, arm poses, actions, or either source file.

Commands:

  Blender --background BASELINE.blend --disable-autoexec --python \
    scripts/reuse-native-carbine-handle.py -- --stage derive

  Blender --background CANDIDATE.blend --disable-autoexec --python \
    scripts/reuse-native-carbine-handle.py -- --stage audit
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import defaultdict, deque
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "outputs/cs16/reuse/classic-carbine-adaptation/classic-carbine-derived-rig-world-repaired.blend"
CANDIDATE = ROOT / "outputs/cs16/reuse/classic-m4-native-handle/clean-temporary-datablocks/classic-m4-native-handle.blend"
OUTPUT = CANDIDATE.parent
NATIVE = ROOT / "assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend"

ARMS = "FPS_Arms_Mesh"
ARMS_RIG = "Arms_Armature"
DONOR = "Tabasco_Classic_M4_Derived"
RIFLE_RIG = "Rifle_01_Armature"
SOURCE_HANDLE = "ChargeHandle_Mesh"
COPIED_HANDLE = "Native_ChargeHandle_Component"
CAMERA = "Camera"
ACTION_MAP = {
    "Idle": {ARMS_RIG: "Arms_BasePose", RIFLE_RIG: "Rifle_Breathing"},
    "Fire": {ARMS_RIG: "Arms_Fire", RIFLE_RIG: "Rifle_Fire"},
    "Reload": {ARMS_RIG: "Arms_Reload", RIFLE_RIG: "Rifle_Reload"},
    "Equip": {ARMS_RIG: "Arms_Draw", RIFLE_RIG: "Rifle_Draw"},
}
ACTION_RANGES = {"Idle": (1, 120), "Fire": (1, 12), "Reload": (1, 83), "Equip": (1, 20)}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("derive", "audit"), required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def rounded(value: Vector, digits: int = 9) -> list[float]:
    return [round(float(component), digits) for component in value]


def matrix(value) -> list[list[float]]:
    return [[round(float(component), 9) for component in row] for row in value]


def require_scene() -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    names = (ARMS, ARMS_RIG, DONOR, RIFLE_RIG, CAMERA)
    objects = tuple(bpy.data.objects.get(name) for name in names)
    if any(object_ is None for object_ in objects):
        raise RuntimeError(f"Required frozen-baseline objects are missing: {names}")
    arms, arms_rig, donor, rifle_rig, camera = objects
    if arms.type != "MESH" or donor.type != "MESH":
        raise RuntimeError("Frozen baseline has no required mesh objects.")
    if arms_rig.type != "ARMATURE" or rifle_rig.type != "ARMATURE":
        raise RuntimeError("Frozen baseline has no required armature objects.")
    return arms, arms_rig, donor, rifle_rig, camera  # type: ignore[return-value]


def set_action(semantic: str) -> None:
    for rig_name, action_name in ACTION_MAP[semantic].items():
        rig = bpy.data.objects[rig_name]
        rig.animation_data_create()
        rig.animation_data.action = bpy.data.actions[action_name]


def all_rigid_group_faces(object_: bpy.types.Object, group_name: str) -> list[int]:
    group = object_.vertex_groups.get(group_name)
    if group is None:
        raise RuntimeError(f"{object_.name} lacks required {group_name} vertex group.")
    selected = []
    for polygon in object_.data.polygons:
        rigid = True
        for vertex_index in polygon.vertices:
            assignments = object_.data.vertices[vertex_index].groups
            positive = [assignment for assignment in assignments if assignment.weight > 0]
            if len(positive) != 1 or positive[0].group != group.index or abs(positive[0].weight - 1.0) > 1e-9:
                rigid = False
                break
        if rigid:
            selected.append(polygon.index)
    return selected


def connected_components(mesh: bpy.types.Mesh, polygon_indices: list[int]) -> list[list[int]]:
    by_vertex: dict[int, set[int]] = defaultdict(set)
    for polygon_index in polygon_indices:
        for vertex_index in mesh.polygons[polygon_index].vertices:
            by_vertex[vertex_index].add(polygon_index)
    unvisited = set(polygon_indices)
    components = []
    while unvisited:
        seed = min(unvisited)
        unvisited.remove(seed)
        component = {seed}
        queue = deque((seed,))
        while queue:
            current = queue.popleft()
            for vertex_index in mesh.polygons[current].vertices:
                for neighbor in by_vertex[vertex_index]:
                    if neighbor in unvisited:
                        unvisited.remove(neighbor)
                        component.add(neighbor)
                        queue.append(neighbor)
        components.append(sorted(component))
    return sorted(components, key=lambda component: (-len(component), component[0]))


def node_value(value: object) -> object:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    try:
        return [round(float(component), 12) for component in value]  # Blender vectors/colors
    except (TypeError, ValueError):
        return str(value)


def material_fingerprint(material: bpy.types.Material | None) -> str | None:
    """Compare render-relevant material data, not Blender's duplicate-name suffix."""
    if material is None:
        return None
    nodes = []
    links = []
    if material.use_nodes and material.node_tree:
        for node in material.node_tree.nodes:
            node_record = {
                "name": node.name,
                "type": node.type,
                "label": node.label,
                "inputs": [(socket.name, node_value(socket.default_value)) for socket in node.inputs if hasattr(socket, "default_value")],
            }
            if hasattr(node, "image") and node.image:
                node_record["image"] = {
                    # Blender rewrites a relative image path when a copied
                    # material is saved from another blend directory.  The
                    # original source image identity is invariant under that
                    # relocation, while the explicit texture map supplies its
                    # known source file during preview.
                    "name": node.image.name.removesuffix(".001"),
                }
            nodes.append(node_record)
        links = sorted(
            (link.from_node.name, link.from_socket.name, link.to_node.name, link.to_socket.name)
            for link in material.node_tree.links
        )
    return digest({
        "use_nodes": material.use_nodes,
        "diffuse_color": node_value(material.diffuse_color),
        "roughness": round(float(material.roughness), 12),
        "metallic": round(float(material.metallic), 12),
        "nodes": sorted(nodes, key=lambda node: (node["name"], node["type"])),
        "links": links,
    })


def surface_signature(object_: bpy.types.Object, polygon_indices: list[int]) -> dict:
    """Order-independent geometric/UV/material signature for copied face sets."""
    mesh = object_.data
    uv_layer = mesh.uv_layers.active
    faces = []
    for polygon_index in polygon_indices:
        polygon = mesh.polygons[polygon_index]
        corners = []
        for loop_index, vertex_index in zip(polygon.loop_indices, polygon.vertices):
            corners.append({
                "co": rounded(mesh.vertices[vertex_index].co, 12),
                "uv": rounded(uv_layer.data[loop_index].uv.to_3d()[:2], 12) if uv_layer else None,
            })
        rotations = [corners[offset:] + corners[:offset] for offset in range(len(corners))]
        faces.append({
            "corners": min(rotations, key=lambda ring: json.dumps(ring, sort_keys=True)),
            "material": material_fingerprint(mesh.materials[polygon.material_index]),
        })
    referenced_vertices = sorted({vertex for polygon_index in polygon_indices for vertex in mesh.polygons[polygon_index].vertices})
    weights = []
    for vertex_index in referenced_vertices:
        weights.append({
            "co": rounded(mesh.vertices[vertex_index].co, 12),
            "weights": sorted([
                (object_.vertex_groups[assignment.group].name, round(float(assignment.weight), 12))
                for assignment in mesh.vertices[vertex_index].groups if assignment.weight > 0
            ]),
        })
    return {
        "vertices": len(referenced_vertices),
        "polygons": len(polygon_indices),
        "triangles": sum(len(mesh.polygons[index].vertices) - 2 for index in polygon_indices),
        "uv_layer": uv_layer.name if uv_layer else None,
        "faces_sha256": digest(sorted(faces, key=lambda face: json.dumps(face, sort_keys=True))),
        "weights_sha256": digest(sorted(weights, key=lambda item: json.dumps(item, sort_keys=True))),
        "material_fingerprints": sorted({face["material"] for face in faces}),
    }


def object_static_signature(object_: bpy.types.Object) -> dict:
    mesh = object_.data
    uv_layer = mesh.uv_layers.active
    if uv_layer is None:
        raise RuntimeError(f"{object_.name} has no active UV layer.")
    positions = [rounded(vertex.co, 12) for vertex in mesh.vertices]
    polygons = [list(polygon.vertices) for polygon in mesh.polygons]
    uvs = [rounded(loop.uv.to_3d()[:2], 12) for loop in uv_layer.data]
    weights = {
        group.name: [
            (vertex.index, round(float(assignment.weight), 12))
            for vertex in mesh.vertices
            for assignment in vertex.groups if assignment.group == group.index and assignment.weight > 0
        ]
        for group in object_.vertex_groups
    }
    return {
        "vertices": len(mesh.vertices), "polygons": len(mesh.polygons),
        "positions_sha256": digest(positions), "polygons_sha256": digest(polygons),
        "uv_sha256": digest(uvs), "weights_sha256": digest(weights),
    }


def donor_body_signature(donor: bpy.types.Object, removed_faces: list[int]) -> dict:
    retained = [polygon.index for polygon in donor.data.polygons if polygon.index not in set(removed_faces)]
    return surface_signature(donor, retained)


def evaluated_world_vertices(object_: bpy.types.Object) -> list[tuple[tuple[float, float, float], Vector]]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = object_.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        values = [
            (tuple(round(float(component), 12) for component in vertex.co), evaluated.matrix_world @ vertex.co)
            for vertex in mesh.vertices
        ]
    finally:
        evaluated.to_mesh_clear()
    return values


def evaluated_surface_positions(object_: bpy.types.Object, polygon_indices: list[int]) -> dict[tuple[float, float, float], list[Vector]]:
    positions: dict[tuple[float, float, float], list[Vector]] = defaultdict(list)
    selected_vertices = sorted({vertex for polygon_index in polygon_indices for vertex in object_.data.polygons[polygon_index].vertices})
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = object_.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        for vertex_index in selected_vertices:
            local = tuple(round(float(component), 12) for component in object_.data.vertices[vertex_index].co)
            positions[local].append(evaluated.matrix_world @ mesh.vertices[vertex_index].co)
    finally:
        evaluated.to_mesh_clear()
    for values in positions.values():
        values.sort(key=lambda item: tuple(item))
    return positions


def surface_frame_difference(left: dict[tuple[float, float, float], list[Vector]], right: dict[tuple[float, float, float], list[Vector]]) -> float:
    if set(left) != set(right):
        raise RuntimeError("Source and copied handle local-coordinate sets differ.")
    maximum = 0.0
    for local in left:
        if len(left[local]) != len(right[local]):
            raise RuntimeError(f"Source and copied handle vertex multiplicity differs at {local}.")
        for first, second in zip(left[local], right[local]):
            maximum = max(maximum, (first - second).length)
    return maximum


def evaluated_triangles(object_: bpy.types.Object) -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = object_.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


def material_draws(object_: bpy.types.Object) -> int:
    return len({polygon.material_index for polygon in object_.data.polygons})


def matrix_difference(left, right) -> float:
    return max(abs(float(a) - float(b)) for left_row, right_row in zip(left, right) for a, b in zip(left_row, right_row))


def append_source_handle() -> bpy.types.Object:
    """Append the native object only long enough to copy its complete rigid faces."""
    with bpy.data.libraries.load(str(NATIVE), link=False) as (data_from, data_to):
        if SOURCE_HANDLE not in data_from.objects:
            raise RuntimeError(f"Native source lacks {SOURCE_HANDLE}.")
        data_to.objects = [SOURCE_HANDLE]
    source = data_to.objects[0]
    if source is None or source.type != "MESH":
        raise RuntimeError("Could not append native ChargeHandle_Mesh for a component-only copy.")
    bpy.context.scene.collection.objects.link(source)
    return source


def copy_source_component(source: bpy.types.Object, rifle_rig: bpy.types.Object) -> tuple[bpy.types.Object, dict]:
    source_faces = all_rigid_group_faces(source, "ChargeHandle")
    source_components = connected_components(source.data, source_faces)
    if len(source_faces) != 90 or len(source_components) != 1 or len(source_components[0]) != len(source_faces):
        raise RuntimeError(f"Native ChargeHandle selection is ambiguous: {len(source_faces)} faces, {len(source_components)} components.")
    if len(source_faces) == len(source.data.polygons):
        raise RuntimeError("Native ChargeHandle selection unexpectedly contains the entire rifle mesh.")
    source_signature = surface_signature(source, source_faces)

    selected_source_faces = set(source_faces)
    for polygon in source.data.polygons:
        polygon.select = polygon.index in selected_source_faces
    copied_mesh = source.data.copy()
    for polygon in copied_mesh.polygons:
        polygon.select = polygon.index in selected_source_faces
    copied_mesh.name = "Native_ChargeHandle_Component_Mesh"
    edit_mesh = bmesh.new()
    edit_mesh.from_mesh(copied_mesh)
    edit_mesh.faces.ensure_lookup_table()
    delete_faces = [face for face in edit_mesh.faces if not face.select]
    bmesh.ops.delete(edit_mesh, geom=delete_faces, context="FACES_ONLY")
    orphan_vertices = [vertex for vertex in edit_mesh.verts if not vertex.link_faces]
    if orphan_vertices:
        bmesh.ops.delete(edit_mesh, geom=orphan_vertices, context="VERTS")
    edit_mesh.to_mesh(copied_mesh)
    edit_mesh.free()
    copied_mesh.update()
    retained_native_material = bpy.data.materials.get("Rifle_01_MI")
    if retained_native_material is None:
        raise RuntimeError("Frozen baseline is missing its retained native Rifle_01_MI material.")
    canonical_native_image = bpy.data.images.get("Rifle_Albedo.png")
    if canonical_native_image is None:
        raise RuntimeError("Frozen baseline is missing its retained native Rifle_Albedo.png image datablock.")
    # Appending the temporary source object may allocate a duplicate Image ID.
    # Reuse the existing frozen native material's original image ID; no shader,
    # texture pixels, material slot, or mapping is authored here.
    for node in retained_native_material.node_tree.nodes:
        if hasattr(node, "image") and node.image and node.image.name.removesuffix(".001") == "Rifle_Albedo.png":
            node.image = canonical_native_image
    for material_index in range(len(copied_mesh.materials)):
        copied_mesh.materials[material_index] = retained_native_material

    copied = bpy.data.objects.new(COPIED_HANDLE, copied_mesh)
    bpy.context.scene.collection.objects.link(copied)
    copied.parent = rifle_rig
    copied.matrix_parent_inverse = source.matrix_parent_inverse.copy()
    copied.matrix_basis = source.matrix_basis.copy()
    copied.rotation_mode = source.rotation_mode
    # ``Mesh.copy`` retains the source's DeformVert numeric assignments.  Keep
    # the one rigid relation explicitly, so no stale groups survive on the new
    # component object.
    for group in list(copied.vertex_groups):
        copied.vertex_groups.remove(group)
    copied_group = copied.vertex_groups.new(name="ChargeHandle")
    copied_group.add([vertex.index for vertex in copied.data.vertices], 1.0, "REPLACE")
    modifier = copied.modifiers.new("Native_Rifle_Armature", "ARMATURE")
    modifier.object = rifle_rig

    copied_faces = all_rigid_group_faces(copied, "ChargeHandle")
    copied_components = connected_components(copied.data, copied_faces)
    copied_signature = surface_signature(copied, copied_faces)
    if len(copied_faces) != len(source_faces) or len(copied_components) != 1 or copied_signature != source_signature:
        raise RuntimeError(
            "Copied handle does not exactly preserve the complete native source face surface: "
            f"source={source_signature}, copied_faces={len(copied_faces)}, "
            f"copied_components={[len(component) for component in copied_components]}, copied={copied_signature}"
        )
    source_relation = {
        "source_object": source.name,
        "copied_object": copied.name,
        "source_parent": source.parent.name if source.parent else None,
        "copied_parent": copied.parent.name if copied.parent else None,
        "source_matrix_parent_inverse": matrix(source.matrix_parent_inverse),
        "copied_matrix_parent_inverse": matrix(copied.matrix_parent_inverse),
        "source_matrix_basis": matrix(source.matrix_basis),
        "copied_matrix_basis": matrix(copied.matrix_basis),
        "source_armature_target": next((modifier.object.name for modifier in source.modifiers if modifier.type == "ARMATURE" and modifier.object), None),
        "copied_armature_target": modifier.object.name,
        "source_surface": source_signature,
        "copied_surface": copied_signature,
    }
    return copied, source_relation


def remove_donor_handle(donor: bpy.types.Object) -> dict:
    donor_faces = all_rigid_group_faces(donor, "ChargeHandle")
    donor_components = connected_components(donor.data, donor_faces)
    if len(donor_faces) != 28 or len(donor_components) != 1 or len(donor_components[0]) != len(donor_faces):
        raise RuntimeError(f"Donor ChargeHandle selection is ambiguous: {len(donor_faces)} faces, {len(donor_components)} components.")
    body_before = donor_body_signature(donor, donor_faces)
    removed_triangles = sum(len(donor.data.polygons[index].vertices) - 2 for index in donor_faces)
    selected_donor_faces = set(donor_faces)
    for polygon in donor.data.polygons:
        polygon.select = polygon.index in selected_donor_faces
    edit_mesh = bmesh.new()
    edit_mesh.from_mesh(donor.data)
    edit_mesh.faces.ensure_lookup_table()
    delete_faces = [face for face in edit_mesh.faces if face.select]
    bmesh.ops.delete(edit_mesh, geom=delete_faces, context="FACES_ONLY")
    orphan_vertices = [vertex for vertex in edit_mesh.verts if not vertex.link_faces]
    if orphan_vertices:
        bmesh.ops.delete(edit_mesh, geom=orphan_vertices, context="VERTS")
    edit_mesh.to_mesh(donor.data)
    edit_mesh.free()
    donor.data.update()
    remaining_charge = all_rigid_group_faces(donor, "ChargeHandle")
    body_after = donor_body_signature(donor, remaining_charge)
    if remaining_charge or body_after != body_before:
        raise RuntimeError("Donor handle removal changed more than the complete superseded component.")
    return {
        "removed_donor_faces": len(donor_faces),
        "removed_donor_triangles": removed_triangles,
        "remaining_charge_handle_faces": len(remaining_charge),
        "body_signature": body_after,
    }


def cleanup_source_object(source: bpy.types.Object) -> None:
    source_mesh = source.data
    temporary_materials = [material for material in source_mesh.materials if material]
    temporary_images = [
        node.image
        for material in temporary_materials if material.use_nodes and material.node_tree
        for node in material.node_tree.nodes if hasattr(node, "image") and node.image
    ]
    bpy.data.objects.remove(source, do_unlink=True)
    if source_mesh.users == 0:
        bpy.data.meshes.remove(source_mesh)
    for material in temporary_materials:
        if material.users == 0:
            bpy.data.materials.remove(material)
    for image in temporary_images:
        if image.users == 0:
            bpy.data.images.remove(image)


def derive() -> None:
    if Path(bpy.data.filepath).resolve() != BASELINE.resolve():
        raise RuntimeError(f"Derive must open the frozen baseline exactly: {BASELINE}")
    if CANDIDATE.exists():
        raise RuntimeError(f"Refusing to overwrite preserved candidate evidence: {CANDIDATE}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    arms, arms_rig, donor, rifle_rig, camera = require_scene()
    set_action("Idle")
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    arms_before = object_static_signature(arms)
    source = append_source_handle()
    source_handle, source_relation = copy_source_component(source, rifle_rig)
    removal = remove_donor_handle(donor)
    cleanup_source_object(source)

    # The original native relationship is copied as rig world + bone rest +
    # object parent inverse/basis.  Existing candidate rigs/actions stay intact.
    source_relation["candidate_rig_world"] = matrix(rifle_rig.matrix_world)
    source_relation["candidate_charge_handle_bone_rest"] = matrix(rifle_rig.data.bones["ChargeHandle"].matrix_local)
    source_relation["candidate_camera_idle_1"] = {"lens_mm": camera.data.lens, "matrix_world": matrix(camera.matrix_world)}
    arms_after = object_static_signature(arms)
    if arms_before != arms_after:
        raise RuntimeError("Replacing the handle altered the retained arm mesh data.")
    gun_triangles = evaluated_triangles(donor) + evaluated_triangles(source_handle)
    arms_triangles = evaluated_triangles(arms)
    draw_count = material_draws(donor) + material_draws(source_handle) + material_draws(arms)
    checks = {
        "baseline_sha256_matches_frozen": sha256(BASELINE) == "fe09b81317a5fac7ded96c0b8b60acf508fdf8654df08a02cd0f42c78a931ae3",
        "native_source_sha256_matches_frozen": sha256(NATIVE) == "2c31e7b35162c32f11f58969b6df4aea21c0603af9f73a8c0c4c2403104d93a2",
        "source_component_is_complete_and_unambiguous": source_relation["source_surface"]["polygons"] == 90,
        "donor_handle_removed_without_fallback": removal["remaining_charge_handle_faces"] == 0,
        "copied_surface_static_equality": source_relation["source_surface"] == source_relation["copied_surface"],
        "retained_arms_static_data_unchanged": arms_before == arms_after,
        "gun_triangle_budget": gun_triangles <= 3500,
        "arms_triangle_budget": arms_triangles <= 4000,
        "combined_draw_budget": draw_count <= 6,
        "native_rigs_retained": len(arms_rig.pose.bones) == 63 and len(rifle_rig.pose.bones) == 9,
        "all_eight_actions_retained": all(bpy.data.actions.get(action_name) for mapping in ACTION_MAP.values() for action_name in mapping.values()),
    }
    report = {
        "stage": "derive",
        "baseline": {"path": str(BASELINE.relative_to(ROOT)), "sha256": sha256(BASELINE)},
        "native_source": {"path": str(NATIVE.relative_to(ROOT)), "sha256": sha256(NATIVE)},
        "candidate": str(CANDIDATE.relative_to(ROOT)),
        "component_replacement": {"native": source_relation, "donor_removal": removal},
        "retained": {
            "arms": arms_before, "arms_bone_count": len(arms_rig.pose.bones), "rifle_bone_count": len(rifle_rig.pose.bones),
            "actions": ACTION_MAP,
            "child_of_constraints": [
                {"bone": bone.name, "target": constraint.target.name if constraint.target else None, "subtarget": constraint.subtarget}
                for bone in arms_rig.pose.bones for constraint in bone.constraints if constraint.type == "CHILD_OF"
            ],
        },
        "resource_cost": {"gun_triangles": gun_triangles, "arms_evaluated_triangles": arms_triangles, "combined_draws": draw_count},
        "checks": checks,
        "status": "pending_authored_camera_junction_and_hand_review" if all(checks.values()) else "blocked_before_render",
    }
    bpy.ops.wm.save_as_mainfile(filepath=str(CANDIDATE), check_existing=False)
    (OUTPUT / "derive.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def complete_glove_components(arms: bpy.types.Object) -> list[list[int]]:
    glove_slot = next((index for index, material in enumerate(arms.data.materials) if material and material.name == "Derived_Black_Glove_Material"), None)
    if glove_slot is None:
        raise RuntimeError("Candidate has no retained black glove material component.")
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = arms.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        selected = [polygon.index for polygon in mesh.polygons if polygon.material_index == glove_slot]
        polygons = [list(polygon.vertices) for polygon in mesh.polygons]
    finally:
        evaluated.to_mesh_clear()
    proxy = bpy.data.meshes.new("__glove_component_proxy")
    try:
        proxy.from_pydata([Vector() for _ in range(max(vertex for polygon in polygons for vertex in polygon) + 1)], [], polygons)
        return connected_components(proxy, selected)
    finally:
        bpy.data.meshes.remove(proxy)


def evaluated_mesh_world(object_: bpy.types.Object) -> tuple[list[Vector], list[list[int]], list[int]]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = object_.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        return ([evaluated.matrix_world @ vertex.co for vertex in mesh.vertices], [list(polygon.vertices) for polygon in mesh.polygons], [polygon.material_index for polygon in mesh.polygons])
    finally:
        evaluated.to_mesh_clear()


def bvh(vertices: list[Vector], polygons: list[list[int]], selected: list[int]) -> BVHTree:
    return BVHTree.FromPolygons(vertices, [polygons[index] for index in selected], all_triangles=False)


def contact_stats(vertices: list[Vector], polygons: list[list[int]], component: list[int], target: BVHTree) -> dict:
    distances = []
    areas = []
    for polygon_index in component:
        polygon = polygons[polygon_index]
        anchor = vertices[polygon[0]]
        for cursor in range(1, len(polygon) - 1):
            first, second = vertices[polygon[cursor]], vertices[polygon[cursor + 1]]
            centroid = (anchor + first + second) / 3
            area = (first - anchor).cross(second - anchor).length / 2
            result = target.find_nearest(centroid)
            if result:
                distances.append(result[3])
                areas.append(area)
    total_area = sum(areas)
    return {
        "min_cm": round(min(distances), 6),
        "median_cm": round(sorted(distances)[len(distances) // 2], 6),
        "area_at_or_under_1cm_percent": round(100 * sum(area for distance, area in zip(distances, areas) if distance <= 1) / total_area, 4),
        "area_at_or_under_2cm_percent": round(100 * sum(area for distance, area in zip(distances, areas) if distance <= 2) / total_area, 4),
    }


def audit_candidate_reload() -> dict:
    arms, arms_rig, donor, rifle_rig, camera = require_scene()
    handle = bpy.data.objects.get(COPIED_HANDLE)
    if handle is None or handle.type != "MESH":
        raise RuntimeError("Candidate does not contain the required copied native handle.")
    handle_faces = all_rigid_group_faces(handle, "ChargeHandle")
    if len(handle_faces) != 90:
        raise RuntimeError("Candidate copied handle no longer has the complete 90-face native component.")
    copied_static = surface_signature(handle, handle_faces)
    glove_components = complete_glove_components(arms)
    per_frame = []
    surfaces = {}
    for frame in range(1, 84):
        set_action("Reload")
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        arm_vertices, arm_polygons, _ = evaluated_mesh_world(arms)
        handle_vertices, handle_polygons, _ = evaluated_mesh_world(handle)
        target = bvh(handle_vertices, handle_polygons, handle_faces)
        contacts = [contact_stats(arm_vertices, arm_polygons, component, target) for component in glove_components]
        per_frame.append({"frame": frame, "components": contacts})
        surfaces[frame] = evaluated_surface_positions(handle, handle_faces)
    set_action("Idle")
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    junction_idle = {
        "camera": {"lens_mm": camera.data.lens, "matrix_world": matrix(camera.matrix_world)},
        "handle_world_bounds_cm": bounds(evaluated_mesh_world(handle)[0]),
        "donor_world_bounds_cm": bounds(evaluated_mesh_world(donor)[0]),
    }
    return {
        "static": copied_static,
        "rig_relation": {
            "parent": handle.parent.name if handle.parent else None,
            "matrix_parent_inverse": matrix(handle.matrix_parent_inverse),
            "matrix_basis": matrix(handle.matrix_basis),
            "armature_target": next((modifier.object.name for modifier in handle.modifiers if modifier.type == "ARMATURE" and modifier.object), None),
            "candidate_rig_world": matrix(rifle_rig.matrix_world),
            "candidate_charge_handle_bone_rest": matrix(rifle_rig.data.bones["ChargeHandle"].matrix_local),
        },
        "surfaces": surfaces,
        "glove_components": glove_components,
        "contact_full_reload": per_frame,
        "junction_idle": junction_idle,
        "retained_arms": object_static_signature(arms),
        "retained_rigs": {"arms": len(arms_rig.pose.bones), "rifle": len(rifle_rig.pose.bones)},
        "donor_triangle_count": evaluated_triangles(donor),
        "handle_triangle_count": evaluated_triangles(handle),
        "arms_triangle_count": evaluated_triangles(arms),
        "draws": material_draws(donor) + material_draws(handle) + material_draws(arms),
    }


def bounds(vertices: list[Vector]) -> dict:
    return {"min": rounded(Vector((min(point.x for point in vertices), min(point.y for point in vertices), min(point.z for point in vertices))), 6), "max": rounded(Vector((max(point.x for point in vertices), max(point.y for point in vertices), max(point.z for point in vertices))), 6)}


def audit_native_reload(glove_components: list[list[int]]) -> dict:
    arms = bpy.data.objects[ARMS]
    arms_rig = bpy.data.objects[ARMS_RIG]
    rifle_rig = bpy.data.objects[RIFLE_RIG]
    handle = bpy.data.objects[SOURCE_HANDLE]
    camera = bpy.data.objects[CAMERA]
    handle_faces = all_rigid_group_faces(handle, "ChargeHandle")
    if len(handle_faces) != 90 or len(connected_components(handle.data, handle_faces)) != 1:
        raise RuntimeError("Original source native handle is not the expected complete rigid component.")
    native_static = surface_signature(handle, handle_faces)
    surfaces = {}
    contacts = []
    for frame in range(1, 84):
        set_action("Reload")
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        arm_vertices, arm_polygons, _ = evaluated_mesh_world(arms)
        handle_vertices, handle_polygons, _ = evaluated_mesh_world(handle)
        target = bvh(handle_vertices, handle_polygons, handle_faces)
        contacts.append({"frame": frame, "components": [contact_stats(arm_vertices, arm_polygons, component, target) for component in glove_components]})
        surfaces[frame] = evaluated_surface_positions(handle, handle_faces)
    set_action("Idle")
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    return {
        "static": native_static,
        "rig_relation": {
            "parent": handle.parent.name if handle.parent else None,
            "matrix_parent_inverse": matrix(handle.matrix_parent_inverse),
            "matrix_basis": matrix(handle.matrix_basis),
            "armature_target": next((modifier.object.name for modifier in handle.modifiers if modifier.type == "ARMATURE" and modifier.object), None),
            "native_rig_world": matrix(rifle_rig.matrix_world),
            "native_charge_handle_bone_rest": matrix(rifle_rig.data.bones["ChargeHandle"].matrix_local),
        },
        "surfaces": surfaces,
        "contact_full_reload": contacts,
        "camera_idle_1": {"lens_mm": camera.data.lens, "matrix_world": matrix(camera.matrix_world)},
        "arms": object_static_signature(arms),
        "rigs": {"arms": len(arms_rig.pose.bones), "rifle": len(rifle_rig.pose.bones)},
    }


def audit() -> None:
    if Path(bpy.data.filepath).resolve() != CANDIDATE.resolve():
        raise RuntimeError(f"Audit must open the derived candidate exactly: {CANDIDATE}")
    if not CANDIDATE.is_file():
        raise RuntimeError("Candidate blend is missing; run derive first.")
    candidate = audit_candidate_reload()
    bpy.ops.wm.open_mainfile(filepath=str(NATIVE), load_ui=False, use_scripts=False)
    native = audit_native_reload(candidate["glove_components"])
    frame_errors = {frame: surface_frame_difference(candidate["surfaces"][frame], native["surfaces"][frame]) for frame in range(1, 84)}
    contact_differences = []
    for copied_frame, native_frame in zip(candidate["contact_full_reload"], native["contact_full_reload"]):
        for copied_component, native_component in zip(copied_frame["components"], native_frame["components"]):
            contact_differences.append(max(abs(copied_component[key] - native_component[key]) for key in copied_component))
    derived_report = json.loads((OUTPUT / "derive.json").read_text())
    checks = {
        "static_surface_uv_material_weight_equality": candidate["static"] == native["static"],
        "parent_inverse_and_basis_equality": candidate["rig_relation"]["matrix_parent_inverse"] == native["rig_relation"]["matrix_parent_inverse"] and candidate["rig_relation"]["matrix_basis"] == native["rig_relation"]["matrix_basis"],
        "rig_world_and_bone_rest_equality": candidate["rig_relation"]["candidate_rig_world"] == native["rig_relation"]["native_rig_world"] and candidate["rig_relation"]["candidate_charge_handle_bone_rest"] == native["rig_relation"]["native_charge_handle_bone_rest"],
        "reload_1_to_83_evaluated_surface_equality": max(frame_errors.values()) <= 1e-6,
        "reload_1_to_83_hand_contact_equality": max(contact_differences) <= 1e-4,
        "retained_arms_positions_uv_weights_equal_native": candidate["retained_arms"] == native["arms"],
        "retained_63_plus_9_rigs": candidate["retained_rigs"] == native["rigs"] == {"arms": 63, "rifle": 9},
        "resource_budgets": candidate["donor_triangle_count"] + candidate["handle_triangle_count"] <= 3500 and candidate["arms_triangle_count"] <= 4000 and candidate["draws"] <= 6,
        "derive_internal_checks": all(derived_report["checks"].values()),
    }
    report = {
        "candidate": {"path": str(CANDIDATE.relative_to(ROOT)), "sha256": sha256(CANDIDATE)},
        "native": {"path": str(NATIVE.relative_to(ROOT)), "sha256": sha256(NATIVE)},
        "candidate_static_surface": candidate["static"],
        "native_static_surface": native["static"],
        "evaluated_surface_max_error_cm_by_reload_frame": {str(frame): round(error, 9) for frame, error in frame_errors.items()},
        "evaluated_surface_max_error_cm": round(max(frame_errors.values()), 9),
        "full_reload_contact_max_statistical_difference": round(max(contact_differences), 9),
        "native_reload_54_contact": native["contact_full_reload"][53],
        "candidate_reload_54_contact": candidate["contact_full_reload"][53],
        "candidate_junction_idle_bounds": candidate["junction_idle"],
        "candidate_resource_cost": {"gun_triangles": candidate["donor_triangle_count"] + candidate["handle_triangle_count"], "arms_triangles": candidate["arms_triangle_count"], "draws": candidate["draws"]},
        "checks": checks,
        "status": "pending_authored_camera_visual_junction_review" if all(checks.values()) else "blocked_before_visual_review",
    }
    (OUTPUT / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def main() -> None:
    stage = arguments().stage
    if stage == "derive":
        derive()
    else:
        audit()


if __name__ == "__main__":
    main()
