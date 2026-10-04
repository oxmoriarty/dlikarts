# Imported Gautam models

**Historical integration report:** the game now loads the clean hand-built reconstruction described in `GAUTAM_REBUILD_REPORT.md`. The imported derivatives remain retained, but are no longer the active racing assets.

User-supplied originals live in `assets/characters/new-models/` (not the initially mentioned nested guatam directory). Originals and previous game models are retained.

The player uses the supplied combined GautamDriving model. CPU racers use instances of the supplied GautamKart model, sharing geometry and textures. The standalone Gautam model is retained for future use; it is not loaded into races or substituted for the approved selection-card artwork.

## Browser runtime copies

`blender/scripts/prepare_ai_guatam.py` generates runtime GLBs with Blender's decimation modifier and JPEG texture export:

| Model | Source triangles | Runtime triangles | Runtime bytes |
| --- | ---: | ---: | ---: |
| GautamDriving | 80,000 | 44,990 | 1,820,416 |
| GautamKart | 80,000 | 29,995 | 1,347,840 |

Combined runtime payload: 3,168,256 bytes. Five racers render approximately 165,000 imported-model triangles rather than 400,000 source triangles. Each asset has one shared texture/material. Higher detail budgets replace the first overly aggressive reduction; coincident seam vertices are welded without discarding loop UVs, normals recalculated, and smooth shading applied with a 55-degree hard-edge threshold. Improved normal sharing also reduces export size despite the higher geometry budget. No graphics-quality settings were changed. Device-level FPS comparisons have not been measured for this revision.

The adapter grounds each model at its lowest point, centers it, normalizes width to 1.85 metres, and converts its forward orientation to the existing KartVisual convention. Existing physics, collision dimensions, AI, camera and handling are unchanged by this integration. The existing visual tumble ground-clearance system remains active.

## Validation and limitations

GLB structure, triangle budgets, adapter scale/centering/grounding, and tumble ground clearance are covered by imported-model tests. Blender inspection renders were reviewed. The combined model was also observed in the live racing camera after starting a browser race.

## Wheel animation revision

The derivative-generation script now extracts the four original wheel regions into UV-preserving meshes, with centered axle pivots. Front wheels receive separate steering parents; nearby lamps/bodywork remain on the chassis. Originals are still untouched. Wheels spin from signed speed divided by each wheel's scaled radius, stop at zero speed and reverse their spin when reversing. Front pivots steer around glTF's vertical Y axis using the existing smoothed kart lean signal, limited to 0.42 radians. Player and CPU instances animate independently. Physics/AI remain unchanged.

Actual runtime GLB geometry and transforms are decoded in automated tests to verify all four wheel nodes, forward/reverse spin, front steering, and tumble clearance. A separate fixture verifies stopped wheels and rear axles remaining unsteered. All 18 model/gameplay/audio tests passed. Blender inspection renders with wheels rotated and front axles steered were reviewed; extraction boundaries were tightened after this review caught adjacent lamp faces moving with a wheel.

These supplied files still have no character skeleton or separate steering-wheel mesh. Character limb/steering-wheel animation remains unavailable. Spatially extracted AI geometry is not equivalent to a professionally authored mechanical rig; baked texture defects and inaccurate underlying AI geometry cannot all be corrected by smoothing. Existing original textures are retained, not repainted. This revision adds four extra mesh draws per kart while keeping shared geometry/material resources.

Source website and licensing information must be supplied by the user before public distribution rights can be confirmed.

The revised assets also loaded into a browser race successfully. A LOW-quality stationary racing-camera sample displayed 59 FPS / 16.9 ms; this is not a representative mobile/full-race benchmark. The browser reported the same MutationObserver error observed before this wheel revision; no model-loading/animation error was reported. That existing presentation/instrumentation issue is outside this asset pass.
