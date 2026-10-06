# Kapuriya reconstruction and five-character roster

## Source

Original: `assets/characters/kapuriya/new-models/KapuriyaDriving.glb`, 4,865,716 bytes and 80,000 triangles. SHA-256: `9d4a8fd691628e1f0f5171c4fbeae0d86938748e25d443a3263a5b1b55f91935`. The source is unchanged. Four source inspection renders are in `blender/characters/kapuriya-rebuilt/reference/`.

The attached standing/kart four-view images were reviewed in the conversation. Their stated Downloads paths were unavailable when copying reference files; no replacement image was assumed or fabricated.

## Reconstruction

Hand-authored round blue head, white face/belly/paws, red nose/collar/tail, gold bell, whiskers, smile, and seated limbs. Blue kart includes opaque white paw emblems, side stripes, silver bumpers, headlights, wing, rear engine/lamp and two exhaust sockets. Four closed grooved wheels retain the established roll and front-steer hierarchy.

Generator: `blender/scripts/rebuild_kapuriya.py`. Editable source and four review renders: `blender/characters/kapuriya-rebuilt/`. Runtime: `assets/characters/kapuriya-rebuilt/KapuriyaDriving.glb`. Only a combined driving model is exported; the garage kart view removes the driver from a clone.

Packed asset: 906,584 bytes (approximately 0.86 MiB), 39,764 Blender triangles, six mesh draws, one shared opaque vertex-color material, no embedded texture images. The generator also supplies a selection card render pending any user-supplied card artwork.

## Roster

Kapuriya is the fifth available selection after Gautam, Retree, Quang and Just Sam. Every selected player races against the four other available characters, each in their respective kart. The temporary duplicate-character filler is removed. Unique participant IDs, kart state, AI controller, power-up inventory and race progress remain independent. Model resources are fetched once per character and cloned into independently animated scene nodes.

Physics, AI tuning, controls, camera, track and race rules are unchanged.

## Checks and limitations

Eleven imported-model checks, eight selection/source checks, seven lineup/clone checks and fourteen gameplay logic checks pass (40 total). Checks cover wheel topology/rolling/reversing/front steering, road clearance during tumble, exhaust alignment, source preservation, selection persistence, and five distinct racers for every player choice.

Front/rear rebuild renders were reviewed; the smile was moved to the face surface and side stripes refined. Syntax and whitespace checks pass. Headless Edge at 1280 × 720 loaded the garage, selected Kapuriya through the picker, started a race and drove him. A second race selected Retree and successfully loaded all five distinct character driving assets, including CPU Kapuriya. No page errors were reported. Garage and racing-camera screenshots were visually reviewed and saved alongside this report.

This remains a close stylized reconstruction rather than an indistinguishable duplicate of the supplied AI asset. Desktop smoke tests do not establish physical-mobile performance or full-race playtesting. Blender 2.83 reports a shutdown error after exports on this machine; actual exported models are independently loaded and tested.
