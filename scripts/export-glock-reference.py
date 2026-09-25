"""Export four matched actions from one frozen Glock source without rebuilding it.

Every clip reopens the same .blend. This prevents action state or per-action
geometry rounding from changing the mesh/skin contract between clips.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

PAIRED_ACTIONS = {
    "Idle": ("Arms_BasePose", "Pistol_Breathing", 1, 200),
    "Fire": ("Arms_Fire", "Pistol_Fire", 1, 14),
    "Reload": ("Arms_Reload", "Pistol_Reload", 1, 37),
    "Equip": ("Arms_Draw", "Pistol_Draw", 1, 12),
}
SOURCE_TEXTURES = {
    "Pistol_01_Albedo.png": "assets/source/kuptchi-weapons/Guns/Pistol_01/Textures/Pistol_01_Albedo.png",
    "Untitled.001": "assets/source/kuptchi-weapons/FP_Arms/Texture/FPS_Arms_Albedo.png",
}
EXPORT_OBJECTS = (
    "Arms_Armature",
    "Pistol_01_Armature",
    "FPS_Arms_Mesh",
    "Glock_Mesh",
    "source-camera-reference",
    "muzzle-socket",
    "ejection-socket",
)


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project-root",
        type=Path,
        required=True,
        help="Project containing the licensed source textures.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Frozen glock-rig-source.blend created once in Idle.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Directory for raw per-clip GLBs and export manifest.",
    )
    parser.add_argument(
        "--clips",
        choices=tuple(PAIRED_ACTIONS),
        nargs="+",
        default=list(PAIRED_ACTIONS),
        help="Defaults to all four actions.",
    )
    return parser.parse_args(
        sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    )


def repair_texture_paths(project_root):
    """Relink existing image datablocks to the checked-in licensed texture paths."""
    for image_name, relative_path in SOURCE_TEXTURES.items():
        texture_path = (project_root / relative_path).resolve(strict=True)
        image = bpy.data.images.get(image_name)
        if image is None:
            raise RuntimeError(f"The frozen source is missing image {image_name}.")
        image.source = "FILE"
        image.filepath = str(texture_path)
        image.reload()


def select_paired_action(semantic):
    arms_action, pistol_action, start, end = PAIRED_ACTIONS[semantic]
    for rig_name, action_name in (
        ("Arms_Armature", arms_action),
        ("Pistol_01_Armature", pistol_action),
    ):
        rig = bpy.data.objects[rig_name]
        rig.animation_data.action = bpy.data.actions[action_name]
        for track in rig.animation_data.nla_tracks:
            track.mute = True
    scene = bpy.context.scene
    scene.frame_start = start
    scene.frame_end = end
    scene.frame_set(start)
    bpy.context.view_layer.update()


def export_clip(destination):
    objects = [bpy.data.objects[name] for name in EXPORT_OBJECTS]
    bpy.ops.object.select_all(action="DESELECT")
    for object_ in objects:
        object_.hide_set(False)
        object_.hide_select = False
        object_.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
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


def main():
    args = arguments()
    project_root = args.project_root.expanduser().resolve(strict=True)
    source = args.source.expanduser().resolve(strict=True)
    output = args.output.expanduser().resolve()
    if source.suffix.lower() != ".blend":
        raise ValueError("--source must be the frozen .blend file.")
    if len(set(args.clips)) != len(args.clips):
        raise ValueError("Each action may appear only once in --clips.")
    destinations = {semantic: output / (semantic + ".glb") for semantic in args.clips}
    manifest_path = output / "export-manifest.json"
    for path in (*destinations.values(), manifest_path):
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite existing evidence: {path}")
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": str(source),
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "blenderVersion": bpy.app.version_string,
        "policy": "Reopen one frozen source for each action; no geometry edits or action bake.",
        "clips": {},
    }
    for semantic, destination in destinations.items():
        bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
        repair_texture_paths(project_root)
        select_paired_action(semantic)
        export_clip(destination)
        manifest["clips"][semantic] = {
            "path": destination.name,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
            "pairedActionsAndFrameRange": PAIRED_ACTIONS[semantic],
        }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
