# Dlicom Racers Asset Specification (Phase 1)

This is the production contract for browser runtime assets. It is intentionally conservative: a race can contain six drivers, six karts, a track, scenery, props, VFX, UI, and shadows at once. Silhouette, color blocking, animation and lighting take priority over dense geometry.

## 1. Spatial standards

| Standard | Requirement |
| --- | --- |
| Unit | 1 Blender unit = 1 metre; transforms are applied before export. |
| Axes | +Z is up; asset-local +Y is vehicle/character forward; +X is right. Runtime may orient the root as needed, but child transforms retain this convention. |
| Origin | Character root: ground contact centred between feet. Kart root: ground projection at chassis centre. |
| Character scale | Standing humanoids target 1.45–1.70 m. Guatam is 1.55 m to preserve the chibi proportions. |
| Kart scale | Compact karts target 2.4–3.0 m long, 1.45–1.8 m wide, 0.8–1.2 m tall excluding driver. Guatam’s kart is about 2.7 m × 1.6 m. |
| Driver proportion | Seated head top should remain below 2.0 m from the road; steering wheel falls naturally within arm reach without extreme wrist deformation. |

## 2. Complexity budgets

Budgets are per highest-detail runtime asset, before scene duplication. They leave room for a full race on modern but non-premium mobile browsers.

| Asset | Preferred | Hard ceiling | Materials / slots |
| --- | ---: | ---: | ---: |
| Standing/seated racer | 2,500–4,500 triangles | 5,500 | 4 shared opaque materials, 6 slots |
| Kart | 2,800–5,000 triangles | 6,000 | 4 shared opaque materials, 6 slots |
| Wheel | included in kart budget | — | 1–2 |
| Collision mesh | 80–250 triangles | 400 | no render material |

At the preferred budgets six racers plus six karts consume roughly 45–57k triangles, leaving the majority of a mobile scene budget for the visible track and environment. A typical mobile race should target 100–160k visible opaque triangles, with an adaptive quality mode below that target for slower devices.

## 3. Materials, textures and compression

- Use simple glTF-compatible `MeshStandardMaterial`/Principled PBR: opaque, metallic normally 0, roughness 0.6–0.9. No transmission, screen-space dependencies, SSS, or Blender-only node graphs.
- Prefer vertex color and separate low-cost geometry for color blocking. Reuse palette materials across a racer and its kart where art direction permits.
- Use a single 512² PNG/WebP-equivalent source atlas per character or kart only when graphics cannot be geometry. 1024² is the exception for a hero-selection close-up, never 2K/4K. Emblems should be small atlas regions or simple geometry.
- Runtime ship format should be KTX2/BasisU (ETC1S for color/albedo, UASTC only for visually sensitive normal/alpha assets), with PNG retained only as editable source. Avoid normal maps unless their readability benefit is clear.
- Target ≤2 texture images per character and ≤2 per kart; use 0 when geometry/material color is sufficient. Mipmaps and power-of-two sizes are required. A 512² RGBA source is 1 MiB uncompressed; compressed GPU residency is materially lower but device dependent.
- Apply mesh compression only after visual regression testing: Draco for static meshes or Meshopt for geometry/animation delivery; use one consistent encoder and retain an uncompressed debug GLB in source control if needed.

## 4. Naming and hierarchy

- Files: lowercase kebab-case (`guatam-kart.glb`).
- Mesh data: `MESH_<asset>_<part>`; render objects: `GEO_<asset>_<part>`.
- Empty/anchor objects: `SOCKET_<purpose>`; collision objects: `COL_<asset>_<part>` and disabled from render/export unless an explicitly documented gameplay export needs them.
- Materials: `MAT_<palette-role>` (for example `MAT_charcoal`, `MAT_skin`).
- Never use spaces, duplicate ambiguous suffixes, or viewport-only names in shipped nodes.

### Character skeleton

Humanoid-compatible armatures use a `RIG_` root and this stable minimal naming set:

`ROOT`, `HIPS`, `SPINE`, `CHEST`, `NECK`, `HEAD`, `UPPER_ARM_L`, `LOWER_ARM_L`, `HAND_L`, `UPPER_ARM_R`, `LOWER_ARM_R`, `HAND_R`, `UPPER_LEG_L`, `LOWER_LEG_L`, `FOOT_L`, `UPPER_LEG_R`, `LOWER_LEG_R`, `FOOT_R`.

These 18 deform bones are the default common humanoid contract for Guatam, Just Sam, Retree and Timur; optional non-deform helper bones must not be exported unless runtime-required. Quang may use scaled/proportioned variants. Kapuriya may use a separate contract. Keep practical mobile bone count at ≤24 deform bones (hard ceiling 32) and no more than 4 influences per vertex. No facial bone rig: expressions are mesh/material variants or gameplay-level face swaps.

## 5. Animation contract

- Skeleton rest pose is a relaxed, balanced standing A-pose: shoulders sit wider than the pelvis, arms fall near the thighs with a small outward slope, thighs and shins are vertically aligned, and both feet rest beneath the hips. Stylized proportions may exaggerate head size, but the shoulder → elbow → wrist and hip → knee → ankle chains must remain clear. Animations use 30 fps, looping only where indicated, root motion off, and no scale keys.
- Stylized hair uses one opaque crown cap plus a small set of broad, flattened low-poly lock meshes for fringe, temples, crown, back, and nape. Preserve the silhouette from front, side, 3/4, and back views; do not use transparent cards, strand systems, or a ring of identical cones. Hair locks follow the `GEO_<character>_hair_lock_##` convention and are merged into the character's existing palette mesh at export.
- Names use lowercase kebab case: `standing-idle`, `seated-idle`, `victory`, `defeat`, `hit-react`, `powerup-use`, `look-back`, `steer-left`, `steer-right`, `drift-lean`.
- Ship short, reusable baked poses/cycles: standing idle, seated idle, steering left/right, victory, defeat, hit reaction and power-up use. `look-back` and drift lean can be baked only if a design needs authored exaggeration; otherwise layer them procedurally.
- For Guatam, `seated-idle`, `steer-left`, `steer-right` and `victory` are authored with temporary Blender hand IK targets where useful, then exported as baked bone keys. Seated legs use explicit hip, knee and ankle rotations: thighs rise slightly forward, knees sit ahead of the hips, then shins angle forward and down to the pedal area. No IK constraints, helpers, or solver are shipped. Future humanoids may use this same source-only bake pattern when it improves hand/wheel contact and seated-leg readability.
- Runtime procedural layer: wheel spin, front steering angle, steering-wheel spin, small chassis pitch/roll/vibration, head look offset and seated torso lean. Pair front steering with the matching two-hand baked left/right grip clip; do not require per-driver runtime arm IK.

## 6. Kart contract

Kart export root owns `GEO_guatam_kart_chassis`, `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR`, `STEERING_WHEEL`, and sockets. Each wheel object’s origin is the hub centre; local +X is axle, and rotation around +X rolls the wheel. Front-wheel steering is applied to a `STEER_FL` / `STEER_FR` parent at the same hub, rotating about +Z; wheel spin remains on the child. Steering wheel pivot is its centre/column axis and uses local +Y rotation in this prototype.

Round production tires use at least 24 radial sides. Tread may use restrained ash vertex color or thin conforming channels that sit essentially flush with the continuous outer tire radius; do not use protruding blocks that make the silhouette gear-like. Keep all tire detail merged into its existing `WHEEL_*` mesh and within the kart budget.

Required named sockets are zero-area empty nodes and must survive GLB export:

| Socket | Role |
| --- | --- |
| `DRIVER_SEAT` | Driver root attachment; local +Y forward and +Z up. |
| `CAMERA_TARGET` | Chase-camera look target above/rear of driver seat. |
| `POWERUP_ORIGIN` | Held / ready power-up presentation point. |
| `PROJECTILE_ORIGIN` | Spawn point forward of the kart nose. |
| `VFX_EXHAUST_LEFT`, `VFX_EXHAUST_RIGHT` | Rear exhaust/trail emitters. |

`DRIVER_SEAT` is a matrix attachment, not a visual-offset suggestion. At runtime, parent or snap the character's `ROOT` transform to the socket's complete world transform (position and orientation); do not duplicate a hand-tuned translation in viewer/game code. For Guatam, the socket is deliberately low and slightly forward in the seat, so the seatback meets the shoulder line while driving clips preserve pelvis, pedal and hand contact. The seat socket owns vertical/fore-aft alignment, the character owns pelvis anatomy, and driving clips own limb pose.

## 7. Export, LOD and collision

- Export separate binary glTF 2.0 files (`.glb`); selected objects only, apply transforms, +Y forward/+Z up, include named actions, skinning, materials, sockets and required hierarchy. Exclude cameras, lights, reference images, hidden construction meshes, unused materials and Blender modifiers that do not export.
- GLB roots must have scale 1, no negative scale, and no external texture dependencies. Validate in Three.js `GLTFLoader`, not only Blender.
- Do not create LODs by default. Assets below the preferred budgets use one high-quality silhouette mesh. Add LOD only after profiling shows six copies are geometry-bound; then use `LOD0` at 0–30 m and a 35–50% triangle `LOD1` from 30–70 m, without extra materials/textures. Beyond 70 m use impostors or visibility culling as track design permits.
- Collision meshes use simple named, non-rendered `COL_` shapes. Runtime physics may generate primitive colliders instead; collision data is not required in the visual GLB.

## 8. Lighting, shadows, rendering and loading

- Assets are authored under neutral directional/key light plus soft hemisphere fill. Albedo/colors must read without baked lighting. Use no baked ambient occlusion that makes skin/hair permanently dark.
- Runtime uses one directional shadow light on high/medium quality, blob/contact shadow on low quality, and no per-wheel real-time lights. Transparent materials are disallowed unless functionally essential.
- Target <45 draw calls for six racers+karts combined before environment; individual racer/kart should normally cost ≤4 draw calls each. Limit each asset to six material slots, ideally four.
- Use frustum culling, shared geometry/materials and instancing for repeated track props, vegetation, coins and simple VFX; do not instance skinned drivers/karts unless an engine-specific path proves safe.
- Load GLBs asynchronously with a loading placeholder, report loader errors, dispose GPU resources on scene change, and select compressed variants according to renderer support. Avoid blocking the render loop while decoding.

## 9. Performance validation procedure

1. Inspect GLB hierarchy and animation/skeleton in a Three.js viewer; ensure no missing texture requests or console errors.
2. Record triangles, vertices, material slots, images/resolutions, bone count, animation count and GLB bytes from exported files.
3. Verify standing and driver-seat placement; test wheel roll, front steering, steering-wheel rotation and every socket transform.
4. Test at 1440×900, 1024×768, 390×844 and 844×390 CSS sizes with device pixel ratio capped at 2.
5. Profile representative six-driver/six-kart scene; review draw calls, triangles, frame time and texture memory in browser tools. If the scene is geometry, skinning or shadow bound, apply the narrowest suitable optimization and re-test.
