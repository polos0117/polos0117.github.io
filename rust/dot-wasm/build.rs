//! 소스 셈 — 올려 둔 dot/dot.wasm 이 소스보다 묵었는지 보려고 wasm 안에 소스의 FNV-1a 64 를 넣는다.
//! tests/dot.cjs 가 같은 셈을 해서 wasm 의 source_hash 와 견준다. 셈 규칙(둘이 같아야 한다):
//!   rust/ 아래 상대 경로(/ 로 잇는다)로 줄 세운 파일마다  경로 · 0x00 · 내용(\r\n → \n) · 0x00  을 이어 FNV-1a 64.
//!   파일: dot-core/Cargo.toml, dot-core/src/**, dot-wasm/Cargo.toml, dot-wasm/build.rs, dot-wasm/src/**
use std::fs;
use std::path::{Path, PathBuf};

fn walk(root: &Path, rel: &str, out: &mut Vec<String>) {
    let p = root.join(rel);
    if p.is_dir() {
        let mut names: Vec<String> = fs::read_dir(&p)
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        for n in names {
            walk(root, &format!("{rel}/{n}"), out);
        }
    } else if p.is_file() {
        out.push(rel.to_string());
    }
}

fn main() {
    let here = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let root = here.parent().unwrap().to_path_buf();
    let mut files = Vec::new();
    for rel in ["dot-core/Cargo.toml", "dot-core/src", "dot-wasm/Cargo.toml", "dot-wasm/build.rs", "dot-wasm/src"] {
        walk(&root, rel, &mut files);
        println!("cargo:rerun-if-changed={}", root.join(rel).display());
    }
    files.sort();
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    let mut feed = |bytes: &[u8]| {
        for &b in bytes {
            h ^= b as u64;
            h = h.wrapping_mul(0x0000_0100_0000_01b3);
        }
    };
    for f in &files {
        let body = fs::read_to_string(root.join(f)).unwrap().replace("\r\n", "\n");
        feed(f.as_bytes());
        feed(&[0]);
        feed(body.as_bytes());
        feed(&[0]);
    }
    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("source_hash.rs");
    fs::write(out, format!("/// 소스 셈(build.rs)\npub const SOURCE_HASH: &str = \"{h:016x}\";\n")).unwrap();
}
