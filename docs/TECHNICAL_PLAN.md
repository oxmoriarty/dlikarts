# DliKarts — Technical Implementation Plan

**Status:** planning only. This plan does not authorize changes to the approved Guatam assets, their Blender masters, the validation viewer, or installation of dependencies.

## 1. Existing project audit

The repository currently contains an approved Phase 1 asset pipeline and a standalone validation surface, not a game application.

| Area | Current state | Reuse decision |
| --- | --- | --- |
| Runtime renderer | `prototype/app.js` is plain browser ES modules using Three.js `0.160.1`, `GLTFLoader`, and `OrbitControls` through an import map. | Reuse Three.js and the direct-module style; do not turn the validation viewer into the game. |
| Asset loading | `GLTFLoader.loadAsync` loads `assets/characters/guatam.glb` and `assets/vehicles/guatam-kart.glb`. | Reuse the loader pattern with a game-owned asset cache/progress layer. |
| Approved assets | Guatam GLB: 3,932 triangles, 18-bone skin, 8 clips, 1 opaque vertex-color material, no images. Kart GLB: 4,688 triangles, 1 opaque material, named wheel/steering/socket nodes. | Load unchanged; drive the documented nodes and socket transforms. |
| Viewer | Responsive static inspection UI with DPR cap 2, `WebGLRenderer`, directional/hemisphere lighting, shadow map, explicit character seat attachment, and asset statistics. | Keep as a regression tool. It is not the game shell. |
| Tooling | `prototype/package.json` has only a Python static-server script; no installed dependencies, bundler, TypeScript, ECS, UI framework, or physics library. Node 24.14.1, npm 11.11.0, and Blender 2.83 are available. | Add no dependency in planning. Use a small vanilla ES module architecture for the first playable slice. |

The viewer currently imports Three from the unpkg CDN. Development can retain the pinned `0.160.1` module import map initially, but the release build should serve an exact vendored/bundled Three build from the game origin so the game does not depend on a third-party CDN at play time. This is a later packaging task, not a package install now.

## 2. Recommended architecture

Create a future `game/` application beside `prototype/`; preserve `prototype/` as the asset-validation viewer. The game remains framework-free browser ES modules until a demonstrated need outweighs the cost of another framework.

```text
game/
  index.html                 # loading shell / canvas / HUD mount
  styles.css
  main.js                    # composition root and lifecycle
  config/
    game-config.js           # fixed step, racer count, mode defaults
    quality-profiles.js
    kart-tuning.js
    item-definitions.js
  core/
    Game.js                  # state ownership and update ordering
    FixedStepLoop.js
    EventBus.js              # small typed-by-convention event channel
    ObjectPool.js
    DisposableScope.js
  render/
    Renderer.js              # Three setup, resize, quality switching
    SceneLighting.js
    AssetCache.js
    MaterialFactory.js
    ParticleSystem.js
  input/
    InputState.js
    KeyboardInput.js
    TouchControls.js
    GamepadInput.js          # dormant adapter; no first-slice requirement
  physics/
    TrackCollision.js
    KartCollision.js
    SpatialHash.js
    Recovery.js
  vehicle/
    ArcadeKartController.js
    KartPresentation.js
    DriftSystem.js
    KartTuning.js
  camera/
    ChaseCamera.js
  track/
    TrackDefinition.js
    SplineSampler.js
    RoadMeshBuilder.js
    CheckpointBuilder.js
    TrackQuery.js
  race/
    RaceStateMachine.js
    ProgressTracker.js
    PositionSystem.js
    LapSystem.js
    WrongWaySystem.js
  ai/
    RacingLineAI.js
    AIDifficulty.js
    AIItemUse.js
  powerups/
    PickupSystem.js
    Inventory.js
    PowerupSystem.js
    ProjectilePool.js
  ui/
    Hud.js
    Countdown.js
    Results.js
    DebugOverlay.js
  audio/
    AudioManager.js
  save/
    SaveStore.js
  debug/
    DebugFlags.js
    DebugDraw.js
    RaceTelemetry.js
  tests/
    *.test.js                # deterministic logic tests; later runner decision
assets/
  ...                        # approved runtime asset locations remain stable
```

`main.js` constructs the systems, while `Game` owns lifecycle and explicit update order. Systems exchange small state objects and events, not direct DOM queries or circular imports. Rendering reads simulation state; it does not decide race rules. UI dispatches input actions; it does not manipulate karts directly.

## 3. Rendering and asset integration

Use one `WebGLRenderer`, opaque PBR materials, a sky/hemisphere fill, and one directional key light. Follow the existing asset document: +Z is authored up, asset-local +Y is forward, and the game loader performs one documented axis adaptation at the root boundary rather than adding asset-specific offsets.

The game asset adapter has explicit contracts:

- Character root snaps to the kart's `DRIVER_SEAT` full matrix; the character retains its authored seated/steering clips.
- `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, and `WHEEL_RR` receive roll around local +X.
- `STEER_WHEEL_FL` and `STEER_WHEEL_FR` receive front steer around local +Z.
- `STEERING_WHEEL` rotates around its exported local +Y and selects/interpolates approved seated/left/right grip clips; no runtime arm IK is planned.
- `CAMERA_TARGET`, VFX sockets, and pickup/projectile sockets are queried by name. Missing required nodes are load-time errors in development.

Rendering is decoupled from simulation with an interpolated presentation pose. The track/game root owns world-space conversion so legacy Blender/Three orientation fixes do not leak into vehicle, race, or AI code. No post-processing is a visual dependency. Use a color-managed renderer, one transparent layer only where a VFX need cannot be met with additive/opaque alternatives, and dispose GLTF geometries/materials/textures when leaving a race scene.

## 4. Physics decision: custom kinematic arcade controller

**Recommendation: option A, a lightweight custom arcade movement/collision system. Do not add Rapier for the first vertical slice.**

The game needs responsive drift, ramps, barriers, six karts, and forgiving recovery—not a realistic suspension, drivetrain, or rigidbody pile-up. A custom fixed-step controller is lower CPU cost, easier to tune, and lets the race designer specify the intended result of a scrape, jump, and drift. It also avoids adding a WASM/package payload before profiling shows a real need.

The custom physics scope is deliberately bounded:

- Karts are kinematic ground bodies represented by a horizontal circle/capsule and a small vertical clearance; visual wheels are not physical bodies.
- Track collision comprises authored/generated road surface strips, barrier line/capsule segments, off-road regions, jump ramps, and recovery volumes. It is a low-resolution gameplay representation, not the render mesh.
- Grounding uses road-surface queries/raycast-like segment tests under the kart footprint. The controller resolves height/normal and switches to ballistic vertical motion when it leaves a ramp.
- Barrier response depenetrates along the nearest normal and removes/caps inward velocity. Kart-to-kart contact uses broadphase spatial hashing plus a symmetric, capped horizontal separation/velocity impulse.
- Ramps, gravity, landing, and recovery are owned by the arcade controller; collision does not need a general triangle-mesh rigidbody engine.

**Why not Rapier initially:** it adds download/decode/runtime complexity, invites realistic-body behavior that works against drift tuning, and would still require custom arcade overrides. Re-evaluate after the vertical-slice collision test only if repeated sloped/compound collision bugs cannot be solved with authored track surfaces, or profiling proves custom collision incorrect. If adopted later, use Rapier only for static track/barrier queries and simple bodies; keep `ArcadeKartController` as the source of speed, steering, drift, and boost.

## 5. Simulation timing and loop

Simulation runs at a fixed **1/60 second** step. The animation frame callback gathers a frame delta, clamps it to 0.10 s after background/resume, adds it to an accumulator, and performs at most five simulation steps. Excess time is discarded after the cap to prevent a spiral of death. Render runs once per browser frame.

```text
requestAnimationFrame(now)
  frameDelta = min(now - previous, 0.10)
  accumulator += frameDelta
  while accumulator >= 1/60 and steps < 5:
      sample held input
      update race state / AI / power-ups
      update kart simulation and collisions
      update progress, positions, events
      accumulator -= 1/60
  render(interpolationAlpha = accumulator / (1/60))
```

Karts retain previous/current simulation transforms so render can interpolate position/orientation. Inputs are action states sampled per fixed step; one-shot actions (item/recovery) are latched then consumed once. All time-based tuning uses seconds/step delta, never per-frame constants. Determinism need only be strong enough for repeatable local tests/AI, not network multiplayer.

## 6. Input and mobile architecture

`InputState` exposes semantic actions: `throttle`, `brake`, `steer`, `drift`, `useItem`, `recover`. Keyboard, touch, future gamepad, and debug adapters write this same state. It owns focus/visibility clearing so an unfocused page cannot keep accelerating.

The landscape touch overlay is HTML/CSS above the canvas, uses button-sized pointer capture, prevents default only within gameplay controls/canvas, and releases action state on `pointerup`, `pointercancel`, visibility change, orientation change, and blur. The page never relies on browser zoom/scroll gestures during a race. UI targets meet a minimum 48 CSS px active size with safe-area padding; the canvas uses `touch-action: none`.

On a portrait device, show a lightweight rotate-device prompt before starting a race. Do not forcibly lock orientation because browser support varies; resume automatically in landscape. Desktop uses the same canvas/HUD but hides touch controls.

## 7. Track architecture

A track is a compact data definition plus generated static render/collision artifacts, not a heavyweight editor.

```js
{
  id: 'switchback-yard',
  centerline: [{ position, width, bank, elevationHint, speedHint }, ...],
  closed: true,
  startGrid: [{ position, yaw }, ...],
  checkpoints: [{ splineDistance, gateWidth, order }, ...],
  barriers: [{ splineRange, side, type }],
  offRoad: [{ polygon, slowdown }],
  ramps: [{ polygon, launchNormal }],
  recoveryZones: [...],
  racingLine: [{ splineDistance, lateralOffset, targetSpeed }],
  pickups: [{ splineDistance, lateralOffset, groupId }],
  shortcuts: [{ entryCheckpoint, exitCheckpoint, requirement }]
}
```

`SplineSampler` creates fixed-distance samples with tangent, normal, curvature, width, and cumulative distance. `RoadMeshBuilder` turns samples into a low-poly road ribbon and shoulder strips. The same samples build checkpoint gates, barrier colliders, legal recovery locations, AI targets, and progress queries, preventing visual and gameplay routes from drifting apart. Terrain/props are lightweight decorations placed from deterministic seeds and are optional to collision.

The first proving track can be hand-authored as a small data object plus simple generated meshes. Avoid an arbitrary in-browser spline editor until four tracks demonstrate a recurring authoring bottleneck.

## 8. Vehicle, drift, camera, and race systems

`ArcadeKartController` stores simulation-only transform, forward/lateral/vertical velocity, grounded state, throttle/brake input, steering yaw, and flags. `DriftSystem` owns entry/maintenance/charge/release/cancel; it returns a boost modifier to the controller and sends events to HUD/audio/VFX. `KartPresentation` converts state to GLB node rotations, chassis lean/pitch, driver clip blend choice, exhaust emission, and wheel spin.

`ChaseCamera` runs after simulation and before render. It smooths toward `CAMERA_TARGET` plus velocity look-ahead, ray-tests the boom against track barriers, adjusts FOV within a narrow range, and respects reduced-motion settings.

`RaceStateMachine` is the single owner of loading/countdown/racing/results transitions. `ProgressTracker` validates ordered checkpoints before changing a lap; `PositionSystem` ranks racer state by finish/lap/checkpoint/segment progress. `WrongWaySystem` uses continuous signed spline progress plus time hysteresis. No renderer or UI component decides a race state.

## 9. AI architecture

Each CPU has the same `ArcadeKartController` and `KartTuning` as the player. `RacingLineAI` samples a target ahead by speed, applies its seeded lateral offset within the permitted corridor, calculates desired speed from curvature/look-ahead, and produces the same semantic actions as `InputState`. A bounded avoidance probe picks a safe offset when a collision is imminent; it is not general pathfinding.

The AI uses a low-frequency decision interval (for example 10–15 Hz) for expensive target/item decisions, then smooths the resulting controls every fixed step. Difficulty selects data values, not different behavior code. Recovery reuses legal checkpoint poses and failure timers. Item logic only evaluates the three currently enabled items; adding an item requires a declared usage rule and deterministic test scenario.

## 10. Asset loading, audio, save, and pooling

`AssetCache` returns shared promise/resource entries keyed by URL/variant. It loads menu shell/core shaders first, then selected racer/kart/track/power-up/audio group during race loading. It tracks byte/progress estimates where available, presents a cancellable/return-to-menu-safe loading state, and disposes race-only resources when the next scene has no references. Future unique character assets load once and can be reused by multiple temporary instances; never download six copies of the same GLB.

The release loading plan is staged:

1. **Boot:** app shell, minimal UI, settings, renderer, shared palette/material resources.
2. **Menu:** only lightweight menu presentation assets.
3. **Race:** selected track, selected player pair, opponent placeholders/selected roster, enabled item visuals/audio, then start grid.
4. **Cache:** retain recently used shared resources within a conservative memory budget; evict track-specific resources first.

`AudioManager` owns a small audio pool and master/music/SFX volume. Audio starts only after a user gesture to meet browser rules. Local `SaveStore` wraps versioned `localStorage`, catches quota/private-mode errors, migrates known versions, and returns defaults safely.

Pool at least particles, pickup respawn visuals, Rattle Pod projectile/effect instances, landing/dust emitters, collision flashes, and reusable positional-audio voices. Pooling is explicit capacity-based; when full, drop the least important effect rather than allocate during a crowded race.

## 11. Quality profiles and performance budget

The existing asset specification remains the per-asset authority. These are the whole-race budgets for a representative six-racer scene on a reasonably capable mobile browser; quality selection is conservative and manually overridable later.

| Budget | Low | Medium (default capable phone/tablet) | High (desktop/strong mobile) |
| --- | ---: | ---: | ---: |
| Frame target | stable 30 fps | 45–60 fps | 60 fps |
| DPR cap | 1.0 | 1.5 | 2.0 |
| Visible opaque triangles | 70–100k | 100–140k | 140–180k |
| Render draw calls, whole scene | ≤90 | ≤130 | ≤170 |
| Texture GPU budget, compressed working set | ≤48 MiB | ≤96 MiB | ≤160 MiB |
| Active particles | ≤50 | ≤110 | ≤180 |
| Shadow mode | blob/contact only | 512–1024 directional, short range | 1024 directional, filtered, short range |
| Shadow-casting dynamic objects | player/near karts only | ≤6 karts, no particle casters | ≤6 karts, no particle casters |
| Physics karts | 6 | 6 | 6 |
| Projectile/effect bodies | ≤8 | ≤12 | ≤16 |
| Initial race download target | ≤8 MiB compressed | ≤12 MiB compressed | ≤16 MiB compressed |

The approved six Guatam/kart pairs alone are about 51,720 triangles and approximately 42 mesh primitives/draw calls before environment. The track therefore must be mostly opaque, batched, and instanced. Shared static geometry/materials serve repeated barriers, gates, vegetation, pickup housings, and particles. Skinned racers and kart nodes are not blindly instanced.

Initial automatic profile selection uses viewport size, DPR, coarse device-memory/hardware-concurrency hints when present, and a short boot frame-time sample. It must not rely on fingerprinting or deny manual choice. Sustained frame-time pressure reduces DPR/particles/shadow distance first; it does not alter simulation timing or race fairness. High quality never adds gameplay-affecting collision/AI detail.

## 12. Debugging, testing, and validation

Development builds include a removable debug overlay with FPS, frame time, DPR/profile, renderer calls/triangles/geometries/textures, asset loading state, player velocity, grounded state, steering/slip angle, drift state/charge/boost, checkpoint/lap/progress/position, active item, AI target/speed, and pool occupancy. `DebugDraw` can show spline samples, racing line, checkpoint gates, barrier segments, recovery poses, ground query, and camera obstruction ray. These tools are feature-flagged and absent/disabled in production.

Testing is layered:

1. **Pure deterministic logic:** drift tier thresholds, checkpoint ordering, position sort, wrong-way hysteresis, item timing, and save migration.
2. **Headless simulation scenarios:** 30/60/120 render cadence produces matching fixed-step kart/race results; ramp landing, barrier scrape, kart overlap, reset, and finish order stay bounded.
3. **Asset integration:** production GLBs load; required nodes/actions exist; driver snaps to `DRIVER_SEAT`; wheels/rim animate; no asset modifications.
4. **Browser integration:** keyboard/touch multitouch, resize/orientation, loading failure, pause/resume, console errors, and race completion.
5. **Performance:** representative six-kart test at 390×844 portrait prompt, 844×390 landscape, 1024×768, and 1440×900; inspect browser profiler on at least one Android and iPhone-class device before release.

## 13. Risks and mitigations

| Risk | Mitigation / decision gate |
| --- | --- |
| Controller feels slippery or inconsistent across frame rates | Fixed 60 Hz simulation, central tuning data, and a small proving track before content work. |
| Custom collision is insufficient on ramps/barriers | Author simple gameplay surfaces first; only evaluate Rapier after a reproducible vertical-slice failure. |
| Six karts plus shadows overload phones | Whole-scene budgets, DPR/particle/shadow scaling, opaque batching, and device profiling before scenic detail. |
| Touch buttons obscure action or lose multitouch | Landscape-first fixed controls, pointer capture/cancel handling, and device testing in milestone 7. |
| CPU drivers look robotic or unstable | Spline/racing-line offsets seeded per driver, low-frequency decisions, and recovery test cases. |
| Asset names/axes regress when future assets arrive | Enforce the existing asset specification at load time and retain the Asset Garage as a regression tool. |
| CDN import becomes unavailable/offline | Pin for development only; vendor/bundle the already-approved Three version before release packaging. |

## 14. Dependency decision

No new dependency is required for the vertical slice. Three.js is already in active use and is the only rendering dependency. The custom physics, event flow, UI overlay, and pooling are intentionally small project modules. Add a test runner, bundler, compression encoder, or Rapier only when the associated milestone has a concrete, measured need and its payload/license/mobile implications are reviewed.
