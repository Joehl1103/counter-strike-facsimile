# Reused first-person AK pilot

`ak47.glb` combines two independently authored CC0 sources:

- AK mesh and textures: Stein Games, Classic Weapons Pack v1.1,
  [author page](https://stein-indie.itch.io/classic-weapons-pack).
  The downloaded pack's `license.txt` explicitly grants CC0 1.0.
- Hands, arms, gloves, textures and source rig: WRAD arms by wwwriks,
  [repository](https://github.com/wwwriks/wrad-arms), commit
  `f3987244176c33d2c20d4f9e139980af12684d87`, CC0 1.0.

The adaptation reduces the weapon mesh, poses the existing arm rig, crops hidden
stock geometry for the first-person camera, and exports a static assembly with
muzzle/ejection sockets. Original geometry, UVs and textures remain the authoring
inputs. No original Counter-Strike art is included. This is an in-development
pilot; it does not include authored reload animation clips.

Source copies, original licenses and download hashes are retained in
`assets/source/reused-ak/` in the repository. Reproduction uses
`scripts/adapt-reused-ak-viewmodel.py` and
`scripts/prepare-rifle-viewmodel.mjs`; validation and paired captures live under
`outputs/cs16/reuse/`.

The earlier `ak-pilot.glb` and recovery atlases are historical comparison assets,
not the rifle loaded by the current application.
