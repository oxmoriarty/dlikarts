# Quang rebuild

## Inputs and output

The original `assets/characters/quang/new-models/QuangDriving.glb` is preserved unchanged. Its SHA-256 is `d29edbec83be566c130af49e2074ae726cefb752948c5bdfb4e6369b2eae64b8`. The supplied QuangStanding and QuangKart four-view images informed hidden parts, colors, clothing, and rear details. Reference renders and images are under `blender/characters/quang-rebuilt/reference/`.

`blender/scripts/rebuild_quang.py` produces an editable Blender source and a clean, hand-authored combined driving model. This is a close stylized interpretation, not an indistinguishable reproduction of the AI mesh. No unnecessary standalone standing or kart asset is exported. The garage's kart-only view removes the driver from a clone of the combined model.

## Model details

- Bald head uses uniform opaque warm skin vertex color everywhere, including the rear scalp. The source's black scalp patches are not reproduced.
- Black glasses, blue eyes, white/cobalt hoodie, dark cargo trousers, and blue-white footwear.
- White/cobalt/orange kart, headlights, wing, engine accents, red rear light, and two named exhaust sockets.
- Four closed opaque wheels with tread grooves; front steering pivots and separate rolling wheels retain the existing runtime animation.
- Existing exhaust effects now locate the model's actual socket positions, with the existing fallback retained for other assets.

## Integration and cost

Quang is selectable in the racer picker and loads through the existing shared racer registry. Existing physics, track, controls, AI, and race rules are unchanged. Garage URL: `/prototype/?models=quang`.

Packed driving GLB: 1,135,544 bytes (approximately 1.08 MiB). Selection card: 518,767 bytes. Seven mesh draws, one shared opaque vertex-color material, no embedded texture images. Blender build count is 43,660 triangles; the browser garage runtime readout reports 43,372 after runtime processing. This is not a minimum-poly mobile asset; further LOD work could reduce its cost.

## Validation

- Nine imported-model checks pass: opaque assets, wheel topology, forward/reverse wheel roll, front steering, tumble clearance, and exhaust socket alignment.
- Four selection/model checks pass: routing, storage failure handling, uniform skin-colored scalp, unchanged original source, and combined-only output.
- Fourteen existing gameplay logic tests pass.
- Syntax checks and whitespace validation pass.
- Headless Edge at 1280 × 720 successfully loads the garage, selects Quang from the landing picker, starts the race, and drives forward. No page errors were reported in either browser check.
- Screenshots `quang-garage-preview.png` and `quang-race-preview.png` were visually inspected. The racing camera confirms the corrected rear scalp and visible dual exhaust effects.

These browser checks are a desktop smoke test, not a physical-mobile performance benchmark or a complete-race playtest. The model remains an approximation of the supplied AI asset and should receive the user's visual review in the garage.
