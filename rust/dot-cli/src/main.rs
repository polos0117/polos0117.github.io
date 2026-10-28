//! dot — 도트 정리 명령줄. book-atelier 의 파이썬 도구(sprite-grid · sprite-sheet · sprite-bob)와 같은 인자를 받는다.
//!   dot still <생성 원본.png> <정리본.png> [색 수=24] [--rows N | --pitch 9.5,14] [--outline] [--cell 96x128]   (4K: --pitch 12,20 --cell 192x256)
//!   dot sheet <생성 시트.png> <정리 시트.png> --frames N --palette <정지 도트.png> [--pitch 9,14 | --fixed-pitch 6 | --rows 121] [--speck 6] [--cell 96x128] [--grid 3x2]
//!   dot frames <정리 시트.png> <원본 1.png> <원본 2.png> … --palette <정지 도트.png> [--rows 121] [--speck 40] [--cell 96x128] — 칸마다 따로 뽑은 원본(걷기 4칸)
//!   dot bob <걷기 시트.png> [--cell 96x128] [--bob 1]   (6칸 · 4칸)
//!   dot stride <걷기 시트.png> [--cell 96x128] [--ms 200]
//!   dot verify <그림 저장소(예: ../book-atelier-img)> — records/sprites/*/*.json 의 인자로 원본을 다시 정리해 올린 정리본과 화소를 견준다
//! 정리본 옆에 <정리본>.json(격자·팔레트·프레임 자리)을 둔다.
use dot_core::{codec, Img, SheetOpts, StillOpts};
use std::path::{Path, PathBuf};
use std::process::exit;

fn load(p: &Path) -> Result<Img, String> {
    let b = std::fs::read(p).map_err(|e| format!("{}: {e}", p.display()))?;
    codec::decode(&b).map_err(|e| format!("{}: {e}", p.display()))
}

fn save(p: &Path, img: &Img, json: &str) -> Result<(), String> {
    std::fs::write(p, codec::encode(img)?).map_err(|e| e.to_string())?;
    std::fs::write(format!("{}.json", p.display()), json).map_err(|e| e.to_string())
}

fn flag<'a>(a: &'a [String], k: &str) -> Option<&'a str> {
    a.iter().position(|x| x == k).and_then(|i| a.get(i + 1)).map(|s| s.as_str())
}

fn pair(s: &str, sep: char) -> Result<(usize, usize), String> {
    let mut it = s.split(sep);
    let a = it.next().and_then(|v| v.parse().ok());
    let b = it.next().and_then(|v| v.parse().ok());
    match (a, b) { (Some(a), Some(b)) => Ok((a, b)), _ => Err(format!("{s} — {sep} 로 나눈 두 수")) }
}

/// 값 없는 깃발과 값을 받는 깃발을 빼고 남은 자리 인자
fn positional(a: &[String]) -> Vec<String> {
    let takes = ["--rows", "--frames", "--palette", "--pitch", "--fixed-pitch", "--speck", "--cell", "--grid", "--bob", "--ms"];
    let mut out = Vec::new(); let mut i = 0;
    while i < a.len() {
        if takes.contains(&a[i].as_str()) { i += 2; continue; }
        if a[i].starts_with("--") { i += 1; continue; }
        out.push(a[i].clone()); i += 1;
    }
    out
}

fn still_opts(a: &[String], pos: &[String]) -> Result<StillOpts, String> {
    Ok(StillOpts {
        colors: pos.get(2).map(|v| v.parse().map_err(|_| format!("색 수 {v}"))).transpose()?.unwrap_or(24),
        rows: flag(a, "--rows").map(|v| v.parse().map_err(|_| format!("--rows {v}"))).transpose()?,
        outline: a.iter().any(|x| x == "--outline"),
        cell: flag(a, "--cell").map(|v| pair(v, 'x')).transpose()?,
        pitch: flag(a, "--pitch").map(|p| {
            let v: Vec<f64> = p.split(',').filter_map(|x| x.parse().ok()).collect();
            if v.len() == 2 { Ok((v[0], v[1])) } else { Err(String::from("--pitch 12,20 꼴")) }
        }).transpose()?,
    })
}

fn sheet_opts(a: &[String]) -> Result<SheetOpts, String> {
    let mut o = SheetOpts::default();
    o.frames = flag(a, "--frames").ok_or("--frames 가 있어야 한다")?.parse().map_err(|_| "--frames 는 수")?;
    if let Some(p) = flag(a, "--pitch") {
        let v: Vec<f64> = p.split(',').filter_map(|x| x.parse().ok()).collect();
        if v.len() != 2 { return Err("--pitch 9,14 꼴".into()); }
        o.lo = v[0]; o.hi = v[1];
    }
    if let Some(v) = flag(a, "--speck") { o.speck = v.parse().map_err(|_| "--speck 는 수")?; }
    if let Some(v) = flag(a, "--cell") { o.cell = Some(pair(v, 'x')?); }
    if let Some(v) = flag(a, "--grid") { o.grid = Some(pair(v, 'x')?); }
    if let Some(v) = flag(a, "--fixed-pitch") { o.fixed_pitch = Some(v.parse().map_err(|_| "--fixed-pitch 는 수")?); }
    if let Some(v) = flag(a, "--rows") { o.rows = Some(v.parse().map_err(|_| "--rows 는 수")?); }
    Ok(o)
}

fn same(a: &Img, b: &Img) -> Option<usize> {
    if a.w != b.w || a.h != b.h { return None; }
    Some(a.px.chunks(4).zip(b.px.chunks(4)).filter(|(x, y)| x != y).count())
}

/// 기록 JSON 에서 문자열 값 하나("key": "…") — 기록 꼴은 손으로 쓴 것이라 필요한 몇 칸만 읽는다
fn jstr(s: &str, key: &str) -> Option<String> {
    let k = format!("\"{key}\"");
    let i = s.find(&k)? + k.len();
    let rest = s[i..].trim_start().strip_prefix(':')?.trim_start().strip_prefix('"')?;
    Some(rest[..rest.find('"')?].to_string())
}

/// "args": [...] 의 문자열·수 목록
fn jargs(s: &str) -> Option<Vec<String>> {
    let i = s.find("\"args\"")?;
    let rest = &s[i..];
    let (a, b) = (rest.find('[')?, rest.find(']')?);
    // 따옴표 안의 쉼표("5,7")는 나누지 않는다
    let (mut out, mut cur, mut q) = (Vec::new(), String::new(), false);
    for ch in rest[a + 1..b].chars() {
        match ch {
            '"' => q = !q,
            ',' if !q => { if !cur.trim().is_empty() { out.push(cur.trim().to_string()); } cur.clear(); }
            _ => cur.push(ch),
        }
    }
    if !cur.trim().is_empty() { out.push(cur.trim().to_string()); }
    Some(out)
}

/// 이름 붙은 덩어리 { … } 의 글 — 중괄호 짝을 센다
fn block<'a>(s: &'a str, key: &str) -> Option<&'a str> {
    let i = s.find(&format!("\"{key}\""))?;
    let a = i + s[i..].find('{')?;
    let mut depth = 0;
    for (j, ch) in s[a..].char_indices() {
        match ch { '{' => depth += 1, '}' => { depth -= 1; if depth == 0 { return Some(&s[a..a + j + 1]); } } _ => {} }
    }
    None
}

fn verify(repo: &Path) -> Result<bool, String> {
    let dir = repo.join("records/sprites");
    let mut people: Vec<PathBuf> = std::fs::read_dir(&dir).map_err(|e| format!("{}: {e}", dir.display()))?
        .filter_map(|e| e.ok().map(|e| e.path())).filter(|p| p.is_dir()).collect();
    people.sort();
    let (mut ok, mut n) = (true, 0);
    for p in people {
        let mut recs: Vec<PathBuf> = std::fs::read_dir(&p).map_err(|e| e.to_string())?.filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|f| f.extension().map_or(false, |x| x == "json")).collect();
        recs.sort();
        for r in recs {
            let s = std::fs::read_to_string(&r).map_err(|e| e.to_string())?;
            let Some(c) = block(&s, "cleaned") else { continue };
            let (Some(args), Some(tool), Some(file)) = (jargs(c), jstr(c, "tool"), jstr(c, "file")) else { continue };
            if args.iter().any(|x| x == "--separate") {
                // 칸마다 따로 뽑은 걷기 — 원본이 generation.files 에 여럿
                let g = block(&s, "generation").ok_or("generation 이 없다")?;
                let files: Vec<String> = g.split("\"file\"").skip(1).filter_map(|x| x.trim_start().strip_prefix(':')?.trim_start().strip_prefix('"').map(|y| y[..y.find('"').unwrap_or(0)].to_string())).collect();
                let srcs = files.iter().map(|f| load(&repo.join(f))).collect::<Result<Vec<_>, _>>()?;
                let pal = load(&repo.join(flag(&args, "--palette").ok_or("--palette 가 없다")?))?;
                let got = dot_core::frames_sheet(&srcs, &pal, &sheet_opts(&args)?)?.img;
                let want = load(&repo.join(&file))?;
                n += 1;
                let rel = r.strip_prefix(repo).unwrap_or(&r).display().to_string();
                match same(&got, &want) {
                    Some(0) => println!("같다  {rel}"),
                    Some(d) => { ok = false; println!("다르다 {rel} — 화소 {d}개") }
                    None => { ok = false; println!("다르다 {rel} — 크기 {}x{} ≠ {}x{}", got.w, got.h, want.w, want.h) }
                }
                continue;
            }
            let src = if let Some(from) = jstr(c, "from") {
                // 정지 도트: 여러 번 뽑은 것 중 from(gen2 …)
                let all = s.split("\"file\"").filter_map(|x| x.trim_start().strip_prefix(':')?.trim_start().strip_prefix('"').map(|y| y[..y.find('"').unwrap_or(0)].to_string()));
                all.into_iter().find(|f| f.ends_with(&format!("{from}.png"))).ok_or("원본을 못 찾았다")?
            } else {
                jstr(block(&s, "generation").unwrap_or(&s), "file").or_else(|| jstr(&s, "file")).ok_or("원본을 못 찾았다")?
            };
            let raw = load(&repo.join(&src))?;
            let want = load(&repo.join(&file))?;
            // 정지 도트 — 파이썬 도구(sprite-grid) 기록이거나, 도트 공방 기록이면 --frames 가 없다
            let got = if tool.contains("sprite-grid") || !args.iter().any(|x| x == "--frames") {
                let mut pos = vec![String::new(), String::new()]; pos.extend(positional(&args));
                dot_core::still(&raw, &still_opts(&args, &pos)?)?.img
            } else {
                let pal = load(&repo.join(flag(&args, "--palette").ok_or("--palette 가 없다")?))?;
                dot_core::sheet(&raw, &pal, &sheet_opts(&args)?)?.img
            };
            n += 1;
            let rel = r.strip_prefix(repo).unwrap_or(&r).display().to_string();
            match same(&got, &want) {
                Some(0) => println!("같다  {rel}"),
                Some(d) => { ok = false; println!("다르다 {rel} — 화소 {d}개") }
                None => { ok = false; println!("다르다 {rel} — 크기 {}x{} ≠ {}x{}", got.w, got.h, want.w, want.h) }
            }
        }
    }
    println!("{n}장 — {}", if ok { "모두 화소 하나 다르지 않다" } else { "다른 것이 있다" });
    Ok(ok && n > 0)
}

fn run(a: Vec<String>) -> Result<bool, String> {
    let cmd = a.first().map(|s| s.as_str()).unwrap_or("");
    let rest = &a[1.min(a.len())..];
    let pos = positional(rest);
    let cell = |d: (usize, usize)| -> Result<(usize, usize), String> { flag(rest, "--cell").map(|v| pair(v, 'x')).transpose().map(|v| v.unwrap_or(d)) };
    match cmd {
        "still" => {
            let (src, out) = (pos.first().ok_or("원본")?, pos.get(1).ok_or("정리본")?);
            let r = dot_core::still(&load(Path::new(src))?, &still_opts(rest, &pos)?)?;
            save(Path::new(out), &r.img, &r.json)?; println!("{}", r.json); Ok(true)
        }
        "sheet" => {
            let (src, out) = (pos.first().ok_or("생성 시트")?, pos.get(1).ok_or("정리 시트")?);
            let pal = load(Path::new(flag(rest, "--palette").ok_or("--palette 가 있어야 한다")?))?;
            let r = dot_core::sheet(&load(Path::new(src))?, &pal, &sheet_opts(rest)?)?;
            save(Path::new(out), &r.img, &r.json)?; println!("{}", r.json); Ok(true)
        }
        "frames" => {
            let out = pos.first().ok_or("정리 시트")?;
            if pos.len() < 3 { return Err("원본이 둘 넘게 있어야 한다".into()); }
            let pal = load(Path::new(flag(rest, "--palette").ok_or("--palette 가 있어야 한다")?))?;
            let srcs = pos[1..].iter().map(|p| load(Path::new(p))).collect::<Result<Vec<_>, _>>()?;
            let mut o = sheet_opts(&[rest, &["--frames".to_string(), srcs.len().to_string()]].concat())?;
            o.grid = None;
            let r = dot_core::frames_sheet(&srcs, &pal, &o)?;
            save(Path::new(out), &r.img, &r.json)?; println!("{}", r.json); Ok(true)
        }
        "bob" => {
            let (cw, _) = cell((96, 128))?;
            let b = flag(rest, "--bob").map(|v| v.parse::<f64>().map_err(|_| "--bob 는 수")).transpose()?.unwrap_or(1.0);
            let (head, dy) = dot_core::bob(&load(Path::new(pos.first().ok_or("걷기 시트")?))?, cw, b)?;
            let f = |v: &[f64]| v.iter().map(|x| dot_core::round2(*x).to_string()).collect::<Vec<_>>().join(", ");
            println!("{{\"head\": [{}], \"dy\": [{}]}}", f(&head), f(&dy)); Ok(true)
        }
        "stride" => {
            let (cw, _) = cell((96, 128))?;
            let ms = flag(rest, "--ms").map(|v| v.parse::<f64>().map_err(|_| "--ms 는 수")).transpose()?.unwrap_or(200.0);
            let img = load(Path::new(pos.first().ok_or("걷기 시트")?))?;
            let s = dot_core::stride(&img, cw)?;
            println!("{{\"stride\": {s}, \"ms\": {ms}, \"speed\": {}}}", dot_core::speed_n(s, ms, img.w / cw)); Ok(true)
        }
        "verify" => verify(Path::new(pos.first().map(|s| s.as_str()).unwrap_or("../../book-atelier-img"))),
        _ => Err("dot still | sheet | frames | bob | stride | verify — 맨 위 설명".into()),
    }
}

fn main() {
    match run(std::env::args().skip(1).collect()) {
        Ok(true) => {}
        Ok(false) => exit(1),
        Err(e) => { eprintln!("{e}"); exit(2) }
    }
}
