# DliKarts — Vertical Slice Report

**Status:** playable browser vertical slice implemented. The approved Guatam character/kart GLBs and Blender masters were not modified. The original Asset Garage remains at `prototype/`; the playable game is a separate application at `game/`.

## Implemented milestones

| Milestone | Delivered |
| --- | --- |
| 1. Game shell | Separate ES-module game application, static-server launch script, fixed 60 Hz loop, loading/start surfaces, renderer and quality configuration. |
| 2. Kart controller | Approved Guatam + kart GLBs load at runtime, driver is attached through `DRIVER_SEAT`, and the kart uses centralized arcade tuning. |
| 3. Camera | Smoothed third-person chase camera with speed look-ahead, height/distance tuning, and speed FOV. |
| 4. Test track | Original Switchback Yard spline/ribbon course with road/off-road, barriers, gates, elevation, a jump zone, start grid, and recovery-safe course queries. |
| 5. Drift/boost | Intentional drift entry, lateral-grip change, charge tiers (Spark/Flare/Comet), release boost, cancellation conditions, and HUD feedback. |
| 6. Race rules | Countdown, ordered checkpoint validation, three laps, progress position sort, wrong-way hysteresis, recovery, timing, non-blocking CPU finish exit, and results transition. |
| 7. Touch | Landscape-first auto-acceleration, multitouch left/right/drift-brake/item/recovery controls, safe-area CSS, and portrait rotate prompt. |
| 8. CPU race | Four temporary test pilots using shared approved kart geometry plus colored temporary driver markers; spline racing-line AI, speed target, line offset, recovery, and collision handling. |
| 9. Power-ups | Zipcap, Rattle Pod, Halo Guard; pickups, respawn, one-item inventory, pooled projectiles, guard visual, and AI use. |
| 10. HUD/results | Position, lap, timer, current item, drift state, countdown, wrong-way feedback, results and retry. |
| 11. Performance | Low/Medium/High DPR/shadow profiles, constrained opaque scene, shared kart geometry for temporary racers, pooled projectiles, and runtime debug metrics. |
| 12. Validation | Logic tests, syntax checks, live desktop browser launch/countdown/five-kart rendering, and visual asset integration inspection. |

## Actual architecture

The slice uses plain browser ES modules and the existing Three.js 0.160.1 import-map approach. It intentionally adds no physics engine or framework dependency. Main systems are split across `game/config`, `core`, `input`, `track`, `vehicle`, `race`, `ai`, `powerups`, and `ui`.

Physics is a custom fixed-step (1/60 second) kinematic arcade implementation. Karts use scalar forward speed, bounded lateral slip, yaw steering, track-surface queries, barrier clamping, simple kart separation, gravity/jump state, landing, and checkpoint-based recovery. This is intentionally not a realistic wheel/suspension simulation.

The approved asset adapter validates the Guatam armature root and all required kart driver/wheel/steering nodes at load. It uses `DRIVER_SEAT`, rotates documented wheel/steering nodes, and selects Guatam's approved seated/left/right steering clips. No runtime arm IK and no modified asset offset were introduced.

## Driving and drift

`game/config/game-config.js` is the single tuning surface for acceleration, braking, reverse, top speed, grip, drift grip/steer, thresholds, boost durations/strengths, off-road speed, gravity, jump impulse, collision radius, and recovery time.

Drifting requires grounded speed plus sufficient steering and held Drift. Drift reduces lateral grip, applies a controlled slide, accrues only during meaningful steering, cancels on airborne/off-road/hard hit/excessive angle, and produces the configured tier boost when released. Zipcap uses the same bounded boost channel but does not create an unlimited stack.

## Track, AI, and power-ups

- **Lap markers:** a short, responsive central `LAP 1 / 3`, `LAP 2 / 3`, or `LAP 3 / 3` banner appears when the player begins the race or crosses into a valid new lap; the persistent HUD lap counter remains available throughout.
- **Zipcap presentation:** the DiliSpeed / Zipcap pickup is now an upright icon and spins around the world vertical axis, preserving its readable shape from every racing-camera angle.

Switchback Yard is generated from one closed Catmull-Rom centerline. Its sampled tangent/normal/progress data drives road rendering, barrier placement, checkpoint gates, spawn/recovery poses, collision query, route progress, and AI look-ahead. That one-source design prevents the visible road, AI route, and lap logic from diverging.

The four temporary AI racers reuse the approved kart's shared mesh hierarchy without recoloring or added colored markers. They follow a look-ahead target on the spline with seeded lateral offsets and curvature-informed target speed; a simple out-of-bounds path triggers recovery. They are explicitly placeholders, not substitutes for the other five production racers.

When a CPU completes lap three, its finish order/time are retained in `RaceSystem`, but it stops collecting items, ignores projectiles, and is skipped by kart collision resolution immediately. Its visual remains briefly visible at the line, then is hidden after the configured 0.8-second finish-exit delay. This prevents finished CPU karts from blocking racers still completing their race without requiring a separate pit-lane system.

Road pickups use a forgiving 1.35 m X/Z collection radius rather than a 3D root-to-mesh distance test. Their visual height is lower and their bobbing is anchored to a base height, so driving through a pickup reliably grants the item instead of passing underneath its hovering mesh.

- **Zipcap:** short self acceleration/top-speed burst.
- **Rattle Pod:** pooled forward pulse projectile; expires safely and slows/spins an unguarded target it reaches.
- **Halo Guard:** a timed, transparent spherical bubble enclosing the entire kart and driver. It lasts exactly **7 seconds**, blocks hostile Rattle Pod hits, and makes the guarded racer immune to displacement or slowing from other racers' kart contact during that window.

### Dili pickup visual correction

The temporary generic pickup crystals were replaced with small original low-poly 3D models derived from the supplied Dili references (their image backgrounds are not used):

- **Zipcap / DiliSpeed:** two emissive cyan speed swooshes surrounding a dark diamond core.
- **Halo Guard / DiliHalo:** a purple face orb framed by two vivid pink halo rings; active use creates a lightweight translucent green spherical bubble around the complete kart/driver silhouette.
- **Rattle Pod / DiliMascot:** a cobalt round mascot with short side arms and two diamond eyes; the same model is reused for a pooled, fixed-direction forward projectile. Its launch vector is captured when fired, so it cannot curve with later steering.

This remains geometry/material based—no new texture download, UV atlas, or high-cost shader is required. The colored temporary CPU head markers were also removed, so all active karts retain the approved Guatam black-and-red vehicle finish.

## Quality and performance

| Profile | DPR cap | Shadows | Particle/projectile budget |
| --- | ---: | --- | ---: |
| Low | 1.0 | Disabled; inexpensive grounding remains | 45 |
| Medium | 1.5 | 512 directional map | 95 |
| High | 2.0 | 1024 directional map | 150 |

The live desktop browser inspection previously rendered a six-kart start at approximately **59 FPS / 16.9 ms** and **about 75 renderer calls** after stabilization on the local development machine. The current five-kart slice should be re-profiled after the wider-track correction. This is an observation, not a device-wide benchmark. The slice deliberately stays below the established opaque-triangle and draw-call guidance by reusing static temporary kart geometry and keeping track geometry simple.

## Automated checks

`npm test` in `game/` passes five deterministic Node tests:

1. data-driven drift tier selection;
2. drift initiation constraints;
3. wrapped start/finish progress comparison;
4. lap/checkpoint-aware race ordering.
5. CPU finish record/stop behavior.

Syntax checks were run for the main integration, kart, track, race, and power-up modules. The first live race exposed a real CPU bug: position sorting reordered the shared racer list, so the player was later treated as a CPU. It was fixed by selecting CPU racers using their `player` role rather than list position.

## Browser and device validation

- **Desktop tested:** local browser launch, GLB loading, start/countdown/GO, five-kart rendered scene, player camera, temporary CPU motion, debug metrics, and quality selector.
- **Emulated mobile:** responsive landscape-touch and portrait-rotate CSS/control paths were implemented and source-inspected. Full browser device-emulation sweep remains a manual QA task because this run did not have an interactive mobile emulation surface after the desktop browser session became unavailable.
- **Real device tested:** not performed. No Android/iPhone performance claim is made.

## Known limitations and deferred work

1. The proof track is intentionally sparse; its visual decoration, camera obstruction query, and shortcut route are not final production content.
2. Audio has event-ready hooks only. No final music or original SFX library is included.
3. Drift dust, landing dust, and boost trails are represented primarily through HUD/kart motion/item feedback; a richer pooled particle pass is deferred behind measured device profiling.
4. CPU avoidance is lightweight and may need corner-case tuning in dense side-by-side packs.
5. The web import map still uses the existing pinned CDN Three.js source; release packaging should vendor/bundle that exact version.
6. Real Android/iPhone testing and a full manual three-lap player playthrough remain required release gates.

## Post-validation grid and ground-contact correction

- The original controller hard-coded a 0.34 m root height even though the approved kart root is its ground projection. Its ready/countdown early return also preserved the old grid height. `KART_TUNING.wheelGroundOffset` now supplies the one asset-aware contact value (currently zero), and both parked and active karts resolve their root height from the track road surface plus that value.
- Switchback Yard is now 12 m wide: enough for four 1.6 m karts abreast with clear lateral room. The five-racer vertical slice starts as a four-kart front row with one kart centered just behind it; four temporary CPU opponents replace the previous five.
- The test circuit's centerline uses long near-straights connected by a few large-radius, gradual bends. It removes the former run of close sharp turns while preserving the closed spline, checkpoint progress, AI route, elevation, and jump test zone. The loop includes spacious left/right variations so racers encounter both turn directions without a tight chicane sequence. The previous spaced block barriers are replaced with continuous raised curbs and outer pavement strips on both sides of the road.
- The start/finish checkpoint now uses an explicit white road-spanning base with individually raised black tiles in a three-row checkerboard, positioned in front of the starting grid. The matching overhead finish gantry uses the same explicit white banner and raised black tiles, held by two outer road-side poles and visible on every lap as a clear landmark. Lap completion still uses exact forward crossing of that shared start/finish plane rather than a proximity radius, so racers cannot be marked finished before passing underneath the flag.
- Power-up inventory is stored on every kart. Both Guatam and all temporary CPU racers can collect and activate Zipcap, Halo Guard, and Rattle Pod; a Rattle Pod excludes only its owner and can strike any other active racer.

## Recommended next steps

1. Run several manual three-lap desktop and landscape-touch races; tune values only in `game/config/game-config.js`.
2. Perform Android Chrome and iOS Safari landscape checks, then record frame time/profile findings.
3. Add simple original audio/VFX after controller feel is approved.
4. Only after the slice passes device QA, begin the next approved content phase; do not create remaining racers or final tracks before review.

## Local launch

```powershell
cd "C:\Users\Engr sam\Documents\Dev\Dlicom Racers\game"
npm run start
```

Open `http://127.0.0.1:4173/game/`.

For a development-only CPU-driven full-race smoke route, append `?autoplay=1`. It is not part of the normal player UI.
