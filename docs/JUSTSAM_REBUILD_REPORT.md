# Just Sam reconstruction

## Source and references

The uploaded source is `assets/characters/justsam/new-models/JustSamDriving.glb` (4,854,360 bytes, 79,998 triangles). Its preserved SHA-256 is `10cb0c57846738152e6424f37db67c4e2e74e3e9d8daff7255b0eb72110bb9d8`. Front/rear/left/right source renders and copies of the supplied JustSamStanding and JustSamKart sheets are saved in `blender/characters/justsam-rebuilt/reference/`.

The blue cap-like structure visible behind the source head is deliberately omitted. No blue head accessory or transparent helmet is generated. Complete golden bowl-cut hair, a closed skin head, facial features, yellow triangle-pattern jacket, black uniform/cargo trousers, and gold/black/white shoes are authored from simple clean geometry.

## Kart and runtime

Yellow bonnet and side pods, black seat/chassis, silver front and rear bumpers, warm headlights, yellow wing with red end plates, gold wheel accents, red exhaust housings, and reference-style D badges. Four closed opaque wheels retain forward/reverse rolling and front steering. Two named exhaust sockets work with the existing flame system.

One combined `JustSamDriving.glb` is exported; no redundant standalone driver/kart downloads. Garage kart-only inspection reuses a clone with the driver removed. Editable source: `blender/characters/justsam-rebuilt/JustSamDriving.blend`; generator: `blender/scripts/rebuild_justsam.py`.

Just Sam is available as the fourth selection after Gautam, Retree, and Quang, before the remaining locked racers. Selection persistence and launch routing use the existing registry. No physics, controls, AI, track, audio, or race-rule tuning was changed.

## Size and verification

- Packed GLB: 1,276,388 bytes, approximately 1.22 MiB.
- Selection image: 537,039 bytes.
- Blender count: 43,324 triangles; browser runtime readout: 43,160 after processing.
- Six mesh draws, one shared opaque vertex-color material, no embedded texture images.
- Ten imported-model checks, six selection/source checks, and fourteen existing gameplay logic checks pass (30 total).
- Tests check wheel topology/animation, tumble ground clearance, exhaust alignment, selection persistence, unchanged source hash, and absence of blue driver vertex colors.
- Headless Edge at 1280 × 720 loads the garage, selects Just Sam, starts a race, and drives forward without page errors. Garage/race screenshots in this directory were visually inspected.
- Front and rear rebuild renders were inspected and hair/jacket geometry refined before final export.

This is a close stylized reconstruction, not an exact duplicate of the AI mesh. A desktop browser smoke test does not establish physical-mobile performance or full-race validation. Further visual refinement should follow user review in `/prototype/?models=justsam`. Blender 2.83 exits with a shutdown error after successful exports on this machine; generated files are independently loaded and tested.
