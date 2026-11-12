# 대미궁 패럴랙스 깊이 그림(2026-11-12) — blender-cloud 의 깊이 렌더(cave_hub 구조, 1024×3072, 흰색 = 멀다)에서
# 위층(가깝다) → 아래층(멀다)의 큰 세로 기울기를 빼고 국소 높낮이만 남긴다 → img/cave4-depth.webp(흑백, 흰색 = 가깝다, 0.5 = 바위 바닥).
#   python3 -I tools/cave4-depth.py <깊이.png> img/cave4.webp <출력 접두사>   → <접두사>.png · -overlay.png(확인용 반투명) · -edges.png(깊이 윤곽 빨강)
#   그다음 PIL 로 <접두사>.png 를 img/cave4-depth.webp(quality 100) 로.
# 순서: ① 줄마다 바닥 높이(그 줄의 밝은 쪽 90% — 먼 바위 면)를 빼고(세로 기울기가 y≈2790 에서 255 로 포화된 뒤 꺾여 다시 내려간다.
#        흐림만 빼면 그 꺾인 줄에 가로 능선이 남는다) ② 큰 반경(σ≈96px) 흐림을 빼는 하이패스 ③ 바위 바닥(가운데값)이 0.5 가 되게,
#        위아래 1% 를 잘라 0~1 로, ±0.2 넘는 것은 무릎으로 눌러(나선 계단이 크게 휘었다) ④ 가장자리가 찢어지지 않게 — 가까운 쪽을 6px 넓히고(최댓값 거르기) σ≈12px 흐림, 바위 바닥을 다시 0.5 로.
#        σ 2.5px 로는 폰(344 폭 — 그림 1px = 화면 0.32px)에서 8px 밀 때 그림으로 25px 가 5px 폭 경계에서 갈라져 방 테두리 · 나선 계단이 겹쳐 보였다(접힘).
#        접히지 않으려면 50 × 깊이 기울기 < 1 — 끝에 그 값을 찍는다. 넓히는 것은 늘어나는 자리를 물건 테두리 대신 그 바깥 바위 쪽으로 보내려고.
import sys
from PIL import Image
import numpy as np
src, cave, out = sys.argv[1], sys.argv[2], sys.argv[3]
R = float(sys.argv[4]) if len(sys.argv) > 4 else 96
KNEE = 0.2
d = np.asarray(Image.open(src).convert('L')).astype(np.float64) / 255.0

def box(a, r, axis):   # 가장자리 반사 · 누적합 상자 흐림
    pad = [(0, 0), (0, 0)]; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='reflect'), axis=axis); n = a.shape[axis]
    return (c[2*r+1:2*r+1+n] - c[:n]) / (2*r+1) if axis == 0 else (c[:, 2*r+1:2*r+1+n] - c[:, :n]) / (2*r+1)

def grow(a, r):   # 최댓값 거르기(가로 · 세로 따로)
    from numpy.lib.stride_tricks import sliding_window_view as win
    a = win(np.pad(a, ((r, r), (0, 0)), mode='edge'), 2 * r + 1, axis=0).max(-1)
    return win(np.pad(a, ((0, 0), (r, r)), mode='edge'), 2 * r + 1, axis=1).max(-1)

def gauss(a, sigma):   # 상자 흐림 세 번 ≈ 가우스
    r = max(1, int(round((np.sqrt(4 * sigma * sigma + 1) - 1) / 2)))
    for _ in range(3): a = box(box(a, r, 0), r, 1)
    return a

row = np.percentile(d, 90, axis=1, keepdims=True)
row = gauss(np.repeat(row, 8, axis=1), 20)[:, :1]
hp = d - row
hp = hp - gauss(hp, R)
c0 = np.median(hp); lo, hi = np.percentile(hp, [1, 99]); s = max(c0 - lo, hi - c0)
n = np.clip(0.5 - 0.5 * (hp - c0) / s, 0, 1)   # 뒤집어 흰색 = 가깝다
x = n - 0.5; ax = np.abs(x)   # 무릎 — 바위 바닥에서 ±0.2 넘는 것(나선 계단 · 입구 계단 꼭대기 0.96, 위 1%)은 0.35 배로. 방 · 호수(±0.2 안)는 그대로
n = 0.5 + np.sign(x) * np.where(ax > KNEE, KNEE + (ax - KNEE) * 0.35, ax)
n = gauss(grow(n, 6), 12.0)
n = np.clip(n - np.median(n) + 0.5, 0, 1)   # 넓힌 만큼 올라간 바위 바닥을 다시 0.5 로
gy, gx = np.gradient(n)
print('mean %.3f  p5/50/95 %s  접힘 지표(50×최대 기울기, 1 아래여야) %.2f · 99.9%% %.2f' % (n.mean(), np.round(np.percentile(n, [5, 50, 95]), 3),
      50 * np.hypot(gx, gy).max(), 50 * np.percentile(np.hypot(gx, gy), 99.9)))
img = Image.fromarray((n * 255 + .5).astype(np.uint8), 'L'); img.save(out + '.png')
c = Image.open(cave).convert('RGB')
Image.blend(c, img.convert('RGB'), .5).save(out + '-overlay.png')
gy, gx = np.gradient(n); g = np.clip(np.hypot(gx, gy) / np.percentile(np.hypot(gx, gy), 99.3), 0, 1)
ca = np.asarray(c).astype(float) * .75
ca[..., 0] = np.maximum(ca[..., 0], g * 255); ca[..., 1] *= 1 - g * .8; ca[..., 2] *= 1 - g * .8
Image.fromarray(ca.astype(np.uint8)).save(out + '-edges.png')
