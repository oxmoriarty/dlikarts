# DliKarts — Vertical Slice Implementation Plan

**Status:** approval plan only. Do not start these milestones until the design and technical plan are approved. The approved Guatam character/kart assets and `prototype/` validation viewer remain unchanged throughout this work.

## Delivery definition

The slice is a complete local browser race: Guatam in the approved kart races four temporary CPU karts around Switchback Yard for three laps using keyboard or landscape touch controls. It has drift boosts, collisions, off-road slowdown, a jump, ordered checkpoints, position/finish/recovery/wrong-way rules, three power-ups, HUD, results, and a measured mobile quality profile.

Work in dependency order. Each milestone is integrated into a runnable build before the next starts; a feature is not complete merely because its module exists.

## Milestone 1 — Core application and game shell

| Item | Plan |
| --- | --- |
| Objective | Establish a separate, runnable `game/` ES-module application with a safe lifecycle, renderer, resize handling, loading shell, fixed-step loop, and development toggles. |
| Systems affected | Core loop, rendering, asset cache skeleton, UI shell, quality settings, debug flags. |
| Expected modules | `game/index.html`, `game/styles.css`, `game/main.js`, `core/Game.js`, `core/FixedStepLoop.js`, `core/EventBus.js`, `render/Renderer.js`, `render/AssetCache.js`, `config/game-config.js`, `config/quality-profiles.js`, `debug/DebugFlags.js`. |
| Dependencies | None. Preserve `prototype/`; reuse its Three.js version/pinned import style initially. |
| Completion criteria | A canvas runs without gameplay; resize/DPR cap works; a loading/error shell exists; visibility pause clears input; fixed update is 60 Hz and render is separate; development debug overlay is behind a flag. |
| Tests | Load/reload/offline-error behavior; 390×844, 844×390, 1024×768, 1440×900 resize checks; synthetic 30/60/120 fps cadence confirms fixed-step count; browser console clean. |

## Milestone 2 — Guatam kart controller

| Item | Plan |
| --- | --- |
| Objective | Load the unmodified approved GLBs and create a controllable single arcade kart on a flat test surface. |
| Systems affected | Asset adapter, input, custom kinematic physics, Guatam animation/presentation, kart socket/node mapping. |
| Expected modules | `input/InputState.js`, `input/KeyboardInput.js`, `physics/TrackCollision.js`, `physics/KartCollision.js`, `vehicle/ArcadeKartController.js`, `vehicle/KartTuning.js`, `vehicle/KartPresentation.js`, `config/kart-tuning.js`, `tests/kart-controller.*`. |
| Dependencies | Milestone 1; existing `guatam.glb` and `guatam-kart.glb`. |
| Completion criteria | Accelerate, brake/reverse, speed-sensitive steering, normal grip, and bounded lateral slip feel responsive; Guatam snaps through `DRIVER_SEAT`; wheel roll/front steering/rim rotation and seated/steering clips use documented names; no asset-specific visual offsets are introduced. |
| Tests | Keyboard action mapping; max speed/acceleration/brake unit scenarios; 30/60/120 render cadence comparison; node-presence load assertion; visual check of seated/left/right steering and reset-to-idle. |

## Milestone 3 — Chase camera

| Item | Plan |
| --- | --- |
| Objective | Make single-kart driving readable and comfortable at speed. |
| Systems affected | Camera target query, render interpolation, track obstruction query, accessibility/reduced-motion setting. |
| Expected modules | `camera/ChaseCamera.js`, `camera/CameraCollision.js` or a `TrackQuery` method, `render/SceneLighting.js`, camera entries in `config/game-config.js`. |
| Dependencies | Milestone 2 and the kart's preserved `CAMERA_TARGET`. |
| Completion criteria | Smooth follow, look-ahead, limited speed FOV, modest drift influence, jump/landing response, boom shortening against test barriers, and no nausea-inducing shake. |
| Tests | Slow/high-speed, hard-left/right, drift, jump, barrier obstruction, reset, portrait prompt, and landscape phone framing visual checks; reduced-motion setting disables optional shake. |

## Milestone 4 — Switchback Yard test track

| Item | Plan |
| --- | --- |
| Objective | Create the one lightweight original proving track and its single-source spline data. |
| Systems affected | Spline sampling, road mesh generation, barriers/off-road/ramps, grid, checkpoints, recovery, track visual batching. |
| Expected modules | `track/TrackDefinition.js`, `track/SplineSampler.js`, `track/RoadMeshBuilder.js`, `track/CheckpointBuilder.js`, `track/TrackQuery.js`, `tracks/switchback-yard.js`, `physics/Recovery.js`, `debug/DebugDraw.js`. |
| Dependencies | Milestones 1–3. |
| Completion criteria | Three-lap-capable closed loop contains the specified wide section, medium/sharp turns, S-curve, long drift corner, elevation, small jump, off-road, barriers, safe recovery locations, start grid, and ordered gates; average lap target is 60–90 s during tuning. |
| Tests | Spline continuity/cumulative-distance assertions; road/barrier/off-road alignment visual pass; ramp/landing; out-of-bounds recovery; all checkpoint gates reachable in legal order; no track mesh hole/normal error. |

## Milestone 5 — Drifting and boost

| Item | Plan |
| --- | --- |
| Objective | Implement the central drift-to-release-boost loop with clear feedback and tunable data. |
| Systems affected | Kart controller, drift state machine, HUD signal, VFX/audio event stubs, kart presentation. |
| Expected modules | `vehicle/DriftSystem.js`, `config/kart-tuning.js`, `render/ParticleSystem.js` (minimal), `audio/AudioManager.js` (event-safe stub), `tests/drift-system.*`. |
| Dependencies | Milestones 2–4. |
| Completion criteria | Grounded speed/steering conditions initiate drift; safe-angle charge produces Spark/Flare/Comet tiers; release gives bounded boost; collision/airborne/off-road/over-angle cancellation works; straight-line abuse and boost chaining are prevented. |
| Tests | Deterministic tier threshold/cancel/release tests; manual long-corner and S-curve playtests; inspect 30/60/120 cadence; verify wheel/driver presentation and VFX event rates are bounded. |

## Milestone 6 — Race, checkpoints, laps, and positions

| Item | Plan |
| --- | --- |
| Objective | Turn driving the track into a valid, finishable three-lap race. |
| Systems affected | State machine, grid/countdown, checkpoint gate logic, progress/position ranking, timer, wrong-way, recovery, results data. |
| Expected modules | `race/RaceStateMachine.js`, `race/ProgressTracker.js`, `race/PositionSystem.js`, `race/LapSystem.js`, `race/WrongWaySystem.js`, `race/RaceResults.js`, `tests/race-logic.*`. |
| Dependencies | Milestones 2–4; drift is helpful but not mandatory for rule correctness. |
| Completion criteria | Loading/ready/countdown/racing/player-finished/race-finished/results states transition correctly; skipped gates cannot finish laps; positions use lap/checkpoint/spline progress; wrong-way has hysteresis; manual/automatic recovery uses legal poses. |
| Tests | Scripted gate order, two nearby spline branches, tie ordering, early finish, reverse line, reset, finish order, and paused/resumed countdown scenarios; three complete manual laps. |

## Milestone 7 — Mobile controls and mobile resilience

| Item | Plan |
| --- | --- |
| Objective | Make the same race comfortable with landscape touch input and auto-acceleration. |
| Systems affected | Input adapters, HUD/control overlay, safe-area/responsive CSS, orientation gate, input focus/visibility behavior. |
| Expected modules | `input/TouchControls.js`, `ui/TouchOverlay.js`, `ui/OrientationPrompt.js`, additions to `input/InputState.js` and `game/styles.css`. |
| Dependencies | Milestones 1–3 and enough of milestone 6 to race. |
| Completion criteria | Large left/right/drift-brake/item controls support steering + drift + item multitouch; auto-acceleration works; cancel/blur never leaves stuck input; page does not scroll/zoom while racing; portrait prompts for landscape. |
| Tests | Android Chrome and iOS Safari where available; 390×844 prompt then 844×390 race; touch target/safe-area checks; pointercancel, orientation change, call/background resume, and no-horizontal-overflow checks. |

## Milestone 8 — Four CPU racers

| Item | Plan |
| --- | --- |
| Objective | Fill the race with five performance-safe temporary opponent karts that race credibly. |
| Systems affected | Shared kart controller, temporary visual factory, spline racing line, avoidance, AI difficulty, recovery, position system. |
| Expected modules | `ai/RacingLineAI.js`, `ai/AIDifficulty.js`, `ai/AIItemUse.js` (stub until milestone 9), `physics/SpatialHash.js`, `render/TemporaryKartFactory.js`, `config/ai-profiles.js`, `tests/ai.*`. |
| Dependencies | Milestones 2, 4, 6. Do not create production models for the five remaining racers. |
| Completion criteria | Five opponents spawn on the grid, complete legal laps, target corner speeds, avoid obvious repeated collisions, recover, and display controlled line/pace variation. Easy/Normal/Hard data changes behavior without replacing code. |
| Tests | Ten automated seeded races for no stuck CPU/invalid finish; turn/ramp/recovery stress cases; side-by-side collision test; visual race observation; compare AI decisions at 10–15 Hz with stable controls at 60 Hz. |

## Milestone 9 — Three initial power-ups

| Item | Plan |
| --- | --- |
| Objective | Add Zipcap, Rattle Pod, and Halo Guard with pickup, inventory, feedback, counterplay, and CPU use. |
| Systems affected | Track pickup placements, inventory, pooled effects/projectiles, collision/events, HUD/audio/VFX, AI decisions. |
| Expected modules | `powerups/PickupSystem.js`, `powerups/Inventory.js`, `powerups/PowerupSystem.js`, `powerups/ProjectilePool.js`, `config/item-definitions.js`, `tests/powerups.*`. |
| Dependencies | Milestones 5–8; touch item action from milestone 7. |
| Completion criteria | One held item maximum; pickup respawn is visible; Zipcap does not stack abusively with drift; Rattle Pod has cone/expiry/warning/guard response; Halo Guard has duration/one-hit expiry; CPU item behavior is reasonable; particle/projectile capacity is bounded. |
| Tests | Pickup/respawn, use while paused/finished, item stacking, hit/guard/expiry, target dodge/intercept, six-kart item stress, keyboard/touch activation, and pool-exhaustion test. |

## Milestone 10 — HUD and results

| Item | Plan |
| --- | --- |
| Objective | Present the race state clearly without obscuring mobile play. |
| Systems affected | HUD, countdown, drift feedback, held item, results, UI event subscription, accessibility labels. |
| Expected modules | `ui/Hud.js`, `ui/Countdown.js`, `ui/Results.js`, `ui/DebugOverlay.js`, `ui/ui-state.js`, `audio/AudioManager.js` (basic cues). |
| Dependencies | Milestones 5, 6, 7, and 9. |
| Completion criteria | Position/lap/timer/held item/drift tier remain legible in landscape; countdown and finish results work; retry/menu actions cleanly dispose/reload the race; keyboard focus and touch layout remain usable. |
| Tests | All race states; first/last finish; item/no-item HUD; small landscape/desktop screenshots; repeated retry without leaked listeners/resources; screen-reader-friendly control labels where practical. |

## Milestone 11 — Performance optimization

| Item | Plan |
| --- | --- |
| Objective | Meet measured scene budgets without changing race rules or approved assets. |
| Systems affected | Renderer quality, shadows, DPR, batching/instancing, particles, asset cache/disposal, AI/physics cadence, debug telemetry. |
| Expected modules | `render/QualityManager.js`, additions to `render/Renderer.js`, `render/ParticleSystem.js`, `core/ObjectPool.js`, `debug/RaceTelemetry.js`, performance fixture/config. |
| Dependencies | Feature-complete milestones 1–10. |
| Completion criteria | Six-kart representative race honors Low/Medium/High budgets from `TECHNICAL_PLAN.md`; quality can degrade shadows/DPR/particles without changing fixed simulation; no sustained allocation spikes or console errors. |
| Tests | Browser performance capture at 844×390, 1024×768, 1440×900; at least one Android and one iPhone-class physical device if available; six-kart start, jump, particle-heavy item use, finish/results, and repeated race loading. |

## Milestone 12 — Vertical-slice validation and release gate

| Item | Plan |
| --- | --- |
| Objective | Validate the complete vertical slice as a playable, repeatable browser experience and document any approved follow-up work. |
| Systems affected | All systems; documentation; QA checklists; save/settings smoke path. |
| Expected modules | `docs/VERTICAL_SLICE_REPORT.md` (future), `tests/` fixtures, production debug-flag build configuration, optional `save/SaveStore.js` smoke path. |
| Dependencies | Milestones 1–11. |
| Completion criteria | A new user can start/finish a three-lap six-kart race on keyboard and touch; drift/power-ups/checkpoints/positions/results/recovery work; no high-severity browser-console errors; approved GLBs remain unchanged; performance evidence is recorded per profile/device. |
| Tests | Full regression: boot, loading failure, desktop race, touch race, every item, each AI difficulty, wrong-way/reset, pause/resume/orientation, repeated retry, low/medium/high profiles, asset viewer regression, and manual visual review. |

## Cross-milestone rules

- Do not introduce other production racers/karts until their asset pipeline phase is separately approved.
- Do not edit `blender/characters/guatam.blend`, `blender/vehicles/guatam-kart.blend`, or their GLBs for gameplay convenience. Fix future integration in the documented runtime adapter/track data, never with arbitrary asset offsets.
- Keep all gameplay values in data/config modules and record playtest changes with scenario/reason.
- Maintain a no-console-error baseline and run the asset viewer after changes to loader/runtime axis code.
- Cut decorative scenery, nonessential VFX, extra items, and menu depth before cutting fixed-step control quality, touch controls, or performance validation.

## Approval gates

1. **Before Milestone 2:** approve the app/module and custom-physics direction.
2. **Before Milestone 5:** controller and camera must feel credible on the proving track.
3. **Before Milestone 8:** race rules/position/recovery must be correct without CPU complexity hiding defects.
4. **Before Milestone 11:** all player-facing vertical-slice features must be complete; optimization is measured, not speculative.
5. **Before future content:** the vertical-slice report must show a playable six-kart browser race on target device categories.
