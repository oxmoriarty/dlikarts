# Dlicom Racers audio provenance

## October 2026 kart audio pass

The active motor remains the domasx2 engine recording documented below. Its
CC0 source page was rechecked. Runtime decoding applies a 35 ms overlap splice;
the source recording on disk is unchanged. Pitch and volume are smoothed during
playback. Music files and the supplied engine-loop.ogg remain unchanged.

The following new files are original procedurally synthesized effects created
for this project by `game/audio/build_kart_sfx.py`. They contain no third-party
samples, recordings or melodies. Creator: this project's Codex-assisted audio
implementation. Source: the reproducible generator in this repository. No
external asset license or attribution requirement applies to these newly
generated signals; they are not presented as sourced CC0 recordings.

| Runtime file | Design / modifications | Encoding |
| --- | --- | --- |
| kart-pickup.wav | Short ascending bell confirmation | Mono 24 kHz, PCM 16-bit WAV |
| kart-boost.wav | Air rush with low propulsion body | Same |
| kart-shield.wav | Rounded energy swell | Same |
| kart-missile.wav | Short pressure burst and launch rush | Same |
| kart-impact.wav | Damped low impact and restrained noise transient | Same |
| kart-landing.wav | Shorter grounded impact | Same |
| kart-drift.wav | Filtered tire-friction noise; loop splice at runtime | Same |
| kart-victory.wav | Original resolved major-key fanfare | Same |
| kart-click.wav | Soft short mechanical-style menu click | Same |
| kart-back.wav | Lower descending menu confirmation | Same |

All are generated directly as PCM with short edge fades and peak headroom;
there is no lossy transcoding. Combined new payload: 279,560 bytes. Older
effects remain in the repository, with their original provenance below,
but replaced events now use the named kart files above.

All newly added runtime effects below are CC0 1.0 Universal assets from
Kenney or the separately identified OpenGameArt creator. CC0 does not require
attribution; this record is retained for traceability.

## Newly sourced effects

### engine-loop.wav

Original asset: `loop_3.wav`

Creator: domasx2

Source: https://opengameart.org/content/racing-car-engine-sound-loops

License: CC0 1.0 Universal

Attribution required: No
Modifications: Renamed for the runtime; no audio conversion or editing.

### reverse-alert.wav

Original asset: `car2.wav`

Creator: Yaroslav_Novikov

Source: https://opengameart.org/content/car-signal

License: CC0 1.0 Universal

Attribution required: No

Modifications: Renamed for the runtime; no audio conversion or editing.

### boost.ogg

Original asset: `thrusterFire_002.ogg`  
Creator: Kenney  
Source: https://opengameart.org/content/sci-fi-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; no audio conversion or editing.

### collision.ogg and landing.ogg

Original assets: `impactMetal_002.ogg` and `impactMetal_003.ogg` respectively  
Creator: Kenney  
Source: https://opengameart.org/content/sci-fi-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; no audio conversion or editing.

### shield.ogg and projectile.ogg

Original assets: `forceField_001.ogg` and `laserSmall_001.ogg` respectively

Creator: Kenney

Source: https://opengameart.org/content/sci-fi-sounds

License: CC0 1.0 Universal

Attribution required: No
Modifications: Renamed for the runtime; no audio conversion or editing.

### drift.ogg

Original asset: `scratch_003.ogg`  
Creator: Kenney  
Source: https://opengameart.org/content/interface-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; looped only by the runtime audio manager.

### countdown.ogg and go.ogg

Original assets: `tick_002.ogg` and `confirmation_003.ogg` respectively  
Creator: Kenney  
Source: https://opengameart.org/content/interface-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; no audio conversion or editing.

### powerup-pickup.ogg, lap-complete.ogg and race-finish.ogg

Original assets: `confirmation_002.ogg`, `bong_001.ogg` and `maximize_004.ogg` respectively  
Creator: Kenney  
Source: https://opengameart.org/content/interface-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; no audio conversion or editing.

### ui-select.ogg and ui-back.ogg

Original assets: `click_003.ogg` and `back_002.ogg` respectively  
Creator: Kenney  
Source: https://opengameart.org/content/interface-sounds  
License: CC0 1.0 Universal  
Attribution required: No  
Modifications: Renamed for the runtime; no audio conversion or editing.

## Existing approved music

`music/menu.ogg`, `music/race.ogg`, `music/race-final-lap.ogg`, and
`music/results.ogg` were already in the project and are treated as approved
production assets. Source and license information is required from the user;
no provenance is inferred here.

## Engine-loop audit note

The earlier audit did not locate `sfx/engine-loop.ogg`. That file is now present
and has been preserved. SOURCE INFORMATION REQUIRED FROM USER for that OGG;
no provenance is inferred. The current active motor uses the documented
`engine-loop.wav` recording above.
