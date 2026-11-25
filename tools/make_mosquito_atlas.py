#!/usr/bin/env python3
"""Trim the full mosquito source sheet down to the few frames the game uses.

Output: web/src/assets/sprites/creatures/mosquito_atlas.png  (3 cells of 190x145)
Only imported assets end up in the single-file build, so this keeps it small.
Run:  python3 tools/make_mosquito_atlas.py   (needs Pillow)
"""
from PIL import Image
src = Image.open('web/src/assets/sprites/creatures/mosquito_sheet_source.png').convert('RGBA')
CELL_W, CELL_H = 190, 145
# (x, y, w, h) of the three "flap" frames in the original sheet
crops = [(75, 45, 180, 145), (270, 45, 180, 145), (450, 45, 190, 145)]
atlas = Image.new('RGBA', (CELL_W * len(crops), CELL_H), (0, 0, 0, 0))
for i, (x, y, w, h) in enumerate(crops):
    atlas.alpha_composite(src.crop((x, y, x + w, y + h)), (i * CELL_W, 0))
out = 'web/src/assets/sprites/creatures/mosquito_atlas.png'
atlas.save(out, optimize=True)
print(out, atlas.size)
