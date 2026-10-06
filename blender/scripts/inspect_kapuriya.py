"""Inspect Kapuriya's uploaded model without modifying it."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
code=(ROOT/'blender/scripts/inspect_quang.py').read_text()
code=code.replace('quang/new-models/QuangDriving','kapuriya/new-models/KapuriyaDriving').replace('quang-rebuilt','kapuriya-rebuilt').replace('QuangDriving','KapuriyaDriving').replace('QUANG SOURCE','KAPURIYA SOURCE')
exec(compile(code,__file__,'exec'))
