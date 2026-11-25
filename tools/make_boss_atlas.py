#!/usr/bin/env python3
"""Crop the two flying poses (facing right / facing left) of the fly boss out of
the full source sheet and shrink them to half size.

Output: web/src/assets/sprites/creatures/fly_boss.png  (2 cells of 470x300)
Run:  python3 tools/make_boss_atlas.py   (needs Pillow)
"""
from PIL import Image
base = 'web/src/assets/sprites/creatures/'
src = Image.open(base + 'fly_boss_source.png').convert('RGBA')
CELL_W, CELL_H = 470, 300
# bounding boxes of the top-row poses in the source sheet
boxes = [(59, 0, 999, 601), (1414, 0, 2354, 601)]
atlas = Image.new('RGBA', (CELL_W * 2, CELL_H), (0, 0, 0, 0))
for i, b in enumerate(boxes):
    cell = src.crop(b).resize((CELL_W, CELL_H), Image.LANCZOS)
    atlas.alpha_composite(cell, (i * CELL_W, 0))
atlas.save(base + 'fly_boss.png', optimize=True)
print(base + 'fly_boss.png', atlas.size)
