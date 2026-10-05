"""Read-only source inspection using the established four-view renderer."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
code=(ROOT/'blender/scripts/inspect_quang.py').read_text()
code=code.replace('quang/new-models/QuangDriving','justsam/new-models/JustSamDriving').replace('quang-rebuilt','justsam-rebuilt').replace('QuangDriving','JustSamDriving').replace('QUANG SOURCE','JUST SAM SOURCE')
exec(compile(code,__file__,'exec'))
