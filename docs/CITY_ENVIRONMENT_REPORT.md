# DliKarts City Environment Report

## Scope

This pass turns Switchback Yard into a finite, lightweight **Dlicom City Circuit** without changing the road ribbon, checkpoint order, racing-line query, collision policy, kart tuning, power-ups, spawn transforms, camera logic, or recovery logic. `game/environment/DlicomCity.js` is a presentation-only module: it deliberately creates no physics bodies.

Near buildings use a hard clearance of `track.width / 2 + 8.05` from the centreline. This leaves the full roadway, curbs, and sidewalk clear even for the largest modular building; the plaza was also moved outward and reduced in footprint.

## Environment architecture

The city is generated at runtime from the existing track spline. Placement uses a sample's tangent and lateral normal, so every district, sidewalk-side prop, and landmark follows the established circuit rather than replacing its geometry. The visible layers are:

1. Existing road, curb, and sidewalk.
2. Near-track modular city blocks and building facade windows.
3. Streetlights, trees, planters, and race-direction billboards.
4. The Dlicom HQ, start gateway, and a small mascot plaza.
5. A no-collision, low-poly background skyline around the outer city.

## Modular building kit and districts

The runtime kit has eight reusable visual roles: small shop/awning block, narrow block, medium office, apartment-like block, corner block, tall office/tower, Dlicom HQ, and distant skyline tower. Their variation comes from four shared facade colours, a compact window facade, height/depth changes, offset, and track-relative orientation—not unique textures or unique meshes.

The lap reads as four visual districts:

- **Dlicom Central:** start/finish, HQ, race gateway, taller offices.
- **Creative Street:** colourful medium-density blocks, awnings, race signage.
- **Dlicom Plaza:** open treatment, planter/tree rhythm, blue mascot-orb landmark with purple halo.
- **Outer City:** lower-density foreground blocks with the skyline beyond.

## Dlicom identity and landmarks

- **Dlicom HQ:** a distinctive dark-blue tower with a blue crown and `DLICOM CITY` sign.
- **Start/finish gateway:** blue posts and a branded overhead `DLICOM CITY` panel that preserves existing grid, camera, and checkpoint clearance.
- **Mascot plaza:** a static blue orb with paired light eyes and a purple halo, based on the supplied branding's compact mascot language rather than an animated NPC.
- **Billboards:** reusable `DLICOM RACERS` panels and short city/race messaging. Two small procedural 256×64 canvas sign textures are shared by all signs.

No supplied `references/environment/` directory was present at implementation time. The environment therefore follows the user-provided Dlicom Figma branding review and the approved game visual language; no third-party city design has been copied.

## Optimization strategy

- Near city blocks are grouped into four `InstancedMesh` facade batches, plus one window batch and one awning batch.
- Streetlights, lamp bulbs, trees, planters, and each skyline colour family are instanced.
- Boxes share unit geometry and shared PBR materials; no building interiors, unique materials, high-resolution building textures, or per-prop colliders are used.
- Skyline buildings are simple no-shadow boxes beyond the primary city layer.
- City scenery has no collision. Existing curbs/barriers remain responsible for playable boundaries.
- All city shadow casting is disabled except the HQ at High quality, preventing decorative city shadow cost from competing with karts.

## Quality profiles

| Profile | City treatment |
| --- | --- |
| Low | Keep near blocks, Dlicom landmark, road-facing direction signs, and corner readability. Hide skyline, vegetation, streetlights, and minor props. |
| Medium | Near blocks, props, vegetation, signage, HQ, plaza, and skyline; city shadows disabled. |
| High | Full Medium composition; HQ alone may cast a shadow. Existing renderer DPR/shadow settings remain governed by `game/config/game-config.js`. |

## Performance observations

The existing vertical-slice report recorded the sparse scene at approximately **59 FPS / 16.9 ms / ~75 draw calls** after stabilisation in its desktop browser test. That historical measurement is useful only as a reference: it predates later track and AI work.

Current in-app-browser desktop validation with five active racers and the city at High showed **~25 FPS / 40.1 ms / 79 draw calls / ~97k visible triangles** at one dense-race sample. An idle scene at the start/finish measured **~60 FPS / 16.5 ms / 48 calls**. These are browser-automation measurements, not real-device benchmarks; the dynamic race result includes all racers and their effects. The triangle count stays inside the High scene budget stated in `TECHNICAL_PLAN.md`; draw calls stay well below its 170-call upper target.

The procedural city adds no downloaded GLBs or image files. Its two generated sign textures are 256×64 canvases (about 128 KiB uncompressed together before GPU overhead). The code bundle impact is one environment module.

## Regression and visual validation

- `npm test` in `game/`: **8/8 passed** (drift, checkpoint/lap validity, race ordering, CPU finishing, Halo duration, lap marker).
- Browser desktop validation: loaded the real game, started the full five-racer race, watched the race camera through dense city sections, and checked the live debug counters.
- The player route, CPU route, road, curbs, checkpoint system, power-ups, race position, and HUD continued to load and run. The environment does not add colliders or mutate the track query, so recovery and physics retain their existing implementation.
- Static source inspection confirmed Low hides nonessential skyline/props while retaining the near city and route signs.

## Known limitations and recommended manual review

- This is an intentionally geometric first city pass. Building facade windows are shared stylized panels, not hand-painted individual shop fronts.
- No real Android, iOS, or tablet GPU measurement was performed; mobile was not represented as a real device test.
- Test the complete race on target phones and select Low if necessary. If a low-end device remains GPU-bound, reduce renderer DPR/shadows first, then reduce the High skyline density.
- Inspect corner sightlines and the HQ/sign placement at full player speed after any future change to the track spline.
