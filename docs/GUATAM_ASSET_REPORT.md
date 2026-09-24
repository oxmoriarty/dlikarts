# Guatam Asset Report — Phase 1

**Status:** production prototype validated in a Three.js/WebGL browser viewer on 2026-09-23.

## Final exported measurements

Measurements below are taken from the final GLBs as loaded by Three.js (GPU-facing vertices, rather than Blender control vertices).

| Metric | Guatam | Guatam's kart |
| --- | ---: | ---: |
| Triangles | 3,932 | 4,688 |
| Vertices | 11,796 | 14,064 |
| Runtime material count | 1 | 1 |
| Runtime mesh primitives / approximate draw calls | 1 | 6 |
| Texture images | 0 | 0 |
| Bone count | 18 | n/a |
| Animation clips | 8 | n/a |
| GLB size | 1,192,524 bytes (1.14 MiB) | 698,376 bytes (682 KiB) |

The apparently high vertex counts relative to triangles are intentional: the single-material strategy stores the palette in the standard glTF `COLOR_0` vertex-color attribute. Vertices split at UV/normal/color seams, but this replaces many material primitives and state changes. There are no image textures, normal maps, alpha materials, or external file requests.

## Final contents

### Guatam

- One skinned GLB mesh with a reusable 18-bone humanoid contract: `ROOT`, `HIPS`, `SPINE`, `CHEST`, `NECK`, `HEAD`, bilateral upper/lower arm, hand, upper/lower leg and foot bones.
- Identity preserved from the supplied art: strongly oversized white eyes with dark outline, asymmetric chunky dark hair, warm medium-brown skin, understated charcoal hoodie/cargo silhouette, white shoes, and a small red-and-cream mushroom chest badge.
- Baked clips: `standing-idle`, `seated-idle`, `steer-left`, `steer-right`, `victory`, `defeat`, `hit-react`, and `powerup-use`.
- The rig intentionally uses rigid low-poly part weighting rather than dense deformation loops. It is clean and inexpensive for the driving motions in scope, not intended for close-up cinematic acting.

### Guatam's kart

- Dark, compact buggy/kart with red rails/spoiler, large exposed tires, round lamps, raised mushroom bonnet emblem, steering column and a raised seatback.
- Runtime movement nodes: `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR`, front parent nodes `STEER_WHEEL_FL` / `STEER_WHEEL_FR`, and `STEERING_WHEEL`. Rear-wheel duplicate-name issue discovered during validation was fixed before final export.
- Required anchors present in the final GLB: `DRIVER_SEAT`, `CAMERA_TARGET`, `POWERUP_ORIGIN`, `PROJECTILE_ORIGIN`, `VFX_EXHAUST_LEFT`, and `VFX_EXHAUST_RIGHT`.
- `DRIVER_SEAT` is authored as the seated character-root anchor, so Guatam's pelvis lands in the cushion when `seated-idle` is active.

## Animation ownership

| Baked in GLB | Procedural at runtime |
| --- | --- |
| standing idle, seated idle, steer left, steer right, victory, defeat, hit reaction, power-up use | wheel spin; front-wheel steering; steering-wheel rotation; chassis pitch/roll/vibration; suspension; subtle kart vibration; optional head look-back/tracking |

The left/right grips are small source-only IK-baked clips, not a runtime IK system. This keeps both hands on the wheel while avoiding a per-driver solver.

## Browser and responsive validation

The validation viewer at `prototype/` loads the final separate GLBs with Three.js `GLTFLoader`, uses opaque PBR game lighting, orbit controls, all eight animation buttons, and live wheel/steering controls.

| Test | Result |
| --- | --- |
| GLB loading and material requests | Passed; both assets load and render with no external texture requests. |
| Skeleton and clips | Passed; 18-joint skin and all eight named clips are visible to Three.js. |
| Seated placement | Passed after adjusting `DRIVER_SEAT`; Guatam sits in the kart rather than hovering over its seat. |
| Wheel / steering transforms | Passed; all four named roll nodes, both front steering parents, and steering-wheel node respond to viewer controls. |
| Socket preservation | Passed; all six required named sockets and wheel nodes survive GLB export. |
| Browser console | Passed; final browser run had no errors or warnings. |
| 1440×900 desktop | Passed; split garage layout and full viewport render. |
| 1024×768 tablet-like | Passed; two-column layout with scrolling control console and bounded canvas. |
| 390×844 mobile portrait | Passed; single-column responsive layout, no horizontal page overflow, portrait camera framing keeps the combined asset visible. |
| 844×390 mobile landscape | Passed; canvas is bounded to 494×390 CSS pixels rather than growing past the viewport; sidebar remains scrollable. |

The viewer initially revealed an axis mismatch (Blender's exported Z-up versus Three.js Y-up) and portrait over-framing. Both were fixed in `prototype/app.js`; final rendering uses explicit axis-aware placement and responsive camera distance.

## Six-racer performance reasoning

Six Guatams plus six karts amount to approximately **42 asset primitives/draw calls** before track, props, VFX, UI and shadows (6 × (1 character + 6 kart)). Geometry is approximately **51,720 triangles** for the racers and karts together. This is conservative enough to leave a meaningful mobile budget for track/environment geometry; frustum culling, opaque rendering and a low-cost blob/contact-shadow option remain essential in a real race.

The combined base GLB payload is about **10.82 MiB** for six copies if no shared/cached load path is used; production loading must download each unique asset once and reuse its GPU resources for duplicates. The zero-texture strategy avoids a large mobile texture-memory multiplier.

## Optimization decisions and compromises

- One vertex-colored opaque PBR material per asset removes texture fetches and material switching. It trades a modest GLB vertex-color payload for much lower draw-call pressure.
- No LOD meshes were created. At 3,932 / 4,688 triangles, extra LOD data would add pipeline complexity and loading cost before profiling establishes a geometry bottleneck. Revisit only after a representative six-kart track profile.
- GLBs are intentionally not Draco/Meshopt compressed yet: together they are about 1.80 MiB and avoiding a decoder keeps this prototype viewer simple. Add Meshopt delivery compression to the production bundling step if a full roster/track loading profile justifies it.
- No textures exist, so KTX2/Basis compression is not applicable to these two assets. The next assets should continue using palette vertex color until an atlas produces a visible improvement.
- Blender 2.83 emits tangent-generation notices for some cap topology while exporting. These assets have no normal maps and Three.js final validation produced no related console warning/error; tangents are not required by the shipped material.

## Compliance with `ASSET_SPECIFICATION.md`

| Requirement | Status |
| --- | --- |
| Units, axis/root, applied export transforms | Compliant |
| Character and kart triangle / material-slot budgets | Compliant |
| Texture/material policy | Compliant (0 textures, 1 opaque material each) |
| Humanoid skeleton ≤24 deform bones | Compliant (18) |
| Naming, wheel hierarchy and sockets | Compliant |
| Separate Blender masters and GLBs | Compliant |
| LOD decision documented | Compliant (not warranted) |
| Browser, motion and responsive validation | Compliant |
| Full low-end physical-device six-racer frame-time benchmark | Not yet performed; requires the later representative track scene and target devices. |

## Known limitations / next review items

1. This is a deliberate low-poly prototype. Face-expression variants are not included; they should be added as small mesh/material swaps only if gameplay readability needs them.
2. The viewer is a validation tool, not a racing game; it has no physics, AI, tracks or gameplay systems.
3. A real lower-end Android/iPhone race scene remains the final authority on shadow quality, draw-call budget and whether Meshopt compression pays for its decode cost.
4. Future humanoid racers should reuse the 18-bone animation contract, but their geometry must be reviewed against their own approved artwork rather than copied from Guatam.

**Pipeline conclusion:** ready to reuse for the remaining racers after review of Guatam. Do not begin those racers until this prototype is approved.

## Correction pass — anatomy, driving pose and kart structure

### Root causes found

1. **Standing legs / arms:** limb meshes used rigid single-bone weights, but their rest-bone joints were offset from their mesh centres. The leg chain drifted sideways below the knee and the arm chain did not form clean shoulder → elbow → wrist segments.
2. **Hands and victory:** pose clips rotated the old downward-facing local axes directly and omitted reset keys for many bones. The result carried stale transforms between clips and swung victory arms behind/sideways rather than upward.
3. **Driver position:** the viewer copied a hand-authored numeric position instead of resolving `DRIVER_SEAT`; the old seated action translated `HIPS` on the bone-local Z channel, which moved the character forward rather than downward.
4. **Kart structure:** the rotating steering-wheel child contained only a short column segment, and the rear red bar had no struts in the source mesh. A later visual review also found that the first corrected rim position was too far back, reading as if it were in the seat.

### Permanent corrections

- Rebuilt Guatam's neutral limbs around connected, straight rest-bone chains. Feet remain grounded in `standing-idle`; knees, ankles and shoes now align beneath the hips.
- Kept the 18-bone humanoid contract and rigid low-poly weighting. No bones, materials, textures, draw-call primitives or runtime solver were added to the character.
- Re-authored every action with full-pose key coverage. Added `steer-left`, `steer-right`, and `defeat` to complete the viewer/regression set.
- Baked short temporary Blender hand IK targets into `seated-idle` and steering clips, then removed all helpers and constraints. Both hands now reach the shortened, nose-mounted steering rim at opposite outer edges (a 9-and-3 grip), not the hub or spokes, through natural shoulder–upper arm–forearm–wrist chains. The legs use explicit, baked seated rotations—forward thighs, knees ahead of the hips, then shins down to the pedal area—rather than an unstable leg IK solve. The victory clip is similarly target-baked upward/outward.
- Repositioned the steering rim at the front edge of the seat opening, directly in front of the driver rather than on the seat. Its fixed low-poly column begins in the rear of the black rounded nose pod behind the mushroom badge and slopes back toward the driver; the independent `STEERING_WHEEL` rotation node remains intact.
- Added two symmetric low-poly red rear struts from the chassis to the red horizontal rear bar.
- Made `DRIVER_SEAT` the sole character-root source of truth in the viewer. Guatam's root snaps to the socket; no compensating viewer translation remains.
- Retargeted the two-hand seated/left/right grip clips to the corrected rim position. In the validation viewer, moving **Front steering** now turns the front wheels and rim together (1.5× rim travel) and selects the matching baked two-hand steering pose; no runtime IK is added.
- Lowered the physical seat cushion and moved `DRIVER_SEAT` 0.20 m lower and 0.21 m forward from its original location. The driving grips and pedal targets were rebaked relative to that source anchor, retaining wheel contact while moving Guatam closer to the nose pod.
- Re-embedded the fixed steering-column base inside the rear of the mushroom-nose pod, eliminating the visible detachment while retaining the independently rotating `STEERING_WHEEL` rim. Shortened only the driver-facing end of that column. The rim now has a slightly bolder dark-metal finish and three simple spokes so it remains legible in both kart-only and driver views; this does not alter the column length. Raised the existing backrest to meet the lowered shoulder line. Rear inspection now shows the intended head-and-small-shoulder silhouette instead of a torso perched above the seat.
- Rebuilt all four tire surfaces as continuous 24-sided round torus forms. Each black tire has four narrow, nearly flush ash road-tread channels that conform to its curved surface, preserving the circular silhouette without off-road-style lugs. The channels are merged into the existing wheel mesh and baked into the one-material vertex palette, adding no runtime wheel node, material slot, or draw call. Kart complexity is now 4,688 triangles / 14,064 vertices and the exported kart GLB is 698,376 bytes (682 KiB).
- Refined Guatam's production rest pose from the supplied standing references without changing his established stylized identity: relaxed nearer-to-body arm chains, shoulders wider than the pelvis, a distinct hoodie torso/shoulder/pelvis silhouette, a visible neck, vertically aligned legs, and planted feet. The new low-poly limb tubes align directly to the armature's shoulder → elbow → wrist and hip → knee → ankle segments. The humanoid rig remains 18 bones and all existing clips were rebaked for the adjusted rest pose. Guatam is now 3,932 triangles / 11,796 vertices and the exported character GLB is 1,192,524 bytes (1.14 MiB).
- Replaced Guatam's old isolated cone-spike hair with an opaque rounded crown cap and 14 flattened low-poly lock meshes. The locks are deliberately asymmetric and divided into forehead fringe, temples, crown, back, and nape layers to preserve the supplied turnaround’s silhouette while keeping ears visible. Hair remains part of the `HEAD`-weighted one-material character mesh, with no transparency, textures, added bones, or runtime draw calls.

### Correction-pass validation

Visual browser inspection covered upright standing, victory, kart three-quarter/rear, seated driver, both authored steering clips, and the revised tires in kart-only and driver views. The tires remained circular while wheel roll, front steering, proportional steering-wheel rotation, all eight clips, sockets and GLB loading remained functional. Final browser console check: no relevant errors or warnings.

No remaining blocking visual defect was found in this corrective scope. The model remains intentionally simplified; it is not a finger-rigged or cinematic character.
