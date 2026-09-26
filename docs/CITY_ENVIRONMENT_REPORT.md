# DliKarts City Environment Report

## Scope

This pass turns Switchback Yard into a finite, lightweight **Dlicom City Circuit** without changing the road ribbon, checkpoint order, racing-line query, collision policy, kart tuning, power-ups, spawn transforms, camera logic, or recovery logic. `game/environment/DlicomCity.js` is a presentation-only module: it deliberately creates no physics bodies.

Every candidate building, landmark, and skyline tower now passes a whole-track clearance check: its footprint radius must clear every sampled section of the closed spline beyond the roadway, curbs, sidewalks, and a 2-unit visible setback. This eliminates buildings on the road even where distant parts of the loop run near one another. The plaza uses the same check; lamps, planters, signs, and start-gateway posts are also outside the sidewalk.

## Environment architecture

The city is generated at runtime from the existing track spline. Placement uses a sample's tangent and lateral normal, so every district, sidewalk-side prop, and landmark follows the established circuit rather than replacing its geometry. The visible layers are:

1. Existing road, curb, and sidewalk.
2. Near-track modular city blocks and building facade windows.
3. Fixed-interval paired streetlights, roadside utility poles/lines, trees, planters, and race-direction billboards.
4. The Dlicom HQ, start gateway, and a small mascot plaza.
5. A no-collision, low-poly background skyline around the outer city.

## Modular building kit and districts

The runtime kit has eight reusable visual roles: **bodega, café, eatery, bank, school, garage, apartments, and offices**, plus Dlicom HQ and distant skyline towers. Selected broad road sections now use paired frontages on both sides: colourful low-/mid-rise facades, storefront glazing, roof trims, awnings, and occasional balcony strips. Their variation comes from a shared palette and compact window texture, height/depth changes, short type signs, offset, and track-relative orientation—not unique heavy meshes.

The lap reads as four visual districts, with paired front rows plus a staggered second building row filling every long inter-gateway section while checkpoint and corner clearances remain open:

- **Dlicom Central:** start/finish, HQ, race gateway, taller offices.
- **Creative Street:** colourful medium-density blocks, awnings, race signage.
- **Dlicom Plaza:** open treatment, planter/tree rhythm, blue mascot-orb landmark with purple halo.
- **Outer City:** lower-density foreground blocks with the skyline beyond.

## Branding and landmarks

- **Checkpoint gateways only:** the seven regular checkpoints use raised blue Dlicom gateways with taller headers and oversized, racing-readable branding. Odd-numbered gateways show `DLICOM` flanked by two official logos; even-numbered gateways show `DLICOM` flanked by the mascot pair. The separate checkerboard finish gantry remains unchanged. Utility poles and their lowest cable sag are deliberately above the gateway header.
- **Neutral street scene:** HQ, mascot plaza, Dlicom billboards, and Dlicom city signs are no longer instantiated. The city dressing uses only generic shop labels and a bright, varied streetscape palette.
- **Urban prop kit:** non-colliding, instanced traffic lights/control boxes, road signs, generic electronic billboards, benches, bins/dumpsters, bollards, bus shelters, meters, mailboxes, tree grates, planters/hedges, fire-escape silhouettes, AC units, scaffolding, subway entries, transformer boxes, and manholes. A high visual-only overpass adds skyline depth without altering the drivable route.
- **Interaction boundary:** the current prop kit is scenery only. Props do not yet become destructible, solid obstacles, ramps, or steam emitters; those are deliberately deferred to a dedicated gameplay/physics and VFX pass so this environment update does not retune racing.

No supplied `references/environment/` directory was present at implementation time. The environment therefore follows the user-provided Dlicom Figma branding review and the approved game visual language; no third-party city design has been copied.

## Optimization strategy

- Near city blocks are grouped into four `InstancedMesh` facade batches, plus one window batch and one awning batch.
- Streetlights use a tapered base and curved inward arm silhouette, while lamp parts, utility poles, utility crossbars, trees, planters, and each skyline colour family are instanced. Utility lines are combined into one lightweight line-segment mesh.
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

After the dense second building row and urban prop kit, a settled local start-grid sample measured approximately **30 FPS / 33.4 ms / 135 draw calls / 49k visible triangles**. This is still below the 170-call High upper target, but it is an in-app-browser measurement and needs real-device testing before treating it as a mobile performance result.

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
