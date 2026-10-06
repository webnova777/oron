#!/usr/bin/env python3
"""누끼 결과를 영상용으로 다듬기: 투명 여백 제거 + 크기 정리(최대 높이 900px)."""
import os
from PIL import Image
A = os.path.join(os.path.dirname(__file__), '..', 'assets')
for n in ['guoba-red.png', 'banana.png', 'sesame.png']:
    im = Image.open(os.path.join(A, n)).convert('RGBA')
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(bbox)
    if im.height > 900:
        im = im.resize((round(im.width * 900 / im.height), 900), Image.LANCZOS)
    im.save(os.path.join(A, n), optimize=True)
    print(n, im.size, round(os.path.getsize(os.path.join(A, n)) / 1024), 'KB')
