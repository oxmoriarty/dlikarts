# Retree character and kart rebuild

## Delivered assets and selection

`assets/characters/retree-rebuilt/Retree.glb`, `RetreeKart.glb`, and `RetreeDriving.glb` are newly constructed meshes based on the user's three supplied references. Editable Blender scenes and front/rear review renders are under `blender/characters/retree-rebuilt/`. The source uploads under `assets/characters/retree/new-models/` remain unchanged; their SHA-256 hashes are recorded in `build-metrics.json` and checked by the automated tests.

Retree is available in the existing PICK A RACER grid, with an independently rendered 3:2 card image. Selection updates the launch label, persists on the device where storage is available, and passes `racer=retree` to the game. Retry reloads the same URL and retains the character. Guatam remains the default for absent/invalid selections. The race loads only the chosen driving model and the existing shared CPU kart; the standing and separate Retree kart exports are loaded by the garage, not by the race.

The asset garage at `/prototype/?models=retree` supports standing character, kart only, and driver in kart inspection, plus wheel roll and front steering sliders. Its initial camera faces the front of the Retree exports.

## Visual construction

Retree has a dark navy face, white oval eyes with blue framing, layered brown hair, charcoal hoodie, cargo trousers, white-soled black shoes, exposed hands in the standing pose, and white gloves gripping the wheel in the seated pose. Broad curved hair locks and overlapping shingles form the crown and fringe.

The kart has a chamfered wedge bonnet, raised central strip, navy side pods, circular dark headlamp lenses, blue chassis accents, blue rim rings, a navy rear wing with cyan end plates, seat, steering wheel, and twin exhausts. The existing official Dlicom cutout's alpha silhouette is sampled into small opaque mesh insignia on the bonnet and side pods. No texture/alpha surface is used for the wheels.

All four tires are closed surfaces with three recessed circumferential grooves, solid sidewalls and hubs. A wheel's tire, rim, ring, and bolts are joined together so they rotate as one object. Front steering pivots turn independently around the vertical axis; the rear axles stay fixed. Existing signed-speed animation handles forward driving, reverse, and stopping. Twin exhaust sockets match the existing flame coordinates exactly; acceleration and active boost increase the existing flame effect.

## Runtime and performance

| Asset | Triangles | Packed bytes |
| --- | ---: | ---: |
| Retree standing | 23,196 | 502,336 |
| Retree kart | 18,788 | 438,076 |
| Retree driving | 41,768 | 929,136 |
| Selection card PNG, 960 × 640 | — | 529,854 |

The driving source reference is 80,000 triangles / 4,832,084 bytes. The rebuilt driving export uses about 48% fewer triangles and 81% fewer bytes. Only 929,136 bytes of Retree model data are needed for his race. All three GLBs together total 1,869,548 bytes; all runtime Retree assets including the selection thumbnail total 2,399,402 bytes.

One shared opaque vertex palette material, one mesh for the standing model, five for the kart, and six for the driving model. No texture downloads, skeleton updates, or per-frame mesh extraction. The packer merges equivalent vertices, preserves positions/normals, strips unused UVs, and compacts colors to normalized bytes. Existing CPU instances continue sharing their geometry/materials. Flame geometry/materials are shared too.

The driving mesh is within the current rebuilt-model test ceiling of 45,000 triangles. This follows the later Gautam rebuild convention; it exceeds the much lower early Phase 1 target in ASSET_SPECIFICATION.md. Real mobile FPS has not been measured for this addition, so this is a geometry/payload comparison, not a device-performance guarantee.

## Reproduction

1. `blender --background --python blender/scripts/rebuild_retree.py -- --render`
2. `node blender/scripts/pack_rebuilt_models.mjs assets/characters/retree-rebuilt Retree RetreeKart RetreeDriving`

The Retree builder imports Gautam's primitive/closed-wheel helpers without executing the Gautam export loop. Optional rim-ring arguments leave Gautam's default generation unchanged. Retree bodywork, character, and pose are authored in `rebuild_retree.py`.

## Validation

- Reviewed reference and rebuild front/rear Blender renders, plus the selection thumbnail. Revised hair layers, limb overlap, colors, and rims after the first render review.
- Eight asset/VFX tests pass, including actual GLB geometry/node transforms, all four wheel nodes, closed tire surfaces, opaque materials, forward/reverse/stop behavior, front steering, complete tumble ground clearance, and Retree exhaust socket/flame alignment.
- Two Retree selection/source tests pass, including launch routing, persistent choice, blocked-storage handling, invalid selection fallback, standing bounds/payload, and unchanged source hashes.
- Fourteen gameplay tests and twelve audio tests pass. Kart physics, tuning, AI, race systems, track, camera, controls, and audio implementation were not changed by this addition.
- The existing headless race simulation also passes: all five racers complete three laps; 22 pickups and 18 activations occur, with shield timing, overtaking, independent attacks, and boost decisions passing. This exercises production race/AI logic without loading visual assets; it is not a browser rendering test.
- Browser module syntax checks and `git diff --check` pass. The local server serves the garage route.
- Live browser inspection remains unverified: both browser and computer-use connectors fail before initialization with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. The garage-open request was queued; it is not evidence of successful browser rendering or a completed browser race.

## Visual limitations / review

This is a clean stylized reconstruction, not an indistinguishable replica of the AI exports. The face, hair strands, proportions, clothing folds, and bodywork bevels differ, and the source's baked photographic shading is not reproduced. The standing and seated bodies are static; wheel animation and exhaust respond at runtime. Manual garage review and an actual mobile race remain the outstanding visual/performance checks.
