# DliKarts — Game Design Specification

**Status:** planning baseline for the post-asset vertical slice.  
**Official game name:** **DliKarts**. Earlier asset-pipeline documents and the Asset Garage use the former working name; that does not rename the game or authorize changes to approved Guatam assets.

## 1. Product definition and pillars

DliKarts is an original, lightweight browser kart racer for short, repeatable races. It is a stylized arcade game, not a vehicle simulator. The player should understand the basics in one race, then improve through line choice, timed drifts, boost releases, shortcuts, avoiding hazards, and well-timed items.

The pillars, in priority order, are:

1. **Responsive arcade driving.** Inputs have an immediate, forgiving effect; the controller is easy to recover from and rewards practice.
2. **Readable mobile racing.** Karts, track edges, pickups, and feedback remain clear in a landscape phone viewport.
3. **Drift-to-boost rhythm.** Deliberate corner entry, control of a drift, and a well-timed release are the main skill loop.
4. **Compact, replayable races.** A race is a complete experience without lengthy setup, grinding, or a tutorial wall.
5. **Polished within a strict browser budget.** Silhouette, animation, palette, and lightweight VFX carry the presentation rather than expensive rendering.

The approved Guatam character/kart pair is the visual and technical baseline. The final roster is Guatam, Just Sam, Kapuriya, Quang, Retree, and Timur; only Guatam is production-ready today.

## 2. Initial playable vertical slice

The first playable race contains Guatam, his approved kart, one original proving track, four temporary CPU karts, three laps, and five racers total. It includes keyboard/touch controls, driving, drift boosts, collisions, off-road slowdown, one jump, checkpoints, lap/position/finish rules, recovery, wrong-way feedback, basic HUD, three item types, and results.

Temporary opponents are intentionally non-production placeholders. They validate race density and CPU behavior without creating the other racers/karts before their approved asset work.

## 3. Controls

### Desktop

| Input | Action |
| --- | --- |
| `W` / Up | Accelerate |
| `S` / Down | Brake; reverse only when nearly stopped |
| `A` / Left | Steer left |
| `D` / Right | Steer right |
| Space | Hold drift |
| `E` | Use held power-up |
| `R` | Hold/tap recovery reset |

Both arrow and WASD mappings are supported. Drift is a hold action; it must not require a difficult chord other than steer + drift.

### Mobile

Races default to **landscape** and use **auto-acceleration**. The initial touch layout is four large, fixed buttons: left and right on the lower-left; drift/brake and power-up on the lower-right. Buttons use pointer events, `touch-action: none`, visual pressed states, and per-pointer tracking so steering plus drift plus item use works with multitouch. Drift/brake brakes only below a low speed or while reversing; otherwise it requests a drift.

This button layout is the recommended first version because it is robust, discoverable, and testable across iOS and Android. Tilt steering may be evaluated later as an opt-in accessibility/control option; it is not a vertical-slice dependency. Gamepad actions map cleanly to the same input action layer later, but gamepad support is not required for the first playable build.

## 4. Arcade driving model

The kart has a speed vector, a facing vector, a grounded/airborne state, and a compact set of tunable handling values. It does **not** emulate a realistic four-wheel drivetrain. Acceleration adds forward velocity; braking applies deceleration then permits limited reverse; steering changes yaw with authority that falls as speed rises. A controlled lateral-velocity component supplies slide rather than simulating tire forces in detail.

Key tunables live in one kart tuning definition, not scattered constants: forward/reverse acceleration, maximum speed, braking, rolling drag, off-road multiplier, base steering rate, high-speed steering reduction, normal/drift lateral grip, gravity, jump impulse/landing response, and collision impulse limits.

- **Normal grip:** lateral velocity is quickly damped. The kart is planted and predictable.
- **Off-road:** road progress remains valid but max speed and acceleration are reduced; steering stays usable. It is a time loss, not a trap.
- **Airborne:** gravity and limited yaw/roll input apply. No air acceleration exploits.
- **Landing:** vertical velocity is absorbed, then a small speed-preserving landing response and dust cue play. Excessively tilted/out-of-bounds karts recover.
- **Collision:** barriers resolve position and remove/redirect only the offending normal velocity. Kart-to-kart contact is a bounded horizontal nudge, never a violent physics pile-up.
- **Presentation:** wheels roll/steer and chassis pitch/roll derive procedurally from motion using the approved kart nodes; Guatam uses the approved seated and steering clips.

## 5. Drift and boost

Drift is intentional rather than automatic. Starting values below are tuning targets, not final constants.

| Rule | Design target |
| --- | --- |
| Initiation | Hold Drift, be grounded, travel above ~35% top speed, and steer beyond a small dead zone. |
| Direction | Lock the drift direction on entry; it may switch only after cancelling/re-entering. |
| Handling change | Reduce lateral grip and add a bounded yaw assist in the held steering direction. |
| Safe angle | Target 8–28° slip; at ~35° the drift loses charge, and at ~48° it cancels into recovery grip. |
| Charge | Accrue only while grounded, moving fast enough, and within the safe angle. Long straight drifts do not charge: steering curvature/slip must be meaningful. |
| Release | Releasing Drift while a tier is charged gives a short forward boost, then returns to normal grip. |
| Failure | Braking to low speed, leaving the road too long, colliding hard, becoming airborne, counter-steering through zero, or exceeding the angle limit cancels charge. |

Charge tiers are deliberately compact: **Spark** (about 0.45 s of valid drift; ~0.35 s boost), **Flare** (about 1.15 s; ~0.65 s), and **Comet** (about 2.1 s; ~1.0 s). Exact duration/multiplier values are profile data. The boost cannot refresh itself while active, has a small cooldown, and is weaker off-road. This makes release timing valuable without making endless drifting optimal.

## 6. Chase camera

The default camera is an obstruction-aware third-person chase camera. It follows a smoothed target near the kart's `CAMERA_TARGET`, not the model origin. Target values: 5.5–6.5 m back, 2.3–2.8 m high, modest forward look-ahead based on velocity, and a 58–66° vertical FOV that widens gradually with speed.

The camera may shift a little toward steering/drift direction and look slightly ahead on jumps, but it must not snap, roll dramatically, or shake continuously. Collision checks shorten the camera boom if terrain/barriers intervene; it eases back out after clearing. Landing gets a very small spring response, while collisions use a brief UI/VFX cue rather than nausea-inducing shake.

## 7. Proving track: **Switchback Yard**

Switchback Yard is an original compact test circuit, not a final themed track. It is a clean industrial-color proving ground built from lightweight road strips, low barriers, terrain pads, gates, and sparse props. A new player should lap it in **60–90 seconds** once the controller is tuned.

Layout, in order: six-kart starting grid; a wide learning bend; medium left/right sequence; a sharper 90° corner; an S-curve; a long banked drift corner; shallow elevation climb; a small, optional straight-line jump; off-road shoulders; a recovery-safe basin; and a final bend to the finish. Ordered checkpoint gates bracket every branch, including a possible later shortcut. The first route uses no mandatory shortcut and has generous barrier run-off.

## 8. Race rules and position

Race state is `LOADING → READY → COUNTDOWN → RACING → PLAYER_FINISHED → RACE_FINISHED → RESULTS`.

- The grid locks input until countdown completion; a brief visual/audio count precedes launch.
- A lap is valid only after crossing checkpoints in their configured order, then crossing the finish line in the valid direction.
- Position is ordered by: finished status/finish order, completed laps, last valid checkpoint ordinal, then signed progress along the current checkpoint-to-checkpoint spline segment. This avoids errors where two nearby but separate parts of a curved circuit are physically close.
- Lap time and best lap are recorded; finish order is stable once set.
- Wrong-way feedback appears only after sustained reverse track progress, with hysteresis so it does not flicker during a corner or reset.
- `R`/touch recovery returns the kart to the last safe checkpoint-facing pose after a short hold/confirmation. Automatic recovery triggers only after a sustained out-of-bounds, upside-down, or immobile state.
- The vertical slice ends after the player finishes and a short grace window lets the field settle; results list all six positions and lap/best-lap data.

## 9. CPU racing and difficulty

CPU karts follow a sampled racing line attached to the track spline rather than using general navigation/pathfinding. Each sample stores target point, target speed, tangent, width corridor, and optional item/shortcut preference. Steering is a look-ahead pursuit target with speed reduced for curvature; recovery seeks the next legal checkpoint sample. A lightweight avoidance layer offsets the target within the corridor when another kart/barrier is close.

Variation is deterministic per racer/seed: a small line offset, reaction smoothing, item-use threshold, and preferred drift release timing. It must not produce irrational stops or all six karts driving in a single exact line.

| Difficulty | CPU behavior |
| --- | --- |
| Easy | Lower target speed, larger braking margin, slower recovery, sparse item use, weak drift release. |
| Normal | Baseline line accuracy/speed, credible braking, occasional drift boost and item use. |
| Hard | Tighter line, better corner target speed, faster recovery, competent but not perfect drift/item timing. |

Any catch-up assistance is subtle: a small behind-the-pack target-speed/item-weight adjustment, capped and disabled near the final finish segment. It is never a teleport or a dramatic last-place speed multiplier.

## 10. Power-ups

### Vertical-slice set

| Item | Role | Behavior and feedback | Counterplay / AI / mobile |
| --- | --- | --- | --- |
| **Zipcap** | Speed | A bright mushroom-cap energy burst gives a fixed short acceleration/top-speed boost; it cannot stack with a drift boost. Clear trail, rising engine pitch, and one-shot chime. | Save for a straight or exit; opponents can block the racing line but cannot remove it. AI uses on a valid straight or after an interrupted drift. One large touch button activates it. |
| **Rattle Pod** | Offense | A visible forward-travelling pulse pod seeks only within a shallow forward cone and applies a short, gentle spin/slow to its first target. It has a clear warning light/sound and expires against scenery. | Target can turn out of the cone, use a guard, or let another kart intercept. AI fires only at a viable kart ahead, not blindly. |
| **Halo Guard** | Defense | A three-second translucent-but-low-overdraw ring absorbs one hostile hit or strongly reduces one kart-collision impulse, then breaks. | It is temporary and visually obvious; opponents wait it out, choose another target, or use speed. AI activates when a warning/close threat is detected. |

Pickups are highly visible, rotating track objects with a pooled pickup flash and respawn timer. Only one held item exists at a time. Audio requirements are a pickup cue, use cue, impact/guard-break cue, and one brief spatial warning cue for the offense item.

### Final pool (6–8 total)

The recommended jam-final pool is **seven** items, including the three above. More items dilute testing and increase AI/network of interactions.

| Item | Role | Mechanic | Counterplay | Rarity |
| --- | --- | --- | --- | --- |
| Zipcap | Speed | Short self boost. | Corner positioning; no stacking. | Common |
| Rattle Pod | Offense | Forward-cone pulse pod causes brief spin/slow. | Dodge cone, intercept, Halo Guard. | Common |
| Halo Guard | Defense | Blocks one hostile event for a short time. | Wait/retarget. | Common |
| **Gripglow** | Handling | Briefly raises normal grip and preserves a small amount of drift charge after a light bump. | Does not add speed; expires quickly. | Uncommon |
| **Trail Stitch** | Tactics | Lays a short visible slow-strip behind the kart; the owner is immune. | Drive around it, jump it, or use a boost. | Uncommon |
| **Beacon Skip** | Route | Brief speed gate opens a nearby marked shortcut entrance for the holder only once. Tracks without an authored safe route omit it. | Take normal route cleanly; deny pickup. | Rare, track-specific |
| **Quiet Current** | Recovery/utility | Clears hostile slow/spin state and grants a very brief low-strength acceleration pulse. | It is reactive, not an attack. | Rare when behind |

No item imitates a recognizable commercial kart-racer item. Each has a single readable purpose, clear cue, limited lifetime, and a testable AI rule.

## 11. Racers and stats

The eventual stat display has only four bars: **Speed, Acceleration, Handling, Drift**. Values are one-to-five presentation bars with a shared total of 16, and translate to modest tuning ranges (initially no more than roughly ±5% from the balanced baseline). Guatam is the neutral 4/4/4/4 baseline. Temporary CPU karts use that baseline; AI behavior supplies variety until their approved racer/kart combinations exist.

Each final combination must be competitively viable: lower Speed is compensated by Acceleration/Handling/Drift, and no stat changes hitbox dimensions or item odds. Stats live in data, not character/vehicle meshes.

**Character-specific abilities are not recommended** for the first release or vertical slice. They add balance, UI, VFX, audio, AI, and accessibility complexity while competing with the common item system. Reconsider only after the core controller and seven-item pool are proven fun; if introduced later, they must be a small optional mode, not a requirement for competitive viability.

## 12. HUD, audio, VFX, and game flow

The landscape HUD is intentionally minimal: position (for example `2/6`), lap (`1/3`), race timer, held power-up, and a three-tier drift/boost arc close to the drift control. A speedometer is omitted from the first playable build because speed sensation, track readability, and drift feedback are more useful on small screens.

Audio categories to plan—not source during this planning phase—are engine loop with speed/acceleration variation, skid/drift, boost, barrier/kart impact, jump/landing, item pickup/use, countdown, lap/finish, UI, and one lightweight music bed. All content must be original/licensed for DliKarts; no commercial-game audio may be used.

VFX use pooled sprite/mesh particles: tire dust off-road, sparse drift smoke/sparks by charge tier, boost trail, landing dust, collision flash, item pickup/use, and guard break. Effects are bounded, opaque/additive where feasible, and quality-scaled.

Eventual flow: `BOOT → TITLE → MAIN MENU → RACER SELECT → TRACK SELECT → RACE LOADING → RACE → RESULTS → RETRY / CONTINUE / MENU`. The vertical slice may enter the single race directly from a lightweight title/debug launch.

## 13. Modes, progression, and saving

The final modes are Quick Race, Championship, and Time Trial. Quick Race is the core; Time Trial reuses the track/controller with ghosts optional after the jam; Championship is a simple multi-race points table with no new driving systems.

Suggested championship: four races, points `10/8/6/5/4/3`, final standings, and gold/silver/bronze trophy presentation. Progression stays lightweight: complete tracks, earn medals by finish/time goals, unlock later tracks, and improve local best times. No currency, shops, loot boxes, grinding, accounts, servers, wallets, or private user data.

`localStorage` stores versioned settings, control preference, quality profile, unlocked track IDs, medals, best laps, and championship state. It is defensive: invalid/old data falls back to defaults; private browsing/storage failure does not prevent racing.

## 14. Proposed final content

For game-jam scope, keep the candidate target: **6 racers, 6 matching karts, 4 tracks, 7 power-ups, Quick Race, a four-race Championship, Time Trial, Easy/Normal/Hard, local records/medals, keyboard, and touch controls.** The non-negotiable cut order is: Time Trial ghosts, then Championship presentation depth, then the seventh item—not driving, touch controls, performance work, or the four polished tracks.

### Final tracks

| Track | Theme / palette | Difficulty and signature | Hazards / shortcut | Target lap |
| --- | --- | --- | --- | --- |
| **Copperleaf Circuit** | Sunlit botanical test park; teal leaves, warm copper rails, cream road markings. | Easy; broad terrace corkscrew teaches drifting. | Soft grass slowdown and low planter barriers; a clean inside garden path opens after a short jump. | 65–75 s |
| **Prism Quarry Run** | Faceted mineral quarry with indigo stone, coral safety paint, glowing cyan seams. | Medium; descending S-curve feeds a low-gravity-feeling crest. | Falling dust puffs and narrow stone walls; a split conveyor ramp trades safety for a faster landing. | 70–85 s |
| **Rainroot Canopy** | Elevated rainforest roots and rain-slick boardwalk, emerald, violet, and amber lanterns. | Medium-hard; linked cambers and a long canopy drift. | Wet leaf patches reduce grip and root gates close rhythmically; a risky hollow-root tunnel shortcut. | 75–90 s |
| **Starlight Switchworks** | Nighttime kinetic observatory rail-yard; deep navy, magenta, silver, and comet-gold. | Hard; elevation switchbacks, timed moving bridges, and precise final hairpin. | Slow rotating arms and temporary bridge closures; a high rail line is faster only with a controlled jump. | 80–95 s |

All four are original concepts and must be laid out from DliKarts' own spline/race needs rather than reference or copy from commercial racing games.
