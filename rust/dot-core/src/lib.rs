//! dot-core — 생성기가 그린 도트 그림을 정리한다(격자 찾기 · 팔레트 · 발 기준선 · 시트 · 걷기 오르내림 · 보폭).
//! book-atelier 의 tools/sprite_px.py · sprite-grid.py · sprite-sheet.py · sprite-bob.py 를 옮긴 것이다.
//! 같은 원본·같은 인자면 그 도구와 화소 하나 다르지 않게 나온다 — numpy 의 셈 차례까지 따른다:
//!   np.arange 는 start + i·((start+step)−start), np.round 는 짝수 쪽 반올림, 작은 축 합은 앞에서부터,
//!   Lab 의 행렬 곱은 BLAS 처럼 fma(c2, m2, fma(c1, m1, c0·m0)), 감마는 numpy 가 셈한 표(k/2/255)를 쓴다.
//! 바깥 의존 없음 — 그림 풀기·싸기는 dot-wasm(브라우저)·dot-cli(명령줄)가 한다.

mod gamma;
#[cfg(feature = "png")]
pub mod codec;

/// RGBA8 그림 한 장(줄 차례).
#[derive(Clone)]
pub struct Img {
    pub w: usize,
    pub h: usize,
    pub px: Vec<u8>,
}

impl Img {
    pub fn new(w: usize, h: usize) -> Img { Img { w, h, px: vec![0; w * h * 4] } }
    #[inline]
    fn at(&self, x: usize, y: usize) -> &[u8] { let i = (y * self.w + x) * 4; &self.px[i..i + 4] }
    #[inline]
    fn alpha(&self, x: usize, y: usize) -> u8 { self.px[(y * self.w + x) * 4 + 3] }
    /// 잘라 낸 사본 — 파이썬 a[y0:y1, x0:x1] (끝은 그림 안으로 줄인다)
    fn crop(&self, x0: usize, y0: usize, x1: usize, y1: usize) -> Img {
        let (x1, y1) = (x1.min(self.w), y1.min(self.h));
        let mut o = Img::new(x1.saturating_sub(x0), y1.saturating_sub(y0));
        for y in y0..y1 {
            let s = (y * self.w + x0) * 4;
            let d = ((y - y0) * o.w) * 4;
            o.px[d..d + o.w * 4].copy_from_slice(&self.px[s..s + o.w * 4]);
        }
        o
    }
}

// ── numpy 흉내 ──

/// np.arange(start, stop, step)
pub fn arange(start: f64, stop: f64, step: f64) -> Vec<f64> {
    let n = ((stop - start) / step).ceil();
    if !(n > 0.0) { return vec![]; }
    let n = n as usize;
    let mut v = Vec::with_capacity(n);
    v.push(start);
    if n > 1 {
        let second = start + step;
        v.push(second);
        let delta = second - start;
        for i in 2..n { v.push(start + i as f64 * delta); }
    }
    v
}

#[inline]
fn rnd(x: f64) -> f64 { x.round_ties_even() }

/// 파이썬 round(x, 2) — 이진 값 그대로를 소수 둘째 자리로(정확히 반이면 짝수 쪽)
pub fn round2(x: f64) -> f64 {
    if x == 0.0 || !x.is_finite() { return x; }
    let neg = x < 0.0;
    let bits = x.abs().to_bits();
    let exp = ((bits >> 52) & 0x7ff) as i64;
    let mut m = (bits & ((1u64 << 52) - 1)) as u128;
    let e = if exp == 0 { -1074 } else { m |= 1u128 << 52; exp - 1075 };
    // |x| = m · 2^e. 100·|x| 를 반올림
    let q: u128 = if e >= 0 {
        if e > 60 { return x; }
        (m * 100) << e
    } else {
        let sh = (-e) as u32;
        if sh >= 120 { 0 } else {
            let num = m * 100;
            let den = 1u128 << sh;
            let (q, r) = (num / den, num % den);
            if 2 * r > den || (2 * r == den && q % 2 == 1) { q + 1 } else { q }
        }
    };
    let v = q as f64 / 100.0;
    if neg { -v } else { v }
}

fn mean(v: &[f64]) -> f64 { v.iter().fold(0.0, |a, &b| a + b) / v.len() as f64 }

fn argmax(v: &[f64]) -> usize { let mut b = 0; for i in 1..v.len() { if v[i] > v[b] { b = i; } } b }
fn argmin(v: &[f64]) -> usize { let mut b = 0; for i in 1..v.len() { if v[i] < v[b] { b = i; } } b }

/// 중앙값 — 짝수 개면 가운데 둘의 평균(np.median)
fn median(v: &mut [f64]) -> f64 {
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = v.len();
    if n % 2 == 1 { v[n / 2] } else { (v[n / 2 - 1] + v[n / 2]) / 2.0 }
}

// ── 색 ──

const M: [[f64; 3]; 3] = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]];
const WHITE: [f64; 3] = [0.9505, 1.0, 1.089];

fn lin(v: f64) -> f64 {
    let k = v * 2.0;
    if k >= 0.0 && k <= 510.0 && k == k.trunc() { return gamma::LIN[k as usize]; }
    let c = v / 255.0;
    if c > 0.04045 { ((c + 0.055) / 1.055).powf(2.4) } else { c / 12.92 }
}

/// sprite_px.lab — 여러 줄. 한 줄이면 numpy 가 다른 길(gemv)로 셈해 그 차례를 따른다
pub fn lab(rows: &[[f64; 3]]) -> Vec<[f64; 3]> {
    let one = rows.len() == 1;
    rows.iter().map(|r| {
        let c = [lin(r[0]), lin(r[1]), lin(r[2])];
        let mut f = [0.0; 3];
        for j in 0..3 {
            let x = if one { c[2].mul_add(M[j][2], c[0] * M[j][0] + c[1] * M[j][1]) }
                    else { c[2].mul_add(M[j][2], c[1].mul_add(M[j][1], c[0] * M[j][0])) };
            let x = x / WHITE[j];
            f[j] = if x > 0.008856 { x.cbrt() } else { 7.787 * x + 16.0 / 116.0 };
        }
        [116.0 * f[1] - 16.0, 500.0 * (f[0] - f[1]), 200.0 * (f[1] - f[2])]
    }).collect()
}

#[inline]
fn d2(a: &[f64; 3], b: &[f64; 3]) -> f64 {
    let (x, y, z) = (a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    x * x + y * y + z * z
}

/// sprite_px.palette — 서로 먼 색부터 씨앗, 12번 다듬고, 묶음마다 원래 색의 중앙값. (팔레트, 줄마다 번호)
pub fn palette(src: &[[f64; 3]], nc: usize) -> (Vec<[u8; 3]>, Vec<usize>) {
    let l = lab(src);
    let n = l.len();
    let first = argmin(&l.iter().map(|v| v[0]).collect::<Vec<_>>());
    let mut cent = vec![l[first]];
    let mut d: Vec<f64> = l.iter().map(|v| d2(v, &cent[0])).collect();
    for _ in 1..nc {
        let k = argmax(&d);
        cent.push(l[k]);
        let c = *cent.last().unwrap();
        for i in 0..n { let e = d2(&l[i], &c); if e < d[i] { d[i] = e; } }
    }
    let assign = |cent: &Vec<[f64; 3]>| -> Vec<usize> {
        l.iter().map(|v| {
            let mut b = 0; let mut bd = d2(v, &cent[0]);
            for k in 1..cent.len() { let e = d2(v, &cent[k]); if e < bd { bd = e; b = k; } }
            b
        }).collect()
    };
    for _ in 0..12 {
        let li = assign(&cent);
        let mut sum = vec![[0.0f64; 3]; nc];
        let mut cnt = vec![0usize; nc];
        for i in 0..n { let k = li[i]; for c in 0..3 { sum[k][c] += l[i][c]; } cnt[k] += 1; }
        for k in 0..nc { if cnt[k] > 0 { for c in 0..3 { cent[k][c] = sum[k][c] / cnt[k] as f64; } } }
    }
    let li = assign(&cent);
    let mut pal = vec![[0u8; 3]; nc];
    for k in 0..nc {
        let mem: Vec<usize> = (0..n).filter(|&i| li[i] == k).collect();
        if mem.is_empty() { continue; }
        for c in 0..3 {
            let mut v: Vec<f64> = mem.iter().map(|&i| src[i][c]).collect();
            pal[k][c] = rnd(median(&mut v)) as u8;
        }
    }
    (pal, li)
}

fn rgbf(p: &[u8; 3]) -> [f64; 3] { [p[0] as f64, p[1] as f64, p[2] as f64] }

/// 화소마다 팔레트 번호(알파 160 미만은 -1) — sprite_px.nearest. 같은 색은 한 번만 셈한다
fn index_map(a: &Img, pal: &[[u8; 3]]) -> Vec<i32> {
    let pl = lab(&pal.iter().map(rgbf).collect::<Vec<_>>());
    let mut cache: std::collections::HashMap<[u8; 3], i32> = std::collections::HashMap::new();
    let mut out = vec![-1i32; a.w * a.h];
    for y in 0..a.h {
        for x in 0..a.w {
            let p = a.at(x, y);
            if p[3] < 160 { continue; }
            let key = [p[0], p[1], p[2]];
            let k = *cache.entry(key).or_insert_with(|| {
                // 여러 줄 길(gemv 아님) — 원래 셈은 화소 전체를 한 번에 넣는다
                let v = lab(&[rgbf(&key), rgbf(&key)])[0];
                let mut b = 0; let mut bd = d2(&v, &pl[0]);
                for k in 1..pl.len() { let e = d2(&v, &pl[k]); if e < bd { bd = e; b = k; } }
                b as i32
            });
            out[y * a.w + x] = k;
        }
    }
    out
}

// ── 격자 ──

/// 열·줄 경계 세기 — np.abs(np.diff(rgb)).sum(-1).sum(...)
fn edges(a: &Img) -> (Vec<f64>, Vec<f64>) {
    let mut ex = vec![0i64; a.w.saturating_sub(1)];
    let mut ey = vec![0i64; a.h.saturating_sub(1)];
    for y in 0..a.h {
        for x in 0..a.w {
            let p = a.at(x, y);
            if x + 1 < a.w { let q = a.at(x + 1, y); for c in 0..3 { ex[x] += (q[c] as i64 - p[c] as i64).abs(); } }
            if y + 1 < a.h { let q = a.at(x, y + 1); for c in 0..3 { ey[y] += (q[c] as i64 - p[c] as i64).abs(); } }
        }
    }
    (ex.into_iter().map(|v| v as f64).collect(), ey.into_iter().map(|v| v as f64).collect())
}

/// e[round(arange(o, len(e)-1, p))].mean()
fn line_mean(e: &[f64], o: f64, p: f64) -> f64 {
    let idx = arange(o, (e.len() - 1) as f64, p);
    let mut s = 0.0; let mut n = 0usize;
    for v in idx { let i = rnd(v) as i64; if i >= 0 && (i as usize) < e.len() { s += e[i as usize]; n += 1; } }
    s / n as f64
}

/// sprite_px.best_pitch → (점수, 간격, 시작점)
pub fn best_pitch(e: &[f64], lo: f64, hi: f64) -> (f64, f64, f64) {
    let em = mean(e);
    let mut top = (0.0, 0.0, 0.0);
    for p in arange(lo, hi, 0.02) {
        for o in arange(0.0, p, 0.25) {
            let sc = line_mean(e, o, p) / em;
            if sc > top.0 { top = (sc, p, o); }
        }
    }
    top
}

/// 한 축에서 (점수, 시작점) — 파이썬 max((점수, o) …): 점수가 같으면 큰 o
fn best_off(e: &[f64], em: f64, p: f64) -> (f64, f64) {
    let mut b = (f64::NEG_INFINITY, 0.0);
    for o in arange(0.0, p, 0.25) {
        let v = line_mean(e, o, p) / em;
        if v > b.0 || (v == b.0 && o > b.1) { b = (v, o); }
    }
    b
}

/// sprite_px.best_square → 간격(두 축 같다)
pub fn best_square(ex: &[f64], ey: &[f64], lo: f64, hi: f64) -> f64 {
    let (mx, my) = (mean(ex), mean(ey));
    let mut top = (0.0, 0.0, 0.0);   // (bx 점수, 간격, by 점수)
    for p in arange(lo, hi, 0.02) {
        let bx = best_off(ex, mx, p);
        let by = best_off(ey, my, p);
        if bx.0 + by.0 > top.0 + top.2 { top = (bx.0, p, by.0); }
    }
    top.1
}

/// sprite_px.sample_grid(square=False) — 칸 가운데 둘레의 채널별 중앙값. (격자 줄 차례 [f64;4], 열 수, 줄 수, (px, ox, sx, py, oy, sy))
pub fn sample_grid(a: &Img, lo: f64, hi: f64) -> (Vec<[f64; 4]>, usize, usize, [f64; 6]) {
    let (ex, ey) = edges(a);
    let (sx, px, ox) = best_pitch(&ex, lo, hi);
    let (sy, py, oy) = best_pitch(&ey, lo, hi);
    let cx = arange(ox + px / 2.0, a.w as f64, px);
    let cy = arange(oy + py / 2.0, a.h as f64, py);
    let r = ((px.min(py) * 0.25) as i64).max(1);
    let mut g = Vec::with_capacity(cx.len() * cy.len());
    let mut buf: [Vec<f64>; 4] = Default::default();
    for &y in &cy {
        for &x in &cx {
            let (yi, xi) = (y as i64, x as i64);
            let (y0, y1) = ((yi - r).max(0) as usize, ((yi + r + 1).max(0) as usize).min(a.h));
            let (x0, x1) = ((xi - r).max(0) as usize, ((xi + r + 1).max(0) as usize).min(a.w));
            for b in buf.iter_mut() { b.clear(); }
            for yy in y0..y1 { for xx in x0..x1 { let p = a.at(xx, yy); for c in 0..4 { buf[c].push(p[c] as f64); } } }
            let mut v = [0.0; 4];
            for c in 0..4 { v[c] = median(&mut buf[c]); }
            g.push(v);
        }
    }
    (g, cx.len(), cy.len(), [px, ox, sx, py, oy, sy])
}

/// sprite_px.bounds — 느슨한 격자 경계
fn bounds(e: &[f64], p: f64, n: usize) -> Vec<usize> {
    let len = e.len();
    let c: Vec<f64> = (0..len).map(|i| {
        let l = if i > 0 { e[i - 1] * 0.25 } else { 0.0 };
        let r = if i + 1 < len { e[i + 1] * 0.25 } else { 0.0 };
        l + e[i] * 0.5 + r
    }).collect();
    let first = ((p * 1.5) as usize).min(len);
    let mut b = vec![argmax(&c[..first])];
    while *b.last().unwrap() as f64 + p * 0.7 < (n - 1) as f64 {
        let last = *b.last().unwrap() as f64;
        let lo = (last + p * 0.7) as usize;
        let hi = (n - 1).min((last + p * 1.35) as usize + 1);
        if lo >= hi { break; }
        b.push(lo + argmax(&c[lo..hi.min(len)]));
    }
    while b[0] as f64 - p * 0.7 > 0.0 {
        let f = b[0] as f64;
        let lo = ((f - p * 1.35) as i64).max(0) as usize;
        let hi = (f - p * 0.7) as usize + 1;
        b.insert(0, lo + argmax(&c[lo..hi]));
    }
    b
}

/// 가장 많은 값 — np.unique 차례라 같은 수면 작은 값(-1 투명이 먼저)
fn mode(blk: &[i32]) -> (i32, Vec<(i32, usize)>) {
    let mut v = blk.to_vec();
    v.sort();
    let mut counts: Vec<(i32, usize)> = Vec::new();
    for x in v { match counts.last_mut() { Some(l) if l.0 == x => l.1 += 1, _ => counts.push((x, 1)) } }
    let mut best = counts[0];
    for &c in &counts[1..] { if c.1 > best.1 { best = c; } }
    (best.0, counts)
}

/// 작은 격자(줄 차례, -1 은 투명)
pub struct Grid { pub w: usize, pub h: usize, pub v: Vec<i32> }

/// sprite_px.sample_elastic → (격자, 간격)
pub fn sample_elastic(a: &Img, pal: &[[u8; 3]], lo: f64, hi: f64, pitch: Option<f64>) -> (Grid, f64) {
    let (ex, ey) = edges(a);
    let p = match pitch { Some(p) if p != 0.0 => p, _ => best_square(&ex, &ey, lo, hi) };
    let bx = bounds(&ex, p, a.w);
    let by = bounds(&ey, p, a.h);
    let idx = index_map(a, pal);
    let (gw, gh) = (bx.len() - 1, by.len() - 1);
    let mut g = Grid { w: gw, h: gh, v: vec![-1; gw * gh] };
    let mut blk = Vec::new();
    for j in 0..gh {
        for i in 0..gw {
            let (y0, y1, x0, x1) = (by[j] + 1, by[j + 1] + 1, bx[i] + 1, bx[i + 1] + 1);
            let sy = ((y1 - y0) / 4).max(1);
            let sx = ((x1 - x0) / 4).max(1);
            let take = |ya: usize, yb: usize, xa: usize, xb: usize, out: &mut Vec<i32>| {
                out.clear();
                let (yb, xb) = (yb.min(a.h), xb.min(a.w));
                for y in ya..yb { for x in xa..xb { out.push(idx[y * a.w + x]); } }
            };
            take(y0 + sy, y1.saturating_sub(sy), x0 + sx, x1.saturating_sub(sx), &mut blk);
            if blk.is_empty() { take(y0, y1, x0, x1, &mut blk); }
            g.v[j * gw + i] = mode(&blk).0;
        }
    }
    (g, p)
}

/// sprite_px.sample_fixed → (격자, (ox, oy)). dark: 어두운 색(Lab L 35 아래)이 칸의 이만큼을 넘으면 그 색
pub fn sample_fixed(a: &Img, pal: &[[u8; 3]], p: f64, dark: f64) -> (Grid, (f64, f64)) {
    let (ex, ey) = edges(a);
    let off = |e: &[f64]| -> f64 {
        let mut b = (f64::NEG_INFINITY, 0.0);
        for o in arange(0.0, p, 0.25) {
            let v = line_mean(e, o, p);
            if v > b.0 || (v == b.0 && o > b.1) { b = (v, o); }
        }
        b.1
    };
    let (ox, oy) = (off(&ex), off(&ey));
    let idx = index_map(a, pal);
    let xs = arange(ox, (a.w - 1) as f64, p);
    let ys = arange(oy, (a.h - 1) as f64, p);
    let (gw, gh) = (xs.len().saturating_sub(1), ys.len().saturating_sub(1));
    let q = p / 8.0;
    let pl = lab(&pal.iter().map(rgbf).collect::<Vec<_>>());
    let darkset: Vec<bool> = pl.iter().map(|v| v[0] < 35.0).collect();
    let mut g = Grid { w: gw, h: gh, v: vec![-1; gw * gh] };
    let mut blk = Vec::new();
    for j in 0..gh {
        for i in 0..gw {
            let (ya, yb) = ((ys[j] + q) as usize, (((ys[j + 1] - q) as usize) + 1).min(a.h));
            let (xa, xb) = ((xs[i] + q) as usize, (((xs[i + 1] - q) as usize) + 1).min(a.w));
            blk.clear();
            for y in ya..yb { for x in xa..xb { blk.push(idx[y * a.w + x]); } }
            let (mut pick, counts) = mode(&blk);
            if pick >= 0 && dark != 0.0 {
                // max((수, 번호)) — 수가 같으면 큰 번호
                let mut best: Option<(usize, i32)> = None;
                for &(k, n) in &counts {
                    if k >= 0 && darkset[k as usize] && best.map_or(true, |b| (n, k) > b) { best = Some((n, k)); }
                }
                if let Some((n, k)) = best { if n as f64 >= dark * blk.len() as f64 { pick = k; } }
            }
            g.v[j * gw + i] = pick;
        }
    }
    (g, (ox, oy))
}

/// 참인 칸의 테두리 상자 (x0, y0, x1, y1) — 끝은 열린 값
fn bbox(m: &[bool], w: usize, h: usize) -> Option<(usize, usize, usize, usize)> {
    let (mut x0, mut y0, mut x1, mut y1) = (usize::MAX, usize::MAX, 0, 0);
    for y in 0..h { for x in 0..w { if m[y * w + x] { x0 = x0.min(x); y0 = y0.min(y); x1 = x1.max(x + 1); y1 = y1.max(y + 1); } } }
    if x0 == usize::MAX { None } else { Some((x0, y0, x1, y1)) }
}

fn sub<T: Copy>(v: &[T], w: usize, b: (usize, usize, usize, usize)) -> Vec<T> {
    let mut o = Vec::with_capacity((b.2 - b.0) * (b.3 - b.1));
    for y in b.1..b.3 { o.extend_from_slice(&v[y * w + b.0..y * w + b.2]); }
    o
}

fn hex(c: &[u8; 3]) -> String { format!("\"#{:02x}{:02x}{:02x}\"", c[0], c[1], c[2]) }

// ── 정지 도트 한 장 (sprite-grid.py) ──

pub struct StillOpts { pub colors: usize, pub rows: Option<usize>, pub outline: bool }

pub struct Out { pub img: Img, pub json: String }

pub fn still(src: &Img, o: &StillOpts) -> Result<Out, String> {
    let mut keyed = src.clone();
    let bgc = key_background(&mut keyed);
    let src = &keyed;
    let nc = o.colors;
    let (pal, mut idx, mut m, w, h, meta);
    if let Some(rows) = o.rows {
        let solid: Vec<bool> = (0..src.w * src.h).map(|i| src.px[i * 4 + 3] >= 160).collect();
        let b = bbox(&solid, src.w, src.h).ok_or("그림이 비었다(불투명한 화소가 없다)")?;
        let (ymin, ymax, xmin, xmax) = (b.1, b.3 - 1, b.0, b.2 - 1);
        let a = src.crop(xmin.saturating_sub(4), ymin.saturating_sub(4), xmax + 5, ymax + 5);
        let px = (ymax - ymin + 1) as f64 / rows as f64;
        let opaque: Vec<[f64; 3]> = (0..a.w * a.h).filter(|&i| a.px[i * 4 + 3] >= 160)
            .map(|i| [a.px[i * 4] as f64, a.px[i * 4 + 1] as f64, a.px[i * 4 + 2] as f64]).collect();
        let step = (opaque.len() / 20000).max(1);
        let samp: Vec<[f64; 3]> = opaque.iter().step_by(step).copied().collect();
        let (pal0, _) = palette(&samp, nc);
        let (e, (ox, oy)) = sample_fixed(&a, &pal0, px, 0.3);
        let mask: Vec<bool> = e.v.iter().map(|&v| v >= 0).collect();
        let bb = bbox(&mask, e.w, e.h).ok_or("격자가 비었다")?;
        let ev = sub(&e.v, e.w, bb);
        m = sub(&mask, e.w, bb);
        w = bb.2 - bb.0; h = bb.3 - bb.1;
        idx = ev.iter().zip(&m).map(|(&v, &k)| if k { v as usize } else { 0 }).collect::<Vec<usize>>();
        pal = pal0;
        meta = format!("\"rows\": {rows}, \"pitch\": [{}, {}], \"offset\": [{}, {}]", round2(px), round2(px), round2(ox), round2(oy));
    } else {
        let (g, gw, gh, [px, ox, _sx, py, oy, _sy]) = sample_grid(src, 9.5, 14.0);
        let mask: Vec<bool> = g.iter().map(|v| v[3] >= 160.0).collect();
        let bb = bbox(&mask, gw, gh).ok_or("격자가 비었다")?;
        let gs = sub(&g, gw, bb);
        m = sub(&mask, gw, bb);
        w = bb.2 - bb.0; h = bb.3 - bb.1;
        let cols: Vec<[f64; 3]> = gs.iter().zip(&m).filter(|(_, &k)| k).map(|(v, _)| [v[0], v[1], v[2]]).collect();
        let (p0, li) = palette(&cols, nc);
        let mut it = li.into_iter();
        idx = m.iter().map(|&k| if k { it.next().unwrap() } else { 0 }).collect();
        pal = p0;
        meta = format!("\"pitch\": [{}, {}], \"offset\": [{}, {}]", round2(px), round2(py), round2(ox), round2(oy));
    }
    let (mut w, mut h) = (w, h);
    if o.outline {
        // 바깥 윤곽 한 칸 — 그 인물의 가장 어두운 색
        let mut used: Vec<usize> = idx.iter().zip(&m).filter(|(_, &k)| k).map(|(&v, _)| v).collect();
        used.sort(); used.dedup();
        let ls: Vec<f64> = used.iter().map(|&k| lab(&[rgbf(&pal[k])])[0][0]).collect();
        let darkest = used[argmin(&ls)];
        let (w2, h2) = (w + 2, h + 2);
        let mut m2 = vec![false; w2 * h2];
        let mut i2 = vec![0usize; w2 * h2];
        for y in 0..h { for x in 0..w { m2[(y + 1) * w2 + x + 1] = m[y * w + x]; i2[(y + 1) * w2 + x + 1] = idx[y * w + x]; } }
        let mut out = m2.clone();
        for y in 0..h2 {
            for x in 0..w2 {
                if m2[y * w2 + x] { continue; }
                let near = (y > 0 && m2[(y - 1) * w2 + x]) || (y + 1 < h2 && m2[(y + 1) * w2 + x])
                    || (x > 0 && m2[y * w2 + x - 1]) || (x + 1 < w2 && m2[y * w2 + x + 1]);
                if near { i2[y * w2 + x] = darkest; out[y * w2 + x] = true; }
            }
        }
        m = out; idx = i2; w = w2; h = h2;
    }
    if h > 126 || w > 96 { return Err(format!("인물이 칸(96×128, 발 기준선 126)보다 크다: {w}×{h} — 줄 수(rows)를 줄인다")); }
    let mut cell = Img::new(96, 128);
    let (x0, y0) = ((96 - w) / 2, 126 - h);
    let mut used: Vec<[u8; 3]> = Vec::new();
    for y in 0..h {
        for x in 0..w {
            let c = pal[idx[y * w + x]];
            let d = ((y0 + y) * 96 + x0 + x) * 4;
            cell.px[d..d + 3].copy_from_slice(&c);
            cell.px[d + 3] = if m[y * w + x] { 255 } else { 0 };
            if m[y * w + x] { used.push(c); }
        }
    }
    used.sort(); used.dedup();
    let meta = match bgc { Some(c) => format!("{meta}, \"background_keyed\": {}", hex(&c)), None => meta };
    let json = format!("{{{meta}, \"sprite\": [{w}, {h}], \"cell\": [96, 128], \"cell_offset\": [{x0}, {y0}], \"foot_y\": 126, \"colours\": {}, \"palette\": [{}]}}",
        used.len(), used.iter().map(hex).collect::<Vec<_>>().join(", "));
    Ok(Out { img: cell, json })
}

// ── 동작 시트 (sprite-sheet.py) ──

pub struct SheetOpts {
    pub frames: usize,
    pub lo: f64,
    pub hi: f64,
    pub speck: usize,
    pub cell: Option<(usize, usize)>,
    pub fixed_pitch: Option<f64>,
    pub rows: Option<usize>,
    pub grid: Option<(usize, usize)>,
}

impl Default for SheetOpts {
    fn default() -> Self { SheetOpts { frames: 4, lo: 9.0, hi: 14.0, speck: 6, cell: None, fixed_pitch: None, rows: None, grid: None } }
}

fn runs(v: &[bool], minlen: usize) -> Vec<(usize, usize)> {
    let mut out = Vec::new(); let mut start: Option<usize> = None;
    for i in 0..=v.len() {
        let x = i < v.len() && v[i];
        if x && start.is_none() { start = Some(i); }
        if !x { if let Some(s) = start { if i - s >= minlen { out.push((s, i)); } start = None; } }
    }
    out
}

/// 기대 경계(k·n/칸 수) 둘레 ±36%/칸 수 안에서 가장 빈 줄로 자른다 — 파이썬 도구의 세로 자르기 그대로(가로 자르기도 같은 식)
fn cut_at(count: &[f64], n: usize, parts: usize) -> Vec<usize> {
    let n0 = n as f64;
    let mut cuts = Vec::new();
    for k in 1..parts {
        let b = k as f64 * n0 / parts as f64;
        let r = n0 * 0.12 / parts as f64 * 3.0;
        let (lo, hi) = (((b - r) as usize).min(n), ((b + r) as usize).min(n));
        cuts.push(if hi > lo { lo + argmin(&count[lo..hi]) } else { b as usize });
    }
    let mut edges = vec![0]; edges.extend(cuts); edges.push(n);
    edges
}

/// 프레임 상자들 (x0, y0, x1, y1). grid(가로 칸 수, 세로 칸 수)를 주면 빈 줄로 못 나눈 곳을 기대 경계 가까이 가장 빈 줄에서 자른다
/// (위아래 칸이 머리카락·자락으로 이어졌거나, 옆 칸에 닿았을 때). 빈 줄로 다 나뉘면 파이썬 도구와 같은 상자다
pub fn frame_boxes(a: &Img, grid: Option<(usize, usize)>) -> Vec<(usize, usize, usize, usize)> {
    let (w, h) = (a.w, a.h);
    let solid: Vec<bool> = (0..w * h).map(|i| a.px[i * 4 + 3] >= 160).collect();
    let rowany: Vec<bool> = (0..h).map(|y| (0..w).any(|x| solid[y * w + x])).collect();
    let mut bands = runs(&rowany, 60);
    if let Some((_, r)) = grid {
        if r > 1 && bands.len() < r {
            /* 위아래가 붙었다 — 줄마다 불투명 화소 수로 가장 빈 가로줄에서 자르고, 칸마다 실제 그림 위아래로 줄인다 */
            let row: Vec<f64> = (0..h).map(|y| (0..w).filter(|&x| solid[y * w + x]).count() as f64).collect();
            bands = Vec::new();
            for p in cut_at(&row, h, r).windows(2) {
                let ys: Vec<usize> = (p[0]..p[1]).filter(|&y| rowany[y]).collect();
                if !ys.is_empty() && ys[ys.len() - 1] + 1 - ys[0] >= 60 { bands.push((ys[0], ys[ys.len() - 1] + 1)); }
            }
        }
    }
    let mut boxes = Vec::new();
    for (y0, y1) in bands {
        let colany: Vec<bool> = (0..w).map(|x| (y0..y1).any(|y| solid[y * w + x])).collect();
        let mut segs = runs(&colany, 60);
        if let Some((c, _)) = grid {
            if segs.len() < c {
                let col: Vec<f64> = (0..w).map(|x| (y0..y1).filter(|&y| solid[y * w + x]).count() as f64).collect();
                segs = Vec::new();
                for p in cut_at(&col, w, c).windows(2) {
                    let xs: Vec<usize> = (p[0]..p[1]).filter(|&x| colany[x]).collect();
                    if !xs.is_empty() { segs.push((xs[0], xs[xs.len() - 1] + 1)); }
                }
            }
        }
        for (x0, x1) in segs { boxes.push((x0, y0, x1, y1)); }
    }
    boxes
}

/// 배경이 투명하지 않으면(생성기가 #00FF00 같은 한 색 바탕으로 그렸을 때) 가장자리에서 이어진 바탕색을 투명으로.
/// 네 귀퉁이가 모두 불투명하고 가장자리 화소의 60% 넘게 한 색(채널마다 ±48)일 때만 — 투명 바탕 그림은 그대로(파이썬 도구와 같은 화소).
/// 바탕에서 이어진 곳만 지우므로 인물 안의 같은 색은 남는다. 지웠으면 그 바탕색을 돌려준다
pub fn key_background(a: &mut Img) -> Option<[u8; 3]> {
    let (w, h) = (a.w, a.h);
    if w < 3 || h < 3 { return None; }
    if [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)].iter().any(|&(x, y)| a.alpha(x, y) < 160) { return None; }
    let mut edge = Vec::new();
    for x in 0..w { edge.push((x, 0)); edge.push((x, h - 1)); }
    for y in 1..h - 1 { edge.push((0, y)); edge.push((w - 1, y)); }
    let mut bg = [0u8; 3];
    for c in 0..3 {
        let mut v: Vec<f64> = edge.iter().map(|&(x, y)| a.at(x, y)[c] as f64).collect();
        bg[c] = rnd(median(&mut v)) as u8;
    }
    let near = |p: &[u8]| p[3] >= 160 && (0..3).all(|c| (p[c] as i32 - bg[c] as i32).abs() <= 48);
    let hits = edge.iter().filter(|&&(x, y)| near(a.at(x, y))).count();
    if (hits as f64) < edge.len() as f64 * 0.6 { return None; }
    let mut seen = vec![false; w * h];
    let mut stack: Vec<(usize, usize)> = edge.into_iter().filter(|&(x, y)| near(a.at(x, y))).collect();
    for &(x, y) in &stack { seen[y * w + x] = true; }
    while let Some((x, y)) = stack.pop() {
        a.px[(y * w + x) * 4 + 3] = 0;
        let nb = [(x.wrapping_sub(1), y), (x + 1, y), (x, y.wrapping_sub(1)), (x, y + 1)];
        for &(nx, ny) in &nb {
            if nx >= w || ny >= h || seen[ny * w + nx] { continue; }
            seen[ny * w + nx] = true;
            if near(a.at(nx, ny)) { stack.push((nx, ny)); }
        }
    }
    Some(bg)
}

/// 가장 큰 덩어리(8방향 이웃)와 speck 칸 이상인 덩어리만 남긴다 → (남길 칸, 지운 칸 수)
fn keep_body(m: &[bool], w: usize, h: usize, speck: usize) -> (Vec<bool>, usize) {
    let mut lab = vec![0usize; w * h];
    let mut sizes = vec![0usize];   // 번호 0 은 비움
    for y in 0..h {
        for x in 0..w {
            if !m[y * w + x] || lab[y * w + x] != 0 { continue; }
            let n = sizes.len(); sizes.push(0);
            let mut stack = vec![(y, x)]; lab[y * w + x] = n;
            while let Some((cy, cx)) = stack.pop() {
                sizes[n] += 1;
                for dy in -1i64..=1 {
                    for dx in -1i64..=1 {
                        let (ny, nx) = (cy as i64 + dy, cx as i64 + dx);
                        if ny < 0 || nx < 0 || ny >= h as i64 || nx >= w as i64 { continue; }
                        let k = ny as usize * w + nx as usize;
                        if m[k] && lab[k] == 0 { lab[k] = n; stack.push((ny as usize, nx as usize)); }
                    }
                }
            }
        }
    }
    let mut big = 1;
    for k in 1..sizes.len() { if sizes[k] > sizes[big] { big = k; } }
    let keep: Vec<bool> = (0..sizes.len()).map(|k| k != 0 && (k == big || sizes[k] >= speck)).collect();
    let dropped = (1..sizes.len()).filter(|&k| !keep[k]).map(|k| sizes[k]).sum();
    (lab.iter().map(|&l| keep[l]).collect(), dropped)
}

/// 정지 도트의 색 — np.unique(still[알파>0][:, :3], axis=0)
pub fn still_palette(still: &Img) -> Vec<[u8; 3]> {
    let mut v: Vec<[u8; 3]> = (0..still.w * still.h).filter(|&i| still.px[i * 4 + 3] > 0)
        .map(|i| [still.px[i * 4], still.px[i * 4 + 1], still.px[i * 4 + 2]]).collect();
    v.sort(); v.dedup();
    v
}

pub fn sheet(src: &Img, still: &Img, o: &SheetOpts) -> Result<Out, String> {
    let mut keyed = src.clone();
    let bgc = key_background(&mut keyed);
    let src = &keyed;
    let boxes = frame_boxes(src, o.grid);
    if boxes.len() != o.frames {
        let grid = o.grid.map_or("없음".to_string(), |g| format!("{}x{}", g.0, g.1));
        return Err(format!("프레임 {} 개를 찾았다(기대 {}, 칸 배치 {grid}{}) — 생성 그림의 칸 수·배치가 지시와 같은지 본다(칸끼리 겹쳐 그렸거나 칸 수가 다르면 다시 생성)",
            boxes.len(), o.frames, if bgc.is_some() { ", 한 색 바탕을 지웠다" } else { "" }));
    }
    let mut pal = still_palette(still);
    if pal.is_empty() { return Err("정지 도트가 비었다".into()); }
    /* 정리한 정지 도트가 아니라 생성 원본을 넣었으면 색이 수십만 개라 셈이 끝나지 않는다 — 64색이 넘으면 그 그림에서 24색을 묶어 쓴다 */
    let quantized = pal.len() > 64;
    if quantized {
        let opaque: Vec<[f64; 3]> = (0..still.w * still.h).filter(|&i| still.px[i * 4 + 3] >= 160)
            .map(|i| [still.px[i * 4] as f64, still.px[i * 4 + 1] as f64, still.px[i * 4 + 2] as f64]).collect();
        let step = (opaque.len() / 20000).max(1);
        let samp: Vec<[f64; 3]> = opaque.iter().step_by(step).copied().collect();
        let (p, _) = palette(&samp, 24);
        pal = p; pal.sort(); pal.dedup();
    }
    let rows_pitch = o.rows.map(|r| {
        let mut hs: Vec<f64> = boxes.iter().map(|&(x0, y0, x1, y1)| {
            let rows: Vec<usize> = (y0..y1).filter(|&y| (x0..x1).any(|x| src.alpha(x, y) >= 160)).collect();
            (rows[rows.len() - 1] - rows[0] + 1) as f64
        }).collect();
        median(&mut hs) / r as f64
    });
    struct F { rgb: Vec<[u8; 3]>, m: Vec<bool>, w: usize, h: usize, pitch: f64, anchor: f64, dropped: usize, bx: (usize, usize, usize, usize) }
    /* 프레임마다 격자로 뽑는다. fit 을 주면 그 간격의 고른 격자로(칸에 안 들어가 다시 뽑을 때) */
    let sample_all = |fit: Option<f64>| -> Result<Vec<F>, String> {
    let mut fr: Vec<F> = Vec::new();
    for &(x0, y0, x1, y1) in &boxes {
        let pad = 4;
        let crop = src.crop(x0.saturating_sub(pad), y0.saturating_sub(pad), x1 + pad, y1 + pad);
        let (g, p) = match fit.or(rows_pitch) {
            Some(rp) => (sample_fixed(&crop, &pal, rp, 0.3).0, rp),
            None => sample_elastic(&crop, &pal, o.lo, o.hi, o.fixed_pitch),
        };
        let mask: Vec<bool> = g.v.iter().map(|&v| v >= 0).collect();
        let b = bbox(&mask, g.w, g.h).ok_or("프레임이 비었다")?;
        let gv = sub(&g.v, g.w, b); let mm = sub(&mask, g.w, b);
        let (w1, h1) = (b.2 - b.0, b.3 - b.1);
        let (mk, dropped) = keep_body(&mm, w1, h1, o.speck);
        let b2 = bbox(&mk, w1, h1).ok_or("프레임이 비었다")?;
        let gv = sub(&gv, w1, b2); let mk = sub(&mk, w1, b2);
        let (w, h) = (b2.2 - b2.0, b2.3 - b2.1);
        let rgb: Vec<[u8; 3]> = gv.iter().zip(&mk).map(|(&v, &k)| if k { pal[v as usize] } else { [0, 0, 0] }).collect();
        let top = ((h as f64 * 0.45) as usize).max(1);
        let (mut s, mut n) = (0usize, 0usize);
        for y in 0..top.min(h) { for x in 0..w { if mk[y * w + x] { s += x; n += 1; } } }
        let cx = s as f64 / n as f64;
        fr.push(F { rgb, m: mk, w, h, pitch: p, anchor: round2(cx), dropped, bx: (x0, y0, x1, y1) });
    }
    Ok(fr)
    };
    let mut fr = sample_all(None)?;
    /* 칸에 안 들어가면(생성기가 도트를 지시보다 잘게 그렸거나 그림이 크다) 간격을 그만큼 키워 다시 뽑는다 — 칸 높이 -4·폭 -2 안으로, 세 번까지.
       파이썬 도구는 여기서 멈췄다(들어가는 그림은 그대로라 같은 화소) */
    let mut fitted: Option<f64> = None;
    if let Some((cw, ch)) = o.cell {
        for _ in 0..3 {
            let (maxw, maxh) = (fr.iter().map(|f| f.w).max().unwrap(), fr.iter().map(|f| f.h).max().unwrap());
            if maxw <= cw && maxh + 2 <= ch { break; }
            let mut ps: Vec<f64> = fr.iter().map(|f| f.pitch).collect();
            let k = (maxh as f64 / (ch - 4) as f64).max(maxw as f64 / (cw - 2) as f64) * 1.01;
            let p = median(&mut ps) * k.max(1.01);
            fr = sample_all(Some(p))?; fitted = Some(p);
        }
    }
    let mut hh = fr.iter().map(|f| f.h).max().unwrap() + 2;
    let reach = fr.iter().map(|f| f.anchor.max(f.w as f64 - f.anchor)).fold(f64::NEG_INFINITY, f64::max);
    let mut ww = (((2.0 * reach + 4.0) / 2.0).ceil() * 2.0) as usize;
    if let Some((cw, ch)) = o.cell {
        let maxw = fr.iter().map(|f| f.w).max().unwrap();
        if cw < maxw || ch < hh { return Err(format!("칸 {cw}x{ch} 에 프레임({maxw}x{hh})이 들어가지 않는다 — 간격을 키워도 안 된다. 생성 그림의 칸·인물 크기를 본다")); }
        ww = cw; hh = ch;
    }
    let mut out = Img::new(ww * fr.len(), hh);
    let mut info = Vec::new();
    for (k, f) in fr.iter().enumerate() {
        let gx = (k * ww) as i64 + rnd(ww as f64 / 2.0 - f.anchor) as i64;
        let gx = gx.max((k * ww) as i64).min((k * ww + ww - f.w) as i64) as usize;
        let gy = hh - 2 - f.h;
        for y in 0..f.h {
            for x in 0..f.w {
                if !f.m[y * f.w + x] { continue; }
                let d = ((gy + y) * out.w + gx + x) * 4;
                out.px[d..d + 3].copy_from_slice(&f.rgb[y * f.w + x]);
                out.px[d + 3] = 255;
            }
        }
        info.push(format!("{{\"box_px\": [{}, {}, {}, {}], \"pitch\": {}, \"size\": [{}, {}], \"anchor_x\": {}, \"dropped_specks\": {}, \"at\": [{}, {}]}}",
            f.bx.0, f.bx.1, f.bx.2, f.bx.3, round2(f.pitch), f.w, f.h, f.anchor, f.dropped, gx - k * ww, gy));
    }
    let mut cols: Vec<[u8; 3]> = (0..out.w * out.h).filter(|&i| out.px[i * 4 + 3] > 0).map(|i| [out.px[i * 4], out.px[i * 4 + 1], out.px[i * 4 + 2]]).collect();
    cols.sort(); cols.dedup();
    let keyed_json = bgc.map_or(String::new(), |c| format!(", \"background_keyed\": {}", hex(&c)))
        + &fitted.map_or(String::new(), |p| format!(", \"fitted_pitch\": {}", round2(p)))
        + if quantized { ", \"palette_quantized\": true" } else { "" };
    let json = format!("{{\"cell\": [{ww}, {hh}], \"frames\": {}, \"foot_y\": {}, \"colours\": {}{keyed_json}, \"frame\": [{}]}}",
        fr.len(), hh - 2, cols.len(), info.join(", "));
    Ok(Out { img: out, json })
}

// ── 걷기: 오르내림·보폭 ──

/// sprite-bob.py — 6칸 걷기의 칸마다 dy(도트 화소, + 는 아래). (머리 높이, dy)
pub fn bob(sheet: &Img, cw: usize, bob: f64) -> Result<(Vec<f64>, Vec<f64>), String> {
    let n = sheet.w / cw;
    if n != 6 { return Err(format!("걷기 6칸만 — {n}칸")); }
    let mut head = Vec::new();
    for k in 0..n {
        let ys: Vec<usize> = (0..sheet.h).filter(|&y| (k * cw..(k + 1) * cw).any(|x| sheet.alpha(x, y) > 0)).collect();
        if ys.is_empty() { return Err(format!("{}번 칸이 비었다", k + 1)); }
        let (top, bot) = (ys[0], ys[ys.len() - 1]);
        let lim = (0.22 * (bot - top) as f64) as usize;
        let (mut s, mut c) = (0usize, 0usize);
        for y in 0..lim { for x in k * cw..(k + 1) * cw { if sheet.alpha(x, top + y) > 0 { s += y; c += 1; } } }
        head.push(top as f64 + s as f64 / c as f64);
    }
    let m = mean(&head);
    let curve = [0.0, 1.0, -1.0, 0.0, 1.0, -1.0];
    let dy = (0..6).map(|i| (rnd((m + bob * curve[i] - head[i]) * 3.0) / 3.0).clamp(-2.0, 2.0) + 0.0).collect();   // + 0 — -0 을 0 으로
    Ok((head, dy))
}

/// 접지 칸(0·3)의 발 폭 평균 — 아래 일곱 줄의 가로 폭. 빠르기 = round(보폭 ÷ 반 주기(3칸 × ms))
pub fn stride(sheet: &Img, cw: usize) -> Result<f64, String> {
    let mut sp = Vec::new();
    for k in [0usize, 3] {
        if (k + 1) * cw > sheet.w { return Err("걷기 칸이 모자란다".into()); }
        let ys: Vec<usize> = (0..sheet.h).filter(|&y| (k * cw..(k + 1) * cw).any(|x| sheet.alpha(x, y) > 0)).collect();
        let bot = *ys.last().ok_or("칸이 비었다")?;
        let (mut lo, mut hi) = (usize::MAX, 0);
        for y in bot.saturating_sub(6)..=bot { for x in 0..cw { if sheet.alpha(k * cw + x, y) > 0 { lo = lo.min(x); hi = hi.max(x); } } }
        sp.push((hi - lo) as f64);
    }
    Ok(mean(&sp))
}

pub fn speed(stride: f64, ms: f64) -> f64 { rnd(stride / (3.0 * ms / 1000.0)) }

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn arange_like_numpy() {
        let v = arange(9.5, 14.0, 0.02);
        assert_eq!(v.len(), 225);
        assert_eq!(v[1], 9.52);
        assert_eq!(arange(0.0, 6.0, 0.25).len(), 24);
        assert_eq!(arange(0.0, 0.0, 0.25).len(), 0);
    }
    #[test]
    fn round2_like_python() {
        assert_eq!(round2(23.125), 23.12);
        assert_eq!(round2(23.135), 23.14);   // 23.135 의 이진 값이 조금 크다
        assert_eq!(round2(2.675), 2.67);     // 이진 값이 조금 작다
        assert_eq!(round2(5.5), 5.5);
    }
    /// 2x2 시트 — 위아래 칸이 가는 띠로 이어지고 한 색(#00FF00) 바탕이어도 네 칸을 찾는다
    #[test]
    fn grid_touching_rows_on_green() {
        let (w, h) = (400usize, 600usize);
        let mut a = Img::new(w, h);
        for i in 0..w * h { a.px[i * 4..i * 4 + 4].copy_from_slice(&[0, 255, 0, 255]); }
        let mut paint = |x0: usize, y0: usize, x1: usize, y1: usize| { for y in y0..y1 { for x in x0..x1 { a.px[(y * w + x) * 4..(y * w + x) * 4 + 4].copy_from_slice(&[120, 60, 40, 255]); } } };
        for &(cx, cy) in &[(100, 150), (300, 150), (100, 450), (300, 450)] { paint(cx - 40, cy - 120, cx + 40, cy + 120); }
        paint(95, 270, 105, 330);   // 왼쪽 위·아래 칸을 잇는 머리카락
        let bg = key_background(&mut a);
        assert_eq!(bg, Some([0, 255, 0]));
        assert_eq!(frame_boxes(&a, None).len(), 2, "빈 줄로만 나누면 둘");
        let b = frame_boxes(&a, Some((2, 2)));
        assert_eq!(b.len(), 4, "{b:?}");
    }
    /// 칸보다 크게 나오면 간격을 키워 다시 뽑아 칸에 넣는다
    #[test]
    fn fits_into_cell() {
        let (w, h) = (300usize, 400usize);
        let mut a = Img::new(w, h);
        for y in 20..380 { for x in 60..240 { a.px[(y * w + x) * 4..(y * w + x) * 4 + 4].copy_from_slice(&[200, 80, 60, 255]); } }
        let still = Img { w: 1, h: 1, px: vec![200, 80, 60, 255] };
        let o = SheetOpts { frames: 1, cell: Some((96, 128)), rows: Some(200), speck: 6, ..Default::default() };
        let r = sheet(&a, &still, &o).unwrap();
        assert!(r.json.contains("fitted_pitch"), "{}", r.json);
        assert_eq!((r.img.w, r.img.h), (96, 128));
    }
    #[test]
    fn transparent_left_alone() {
        let mut a = Img::new(10, 10);
        assert_eq!(key_background(&mut a), None);
    }
    #[test]
    fn runs_and_mode() {
        assert_eq!(runs(&[true, true, false, true], 2), vec![(0, 2)]);
        assert_eq!(mode(&[2, -1, 2, -1]).0, -1);
    }
}
