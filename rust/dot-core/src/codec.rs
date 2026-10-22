//! PNG 풀기·싸기 — PIL 의 Image.open(..).convert('RGBA') 와 같은 RGBA8(팔레트·회색·RGB 를 펴고, 16비트는 윗바이트).
use crate::Img;
use std::io::Cursor;

pub fn decode(bytes: &[u8]) -> Result<Img, String> {
    let mut d = png::Decoder::new(Cursor::new(bytes));
    d.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut r = d.read_info().map_err(|e| format!("PNG 를 못 풀었다: {e}"))?;
    let mut buf = vec![0; r.output_buffer_size().ok_or("PNG 가 너무 크다")?];
    let info = r.next_frame(&mut buf).map_err(|e| format!("PNG 를 못 풀었다: {e}"))?;
    let (w, h) = (info.width as usize, info.height as usize);
    let mut img = Img::new(w, h);
    let src = &buf[..info.buffer_size()];
    let ch = match info.color_type {
        png::ColorType::Rgba => 4, png::ColorType::Rgb => 3,
        png::ColorType::GrayscaleAlpha => 2, png::ColorType::Grayscale => 1,
        png::ColorType::Indexed => return Err("PNG 팔레트가 펴지지 않았다".into()),
    };
    let line = info.line_size;
    for y in 0..h {
        for x in 0..w {
            let s = &src[y * line + x * ch..y * line + x * ch + ch];
            let d = &mut img.px[(y * w + x) * 4..(y * w + x) * 4 + 4];
            match ch { 4 => d.copy_from_slice(s), 3 => { d[..3].copy_from_slice(s); d[3] = 255; }
                       2 => { d[0] = s[0]; d[1] = s[0]; d[2] = s[0]; d[3] = s[1]; }
                       _ => { d[0] = s[0]; d[1] = s[0]; d[2] = s[0]; d[3] = 255; } }
        }
    }
    Ok(img)
}

pub fn encode(img: &Img) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    {
        let mut e = png::Encoder::new(&mut out, img.w as u32, img.h as u32);
        e.set_color(png::ColorType::Rgba);
        e.set_depth(png::BitDepth::Eight);
        let mut w = e.write_header().map_err(|e| e.to_string())?;
        w.write_image_data(&img.px).map_err(|e| e.to_string())?;
    }
    Ok(out)
}
