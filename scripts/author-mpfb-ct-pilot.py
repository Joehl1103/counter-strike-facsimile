"""Build an offline, MPFB-authored Counter-Terrorist qualification pilot.

This is deliberately an authoring experiment, not a runtime asset replacement.
It uses MPFB 2.0.17 services to create the body, install game-engine weights,
and refit every clothing item. Blender only performs ordinary export preparation:
remove hidden body surfaces, decimate, consolidate the two material groups, and
export a reviewable GLB. No body vertices or skin weights are authored here.

Usage from the counter-strike repository root:
  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \
    --python scripts/author-mpfb-ct-pilot.py -- --stage tooling
  /Volumes/Blender/Blender.app/Contents/MacOS/Blender --background --disable-autoexec \
    --python scripts/author-mpfb-ct-pilot.py -- --stage pilot
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
MPFB_SOURCE = (
    ROOT
    / "assets/source/mpfb/vendor/mpfb2-80919fa4682335c41847f761a4d79dcad4124732/src"
)
PACKS = ROOT / "assets/source/mpfb/packs"
OUTPUT = ROOT / "outputs/cs16/reuse/mpfb-ct"
GAS_MASK_OUTPUT = OUTPUT / "gas-mask-source"
GAS_MASK_FULL_HELPER_OUTPUT = GAS_MASK_OUTPUT / "full-helper-rig-source-cc0-gloves-boots"
GAS_MASK_PILOT_OUTPUT = OUTPUT / "gas-mask-pilot"
GAS_MASK_BIND_VALIDATION_OUTPUT = GAS_MASK_PILOT_OUTPUT / "full-helper-bind-validation"
GAS_MASK_WEIGHT_VALIDATION_OUTPUT = GAS_MASK_PILOT_OUTPUT / "full-helper-weight-validation"

ASSETS = {
    "jacket": PACKS
    / "suits03/clothes/elvs_emt_uniform_jacket_male/elvs_emt_uniform_jacket_male.mhclo",
    "pants": PACKS
    / "suits03/clothes/elvs_emt_uniform_pants_male/elvs_emt_uniform_pants_male.mhclo",
    "helmet": PACKS
    / "hats02/clothes/mrgreaterthan_m1_helmet/mrgreaterthan_m1_helmet.mhclo",
    "gloves": PACKS
    / "gloves01/clothes/culturalibre_hero-heroine_gloves_1/culturalibre_hero-heroine_gloves_1.mhclo",
    "boots": PACKS
    / "shoes01/clothes/culturalibre_male_boots/culturalibre_male_boots.mhclo",
}
CT_SOURCE_ASSETS = {
    "uniform": PACKS
    / "suits03/clothes/elvs_male_coveralls_1/elvs_male_coveralls_1.mhclo",
    "vest": PACKS
    / "equipment03/clothes/mindfront_tactical_vest_male/mindfront_tactical_vest_male.mhclo",
    "balaclava": PACKS
    / "masks01/clothes/culturalibre_hero-heroine_hood_2/culturalibre_hero-heroine_hood_2.mhclo",
    "gloves": PACKS
    / "gloves01/clothes/culturalibre_hero-heroine_gloves_1/culturalibre_hero-heroine_gloves_1.mhclo",
    "boots": PACKS
    / "shoes01/clothes/culturalibre_hero_boots_1/culturalibre_hero_boots_1.mhclo",
}
GAS_MASK_SOURCE_ASSETS = {
    "uniform": CT_SOURCE_ASSETS["uniform"],
    "vest": CT_SOURCE_ASSETS["vest"],
    "gas_mask": PACKS / "masks02/clothes/gredal_gas_mask/gredal_gas_mask.mhclo",
    # Both selected files and their mesh payload headers identify MRT / CC0.
    # They replace the previous culturalibre selections, whose header records
    # conflicted with their pack-catalog CC0 entries.
    "gloves": PACKS / "gloves01/clothes/toigo_gloves_short/toigo_gloves_short.mhclo",
    "boots": PACKS / "shoes01/clothes/toigo_ankle_boots_male/toigo_ankle_boots_male.mhclo",
}
PREVIOUS_GAS_MASK_TINTS = {
    "uniform": (0.055, 0.13, 0.46, 1.0),
    "vest": (0.045, 0.055, 0.07, 1.0),
    "gas_mask": (0.055, 0.07, 0.08, 1.0),
    "gloves": (0.01, 0.012, 0.016, 1.0),
    "boots": (0.01, 0.012, 0.016, 1.0),
}
# The original very-low multipliers baked correctly, but made the CC0 source
# unreadable under the game's direct outdoor light. These values remain a
# texture-preserving uniform material treatment: authored albedo, UVs, normal
# maps, geometry, and MPFB weights remain untouched. Values are deliberately
# split into navy cloth, charcoal equipment, dark rubber, and near-black hands
# and feet so vest pouches and the gas-mask silhouette retain contrast.
GAS_MASK_TINTS = {
    "uniform": (0.18, 0.32, 0.65, 1.0),
    "vest": (0.20, 0.22, 0.25, 1.0),
    "gas_mask": (0.22, 0.25, 0.27, 1.0),
    "gloves": (0.14, 0.16, 0.18, 1.0),
    "boots": (0.14, 0.16, 0.18, 1.0),
}
SKIN = PACKS / "makehuman_system_assets/skins/middleage_caucasian_male/middleage_caucasian_male.mhmat"
EYES = PACKS / "makehuman_system_assets/eyes/low-poly/low-poly.mhclo"
EYES_BROWN = PACKS / "makehuman_system_assets/eyes/materials/brown.mhmat"


def command_line_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("tooling", "native-diagnostic", "mask-diagnostic", "reduction-diagnostic", "ct-source-diagnostic", "material-diagnostic", "freeze-source", "freeze-gas-mask-source", "freeze-gas-mask-full-helper-source", "gas-mask-bind-validation", "gas-mask-weight-validation", "gas-mask-pilot", "pilot"), required=True)
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(arguments)


def prepare_empty_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def register_scoped_mpfb():
    """Load this repository's pinned source without saving addon preferences."""
    source = str(MPFB_SOURCE)
    if source not in sys.path:
        sys.path.insert(0, source)
    import mpfb  # pylint: disable=import-outside-toplevel

    # MPFB's source-distribution boot path asks Blender for an extension-owned
    # user directory. This pilot imports the pinned source directly rather than
    # installing an extension, so provide a session-local directory only while
    # MPFB initializes its path service. Nothing is written to global add-on
    # preferences and the Blender utility is restored immediately afterward.
    original_extension_path_user = bpy.utils.extension_path_user
    original_get_preference = mpfb.get_preference
    session_home = OUTPUT / "mpfb-session"
    session_home.mkdir(parents=True, exist_ok=True)
    bpy.utils.extension_path_user = lambda _package: str(session_home)
    mpfb.get_preference = lambda _name: ""
    try:
        mpfb.register()
    finally:
        bpy.utils.extension_path_user = original_extension_path_user
        mpfb.get_preference = original_get_preference
    from mpfb.services import HumanService, TargetService  # pylint: disable=import-outside-toplevel

    return HumanService, TargetService, mpfb


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Qualification_world")
    scene.world.color = (0.025, 0.035, 0.05)
    scene.view_settings.look = "AgX - Medium High Contrast"


def look_at(object_: bpy.types.Object, target: Vector) -> None:
    object_.rotation_euler = (target - object_.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, Vector((0.0, 0.0, 0.9)))


def add_review_studio() -> bpy.types.Object:
    add_area_light("Key", (3.8, -4.8, 5.0), 900.0, 4.0)
    add_area_light("Fill", (-4.0, -2.0, 2.8), 500.0, 3.0)
    add_area_light("Rim", (2.0, 3.0, 4.0), 700.0, 2.0)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0.0, 0.0, 0.0))
    floor = bpy.context.object
    floor.name = "Review_floor"
    floor_material = bpy.data.materials.new("Review_floor_material")
    floor_material.diffuse_color = (0.08, 0.10, 0.13, 1.0)
    floor.data.materials.append(floor_material)
    return floor


def add_camera() -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("Qualification_camera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("Qualification_camera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    return camera


def render_camera(
    camera: bpy.types.Object, location: tuple[float, float, float], filename: str, output_dir: Path = OUTPUT
) -> None:
    camera.location = location
    look_at(camera, Vector((0.0, 0.0, 0.88)))
    bpy.context.scene.render.filepath = str(output_dir / filename)
    bpy.ops.render.render(write_still=True)


def render_head_closeup(camera: bpy.types.Object, filename: str, output_dir: Path = OUTPUT) -> None:
    previous_lens = camera.data.lens
    camera.data.lens = 78
    camera.location = (0.0, -2.75, 1.62)
    look_at(camera, Vector((0.0, 0.0, 1.50)))
    bpy.context.scene.render.filepath = str(output_dir / filename)
    bpy.ops.render.render(write_still=True)
    camera.data.lens = previous_lens


def render_torso_closeup(camera: bpy.types.Object, filename: str, output_dir: Path = OUTPUT) -> None:
    previous_lens = camera.data.lens
    camera.data.lens = 72
    camera.location = (0.0, -3.25, 1.30)
    look_at(camera, Vector((0.0, 0.0, 1.05)))
    bpy.context.scene.render.filepath = str(output_dir / filename)
    bpy.ops.render.render(write_still=True)
    camera.data.lens = previous_lens


def create_human(HumanService, TargetService, rig_name="game_engine") -> tuple[bpy.types.Object, bpy.types.Object]:
    macro = TargetService.get_default_macro_info_dict()
    macro.update(
        {
            "gender": 1.0,
            "age": 0.42,
            "muscle": 0.55,
            "weight": 0.52,
            "proportions": 0.52,
            "height": 0.54,
        }
    )
    macro["race"] = {"asian": 0.1, "caucasian": 0.75, "african": 0.15}
    # Keep MPFB's detailed helper geometry and extra vertex groups while the
    # native rig is fitted.  The Mixamo rig uses the helper joint cubes (for
    # example ``joint-l-hand``) as live body landmarks; suppressing them
    # makes MPFB fall back to the JSON's default T-pose coordinates and
    # separates the rest skeleton from the A-pose surface.  Export cleanup
    # removes helpers only after the correctly fitted rig and garments exist.
    body = HumanService.create_human(
        detailed_helpers=True,
        extra_vertex_groups=True,
        macro_detail_dict=macro,
    )
    body.name = "MPFB_CT_Body"
    HumanService.set_character_skin(str(SKIN), body, skin_type="GAMEENGINE", material_instances=False)
    rig = HumanService.add_builtin_rig(body, rig_name, import_weights=True)
    rig.name = f"MPFB_CT_{rig_name.title()}Rig"
    return body, rig


def add_native_clothes(HumanService, body: bpy.types.Object, assets=ASSETS) -> dict[str, bpy.types.Object]:
    clothing = {}
    for label, path in assets.items():
        if not path.exists():
            raise FileNotFoundError(path)
        clothing[label] = HumanService.add_mhclo_asset(
            str(path),
            body,
            asset_type="Clothes",
            subdiv_levels=0,
            material_type="GAMEENGINE",
            set_up_rigging=True,
            interpolate_weights=True,
            import_subrig=True,
            import_weights=True,
        )
        clothing[label].name = f"MPFB_CT_{label.title()}"
    return clothing


def add_native_brown_eyes(HumanService, body: bpy.types.Object) -> bpy.types.Object:
    """Add the CC0 MakeHuman low-poly eye mesh through MPFB's asset service."""
    if not EYES.exists() or not EYES_BROWN.exists():
        raise FileNotFoundError(f"Missing native eye asset or material: {EYES}, {EYES_BROWN}")
    eyes = HumanService.add_mhclo_asset(
        str(EYES),
        body,
        asset_type="Eyes",
        subdiv_levels=0,
        material_type="GAMEENGINE",
        set_up_rigging=True,
        interpolate_weights=True,
        import_subrig=True,
        import_weights=True,
    )
    eyes.name = "MPFB_CT_NativeBrownEyes"
    return eyes


def make_recolor_material(name: str, base_color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Roughness"].default_value = 0.72
    material.diffuse_color = base_color
    return material


def assign_recolor(mesh: bpy.types.Object, material: bpy.types.Material) -> None:
    while mesh.data.materials:
        mesh.data.materials.pop(index=0)
    mesh.data.materials.append(material)


def apply_texture_preserving_tint(
    mesh: bpy.types.Object, tint: tuple[float, float, float, float], label: str
) -> list[dict[str, object]]:
    """Multiply MPFB's imported diffuse texture by a uniform CT tint.

    This retains the authored fabric, pocket, strap, normal-map, and UV detail.
    It deliberately does not replace geometry, paint source textures, or alter
    any vertex group/weight data.
    """
    material_details = []
    for material in mesh.data.materials:
        if material is None:
            continue
        material.use_nodes = True
        tree = material.node_tree
        nodes = tree.nodes
        links = tree.links
        principled = nodes.get("Principled BSDF")
        diffuse = nodes.get("DiffuseTexture")
        if principled is None:
            material_details.append({"material": material.name, "tinted": False, "reason": "no Principled BSDF"})
            continue
        mix = nodes.get(f"CT_Tint_{label}")
        if mix is None:
            mix = nodes.new("ShaderNodeMixRGB")
            mix.name = f"CT_Tint_{label}"
            mix.label = f"CT texture-preserving tint: {label}"
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[2].default_value = tint
        base_color = principled.inputs["Base Color"]
        for link in list(base_color.links):
            links.remove(link)
        if diffuse is not None and diffuse.outputs.get("Color") is not None:
            for link in list(mix.inputs[1].links):
                links.remove(link)
            links.new(diffuse.outputs["Color"], mix.inputs[1])
        else:
            mix.inputs[1].default_value = material.diffuse_color
        links.new(mix.outputs["Color"], base_color)
        principled.inputs["Roughness"].default_value = 0.85
        material_details.append(
            {
                "material": material.name,
                "tinted": True,
                "diffuse_texture_node": diffuse.name if diffuse is not None else None,
                "tint": list(tint),
            }
        )
    return material_details


def remove_sourced_hood_eye_faces(mesh: bpy.types.Object) -> dict[str, object]:
    """Cut only the hood polygons whose imported UVs cover the white eye art.

    Hood 2 contains a single material and one connected mesh, but its diffuse
    image marks the two eye inserts as white, bounded UV islands. Removing the
    matching source-garment faces exposes the already-authored MPFB face and
    eyes beneath; this routine never changes body geometry or skin weights.
    """
    material = mesh.active_material
    if material is None or material.node_tree is None:
        raise RuntimeError("Hood 2 has no node material for UV eye detection")
    diffuse = material.node_tree.nodes.get("DiffuseTexture")
    image = diffuse.image if diffuse is not None else None
    if image is None:
        raise RuntimeError("Hood 2 diffuse image is unavailable for UV eye detection")
    image_w, image_h = image.size
    pixels = image.pixels[:]
    uv_layer = mesh.data.uv_layers.active
    if uv_layer is None:
        raise RuntimeError("Hood 2 has no UV layer")

    def is_white(uv: tuple[float, float]) -> bool:
        x = min(image_w - 1, max(0, int((uv[0] % 1.0) * image_w)))
        y = min(image_h - 1, max(0, int((1.0 - (uv[1] % 1.0)) * image_h)))
        offset = (y * image_w + x) * 4
        red, green, blue = pixels[offset : offset + 3]
        return min(red, green, blue) > 0.70 and max(red, green, blue) - min(red, green, blue) < 0.12

    selected = []
    for polygon in mesh.data.polygons:
        uvs = [tuple(uv_layer.data[loop_index].uv) for loop_index in polygon.loop_indices]
        centroid = (
            sum(uv[0] for uv in uvs) / len(uvs),
            sum(uv[1] for uv in uvs) / len(uvs),
        )
        # Center plus a point biased toward each corner catches the small,
        # source-authored white triangles while excluding the surrounding
        # black outline.
        samples = [centroid, *[((uv[0] + centroid[0] * 2.0) / 3.0, (uv[1] + centroid[1] * 2.0) / 3.0) for uv in uvs]]
        if any(is_white(sample) for sample in samples):
            polygon.select = True
            selected.append(polygon.index)
        else:
            polygon.select = False
    if not selected:
        raise RuntimeError("Hood 2 UV eye detector selected no source garment faces")

    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "adaptation": "Deleted source hood polygons whose UV samples map to the white eye-insert artwork.",
        "source_eye_faces_removed": len(selected),
        "source_polygon_indices": selected,
        "source_diffuse_image": Path(image.filepath).name,
        "remaining_triangles": triangles([mesh]),
    }


def preserve_native_eye_band_under_hood(
    body: bpy.types.Object, hood_asset_name: str, eyes: bpy.types.Object
) -> dict[str, object]:
    """Keep MPFB hood coverage, except for a narrow native-eye-band visibility patch.

    Hood 2's supplied delete group is deliberately broad because its original
    white graphic eyes replace the entire face.  Our source-garment slit uses
    the real MPFB eyes instead.  Retaining that source coverage group hides
    ears and all remaining head surface; removing only its existing members
    that overlap the service-imported eye bounds preserves the native eyelids
    visible through the slit.  No body vertices, anatomy, UVs, or rig weights
    are edited.
    """
    modifier_name = f"Delete.{hood_asset_name}"
    modifier = body.modifiers.get(modifier_name)
    if modifier is None or modifier.type != "MASK":
        raise RuntimeError(f"Expected MPFB hood coverage modifier is unavailable: {modifier_name}")
    group = body.vertex_groups.get(modifier.vertex_group)
    if group is None:
        raise RuntimeError(f"Expected MPFB hood coverage vertex group is unavailable: {modifier.vertex_group}")
    eye_bounds = world_bounds(eyes)
    padding_x, padding_z = 0.005, 0.005
    kept = []
    group_index = group.index
    for vertex in body.data.vertices:
        if group_index not in {membership.group for membership in vertex.groups}:
            continue
        world = body.matrix_world @ vertex.co
        in_eye_band = (
            eye_bounds["min"][0] - padding_x <= world.x <= eye_bounds["max"][0] + padding_x
            and eye_bounds["min"][2] - padding_z <= world.z <= eye_bounds["max"][2] + padding_z
            and world.y < 0.05
        )
        if in_eye_band:
            kept.append(vertex.index)
    if not kept:
        raise RuntimeError("Native-eye visibility patch selected no MPFB coverage vertices")
    group.remove(kept)
    modifier.show_viewport = True
    modifier.show_render = True
    return {
        "adaptation": "Retained MPFB hood-only body coverage and removed only its existing members within a native-eye-bounds-derived visibility patch.",
        "modifier": modifier_name,
        "vertex_group": group.name,
        "eye_bounds": eye_bounds,
        "padding": {"x": padding_x, "z": padding_z},
        "native_body_vertices_revealed": len(kept),
        "body_geometry_deleted": False,
        "rig_weights_changed": False,
    }


def expose_native_eyes(body: bpy.types.Object) -> dict[str, object]:
    """Record whether MPFB supplied an eye-specific body coverage group."""
    group_name = "Delete.low-poly"
    if body.vertex_groups.get(group_name) is None:
        # The CC0 low-poly eye MHCLO has no delete-group entries: it is a
        # separate eye mesh intended to sit in the base mesh's native sockets.
        return {
            "adaptation": "Low-poly eye asset has no body delete group; kept the native body mesh intact.",
            "modifier": None,
            "vertex_group": None,
            "body_geometry_deleted": False,
        }
    modifier = body.modifiers.new("MPFB_NativeEyeCoverage", "MASK")
    modifier.vertex_group = group_name
    modifier.invert_vertex_group = True
    return {
        "adaptation": "Added the MPFB low-poly-eye coverage MASK so the service-imported iris mesh is visible; no body geometry edited.",
        "modifier": modifier.name,
        "vertex_group": group_name,
        "body_geometry_deleted": False,
    }


def world_bounds(mesh: bpy.types.Object) -> dict[str, list[float]]:
    coordinates = [mesh.matrix_world @ vertex.co for vertex in mesh.data.vertices]
    return {
        "min": [min(point[i] for point in coordinates) for i in range(3)],
        "max": [max(point[i] for point in coordinates) for i in range(3)],
    }


def cut_hood_eye_slit_from_native_eyes(
    hood: bpy.types.Object, eyes: bpy.types.Object
) -> dict[str, object]:
    """Cut a narrow hood-only slit from the imported native-eye bounds.

    Hood 2's frontal panels are too large for a face-selection aperture. A
    standard exact Boolean keeps the source garment intact outside the slit,
    while deriving its width and height from the service-imported eyes.
    """
    eye_bounds = world_bounds(eyes)
    eye_min, eye_max = eye_bounds["min"], eye_bounds["max"]
    slit_x_min, slit_x_max = eye_min[0] - 0.003, eye_max[0] + 0.003
    slit_z_min, slit_z_max = eye_min[2] - 0.002, eye_max[2] + 0.002
    hood_bounds = world_bounds(hood)
    hood_min, hood_max = hood_bounds["min"], hood_bounds["max"]
    cutter_depth = hood_max[1] - hood_min[1] + 0.04
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.mesh.primitive_cube_add(
        location=(
            (slit_x_min + slit_x_max) / 2.0,
            (hood_min[1] + hood_max[1]) / 2.0,
            (slit_z_min + slit_z_max) / 2.0,
        )
    )
    cutter = bpy.context.object
    cutter.name = "MPFB_CT_HoodEyeSlitCutter"
    cutter.dimensions = (slit_x_max - slit_x_min, cutter_depth, slit_z_max - slit_z_min)
    bpy.context.view_layer.update()
    before_triangles = triangles([hood])
    bpy.context.view_layer.objects.active = hood
    bpy.ops.object.select_all(action="DESELECT")
    hood.select_set(True)
    boolean = hood.modifiers.new("MPFB_NativeEyeSlit", "BOOLEAN")
    boolean.operation = "DIFFERENCE"
    boolean.solver = "EXACT"
    boolean.object = cutter
    # The hood is already skinned by MPFB. Boolean must run against the
    # source garment before the Armature modifier; otherwise Blender evaluates
    # a deformed non-manifold surface and can produce broad false apertures.
    while hood.modifiers.find(boolean.name) > 0:
        bpy.context.view_layer.objects.active = hood
        bpy.ops.object.modifier_move_up(modifier=boolean.name)
    bpy.ops.object.modifier_apply(modifier=boolean.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return {
        "adaptation": "Applied a standard exact Boolean to hood-only geometry using a narrow slit derived from the MPFB native-eye mesh.",
        "source_eye_faces_removed": None,
        "triangle_delta_from_boolean": triangles([hood]) - before_triangles,
        "source_polygon_indices": [],
        "native_eye_bounds": eye_bounds,
        "slit_bounds": {"x": [slit_x_min, slit_x_max], "z": [slit_z_min, slit_z_max], "cutter_depth": cutter_depth},
        "remaining_triangles": triangles([hood]),
    }


def offset_vest_over_uniform(vest: bpy.types.Object, distance: float = 0.012) -> dict[str, object]:
    """Use Blender's ordinary Shrink/Fatten operation to put the vest outside cloth."""
    bpy.context.view_layer.objects.active = vest
    bpy.ops.object.select_all(action="DESELECT")
    vest.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.transform.shrink_fatten(value=distance, use_even_offset=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "adaptation": "Applied Blender Shrink/Fatten along the vest's existing normals to maintain clearance over the coverall.",
        "distance": distance,
        "weights_changed": False,
        "uvs_changed": False,
    }


def offset_export_garment(mesh: bpy.types.Object, distance: float, label: str) -> dict[str, object]:
    """Give an already-refitted outer garment ordinary normal clearance."""
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.transform.shrink_fatten(value=distance, use_even_offset=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "label": label,
        "adaptation": "Applied Blender Shrink/Fatten along existing garment normals on the derived export copy to prevent body/clothing depth fighting.",
        "distance": distance,
        "weights_changed": False,
        "uvs_changed": False,
    }


def offset_hood_over_head(hood: bpy.types.Object, distance: float = 0.005) -> dict[str, object]:
    """Move the intact source hood outward along its existing surface normals."""
    bpy.context.view_layer.objects.active = hood
    bpy.ops.object.select_all(action="DESELECT")
    hood.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.transform.shrink_fatten(value=distance, use_even_offset=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "adaptation": "Applied Blender Shrink/Fatten along the hood's existing normals after its Boolean slit, creating clearance above the native head.",
        "distance": distance,
        "weights_changed": False,
        "uvs_changed": False,
    }


def apply_coverage_masks(mesh: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    # The qualification export freezes the selected MPFB phenotype. Removing
    # its unanimated macro shape keys lets Blender apply MPFB's coverage masks
    # and its normal decimation modifier without replacing the native weights.
    if mesh.data.shape_keys is not None:
        bpy.ops.object.shape_key_remove(all=True)
    for modifier in list(mesh.modifiers):
        if modifier.type == "MASK":
            # MPFB installs its clothing visibility MASKs after Armature for
            # interactive fitting.  Freeze them on the export copy in the
            # undeformed source order, before Armature, so hidden body pieces
            # do not leak through later reduction.
            while mesh.modifiers.find(modifier.name) > 0:
                bpy.context.view_layer.objects.active = mesh
                bpy.ops.object.modifier_move_up(modifier=modifier.name)
            bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_export_modifiers(mesh: bpy.types.Object, ratio: float) -> None:
    apply_coverage_masks(mesh)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    decimate = mesh.modifiers.new("MPFB_Qualification_Decimate", "DECIMATE")
    decimate.ratio = ratio
    decimate.use_symmetry = True
    bpy.ops.object.modifier_apply(modifier=decimate.name)


def join_material_group(name: str, meshes: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = name
    return combined


def retain_native_neck_surface(mesh: bpy.types.Object) -> dict[str, object]:
    """Keep only the existing MPFB neck-weighted skin after clothing masks.

    The approved outer garments cover every other body region. This standard
    mesh visibility prune avoids depth fights under the reduced outer layers
    while retaining the naturally visible neck band; it reads the native
    Mixamo neck group and creates no anatomy, coordinate selections, or new
    weights.
    """
    group = mesh.vertex_groups.get("mixamorig:Neck")
    if group is None:
        raise RuntimeError("Native Mixamo neck group is unavailable for body visibility prune")
    group_index = group.index
    minimum_native_neck_weight = 0.20
    retained = 0
    for polygon in mesh.data.polygons:
        def neck_weight(vertex_index: int) -> float:
            return next(
                (entry.weight for entry in mesh.data.vertices[vertex_index].groups if entry.group == group_index),
                0.0,
            )
        retain = all(neck_weight(index) >= minimum_native_neck_weight for index in polygon.vertices)
        polygon.select = not retain
        retained += int(retain)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return {
        "native_vertex_group": group.name,
        "minimum_weight_per_face_vertex": minimum_native_neck_weight,
        "remaining_triangles": triangles([mesh]),
        "retained_polygons": retained,
    }


def reduce_visible_mesh_to_budget(
    mesh: bpy.types.Object, triangle_budget: int, retain_neck_only: bool = False
) -> dict[str, object]:
    """Apply native visibility then a normal Blender decimate per visible piece."""
    source_triangles = triangles([mesh])
    apply_coverage_masks(mesh)
    visible_triangles = triangles([mesh])
    neck_prune = retain_native_neck_surface(mesh) if retain_neck_only else None
    visible_triangles_after_prune = triangles([mesh])
    ratio = min(1.0, triangle_budget / max(1, visible_triangles_after_prune))
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    decimate = mesh.modifiers.new("MPFB_Qualification_PerPieceDecimate", "DECIMATE")
    decimate.ratio = ratio
    decimate.use_symmetry = True
    # Apply on the neutral source mesh, not the Armature-deformed evaluation.
    # Leaving Decimate after Armature can bake transformed triangles into long
    # slivers, which is visually invalid and changes the exported bind shape.
    while mesh.modifiers.find(decimate.name) > 0:
        bpy.context.view_layer.objects.active = mesh
        bpy.ops.object.modifier_move_up(modifier=decimate.name)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    return {
        "source_triangles": source_triangles,
        "visible_triangles_after_native_masks": visible_triangles,
        "visible_triangles_after_body_prune": visible_triangles_after_prune,
        "body_visibility_prune": neck_prune,
        "allocated_triangle_budget": triangle_budget,
        "decimate_ratio": ratio,
        "triangles_after_per_piece_decimate": triangles([mesh]),
    }


def bake_group_atlas(mesh: bpy.types.Object, label: str, resolution: int = 1024) -> tuple[bpy.types.Material, dict[str, object]]:
    """Bake actual source Base Color graphs into one standard atlas material.

    The imported MPFB materials use a MixRGB tint graph.  Blender's glTF
    exporter does not retain that graph, so this derives an ordinary image
    texture from the evaluated Base Color for the export copy.  Geometry and
    source UVs remain untouched in the frozen source blend; the export copy
    gets a standard smart-packed atlas UV.
    """
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    source_uv = mesh.data.uv_layers.active
    if source_uv is None:
        raise RuntimeError(f"Cannot atlas-bake {mesh.name}: source mesh has no UV layer")
    source_uv_name = source_uv.name
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.uv_texture_add()
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(66.0), island_margin=0.02, area_weight=0.0,
        correct_aspect=True, scale_to_bounds=True,
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    atlas_uv = mesh.data.uv_layers.active
    atlas_uv.name = f"{label}_AtlasUV"
    # Blender uses the active render UV layer when a material texture has no
    # Vector input.  The prior export left the imported UVMap as active_render,
    # so the atlas image was baked correctly but sampled with source UVs.
    for uv_layer in mesh.data.uv_layers:
        uv_layer.active_render = uv_layer.name == atlas_uv.name

    image = bpy.data.images.new(f"{label}_AtlasColor", width=resolution, height=resolution, alpha=False)
    image.colorspace_settings.name = "sRGB"
    source_materials = [material for material in mesh.data.materials if material is not None]
    for material in source_materials:
        material.use_nodes = True
        tree = material.node_tree
        nodes, links = tree.nodes, tree.links
        principled = nodes.get("Principled BSDF")
        output = nodes.get("Material Output")
        if principled is None or output is None:
            raise RuntimeError(f"Cannot bake missing Principled/Output nodes from {material.name}")
        # The new atlas UV is active for the bake target. Source image nodes
        # must instead continue sampling their imported UV layer, otherwise
        # the target packing is incorrectly treated as source coordinates.
        for image_node in [node for node in nodes if node.type == "TEX_IMAGE"]:
            original_vector_links = list(image_node.inputs["Vector"].links)
            for link in original_vector_links:
                links.remove(link)
            source_uv_node = nodes.new("ShaderNodeUVMap")
            source_uv_node.name = f"Qualification_SourceUV_{label}"
            source_uv_node.uv_map = source_uv_name
            links.new(source_uv_node.outputs["UV"], image_node.inputs["Vector"])
        target = nodes.new("ShaderNodeTexImage")
        target.name = f"Qualification_BakeTarget_{label}"
        target.image = image
        nodes.active = target
        target.select = True

    scene = bpy.context.scene
    previous_engine = scene.render.engine
    bake_settings = scene.render.bake
    previous_direct = bake_settings.use_pass_direct
    previous_indirect = bake_settings.use_pass_indirect
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    bake_settings.use_pass_direct = False
    bake_settings.use_pass_indirect = False
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    # Bake the Principled albedo with Cycles' standard COLOR-only diffuse pass.
    # The prior Emission setup recorded linear values into an image later read
    # as sRGB, which made the atlased mask and vest materially darker than the
    # same source graph. This preserves the current source Base Color result
    # without direct/indirect lighting or a display-transform workaround.
    try:
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_clear=True, margin=8)
    finally:
        bake_settings.use_pass_direct = previous_direct
        bake_settings.use_pass_indirect = previous_indirect
        scene.render.engine = previous_engine
    image.pack()

    atlas_material = bpy.data.materials.new(f"{label}_AtlasMaterial")
    atlas_material.use_nodes = True
    nodes = atlas_material.node_tree.nodes
    links = atlas_material.node_tree.links
    principled = nodes.get("Principled BSDF")
    atlas_uv_node = nodes.new("ShaderNodeUVMap")
    atlas_uv_node.name = f"{label}_AtlasUVMap"
    atlas_uv_node.uv_map = atlas_uv.name
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = f"{label}_AtlasTexture"
    texture.image = image
    # Keep this explicit even though atlas_uv is active_render.  It makes the
    # final material independent of layer ordering in Blender and the GLB.
    links.new(atlas_uv_node.outputs["UV"], texture.inputs["Vector"])
    links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    principled.inputs["Roughness"].default_value = 0.85
    mesh.data.materials.clear()
    mesh.data.materials.append(atlas_material)
    for polygon in mesh.data.polygons:
        polygon.material_index = 0
    return atlas_material, {
        "atlas_uv": atlas_uv.name,
        "atlas_uv_active_render": atlas_uv.active_render,
        "atlas_texture_vector_node": atlas_uv_node.name,
        "image": image.name,
        "resolution": resolution,
        "source_materials_baked": [material.name for material in source_materials],
        "standard_export_material": atlas_material.name,
    }


def save_and_export_to(output_dir: Path, rig: bpy.types.Object, meshes: list[bpy.types.Object], filename: str) -> Path:
    """Save the neutral export copy and create a GLB with its MPFB Mixamo rig."""
    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / f"{filename}.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    glb = output_dir / f"{filename}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb), export_format="GLB", use_selection=True,
        export_animations=False, export_yup=True,
    )
    return glb


def render_glb_roundtrip(output_dir: Path, glb: Path) -> dict[str, object]:
    """Import the written GLB into a clean scene and capture rendered evidence."""
    prepare_empty_scene()
    configure_render()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    rig = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
    if rig is None:
        raise RuntimeError("GLB roundtrip did not contain an armature")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (0.0, -6.5, 1.7), "gas-mask-pilot-roundtrip-front.png", output_dir)
    render_camera(camera, (4.5, -4.5, 2.15), "gas-mask-pilot-roundtrip-three-quarter.png", output_dir)
    required_bones = [
        "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2",
        "mixamorig:Neck", "mixamorig:Head", "mixamorig:LeftArm", "mixamorig:LeftForeArm",
        "mixamorig:LeftHand", "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
        "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:RightUpLeg",
        "mixamorig:RightLeg", "mixamorig:RightFoot",
    ]
    returned = {bone.name for bone in rig.data.bones}
    missing = [name for name in required_bones if name not in returned]
    if missing:
        raise RuntimeError(f"GLB roundtrip missing required Mixamo bones: {missing}")
    world_points = [mesh.matrix_world @ vertex.co for mesh in meshes for vertex in mesh.data.vertices]
    bounds_min = [min(point[index] for point in world_points) for index in range(3)]
    bounds_max = [max(point[index] for point in world_points) for index in range(3)]
    skeleton = {}
    for name in required_bones:
        bone = rig.data.bones[name]
        matrix = bone.matrix_local.to_3x3()
        skeleton[name] = {
            "parent": bone.parent.name if bone.parent else None,
            "head_local_meters": list(bone.head_local),
            "tail_local_meters": list(bone.tail_local),
            "rest_axes_local": {
                "x": list(matrix.col[0]),
                "y": list(matrix.col[1]),
                "z": list(matrix.col[2]),
            },
        }
    return {
        "glb": glb.name,
        "roundtrip_armature": rig.name,
        "required_mixamo_bones": required_bones,
        "missing_required_mixamo_bones": missing,
        "roundtrip_mesh_triangles": triangles(meshes),
        "roundtrip_materials": sorted({material.name for mesh in meshes for material in mesh.data.materials if material}),
        "raw_export_bounds_meters": {"min": bounds_min, "max": bounds_max},
        "raw_export_dimensions_meters": [bounds_max[index] - bounds_min[index] for index in range(3)],
        "raw_export_skeleton": skeleton,
        "renders": ["gas-mask-pilot-roundtrip-front.png", "gas-mask-pilot-roundtrip-three-quarter.png"],
    }


def triangles(meshes: list[bpy.types.Object]) -> int:
    return sum(sum(max(0, len(face.vertices) - 2) for face in mesh.data.polygons) for mesh in meshes)


def natural_pose(rig: bpy.types.Object) -> None:
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0.0, 0.0, 0.0)


def deformation_pose(rig: bpy.types.Object) -> None:
    natural_pose(rig)
    # A deliberately asymmetric articulation makes each joint visible in one
    # static review image.  These are temporary native-rig rotations only;
    # natural_pose() restores the neutral export rest pose immediately after
    # the capture.  The local X rotations bend the fitted MPFB elbow and knee
    # planes, unlike local Y (twist) or the old crossed-leg combination.
    rotations = {
        "mixamorig:LeftArm": (math.radians(35), 0.0, 0.0),
        "mixamorig:LeftForeArm": (math.radians(70), 0.0, 0.0),
        "mixamorig:RightArm": (math.radians(-25), 0.0, 0.0),
        "mixamorig:RightForeArm": (math.radians(-55), 0.0, 0.0),
        "mixamorig:LeftLeg": (math.radians(-55), 0.0, 0.0),
    }
    for bone_name, rotation in rotations.items():
        bone = rig.pose.bones.get(bone_name)
        if bone is not None:
            bone.rotation_euler = rotation


def save_and_export(rig: bpy.types.Object, meshes: list[bpy.types.Object]) -> None:
    # MPFB's armature uses Cube/Icosphere display helpers. They are useful while
    # authoring but are not character geometry, so clear the display references
    # before this lean runtime-format export.
    for pose_bone in rig.pose.bones:
        pose_bone.custom_shape = None
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "mpfb-ct-pilot.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "mpfb-ct-pilot.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_yup=True,
    )


def tooling_proof() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    jacket = HumanService.add_mhclo_asset(
        str(ASSETS["jacket"]), body, subdiv_levels=0, material_type="GAMEENGINE"
    )
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (3.0, -6.3, 2.0), "tooling-import-render.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "tooling-proof.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    body.select_set(True)
    jacket.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / "tooling-proof.glb"), export_format="GLB", use_selection=True
    )
    evidence = {
        "stage": "tooling",
        "status": "tool-compatible",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "services": ["HumanService.create_human", "HumanService.add_builtin_rig", "HumanService.add_mhclo_asset"],
        "output": ["tooling-import-render.png", "tooling-proof.blend", "tooling-proof.glb"],
        "body": body.name,
        "rig": rig.name,
        "jacket": jacket.name,
    }
    (OUTPUT / "tooling-proof.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def native_diagnostic() -> None:
    """Capture native MPFB output before masks, joins, or optimization."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService)
    clothing = add_native_clothes(HumanService, body)
    meshes = [body, *clothing.values()]
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (0.0, -6.5, 1.7), "diagnostic-native-front.png")
    render_camera(camera, (4.5, -4.5, 2.15), "diagnostic-native-three-quarter.png")
    evidence = {
        "stage": "native-diagnostic",
        "status": "native-MPFB-output-before-export-preparation",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "operations_not_applied": ["coverage masks", "decimate", "material joins", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "renders": ["diagnostic-native-front.png", "diagnostic-native-three-quarter.png"],
        "rig": rig.name,
    }
    (OUTPUT / "diagnostic-native.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def mask_diagnostic() -> None:
    """Isolate the standard MPFB clothing-coverage masks from reduction."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService)
    clothing = add_native_clothes(HumanService, body)
    meshes = [body, *clothing.values()]
    for mesh in meshes:
        apply_coverage_masks(mesh)
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (0.0, -6.5, 1.7), "diagnostic-mask-front.png")
    render_camera(camera, (4.5, -4.5, 2.15), "diagnostic-mask-three-quarter.png")
    evidence = {
        "stage": "mask-diagnostic",
        "status": "MPFB-coverage-masks-applied-before-decimation",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "operations_applied": ["MPFB clothing delete-group MASK modifiers"],
        "operations_not_applied": ["decimate", "material joins", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "renders": ["diagnostic-mask-front.png", "diagnostic-mask-three-quarter.png"],
        "rig": rig.name,
    }
    (OUTPUT / "diagnostic-mask.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def reduction_diagnostic() -> None:
    """Measure the first safe per-piece reduction without material consolidation."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService)
    clothing = add_native_clothes(HumanService, body)
    meshes = [body, *clothing.values()]
    for mesh in meshes:
        apply_export_modifiers(mesh, ratio=0.035)
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (0.0, -6.5, 1.7), "diagnostic-reduction-front.png")
    render_camera(camera, (4.5, -4.5, 2.15), "diagnostic-reduction-three-quarter.png")
    evidence = {
        "stage": "reduction-diagnostic",
        "status": "per-piece-standard-decimate-before-join",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "operations_applied": ["MPFB coverage masks", "Blender DECIMATE ratio 0.035 per source mesh"],
        "operations_not_applied": ["material joins", "atlas bake", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "renders": ["diagnostic-reduction-front.png", "diagnostic-reduction-three-quarter.png"],
        "rig": rig.name,
    }
    (OUTPUT / "diagnostic-reduction.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def ct_source_diagnostic() -> None:
    """Render the revised CT source set before its budget work is designed."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, CT_SOURCE_ASSETS)
    meshes = [body, *clothing.values()]
    add_review_studio()
    camera = add_camera()
    render_camera(camera, (0.0, -6.5, 1.7), "diagnostic-ct-source-front.png")
    render_camera(camera, (4.5, -4.5, 2.15), "diagnostic-ct-source-three-quarter.png")
    evidence = {
        "stage": "ct-source-diagnostic",
        "status": "revised-native-CT-source-before-export-preparation",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "assets": {label: str(path.relative_to(ROOT)) for label, path in CT_SOURCE_ASSETS.items()},
        "operations_not_applied": ["decimate", "material joins", "atlas bake", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "renders": ["diagnostic-ct-source-front.png", "diagnostic-ct-source-three-quarter.png"],
        "rig": rig.name,
    }
    (OUTPUT / "diagnostic-ct-source.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def material_diagnostic() -> None:
    """Record MPFB's native material adjustment sockets before recoloring."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, _mpfb = register_scoped_mpfb()
    from mpfb.services import MaterialService  # pylint: disable=import-outside-toplevel

    body, _rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, CT_SOURCE_ASSETS)
    evidence = {}
    for label, mesh in clothing.items():
        material = mesh.active_material
        evidence[label] = {
            "material": material.name if material else None,
            "material_model": MaterialService.identify_material(material) if material else None,
            "color_adjustment": MaterialService.find_color_adjustment(mesh),
            "nodes": [
                {"name": node.name, "type": node.bl_idname, "inputs": [socket.name for socket in node.inputs]}
                for node in material.node_tree.nodes
            ] if material and material.node_tree else [],
        }
    (OUTPUT / "diagnostic-materials.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def freeze_source() -> None:
    """Freeze an unreduced, visibly CT-like native MPFB source for review.

    This is intentionally before all coverage masks, joins, decimation, atlas
    baking, and GLB export. It is the visual gate for source selection, not a
    qualified runtime candidate.
    """
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, CT_SOURCE_ASSETS)
    eyes = add_native_brown_eyes(HumanService, body)
    eye_visibility = expose_native_eyes(body)
    hood_asset_name = CT_SOURCE_ASSETS["balaclava"].stem
    eye_adaptation = cut_hood_eye_slit_from_native_eyes(clothing["balaclava"], eyes)
    hood_fit = offset_hood_over_head(clothing["balaclava"])
    body_face_visibility = preserve_native_eye_band_under_hood(body, hood_asset_name, eyes)
    vest_fit = offset_vest_over_uniform(clothing["vest"])
    tints = {
        "uniform": (0.055, 0.13, 0.46, 1.0),
        "vest": (0.045, 0.055, 0.07, 1.0),
        "balaclava": (0.006, 0.006, 0.008, 1.0),
        "gloves": (0.01, 0.012, 0.016, 1.0),
        "boots": (0.01, 0.012, 0.016, 1.0),
    }
    material_report = {
        label: apply_texture_preserving_tint(mesh, tints[label], label)
        for label, mesh in clothing.items()
    }
    # hood_2 has one imported material (the white eye motif is not a separately
    # addressable material-face group). Preserve its authored topology and do
    # not invent an eye opening by deleting or repainting faces.
    hood_material_slots = [material.name if material else None for material in clothing["balaclava"].data.materials]
    meshes = [body, eyes, *clothing.values()]
    add_review_studio()
    camera = add_camera()
    natural_pose(rig)
    render_camera(camera, (0.0, -6.5, 1.7), "candidate-source-front.png")
    render_camera(camera, (6.5, 0.0, 1.7), "candidate-source-side.png")
    render_camera(camera, (4.5, -4.5, 2.15), "candidate-source-three-quarter.png")
    render_head_closeup(camera, "candidate-source-head.png")
    render_torso_closeup(camera, "candidate-source-torso.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / "candidate-source-unoptimized.blend"))
    evidence = {
        "asset": "mpfb-ct-source",
        "stage": "freeze-source",
        "status": "frozen-unoptimized-source-awaiting-root-visual-gate",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "authoring": "Blender 4.5.9 background mode with --disable-autoexec",
        "native_services": [
            "HumanService.create_human (male macro phenotype)",
            "HumanService.set_character_skin (MPFB Game Engine skin)",
            "HumanService.add_builtin_rig(mixamo, import_weights=True)",
            "HumanService.add_mhclo_asset(... interpolate_weights=True, import_weights=True) for each garment",
        ],
        "assets": {
            "uniform": "Elvaerwyn male_coveralls_1 — author: Elvaerwyn; license text: CC-BY; source: suits03/packs/suits03.json",
            "vest": "Mindfront tactical_vest_male — author: Mindfront (Sweden); license text: CC BY 4.0; source: mindfront_tactical_vest_male.mhclo",
            "balaclava": "culturalibre hero-heroine_hood_2, CC0, masks01",
            "eyes": "MakeHuman low-poly eyes with brown.mhmat, CC0, makehuman_system_assets",
            "gloves": "toigo_gloves_short — selected MHCLO and OBJ headers: author MRT; license CC0. Pack catalog: author MargaretToigo; license CC0.",
            "boots": "toigo_ankle_boots_male — selected MHCLO and OBJ headers: author MRT; license CC0. Pack catalog: author MargaretToigo; license CC0.",
            "body_and_skin": "MPFB base mesh and MakeHuman middleage caucasian male skin, CC0 makehuman_system_assets",
        },
        "assets_relative_paths": {label: str(path.relative_to(ROOT)) for label, path in CT_SOURCE_ASSETS.items()},
        "source_color_treatment": "Blender node-based MULTIPLY of each imported MPFB diffuse texture by a uniform tint; source textures and normal maps retained.",
        "material_report": material_report,
        "balaclava_eye_insert_check": {"material_slots": hood_material_slots, **eye_adaptation, "native_face_visibility": body_face_visibility},
        "hood_fit": hood_fit,
        "native_eyes": {
            "service": "HumanService.add_mhclo_asset(low-poly.mhclo, asset_type='Eyes')",
            "object": eyes.name,
            "material_source": str(EYES_BROWN.relative_to(ROOT)),
            "triangles": triangles([eyes]),
            "bounds": world_bounds(eyes),
            "visibility": eye_visibility,
        },
        "vest_fit": vest_fit,
        "operations_not_applied": ["coverage masks", "decimate", "material joins", "atlas bake", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "material_slots_total": sum(len(mesh.data.materials) for mesh in meshes),
        "rig": rig.name,
        "renders": ["candidate-source-front.png", "candidate-source-side.png", "candidate-source-three-quarter.png", "candidate-source-head.png", "candidate-source-torso.png"],
        "editable_source": "candidate-source-unoptimized.blend",
    }
    (OUTPUT / "candidate-source.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def freeze_gas_mask_source(output_dir: Path = GAS_MASK_OUTPUT) -> None:
    """Freeze the native gas-mask alternative before any budget operation.

    This intentionally replaces the rejected superhero hood wholesale.  The
    mask is loaded through MPFB's clothing service and keeps its author-supplied
    head coverage and circular lens geometry: no Boolean, head edit, eye cut,
    added source eyes, or manual fit/weight work is performed.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, GAS_MASK_SOURCE_ASSETS)
    gas_mask = clothing["gas_mask"]
    coverage_name = f"Delete.{GAS_MASK_SOURCE_ASSETS['gas_mask'].stem}"
    coverage = body.modifiers.get(coverage_name)
    # This particular source garment has no delete-group records in its MHCLO,
    # so MPFB imports no corresponding body MASK.  Record that fact and leave
    # all source state intact; do not fabricate a coverage group to compensate.
    if coverage is not None and (coverage.type != "MASK" or not coverage.show_viewport or not coverage.show_render):
        raise RuntimeError("MPFB gas-mask coverage modifier exists but is not active")

    # Retain every source texture and UV while using a dark neutral MULTIPLY
    # tint on the mask's one imported material.  This turns the package's
    # chalk-white rubber and eye rims into readable tactical charcoal without
    # replacing albedo, lens geometry, or source material assignment.
    tints = GAS_MASK_TINTS
    material_report = {
        label: apply_texture_preserving_tint(clothing[label], tints[label], label)
        for label in ("uniform", "vest", "gloves", "boots")
    }
    material_report["gas_mask"] = apply_texture_preserving_tint(gas_mask, tints["gas_mask"], "gas_mask")
    vest_fit = offset_vest_over_uniform(clothing["vest"])

    meshes = [body, *clothing.values()]
    add_review_studio()
    camera = add_camera()
    natural_pose(rig)
    render_camera(camera, (0.0, -6.5, 1.7), "gas-mask-source-front.png", output_dir)
    render_camera(camera, (4.5, -4.5, 2.15), "gas-mask-source-three-quarter.png", output_dir)
    render_head_closeup(camera, "gas-mask-source-head.png", output_dir)
    render_torso_closeup(camera, "gas-mask-source-torso.png", output_dir)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "gas-mask-source-unoptimized.blend"))

    evidence = {
        "asset": "mpfb-ct-gas-mask-source",
        "stage": "freeze-gas-mask-source",
        "status": "frozen-unoptimized-source-awaiting-root-visual-gate",
        "costume_note": "Documented CT/SAS-like approximation using a native MPFB WW2-style Soviet gas mask; it is not claimed as exact SAS equipment.",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "authoring": "Blender 4.5.9 background mode with --disable-autoexec",
        "native_services": [
            "HumanService.create_human (male macro phenotype)",
            "HumanService.set_character_skin (MPFB Game Engine skin)",
            "HumanService.add_builtin_rig(mixamo, import_weights=True)",
            "HumanService.add_mhclo_asset(... interpolate_weights=True, import_weights=True) for each garment including the gas mask",
        ],
        "rig_fit": "MPFB detailed helper landmarks and extra base-mesh vertex groups were retained while add_builtin_rig(mixamo) fitted the skeleton. Export cleanup may remove helpers only after this native bind is established.",
        "assets": {
            "uniform": "Elvaerwyn male_coveralls_1 — author: Elvaerwyn; license text: CC-BY; source: suits03/packs/suits03.json",
            "vest": "Mindfront tactical_vest_male — author: Mindfront (Sweden); license text: CC BY 4.0; source: mindfront_tactical_vest_male.mhclo",
            "gas_mask": "Masks02 package page/source manifest: Mathias_Gredal, CC-BY. Selected gredal_gas_mask.mhclo and Gas_Mask.mhmat headers each state author: unknown; license: CC0; both provenance statements retained.",
            "gloves": "toigo_gloves_short — selected MHCLO and OBJ headers: author MRT; license CC0. Pack catalog: author MargaretToigo; license CC0.",
            "boots": "toigo_ankle_boots_male — selected MHCLO and OBJ headers: author MRT; license CC0. Pack catalog: author MargaretToigo; license CC0.",
            "body_and_skin": "MPFB base mesh and MakeHuman middleage caucasian male skin, CC0 makehuman_system_assets",
        },
        "assets_relative_paths": {label: str(path.relative_to(ROOT)) for label, path in GAS_MASK_SOURCE_ASSETS.items()},
        "gas_mask_source": {
            "page": "https://static.makehumancommunity.org/assets/assetpacks/masks02.html",
            "archive_manifest": "assets/source/mpfb/packs/masks02-source.json",
            "selected_mhclo_header": {"author": "unknown", "license": "CC0", "description": "A WW2 style soviet gas mask"},
            "selected_mhmat_header": {"author": "unknown", "license": "CC0"},
        },
        "native_coverage": ({
            "modifier": coverage.name,
            "vertex_group": coverage.vertex_group,
            "state": "MPFB supplied coverage mask retained enabled; no head, eye, or body geometry was manually edited.",
        } if coverage is not None else {
            "modifier": None,
            "vertex_group": None,
            "state": "Selected gas-mask MHCLO supplied no Delete-group coverage modifier after native import; no synthetic mask or body edit was added.",
        }),
        "material_report": material_report,
        "material_readability_revision": {
            "trigger": "Root runtime paired capture: fixed outdoor game lighting made the prior dark source multipliers unreadable; qualification-studio source/bake/roundtrip radiometry did not indicate atlas or color-space loss.",
            "previous_mixrgb_multiply_tints": PREVIOUS_GAS_MASK_TINTS,
            "current_mixrgb_multiply_tints": GAS_MASK_TINTS,
            "current_roughness": 0.85,
            "scope": "Source Principled/MixRGB inputs only; authored textures, meshes, UVs, skin weights, material slots, review camera, and game lighting are unchanged.",
        },
        "vest_fit": vest_fit,
        "operations_not_applied": ["manual head/eye edits", "coverage-mask baking", "decimate", "material joins", "atlas bake", "GLB export"],
        "objects": {mesh.name: triangles([mesh]) for mesh in meshes},
        "triangles_total": triangles(meshes),
        "material_slots_total": sum(len(mesh.data.materials) for mesh in meshes),
        "rig": rig.name,
        "renders": ["gas-mask-source-front.png", "gas-mask-source-three-quarter.png", "gas-mask-source-head.png", "gas-mask-source-torso.png"],
        "editable_source": "gas-mask-source-unoptimized.blend",
    }
    (output_dir / "gas-mask-source.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def export_full_helper_bind_validation() -> None:
    """Export an unoptimized, neutral GLB solely to prove the repaired bind.

    This is a disposable export copy.  It retains source meshes, native Mixamo
    weights, and their original material assignments; it only evaluates the
    MPFB visibility masks so the helper landmarks used for fitting never ship.
    No decimation, joining, atlas baking, pose conversion, or facing correction
    occurs in this stage.
    """
    GAS_MASK_BIND_VALIDATION_OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, GAS_MASK_SOURCE_ASSETS)
    tints = GAS_MASK_TINTS
    for label, tint in tints.items():
        apply_texture_preserving_tint(clothing[label], tint, label)
    vest_fit = offset_vest_over_uniform(clothing["vest"])

    meshes = [body, *clothing.values()]
    for mesh in meshes:
        apply_coverage_masks(mesh)
    natural_pose(rig)
    glb = save_and_export_to(
        GAS_MASK_BIND_VALIDATION_OUTPUT, rig, meshes, "mpfb-ct-full-helper-bind-validation"
    )
    evidence = {
        "asset": "mpfb-ct-full-helper-bind-validation",
        "purpose": "Unoptimized neutral GLB for skeletal-bind review before reduction or atlas work.",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "source": "../../gas-mask-source/full-helper-rig-source-cc0-gloves-boots/gas-mask-source-unoptimized.blend",
        "glb": glb.name,
        "blend": "mpfb-ct-full-helper-bind-validation.blend",
        "native_rig": "HumanService.add_builtin_rig(mixamo, import_weights=True) with detailed_helpers=True and extra_vertex_groups=True at rig fit time.",
        "export_copy_operations": ["applied existing MPFB visibility masks, including Hide helpers"],
        "not_applied": ["pose conversion", "manual bone or weight edits", "decimation", "mesh joining", "atlas baking", "facing correction"],
        "vest_fit": vest_fit,
        "triangles": triangles(meshes),
        "material_slots": sum(len(mesh.data.materials) for mesh in meshes),
        "mesh_names": [mesh.name for mesh in meshes],
        "required_mixamo_bones_present": all(name in rig.data.bones for name in [
            "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2",
            "mixamorig:Neck", "mixamorig:Head", "mixamorig:LeftArm", "mixamorig:LeftForeArm",
            "mixamorig:LeftHand", "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
            "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:RightUpLeg",
            "mixamorig:RightLeg", "mixamorig:RightFoot",
        ]),
    }
    (GAS_MASK_BIND_VALIDATION_OUTPUT / "provenance.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def limit_vertex_groups_to_four(mesh: bpy.types.Object) -> None:
    """Use Blender's standard export compatibility operation on a copy.

    glTF stores four JOINTS/WEIGHTS entries by default.  MPFB's native body
    source can have more overlapping authored groups, so this removes the
    lower influences and normalizes the retained authored weights.  It never
    paints, invents, or coordinate-selects weights.
    """
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.vertex_group_limit_total(limit=4)


def retain_native_mixamo_deform_groups(mesh: bpy.types.Object) -> list[str]:
    """Remove MPFB helper/mask groups after their export-copy masks are baked.

    The source body carries helper groups such as ``body``, ``Left`` and
    ``Delete.*`` at weight 1.0.  They are not armature bones, but Blender's
    generic four-weight limiter sees them as higher priority than real Mixamo
    hand and finger influences.  On the export copy, retain only MPFB's
    existing ``mixamorig:`` groups before applying Blender's standard limit.
    """
    removed = []
    for group in list(mesh.vertex_groups):
        if not group.name.startswith("mixamorig:"):
            removed.append(group.name)
            mesh.vertex_groups.remove(group)
    return removed


def export_full_helper_weight_validation() -> None:
    """Make a native MPFB export copy with standard four-weight limiting.

    This isolates glTF's four-influence compatibility preparation from every
    visual budget operation.  The source hierarchy stays editable and intact.
    """
    GAS_MASK_WEIGHT_VALIDATION_OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    from mpfb.services import ExportService  # pylint: disable=import-outside-toplevel

    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, GAS_MASK_SOURCE_ASSETS)
    for label, tint in GAS_MASK_TINTS.items():
        apply_texture_preserving_tint(clothing[label], tint, label)
    vest_fit = offset_vest_over_uniform(clothing["vest"])

    export_root = ExportService.create_character_copy(body, name_suffix="_weight_validation")
    export_body = next(
        child for child in export_root.children
        if child.type == "MESH" and child.name.startswith("MPFB_CT_Body")
    )
    # MPFB's export service owns helper removal on the duplicated native body.
    ExportService.bake_modifiers_remove_helpers(
        export_body, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=False
    )
    export_meshes = [child for child in export_root.children if child.type == "MESH"]
    auxiliary_groups_removed = {}
    for mesh in export_meshes:
        apply_coverage_masks(mesh)
        auxiliary_groups_removed[mesh.name] = retain_native_mixamo_deform_groups(mesh)
        limit_vertex_groups_to_four(mesh)
    natural_pose(export_root)
    glb = save_and_export_to(
        GAS_MASK_WEIGHT_VALIDATION_OUTPUT, export_root, export_meshes,
        "mpfb-ct-full-helper-weight-validation"
    )
    evidence = {
        "asset": "mpfb-ct-full-helper-weight-validation",
        "purpose": "Neutral GLB bind test after MPFB export-copy helper removal and Blender standard four-influence limiting.",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "source": "../../gas-mask-source/full-helper-rig-source-cc0-gloves-boots/gas-mask-source-unoptimized.blend",
        "glb": glb.name,
        "blend": "mpfb-ct-full-helper-weight-validation.blend",
        "native_export_copy": "ExportService.create_character_copy followed by ExportService.bake_modifiers_remove_helpers on the copy only.",
        "weight_compatibility": "After MPFB masks are baked, non-deforming helper/mask groups are removed from the export copy and Blender vertex_group_limit_total(limit=4) retains and normalizes the four strongest native Mixamo influences.",
        "auxiliary_groups_removed": auxiliary_groups_removed,
        "not_applied": ["manual weight edits", "pose conversion", "decimation", "mesh joining", "atlas baking", "facing correction"],
        "vest_fit": vest_fit,
        "triangles": triangles(export_meshes),
        "material_slots": sum(len(mesh.data.materials) for mesh in export_meshes),
        "mesh_names": [mesh.name for mesh in export_meshes],
    }
    (GAS_MASK_WEIGHT_VALIDATION_OUTPUT / "provenance.json").write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence, indent=2))


def gas_mask_pilot() -> None:
    """Make the two-material, budgeted GLB copy of the approved gas-mask source."""
    GAS_MASK_PILOT_OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService, rig_name="mixamo")
    clothing = add_native_clothes(HumanService, body, GAS_MASK_SOURCE_ASSETS)
    tints = GAS_MASK_TINTS
    for label, tint in tints.items():
        apply_texture_preserving_tint(clothing[label], tint, label)
    vest_fit = offset_vest_over_uniform(clothing["vest"])

    # Build the budgeted artifact from MPFB's self-contained export copy.  The
    # frozen full-helper source is kept in the same authoring scene but is never
    # selected for export or altered by visibility, reduction, or atlas work.
    from mpfb.services import ExportService  # pylint: disable=import-outside-toplevel
    source_body, source_clothing, source_rig = body, clothing, rig
    rig = ExportService.create_character_copy(source_body, name_suffix="_budget")
    body = next(child for child in rig.children if child.name == f"{source_body.name}_budget")
    clothing = {
        label: next(child for child in rig.children if child.name == f"{mesh.name}_budget")
        for label, mesh in source_clothing.items()
    }
    ExportService.bake_modifiers_remove_helpers(
        body, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=False
    )
    # Retain the untouched source in the editable blend, but do not render it
    # over the derived copy: coincident source/copy surfaces would otherwise
    # present as false black-white z-fighting in the qualification captures.
    source_rig.hide_render = True
    source_body.hide_render = True
    for source_mesh in source_clothing.values():
        source_mesh.hide_render = True

    # These allocations total 11,550 triangles before joins, preserving the
    # respirator's opaque lens surface while remaining below 12k without a
    # destructive global factor. Each ratio is computed from the actually
    # visible result after MPFB's own masks apply.
    allocations = {
        "body": 2700,
        "uniform": 3800,
        "vest": 1900,
        "gas_mask": 1800,
        "gloves": 800,
        "boots": 550,
    }
    reduction = {"body": reduce_visible_mesh_to_budget(body, allocations["body"], retain_neck_only=True)}
    for label, mesh in clothing.items():
        reduction[label] = reduce_visible_mesh_to_budget(mesh, allocations[label])
    auxiliary_groups_removed = {}
    for mesh in [body, *clothing.values()]:
        auxiliary_groups_removed[mesh.name] = retain_native_mixamo_deform_groups(mesh)

    uniform = join_material_group("MPFB_CT_Atlas_NavyUniform", [clothing["uniform"]])
    equipment = join_material_group(
        "MPFB_CT_Atlas_Equipment",
        [body, clothing["vest"], clothing["gas_mask"], clothing["gloves"], clothing["boots"]],
    )
    _uniform_material, uniform_atlas = bake_group_atlas(uniform, "CT_NavyUniform")
    _equipment_material, equipment_atlas = bake_group_atlas(equipment, "CT_Equipment")
    exported_meshes = [uniform, equipment]
    for mesh in exported_meshes:
        limit_vertex_groups_to_four(mesh)
    triangle_count = triangles(exported_meshes)
    material_draws = sum(len(mesh.data.materials) for mesh in exported_meshes)
    if triangle_count > 12000:
        raise RuntimeError(f"Gas-mask pilot exceeds triangle limit: {triangle_count} > 12000")
    if material_draws > 2:
        raise RuntimeError(f"Gas-mask pilot exceeds material draw limit: {material_draws} > 2")

    required_bones = [
        "mixamorig:Hips", "mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2",
        "mixamorig:Neck", "mixamorig:Head", "mixamorig:LeftArm", "mixamorig:LeftForeArm",
        "mixamorig:LeftHand", "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
        "mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot", "mixamorig:RightUpLeg",
        "mixamorig:RightLeg", "mixamorig:RightFoot",
    ]
    rig_bones = {bone.name for bone in rig.data.bones}
    missing_bones = [name for name in required_bones if name not in rig_bones]
    if missing_bones:
        raise RuntimeError(f"Native MPFB Mixamo rig missing gameplay bones: {missing_bones}")

    add_review_studio()
    camera = add_camera()
    natural_pose(rig)
    render_camera(camera, (0.0, -6.5, 1.7), "gas-mask-pilot-native-front.png", GAS_MASK_PILOT_OUTPUT)
    render_camera(camera, (4.5, -4.5, 2.15), "gas-mask-pilot-native-three-quarter.png", GAS_MASK_PILOT_OUTPUT)
    deformation_pose(rig)
    render_camera(camera, (4.5, -4.5, 2.15), "gas-mask-pilot-native-deformation.png", GAS_MASK_PILOT_OUTPUT)
    natural_pose(rig)
    glb = save_and_export_to(GAS_MASK_PILOT_OUTPUT, rig, exported_meshes, "mpfb-ct-gas-mask-pilot")
    roundtrip = render_glb_roundtrip(GAS_MASK_PILOT_OUTPUT, glb)

    attribution = {
        "export": "outputs/cs16/reuse/mpfb-ct/gas-mask-pilot/mpfb-ct-gas-mask-pilot.glb",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "gas_mask": {
            "package_page": "https://static.makehumancommunity.org/assets/assetpacks/masks02.html",
            "archive_manifest": "assets/source/mpfb/packs/masks02-source.json",
            "package_attribution": "Mathias_Gredal; CC-BY",
            "selected_file_header_text": {
                "gredal_gas_mask.mhclo": "author: unknown; license: CC0",
                "Gas_Mask.mhmat": "author: unknown; license: CC0",
            },
        },
        "uniform": {
            "selected_file_header_text": {
                "elvs_male_coveralls_1.mhclo": "author: Elvaerwyn; license: CC-BY",
                "elvs_male_mechanics_coverall1a.obj": "author: Elvaerwyn; license: CC-BY",
            },
        },
        "vest": {
            "selected_file_header_text": {
                "mindfront_tactical_vest_male.mhclo": "author Mindfront (Sweden); license CC BY 4.0",
                "tactical_vest_male.obj": "author Mindfront (Sweden); license CC BY 4.0",
            },
        },
        "gloves": {
            "selected_file_header_text": {
                "toigo_gloves_short.mhclo": "author MRT; license CC0",
                "gloves_hand.obj": "author MRT; license CC0",
            },
            "pack_catalog": "gloves01/packs/gloves01.json: author MargaretToigo; license CC0",
        },
        "boots": {
            "selected_file_header_text": {
                "toigo_ankle_boots_male.mhclo": "author MRT; license CC0",
                "boots_ankle_male.obj": "author MRT; license CC0",
            },
            "pack_catalog": "shoes01/packs/shoes01.json: author MargaretToigo; license CC0",
        },
        "body_and_skin": "MPFB MakeHuman body and middleage caucasian male skin; CC0 makehuman_system_assets",
        "disposition": "Exact selected glove and boot MHCLO/OBJ headers and their pack-catalog records are CC0.",
    }
    attribution_path = ROOT / "assets/source/mpfb-ct/gas-mask-pilot-attribution.json"
    attribution_path.write_text(json.dumps(attribution, indent=2) + "\n")
    provenance = {
        "asset": "mpfb-ct-gas-mask-pilot",
        "status": "frozen-offline-export-candidate-awaiting-root-visual-and-renderer-material-gate",
        "costume_note": "CT/SAS-like approximation using sourced MPFB gas-mask equipment; not asserted as exact SAS issue gear.",
        "source_editable_blend": "../gas-mask-source/full-helper-rig-source-cc0-gloves-boots/gas-mask-source-unoptimized.blend",
        "export_editable_blend": "mpfb-ct-gas-mask-pilot.blend",
        "glb": glb.name,
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "authoring": "Blender 4.5.9 background mode with --disable-autoexec",
        "native_services": [
            "HumanService.create_human", "HumanService.set_character_skin",
            "HumanService.add_builtin_rig(mixamo, import_weights=True)",
            "HumanService.add_mhclo_asset(... interpolate_weights=True, import_weights=True)",
        ],
        "native_weights": "MPFB-authored Mixamo weights retained; the derived export copy drops non-deforming helper/mask groups and uses Blender's standard four-influence limiter, with no coordinate-authored weights or clips.",
        "native_rest_pose": "Neutral Mixamo rest pose was restored before the blend and GLB export.",
        "vest_fit": vest_fit,
        "export_preparation": {
            "native_export_copy": "ExportService.create_character_copy with ExportService.bake_modifiers_remove_helpers on the derived copy only.",
            "native_visibility": "Applied existing MPFB MASK modifiers only; visible neck anatomy was retained.",
            "auxiliary_groups_removed": auxiliary_groups_removed,
            "weight_compatibility": "Blender vertex_group_limit_total(limit=4) after helper/mask groups were removed from the derived export copy.",
            "per_piece_reduction": reduction,
            "atlas_bake": {"uniform": uniform_atlas, "equipment": equipment_atlas},
            "atlas_uv_repair": {
                "cause": "The previous candidate kept imported UVMap as active_render and left the final atlas Image Texture Vector unconnected. Blender therefore sampled the packed atlas with source UVs.",
                "repair": "Set each generated atlas UV layer as active_render before baking and connect an explicit ShaderNodeUVMap for that atlas UV to the final atlas Image Texture Vector.",
                "paired_evidence": [
                    "atlas-uv-diagnosis-before.json",
                    "atlas-uv-diagnosis-after.json",
                    "atlas-uv-paired-artifact-comparison.json",
                    "atlas-uv-repair-radiometry.json",
                    "atlas-uv-before-after-comparison.png",
                ],
                "failing_candidate_preserved": "../gas-mask-pilot-cc0-material-bake-gate-failing/",
            },
            "material_graph": "Baked the evaluated source texture-plus-MULTIPLY tint Base Color into packed standard glTF atlas images.",
            "geometry_or_weight_authoring": "None; standard Blender operations only on the derived export copy.",
        },
        "limits": {"triangles": triangle_count, "triangle_limit": 12000, "material_draws": material_draws, "draw_limit": 2},
        "mixamo": {"required_gameplay_bones": required_bones, "missing": missing_bones, "native_bone_count": len(rig_bones), "export_yup": True},
        "roundtrip": roundtrip,
        "attribution_record": str(attribution_path.relative_to(ROOT)),
        "material_readability_revision": {
            "trigger": "Root runtime paired capture: fixed outdoor game lighting made the prior dark source multipliers unreadable; qualification-studio source/bake/roundtrip radiometry did not indicate atlas or color-space loss.",
            "previous_mixrgb_multiply_tints": PREVIOUS_GAS_MASK_TINTS,
            "current_mixrgb_multiply_tints": GAS_MASK_TINTS,
            "current_roughness": 0.85,
            "scope": "Source Principled/MixRGB inputs only; authored textures, meshes, UVs, skin weights, material slots, review camera, and game lighting are unchanged.",
        },
        "renders": [
            "gas-mask-pilot-native-front.png", "gas-mask-pilot-native-three-quarter.png",
            "gas-mask-pilot-native-deformation.png", "gas-mask-pilot-roundtrip-front.png",
            "gas-mask-pilot-roundtrip-three-quarter.png",
        ],
        "animation": "No authored clips in this pilot. The deformation capture uses temporary rotations on the native MPFB Mixamo rig and was reset before export.",
    }
    (GAS_MASK_PILOT_OUTPUT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(provenance, indent=2))


def pilot() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    prepare_empty_scene()
    HumanService, TargetService, mpfb = register_scoped_mpfb()
    configure_render()
    body, rig = create_human(HumanService, TargetService)
    clothing = add_native_clothes(HumanService, body)

    navy = make_recolor_material("CT_Navy_Cloth", (0.006, 0.018, 0.055, 1.0))
    dark = make_recolor_material("CT_Dark_Equipment", (0.002, 0.003, 0.006, 1.0))
    assign_recolor(body, dark)
    for label in ("jacket", "pants"):
        assign_recolor(clothing[label], navy)
    for label in ("helmet", "gloves", "boots"):
        assign_recolor(clothing[label], dark)

    all_meshes = [body, *clothing.values()]
    for mesh in all_meshes:
        apply_export_modifiers(mesh, ratio=0.035)

    uniform = join_material_group("MPFB_CT_NavyUniform", [clothing["jacket"], clothing["pants"]])
    equipment = join_material_group(
        "MPFB_CT_DarkEquipmentAndHead",
        [body, clothing["helmet"], clothing["gloves"], clothing["boots"]],
    )
    # The dark group still contains the continuous body plus four refitted
    # assets. A final ordinary decimation pass gives the pilot its declared
    # 12k-triangle ceiling after the material join, without changing weights.
    apply_export_modifiers(equipment, ratio=0.82)
    exported_meshes = [uniform, equipment]
    triangle_count = triangles(exported_meshes)

    add_review_studio()
    camera = add_camera()
    natural_pose(rig)
    render_camera(camera, (0.0, -6.5, 1.7), "ct-front.png")
    render_camera(camera, (6.5, 0.0, 1.7), "ct-side.png")
    render_camera(camera, (4.5, -4.5, 2.15), "ct-three-quarter.png")
    deformation_pose(rig)
    render_camera(camera, (4.5, -4.5, 2.15), "ct-deformation-shoulder-elbow-knee.png")
    natural_pose(rig)
    save_and_export(rig, exported_meshes)

    provenance = {
        "asset": "mpfb-ct-pilot",
        "status": "frozen-offline-candidate-awaiting-visual-gate",
        "mpfb": {"version": list(mpfb.VERSION), "source_commit": "80919fa4682335c41847f761a4d79dcad4124732"},
        "authoring": "Blender 4.5.9 background mode with --disable-autoexec",
        "native_services": [
            "HumanService.create_human (male macro phenotype)",
            "HumanService.set_character_skin (MPFB Game Engine skin)",
            "HumanService.add_builtin_rig(game_engine, import_weights=True)",
            "HumanService.add_mhclo_asset(... interpolate_weights=True, import_weights=True) for each garment",
        ],
        "assets": {
            "jacket": "Elvaerwyn EMT uniform jacket male, CC-BY, suits03/packs/suits03.json",
            "pants": "Elvaerwyn EMT uniform pants male, CC-BY, suits03/packs/suits03.json",
            "helmet": "MrGreaterThan M1 helmet, CC0, hats02/packs/hats02.json",
            "gloves": "culturalibre hero-heroine gloves 1, CC0, gloves01/packs/gloves01.json",
            "boots": "culturalibre male boots, CC0, shoes01/packs/shoes01.json",
            "body_and_skin": "MPFB built-in base mesh and MakeHuman system middleage caucasian male skin, source assets pack CC0",
        },
        "export_preparation": "MPFB clothing delete groups applied; standard Blender decimate at 0.035, joined by two reusable materials, then dark-group decimate at 0.82. No manual anatomy or coordinate weight authoring.",
        "limits": {"triangles": triangle_count, "material_draws": 2, "triangle_limit": 12000, "draw_limit": 2},
        "artifacts": [
            "mpfb-ct-pilot.blend",
            "mpfb-ct-pilot.glb",
            "ct-front.png",
            "ct-side.png",
            "ct-three-quarter.png",
            "ct-deformation-shoulder-elbow-knee.png",
        ],
        "animation": "No authored clips shipped by this pilot. The deformation capture poses the actual MPFB game_engine rig only.",
    }
    (OUTPUT / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(provenance, indent=2))
    if triangle_count > 12000:
        raise RuntimeError(f"Pilot exceeds triangle limit: {triangle_count} > 12000")


def main() -> None:
    stage = command_line_arguments().stage
    if stage == "tooling":
        tooling_proof()
    elif stage == "native-diagnostic":
        native_diagnostic()
    elif stage == "mask-diagnostic":
        mask_diagnostic()
    elif stage == "reduction-diagnostic":
        reduction_diagnostic()
    elif stage == "ct-source-diagnostic":
        ct_source_diagnostic()
    elif stage == "material-diagnostic":
        material_diagnostic()
    elif stage == "freeze-source":
        freeze_source()
    elif stage == "freeze-gas-mask-source":
        freeze_gas_mask_source()
    elif stage == "freeze-gas-mask-full-helper-source":
        freeze_gas_mask_source(GAS_MASK_FULL_HELPER_OUTPUT)
    elif stage == "gas-mask-bind-validation":
        export_full_helper_bind_validation()
    elif stage == "gas-mask-weight-validation":
        export_full_helper_weight_validation()
    elif stage == "gas-mask-pilot":
        gas_mask_pilot()
    else:
        pilot()


if __name__ == "__main__":
    main()
