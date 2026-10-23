//! 도트 정리 — 브라우저 쪽(dot/dot.wasm). wasm-bindgen 없이 `extern "C"` 내보내기와 포인터·길이만 쓴다.
//! 부르는 쪽은 dot/dot.js(손으로 쓴 작은 싣개). 셈은 dot-core 그대로라 명령줄(dot-cli)·파이썬 도구와 같은 화소가 나온다.
//!
//! 그림은 번호로 쥔다(0 부터). 차례
//!   1. `alloc(n)` 자리에 PNG 바이트를 써 넣고 `decode(ptr, n)` → 번호. 브라우저가 푼 RGBA 는 `put(ptr, w, h)` → 번호.
//!   2. `still(번호, 색 수, 줄 수(0 = 격자 찾기), 윤곽)` · `sheet(번호, 정지 도트 번호, …)` · `frames_sheet(번호들 자리, 장 수, 정지 도트 번호, …)` → 정리본 번호, 옆에 `json`.
//!      `bob(번호, 칸 폭, 오르내림)` · `stride(번호, 칸 폭, ms)` → `json`.
//!   3. `img_w/img_h/img_ptr(번호)` 로 RGBA 를 읽거나 `encode(번호)` → `bytes_ptr/bytes_len` 의 PNG. 다 쓴 번호는 `free`.
//!   실패하면 -1 이고 까닭은 `err_ptr/err_len`(UTF-8).
//!
//! `source_hash` 는 빌드 때 dot-core·dot-wasm 소스를 셈한 값 — 올려 둔 dot/dot.wasm 이 소스보다 묵었는지 tests/dot.cjs 가 본다(build.rs).

use dot_core::{codec, Img, SheetOpts, StillOpts};
use std::cell::RefCell;

include!(concat!(env!("OUT_DIR"), "/source_hash.rs"));

/// 내보내기 꼴이 바뀌면 올린다 — dot/dot.js 가 맞춰 본다.
pub const API_VERSION: u32 = 2;   // 2 — frames_sheet(칸마다 따로 뽑은 원본), 걷기 4칸

#[derive(Default)]
struct State { imgs: Vec<Option<Img>>, json: String, err: String, bytes: Vec<u8> }

thread_local! {
    static S: RefCell<State> = RefCell::new(State::default());
}

fn keep(img: Img) -> i32 {
    S.with(|s| {
        let mut s = s.borrow_mut();
        if let Some(i) = s.imgs.iter().position(|x| x.is_none()) { s.imgs[i] = Some(img); i as i32 }
        else { s.imgs.push(Some(img)); (s.imgs.len() - 1) as i32 }
    })
}

fn fail(e: String) -> i32 { S.with(|s| s.borrow_mut().err = e); -1 }

fn with_img<T>(id: i32, f: impl FnOnce(&Img) -> T) -> Option<T> {
    S.with(|s| s.borrow().imgs.get(id as usize).and_then(|x| x.as_ref()).map(f))
}

fn get(id: i32) -> Result<Img, String> { with_img(id, |i| i.clone()).ok_or_else(|| format!("그림 {id} 이 없다")) }

fn done(r: Result<dot_core::Out, String>) -> i32 {
    match r {
        Ok(o) => { S.with(|s| s.borrow_mut().json = o.json); keep(o.img) }
        Err(e) => fail(e),
    }
}

#[no_mangle] pub extern "C" fn api_version() -> u32 { API_VERSION }
#[no_mangle] pub extern "C" fn source_hash_ptr() -> *const u8 { SOURCE_HASH.as_ptr() }
#[no_mangle] pub extern "C" fn source_hash_len() -> u32 { SOURCE_HASH.len() as u32 }

fn layout(len: u32) -> Option<std::alloc::Layout> { std::alloc::Layout::from_size_align(len.max(1) as usize, 8).ok() }

/// 바이트 n 개 자리 — 8바이트 맞춤
#[no_mangle]
pub extern "C" fn alloc(len: u32) -> *mut u8 {
    match layout(len) {
        // SAFETY: 크기가 0 이 아니다
        Some(l) => unsafe { std::alloc::alloc(l) },
        None => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: u32) {
    if ptr.is_null() { return; }
    // SAFETY: alloc 이 같은 크기로 준 자리
    if let Some(l) = layout(len) { unsafe { std::alloc::dealloc(ptr, l) } }
}

fn slice<'a>(ptr: *const u8, len: u32) -> &'a [u8] {
    // SAFETY: 부르는 쪽이 alloc 으로 받은 자리에 len 바이트를 써 넣었다
    unsafe { std::slice::from_raw_parts(ptr, len as usize) }
}

/// PNG → 번호
#[no_mangle]
pub extern "C" fn decode(ptr: *const u8, len: u32) -> i32 {
    match codec::decode(slice(ptr, len)) { Ok(i) => keep(i), Err(e) => fail(e) }
}

/// RGBA w×h → 번호 (PNG 가 아닌 그림을 브라우저가 풀었을 때)
#[no_mangle]
pub extern "C" fn put(ptr: *const u8, w: u32, h: u32) -> i32 {
    let px = slice(ptr, w * h * 4).to_vec();
    keep(Img { w: w as usize, h: h as usize, px })
}

#[no_mangle] pub extern "C" fn free(id: i32) { S.with(|s| { if let Some(x) = s.borrow_mut().imgs.get_mut(id as usize) { *x = None; } }); }
#[no_mangle] pub extern "C" fn img_w(id: i32) -> u32 { with_img(id, |i| i.w as u32).unwrap_or(0) }
#[no_mangle] pub extern "C" fn img_h(id: i32) -> u32 { with_img(id, |i| i.h as u32).unwrap_or(0) }
#[no_mangle] pub extern "C" fn img_ptr(id: i32) -> *const u8 { with_img(id, |i| i.px.as_ptr()).unwrap_or(std::ptr::null()) }

/// 정지 도트 한 장 (sprite-grid.py). rows 0 이면 격자를 찾는다
#[no_mangle]
pub extern "C" fn still(id: i32, colors: u32, rows: u32, outline: u32) -> i32 {
    let src = match get(id) { Ok(i) => i, Err(e) => return fail(e) };
    done(dot_core::still(&src, &StillOpts { colors: colors as usize, rows: (rows > 0).then_some(rows as usize), outline: outline != 0 }))
}

/// 동작 시트 (sprite-sheet.py). 0 은 "주지 않음"(grid · rows · fixed_pitch · cell)
#[no_mangle]
pub extern "C" fn sheet(id: i32, still: i32, frames: u32, grid_c: u32, grid_r: u32, rows: u32, fixed_pitch: f64,
                        lo: f64, hi: f64, speck: u32, cell_w: u32, cell_h: u32) -> i32 {
    let (src, st) = match (get(id), get(still)) { (Ok(a), Ok(b)) => (a, b), (Err(e), _) | (_, Err(e)) => return fail(e) };
    let o = SheetOpts {
        frames: frames as usize, lo, hi, speck: speck as usize,
        cell: (cell_w > 0 && cell_h > 0).then_some((cell_w as usize, cell_h as usize)),
        fixed_pitch: (fixed_pitch > 0.0).then_some(fixed_pitch),
        rows: (rows > 0).then_some(rows as usize),
        grid: (grid_c > 0 && grid_r > 0).then_some((grid_c as usize, grid_r as usize)),
    };
    done(dot_core::sheet(&src, &st, &o))
}

/// 칸마다 따로 뽑은 원본 여러 장 → 한 시트(걷기 4칸). ids 는 그림 번호 n 개(i32)를 써 넣은 자리
#[no_mangle]
pub extern "C" fn frames_sheet(ids: *const i32, n: u32, still: i32, rows: u32, fixed_pitch: f64, lo: f64, hi: f64, speck: u32, cell_w: u32, cell_h: u32) -> i32 {
    // SAFETY: 부르는 쪽이 alloc 으로 받은 자리에 i32 n 개를 써 넣었다
    let ids = unsafe { std::slice::from_raw_parts(ids, n as usize) };
    let mut srcs = Vec::new();
    for &i in ids { match get(i) { Ok(x) => srcs.push(x), Err(e) => return fail(e) } }
    let st = match get(still) { Ok(x) => x, Err(e) => return fail(e) };
    let o = SheetOpts {
        frames: srcs.len(), lo, hi, speck: speck as usize,
        cell: (cell_w > 0 && cell_h > 0).then_some((cell_w as usize, cell_h as usize)),
        fixed_pitch: (fixed_pitch > 0.0).then_some(fixed_pitch),
        rows: (rows > 0).then_some(rows as usize),
        grid: None,
    };
    done(dot_core::frames_sheet(&srcs, &st, &o))
}

fn nums(v: &[f64]) -> String { v.iter().map(|x| dot_core::round2(*x).to_string()).collect::<Vec<_>>().join(", ") }

/// 걷기(6칸 · 4칸)의 칸마다 dy (sprite-bob.py) → json {"head": [...], "dy": [...]}
#[no_mangle]
pub extern "C" fn bob(id: i32, cw: u32, amount: f64) -> i32 {
    let img = match get(id) { Ok(i) => i, Err(e) => return fail(e) };
    match dot_core::bob(&img, cw as usize, amount) {
        Ok((h, d)) => { S.with(|s| s.borrow_mut().json = format!("{{\"head\": [{}], \"dy\": [{}]}}", nums(&h), nums(&d))); 0 }
        Err(e) => fail(e),
    }
}

/// 접지 칸 발 폭과 빠르기 → json {"stride": n, "ms": ms, "speed": v}
#[no_mangle]
pub extern "C" fn stride(id: i32, cw: u32, ms: f64) -> i32 {
    let img = match get(id) { Ok(i) => i, Err(e) => return fail(e) };
    match dot_core::stride(&img, cw as usize) {
        Ok(st) => { S.with(|s| s.borrow_mut().json = format!("{{\"stride\": {st}, \"ms\": {ms}, \"speed\": {}}}", dot_core::speed_n(st, ms, img.w / cw as usize))); 0 }
        Err(e) => fail(e),
    }
}

/// 번호 → PNG 바이트(bytes_ptr/bytes_len)
#[no_mangle]
pub extern "C" fn encode(id: i32) -> i32 {
    let img = match get(id) { Ok(i) => i, Err(e) => return fail(e) };
    match codec::encode(&img) { Ok(b) => { S.with(|s| s.borrow_mut().bytes = b); 0 } Err(e) => fail(e) }
}

#[no_mangle] pub extern "C" fn bytes_ptr() -> *const u8 { S.with(|s| s.borrow().bytes.as_ptr()) }
#[no_mangle] pub extern "C" fn bytes_len() -> u32 { S.with(|s| s.borrow().bytes.len() as u32) }
#[no_mangle] pub extern "C" fn json_ptr() -> *const u8 { S.with(|s| s.borrow().json.as_ptr()) }
#[no_mangle] pub extern "C" fn json_len() -> u32 { S.with(|s| s.borrow().json.len() as u32) }
#[no_mangle] pub extern "C" fn err_ptr() -> *const u8 { S.with(|s| s.borrow().err.as_ptr()) }
#[no_mangle] pub extern "C" fn err_len() -> u32 { S.with(|s| s.borrow().err.len() as u32) }
