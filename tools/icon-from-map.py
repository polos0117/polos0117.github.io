#!/usr/bin/env python3
"""앱 아이콘 — 공방 지도 그림(img/map.webp)에서 가운데를 잘라 만든다(2026-10-26 방 여섯 지도부터, 2026-10-30 대미궁 지도 — 호수와 방 여덟을 네모로).

  python3 tools/icon-from-map.py

두 벌을 만든다.
  icon-512.png · icon-192.png · icon-180.png — 건물이 칸의 90% (iOS 둥근 네모·데스크톱처럼 자르지 않는 자리)
  icon-maskable-512.png · icon-maskable-192.png — 건물이 maskable 안전 원(반지름 40%) 안에 (안드로이드 동그라미)
바탕은 지도 그림의 바탕색. 잘라 낸 네모의 가장자리는 흐리게 녹인다. 옛 블록 아이콘은 tools/icon.py"""
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(ROOT, 'img', 'map.webp')).convert('RGB')
k = src.size[0] / 1024                                   # 좌표는 1024 기준(ROOMS 와 같다)
crop = src.crop((int(0 * k), int(60 * k), int(1024 * k), int(1084 * k)))   # 세로 그림 — 방 여덟과 호수가 든 위쪽 네모
a = np.array(src)
corners = np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3), a[-40:, :40].reshape(-1, 3), a[-40:, -40:].reshape(-1, 3)])
BG = tuple(int(x) for x in np.median(corners, axis=0))


def make(frac, n=1024):
    out = Image.new('RGB', (n, n), BG)
    w = int(n * frac)
    r = crop.resize((w, int(crop.size[1] * w / crop.size[0])), Image.LANCZOS)
    m = Image.new('L', r.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, r.size[0] - 1, r.size[1] - 1), radius=int(80 * frac / .9), fill=255)
    out.paste(r, ((n - r.size[0]) // 2, (n - r.size[1]) // 2 + 8), m.filter(ImageFilter.GaussianBlur(int(30 * frac / .9))))
    b = np.array(out).astype(int)
    ys, xs = np.nonzero(np.abs(b - np.array(BG)).sum(axis=2) > 60)
    return out, np.hypot(xs - n / 2, ys - n / 2).max() / n


full, _ = make(.90)
frac = .74
while True:
    mask, d = make(frac)
    if d <= .40:
        break
    frac -= .02
for n in (512, 192):
    full.resize((n, n), Image.LANCZOS).save(os.path.join(ROOT, 'icon-%d.png' % n), optimize=True)
    mask.resize((n, n), Image.LANCZOS).save(os.path.join(ROOT, 'icon-maskable-%d.png' % n), optimize=True)
full.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, 'icon-180.png'), optimize=True)
print('바탕', BG, '· maskable 건물 폭 %.0f%% · 가장 먼 불빛 %.3f (안전 0.40)' % (frac * 100, d))
