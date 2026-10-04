# Clean Gautam / kart reconstruction

## Scope

Hand-built geometry based on the user's supplied AI models and Gautam artwork. No AI mesh was cut, remeshed, or reused. The appearance is a stylized approximation, not an indistinguishable replica. Original and earlier assets remain available.

Runtime: `assets/characters/gautam-rebuilt/GautamDriving.glb` (player), `GautamKart.glb` (four CPU instances). Blender source scenes and front/rear review renders: `blender/characters/gautam-rebuilt/`.

## Construction

Rounded black nose, chassis tubes, bumper, side pods, seat, steering rim, pale circular headlights, red rear wing, twin fixed exhausts, mushroom emblem. Gautam has an oversized head, pale outlined eyes, warm skin, layered curved brown hair, dark hoodie/trousers, mushroom chest badge, shoes and hands posed on the steering rim.

Four newly constructed closed tire barrels, solid sidewalls/rims/hubs, bolts and shallow solid tread ribs. Every wheel's parts are joined into one mesh; exhausts and chassis stay fixed. Only front axles steer. Meshes have opaque materials and no alpha textures. No double-sided material workaround hides holes.

Existing `KartVisual` supplies signed-speed wheel spin, reverse, stop, front steering and tumble clearance. Existing imported-model adapter supplies scale/orientation/grounding. Physics, collision shape, AI, controls and camera were not changed for this rebuild.

## Reproduction

1. `blender --background --python blender/scripts/rebuild_gautam.py` (add `-- --render` for reviews).
2. `node blender/scripts/pack_rebuilt_models.mjs`.

The packer preserves positions/normals and triangles, removes unused UVs, merges identical vertices and compacts vertex colors to normalized bytes. No texture downloads are needed. One shared palette material, six mesh draws for the player and five per CPU; CPU geometry/materials are shared between instances.

| Runtime | Triangles | Bytes |
| --- | ---: | ---: |
| Driving | 38,262 | 835,580 |
| Kart | 17,122 | 381,972 |

Combined: 1,217,552 bytes (1.16 MiB), approximately 106,750 racer triangles if all five racers are visible.

## Hair and tire revision

Compared against the earlier inspection render of the supplied driving GLB. Replaced the chunky short hair clumps with thinner, longer swept locks, sharper tips, a revised fringe and side layers, plus fuller rear coverage. Recalculated normals on the hand-built lock meshes. It remains a stylized approximation, not copied AI topology.

Removed all raised cross-tread bars. Each closed tire barrel now incorporates three recessed circumferential channels that run vertically in the rear racing view. They are geometry grooves, not alpha textures or detached meshes. Reviewed regenerated front/rear renders. All five model tests pass after this revision, including opaque materials, closed tire surfaces, motion/steering and tumble clearance. Existing wheel animation/physics were unchanged. Asset URLs in the game and garage are versioned to avoid reusing stale cached models.

## Validation

All 20 model, gameplay and audio tests passed. Tests decode actual exported GLB positions/transforms, verify the wheel nodes, forward/reverse spin, stopped wheels, front steering, rear axles remaining unsteered and tumble clearance. Rebuilt-wheel triangles are welded by position in the test and every surface edge must have exactly two adjacent triangles: all four wheels in both assets passed this closed-surface test. Materials are checked to be opaque.

The browser autoplay driving test completed the race and reached results: player fifth place, race time 2:00.12, best lap 0:39.65. This validates race flow with the replacement assets; it is not a manual mobile-driving or exact-art-match acceptance test.

Front/rear Blender renders reviewed; lamps/emblem were moved clear of the nose after the first review. Browser race started successfully and the new rear silhouette/solid tires were checked from the racing camera. Browser error log was empty in this check. A stationary HIGH-profile desktop sample showed 48 FPS / 21 ms, 118 calls and 64k visible triangles; not a representative full-race/mobile performance benchmark.

## Limitations

## Exhaust visual effect

Twin lightweight orange flames with pale cores attach at authored exhaust outlets (source glTF coordinates x +/-0.38, y 0.34, z -0.948). Flame size responds smoothly to observed throttle; active boost, including Zipcap, produces the largest jets. Flicker uses deterministic sine modulation. Effects fade away when stopped and suppress on finish/tumble. Player and CPU karts share cone geometry and two additive materials; four small meshes per kart, normal frustum culling, no texture, particles, lighting or shadows. Added after cached tumble bounds so the visual effect cannot change chassis clearance. Six asset/VFX tests pass including throttle/boost ordering and shutdown; gameplay state remains owned by existing systems.

A subsequent browser navigation reproduced the pre-existing MutationObserver instrumentation/presentation error seen before this rebuild. It did not prevent race start; no asset-loading error was reported. The earlier empty log was a single check, not a guarantee of an error-free presentation layer.

Face, hair and small proportions differ from the AI reference. This reconstruction does not reproduce its baked shading or fine clothing textures. The seated body is static, without skeletal limb animation. The rebuilt GLBs use vertex-color materials rather than detailed textures. Manual visual review of face/hair and kart proportions is recommended before considering this final production art. Real-device performance testing remains necessary.
