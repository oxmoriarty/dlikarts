# Audio implementation report

## Scope and architecture

Audio is centralized in `game/audio/AudioManager.js`. Gameplay systems do not
create `Audio` objects. The manager observes `RaceSystem` state and player-kart
state, while `PowerupSystem` publishes a compact pickup/use event queue for
precise cues. Player kart-to-kart collision handling and track-edge
corrections report only meaningful impacts to the manager.

`AudioManager` owns music transitions, two dedicated loop voices (engine and
drift), short-effect pools, cooldowns, local volume preferences, visibility
handling, and browser audio unlocking. A single AudioContext is created and
resumed on the first valid pointer or keyboard interaction; media playback is
also explicitly unlocked by the Start Race and menu interactions.

## Music states

- `menu.ogg`: desired while the landing page or race-start menu is visible.
- `race.ogg`: starts with the same simulation state transition that displays
  GO and unlocks racing.
- `race-final-lap.ogg`: triggered once when the player enters lap three. It
  uses a 0.7-second crossfade and mirrors race-track playback position when
  duration metadata is available.
- `results.ogg`: crossfades in when RaceSystem reaches RESULTS. Race loops
  are stopped when the player has legitimately finished.

The four existing approved music files are unchanged. Their provenance is
recorded as source information required from the user in `assets/audio/LICENSES.md`.

## New sound effects and licensing

The runtime maps fourteen context-appropriate effects: a traced CC0 racing
engine loop; tyre-scrub, boost, collision and landing feedback; countdown,
lap and finish cues; plus individual shield and projectile activations. Per-file
original names, creator, URL, licence and modification status are in
`assets/audio/LICENSES.md`. The complete `assets/audio` payload is 16.27 MiB,
dominated by the four approved music tracks. No lossy re-encoding was performed.

The intended previously approved `engine-loop.ogg` was absent at audit time.
It has been replaced with a traced CC0 racing-engine loop (`engine-loop.wav`)
from domasx2, which is more appropriate for the kart. It is safe to replace
with the approved original later without a code change.

## Gameplay mapping

- Engine: temporarily disabled at the audio-manager feature switch while the
  SFX mix is being reworked. The continuous player/CPU engine and reverse
  implementation remains isolated in the manager for later re-enablement.
- Drift: one loop starts only when `kart.drift` becomes true, responds to drift
  charge, and fades on exit.
- Boost: a one-shot plays only when actual boost time increases.
- Collision: player-involved kart impacts and meaningful road-edge impacts are
  intensity-scaled, rate-varied subtly, and have a 150 ms cooldown.
- Landing: only a meaningful airborne-to-grounded transition plays a cue.
- Power-ups: collection and activation are separate PowerupSystem events.
  Zipcap uses the boost cue, Halo Guard uses the force-field cue, and Rattle
  Pod uses the forward-projectile cue rather than a generic activation sound.
- Laps/final lap/finish: each cue is gated to the legitimate player race state;
  CPU finishes never play the player's finish signal.
- UI: select/back sounds are bound to existing menu, panel, retry, quality and
  audio-controls interactions.

## Settings and browser handling

Master, Music and SFX levels plus mute are persisted in `localStorage` under
`dlikarts.audio.v1`. The landing page's previous music/SFX values are migrated
when no new audio record exists. Audio controls now appear in both the landing
settings panel and the game's start menu.

On visibility loss, music and loop voices pause. On return, the selected music
state resumes after the normal browser-unlock requirement is satisfied. Failed
or missing files are marked by their audio elements and never interrupt race
logic.

## Concurrency and performance

Drift has one dedicated loop. Engine voice creation is currently disabled.
Loop playback never restarts while active, fades have cancellation tokens, and stopping music clears its
desired state so a late keyboard unlock cannot restart menu music over a race.
Short sounds use pools of three voices (two for collision) and effect-specific
cooldowns, preventing wall-scrape or rapid-click stacking.

## Validation

- Node syntax checks passed for the audio manager, game integration, UI,
  power-ups and landing menu.
- Existing logic suite: 11/11 passed.
- Desktop browser validation: game booted from `http://127.0.0.1:4173/game/`,
  Start Race entered countdown, the audio context reached `running`, race
  music state became active after GO, and browser console errors/warnings were
  empty. The delayed keyboard-unlock path was also checked so it cannot restart
  menu music during the race.
- Mobile behavior is implemented through the same first-tap unlock and
  responsive settings controls. It requires real-device listening validation
  before release; no real phone/tablet test was performed in this pass.

## Known limitations and recommended polish

- The missing original approved engine loop should be supplied if it has a
  preferred sound identity.
- The final-lap crossfade is deliberately short; a later audio pass can align
  it to bar boundaries if the music stems provide timing metadata.
- Effects were browser-validated for lifecycle and event state, but subjective
  balance should be tuned on headphones and a physical phone before release.
