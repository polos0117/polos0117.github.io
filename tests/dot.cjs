/* 도트 공방 — dot/dot.wasm · dot/dot.js. node tests/dot.cjs
   - wasm 이 소스보다 묵지 않았나: wasm 안의 source_hash 와 rust/ 소스를 같은 규칙으로 셈한 값(rust/dot-wasm/build.rs)
   - book 서재 세 인물: 그림 저장소(../book-atelier-img)의 기록(records/sprites/<인물>/<상태>.json)마다 원본을 같은 인자로 다시 정리해
     올린 정리본과 화소 하나 다르지 않다 — 정지 셋 · 대기 셋 · 걷기 셋 · 반응 셋, 걷기 v2 의 dy·빠르기는 book 의 data/sprites.json 과 같다
   - 지시문 · 요청문 · 파일 이름 · 기록 · sprites.json 칸 · 공방 그림 목록(옆에 저장소가 있으면 다섯 공방 실제 자료로) */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const D = require('../dot/dot.js');
let n = 0;

function sourceHash() {
  const base = path.join(ROOT, 'rust'), files = [];
  const walk = rel => {
    const p = path.join(base, rel);
    if (fs.statSync(p).isDirectory()) fs.readdirSync(p).sort().forEach(f => walk(rel + '/' + f));
    else files.push(rel);
  };
  ['dot-core/Cargo.toml', 'dot-core/src', 'dot-wasm/Cargo.toml', 'dot-wasm/build.rs', 'dot-wasm/src'].forEach(walk);
  files.sort();
  let h = 0xcbf29ce484222325n;
  const feed = b => { for (const x of b) { h ^= BigInt(x); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } };
  for (const f of files) {
    feed(Buffer.from(f)); feed([0]);
    feed(Buffer.from(fs.readFileSync(path.join(base, f), 'utf8').replace(/\r\n/g, '\n'))); feed([0]);
  }
  return h.toString(16).padStart(16, '0');
}

(async () => {
  const W = await D.load(fs.readFileSync(path.join(ROOT, 'dot/dot.wasm')));
  assert.equal(W.hash, sourceHash(), 'dot/dot.wasm 이 소스보다 묵었다 — rust/README.md 대로 다시 지어 올릴 것');
  n++;

  /* ── book 서재 세 인물을 다시 정리 ── */
  const IMG = path.join(ROOT, '..', 'book-atelier-img');
  let same = 0;
  if (fs.existsSync(path.join(IMG, 'records/sprites'))) {
    const dec = f => W.decode(fs.readFileSync(path.join(IMG, f)));
    const flag = (a, k) => { const i = a.indexOf(k); return i < 0 ? null : a[i + 1]; };
    for (const who of fs.readdirSync(path.join(IMG, 'records/sprites')).sort()) {
      const dir = path.join(IMG, 'records/sprites', who);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
        const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), c = r.cleaned;
        if (!c || !c.args) continue;
        const src = r.generations ? r.generations.find(g => g.file.endsWith((c.from || 'gen1') + '.png')).file : r.generation.file;
        const a = c.args.map(String), raw = dec(src);
        let out;
        if (/sprite-grid/.test(c.tool)) {
          out = W.still(raw, { colors: +a[0], rows: flag(a, '--rows') ? +flag(a, '--rows') : 0, outline: a.includes('--outline') });
        } else {
          const pal = dec(flag(a, '--palette')), grid = flag(a, '--grid'), cell = flag(a, '--cell'), pitch = flag(a, '--pitch');
          out = W.sheet(raw, pal, {
            frames: +flag(a, '--frames'), grid: grid ? grid.split('x').map(Number) : null, rows: +(flag(a, '--rows') || 0),
            fixedPitch: +(flag(a, '--fixed-pitch') || 0), speck: +(flag(a, '--speck') || 6), cell: cell ? cell.split('x').map(Number) : null,
            lo: pitch ? +pitch.split(',')[0] : 9, hi: pitch ? +pitch.split(',')[1] : 14
          });
          W.free(pal);
        }
        const got = W.rgba(out.id), want = W.rgba(dec(c.file));
        assert.deepEqual([got.w, got.h], [want.w, want.h], who + '/' + f + ' 크기');
        let diff = 0;
        for (let i = 0; i < got.data.length; i += 4) if (got.data[i] !== want.data[i] || got.data[i + 1] !== want.data[i + 1] || got.data[i + 2] !== want.data[i + 2] || got.data[i + 3] !== want.data[i + 3]) diff++;
        assert.equal(diff, 0, who + '/' + f + ' — 다른 화소 ' + diff);
        if (c.cell) assert.deepEqual(out.info.cell, c.cell, who + '/' + f + ' 칸');
        if (c.frame) assert.deepEqual(out.info.frame.map(x => x.at), c.frame.map(x => x.at), who + '/' + f + ' 프레임 자리');
        /* PNG 로 싸서 다시 풀어도 같다 */
        const back = W.rgba(W.decode(W.png(out.id)));
        assert.deepEqual(back.data, got.data);
        same++; W.free(raw); W.free(out.id);
      }
    }
    assert.equal(same, 12, '정지 셋 · 대기 셋 · 걷기 셋 · 반응 셋');
    /* 걷기 v2 — 오르내림·빠르기가 book 의 sprites.json 과 같다 */
    const book = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'book-atelier/data/sprites.json'), 'utf8'));
    for (const [who, a] of Object.entries(book.actors)) {
      const s = a.states.walk, img = W.decode(fs.readFileSync(path.join(IMG, 'sprites', s.file)));
      assert.deepEqual(W.bob(img, a.cell[0], 1).dy, s.dy, who + ' dy');
      assert.equal(W.stride(img, a.cell[0], s.ms[0]).speed, s.speed, who + ' 빠르기');
      W.free(img);
    }
    n += 3;
  } else console.log('(../book-atelier-img 가 옆에 없어 다시 정리 시험은 건너뜀)');

  /* ── 한 색 바탕(#00FF00)에 위아래 칸이 이어진 2x2 시트 — 바탕을 지우고 칸 배치로 잘라 네 칸 ── */
  {
    const w = 400, hh = 600, px = new Uint8Array(w * hh * 4);
    for (let i = 0; i < w * hh; i++) px.set([0, 255, 0, 255], i * 4);
    const paint = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set([120, 60, 40, 255], (y * w + x) * 4); };
    for (const [cx, cy] of [[100, 150], [300, 150], [100, 450], [300, 450]]) paint(cx - 40, cy - 120, cx + 40, cy + 120);
    paint(95, 270, 105, 330);
    const raw = W.put(px, w, hh), st = W.put(new Uint8Array([120, 60, 40, 255, 0, 0, 0, 0]), 2, 1);
    const r = W.sheet(raw, st, { frames: 4, grid: [2, 2], rows: 0, fixedPitch: 6, speck: 6, cell: [96, 128] });
    assert.equal(r.info.frames, 4); assert.equal(r.info.background_keyed, '#00ff00');
    assert.throws(() => W.sheet(raw, st, { frames: 4, grid: null, rows: 0, fixedPitch: 6, speck: 6, cell: [96, 128] }), /프레임 2 개를 찾았다\(기대 4, 칸 배치 없음, 한 색 바탕을 지웠다\)/);
    /* 정지 도트 칸에 원본(색 수십만)을 넣어도 — 24색으로 묶어 금방 끝난다 */
    const t0 = Date.now(), q = W.sheet(raw, raw, { frames: 4, grid: [2, 2], rows: 0, fixedPitch: 6, speck: 6, cell: [96, 128] });
    assert.equal(q.info.palette_quantized, undefined, '두 색 그림은 묶지 않는다');
    const noisy = new Uint8Array(w * hh * 4); for (let i = 0; i < w * hh; i++) noisy.set([i % 251, (i * 7) % 253, (i * 13) % 255, 255], i * 4);
    const big = W.put(noisy, w, hh), q2 = W.sheet(raw, big, { frames: 4, grid: [2, 2], rows: 0, fixedPitch: 6, speck: 6, cell: [96, 128] });
    assert.equal(q2.info.palette_quantized, true); assert(Date.now() - t0 < 20000, '원본을 정지 도트로 넣어도 끝난다 ' + (Date.now() - t0) + 'ms');
    W.free(raw); W.free(st); W.free(r.id); W.free(q.id); W.free(big); W.free(q2.id);
    n++;
  }

  /* ── 틀린 입력은 던진다(그림은 그대로) ── */
  assert.throws(() => W.decode(new Uint8Array([1, 2, 3])), /PNG/);
  const blank = W.put(new Uint8Array(64 * 64 * 4), 64, 64);
  assert.throws(() => W.still(blank, {}), /비었다/);
  assert.throws(() => W.sheet(blank, blank, { frames: 4, grid: [2, 2] }), /프레임 0 개/);
  n++;

  /* ── 지시문 · 요청문 ── */
  const st = D.prompt({ state: 'still', subject: 'woman', identity: 'Short dark-brown bob.', sample: true });
  assert.deepEqual(st.attach, ['canonical', 'sample_x6']);
  assert(st.text.includes('SAME young woman') && st.text.includes('Short dark-brown bob.') && st.text.includes('image 2 is a finished sprite') && st.text.includes('12 x 12'));
  const wk = D.prompt({ state: 'walk', identity: 'Ink-black robe.' });
  assert.deepEqual(wk.attach, ['still_x6', 'leg_guide', 'canonical']);
  assert(wk.text.includes('3 x 2 grid (cell 341 x 768)') && wk.text.includes('MIRROR of frame 1') && wk.text.includes('NEAR leg'));
  assert(D.prompt({ state: 'walk', skirt: true }).text.includes('hidden by a long skirt'));
  const id = D.prompt({ state: 'idle' });
  assert(id.text.includes('2 x 2 grid (cell 512 x 768)') && id.text.includes('blink') && id.attach.length === 2);
  assert(D.prompt({ state: 'react' }).text.includes('REACT'));
  const req = D.request({ state: 'walk', id: 'alice', form: 'begin', name: '앨리스', atelierName: '책', files: { canonical: 'https://x/alice.webp' } });
  assert(req.includes('alice_begin_walk_gen1.png') && req.includes('첨부 3장') && req.includes('https://x/alice.webp') && req.includes('강제 push'));
  n += 2;

  /* ── 이름 · 인자 · 기록 · sprites.json 칸 ── */
  assert.deepEqual(D.names('alice', 'begin', 'walk', 2, 'v2'), { raw: 'sprites/alice/raw/alice_begin_walk_gen2.png', cleaned: 'sprites/alice/alice_begin_walk_v2.png', record: 'records/sprites/alice/walk_v2.json', x6: 'alice_begin_still_x6.png' });
  assert.deepEqual(D.args('still'), ['24', '--rows', '121', '--outline']);
  assert.deepEqual(D.args('walk', {}, 'sprites/a/a_still.png'), ['--frames', '6', '--grid', '3x2', '--palette', 'sprites/a/a_still.png', '--rows', '121', '--speck', '40', '--cell', '96x128']);
  assert.equal(D.slug('Mr. Mime'), 'mr_mime');
  const ent = D.spriteState({ state: 'walk', id: 'x', form: 'base', walk: { speed: 60, dy: [0, 1, -1, 0, 1, -1] } });
  assert.deepEqual(ent, { file: 'x/x_base_walk.png', frames: 6, order: [0, 1, 2, 3, 4, 5], ms: [200, 200, 200, 200, 200, 200], speed: 60, dy: [0, 1, -1, 0, 1, -1] });
  const rec = D.record({ state: 'idle', id: 'x', atelier: 'pkm', date: '2026-10-22', args: D.args('idle'), info: { cell: [96, 128] } });
  assert.equal(rec.cleaned.file, 'sprites/x/x_base_idle.png'); assert.deepEqual(rec.playback.order, [0, 1, 2, 3]); assert.deepEqual(rec.cleaned.cell, [96, 128]);
  n += 2;

  /* ── 인물 칸 전체 ── */
  const act = D.actor({ id: 'x', form: 'base', states: ['still', 'walk'], walk: { speed: 60, dy: [0, 1, -1, 0, 1, -1] } });
  assert.deepEqual(Object.keys(act.states), ['still', 'walk']); assert.deepEqual(act.cell, [96, 128]); assert.deepEqual(act.foot, [48, 126]);
  assert.equal(act.states.walk.speed, 60); assert.equal(act.flip, true); assert.equal('base' in act, false);
  /* 그림이 sprites.json 의 base 와 다른 저장소에 있으면 인물 칸에 base */
  assert.equal(D.actor({ id: 'x', states: ['still'], base: 'https://h/pkm-atelier-img-3/sprites/' }).base, 'https://h/pkm-atelier-img-3/sprites/');
  n++;

  /* ── 걷기 4칸을 칸마다 따로(walk4) — 지시문 넷 · 이름 · 기록 · 재생기의 걷기 자리 · 따로 뽑은 원본 넷을 한 시트로 ── */
  {
    const p1 = D.prompt({ state: 'walk4', frame: 1 }), p3 = D.prompt({ state: 'walk4', frame: 3, skirt: true });
    assert.deepEqual(p1.attach, ['still_x6', 'canonical']); assert.deepEqual(p3.attach, ['still_x6', 'walk4_f1', 'canonical']);
    assert(p1.text.includes('frame 1 of 4') && p1.text.includes('ONE character only') && p1.text.includes('NEAR leg') && !p1.text.includes('image 2 is frame 1'));
    assert(p3.text.includes('frame 3 of 4') && p3.text.includes('image 2 is frame 1') && p3.text.includes('long skirt') === false && p3.text.includes('FAR foot peeks out'));
    const nm = D.names('alice', 'begin', 'walk4');
    assert.deepEqual(nm.raws, [1, 2, 3, 4].map(k => 'sprites/alice/raw/alice_begin_walk4_' + k + '_gen1.png'));
    assert.equal(nm.cleaned, 'sprites/alice/alice_begin_walk4.png');
    assert(D.request({ state: 'walk4', frame: 2, id: 'alice', form: 'begin' }).includes('alice_begin_walk4_2_gen1.png'));
    assert.deepEqual(D.args('walk4', {}, 'p.png'), ['--separate', '--frames', '4', '--palette', 'p.png', '--rows', '121', '--speck', '40', '--cell', '96x128']);
    const rec4 = D.record({ state: 'walk4', id: 'alice', form: 'begin', rawSha256: ['a', 'b', 'c', 'd'], received: ['1.png', '2.png', '3.png', '4.png'] });
    assert.equal(rec4.generation.files.length, 4); assert.equal(rec4.generation.files[2].sha256, 'c'); assert.deepEqual(rec4.playback.ms, [250, 250, 250, 250]);
    const a4 = D.actor({ id: 'alice', form: 'begin', states: ['still', 'walk', 'walk4'], walk: { speed: 100, dy: [1, -1, 1, -1] } });
    assert.deepEqual(Object.keys(a4.states), ['still', 'walk'], '4칸은 재생기의 걷기 자리'); assert.equal(a4.states.walk.file, 'alice/alice_begin_walk4.png'); assert.equal(a4.states.walk.frames, 4);
    n++;
    /* 앨리스 6칸 걷기 원본에서 접지·지나감·거울 접지·거울 지나감(0·2·3·5칸)을 잘라, 장마다 다른 자리의 1024×1536 초록 바탕에 — 따로 뽑은 것처럼 */
    const IMG = path.join(ROOT, '..', 'book-atelier-img');
    if (fs.existsSync(path.join(IMG, 'records/sprites/alice'))) {
      const recs = fs.readdirSync(path.join(IMG, 'records/sprites/alice')).filter(f => /^walk.*\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(IMG, 'records/sprites/alice', f), 'utf8')));
      const r = recs.find(x => x.cleaned.frame && x.cleaned.frame.length === 6);
      const src = r.generations ? r.generations.find(g => g.file.endsWith((r.cleaned.from || 'gen1') + '.png')).file : r.generation.file;
      const big = W.rgba(W.decode(fs.readFileSync(path.join(IMG, src))));
      const pal = W.decode(fs.readFileSync(path.join(IMG, r.cleaned.args[r.cleaned.args.indexOf('--palette') + 1])));
      const ids = [0, 2, 3, 5].map((fi, k) => {
        const [x0, y0, x1, y1] = r.cleaned.frame[fi].box_px, cw = 1024, ch = 1536, px = new Uint8Array(cw * ch * 4);
        for (let i = 0; i < cw * ch; i++) px.set([0, 255, 0, 255], i * 4);
        const ox = 300 + k * 9, oy = 600 - k * 7;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const s = (y * big.w + x) * 4; if (big.data[s + 3] < 128) continue;
          px.set(big.data.subarray(s, s + 4), ((oy + y - y0) * cw + ox + x - x0) * 4);
        }
        return W.put(px, cw, ch);
      });
      const out = W.framesSheet(ids, pal, { rows: 121, speck: 40, cell: [96, 128] }), out2 = W.framesSheet(ids, pal, { rows: 121, speck: 40, cell: [96, 128] });
      assert.equal(out.info.separate, 4); assert.equal(out.info.frames, 4); assert.equal(out.info.background_keyed, '#00ff00'); assert.deepEqual(W.size(out.id), [384, 128]);
      assert.deepEqual(W.rgba(out.id).data, W.rgba(out2.id).data, '같은 원본이면 같은 화소');
      const colours = c => { const d = W.rgba(c).data, s = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) s.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return s; };
      const mine = colours(out.id), still = colours(pal);
      assert([...mine].every(c => still.has(c)), '색은 정지 도트의 것만');
      assert(out.info.frame.every(f => f.at[1] + f.size[1] === 126), '네 칸 모두 발이 기준선 126');
      const b = W.bob(out.id, 96, 1), t = W.stride(out.id, 96, 250);
      assert.equal(b.dy.length, 4); assert(b.dy.every(v => Math.abs(v) <= 2));
      assert.equal(t.speed, Math.round(t.stride / 0.5), '빠르기 = 보폭 ÷ 반 주기(2칸 × 250ms)');
      ids.concat([out.id, out2.id, pal]).forEach(i => W.free(i));
      n++;
    }
  }

  /* ── 재생 차례를 손으로 고른 것(앨리스 대기 [0,3,0,2]) — 칸·인물 칸·기록이 따라간다, 안 주면 상태 기본 ── */
  {
    const o = { order: [0, 3, 0, 2], ms: [700, 220, 700, 140] };
    assert.deepEqual(D.spriteState({ state: 'idle', id: 'alice', form: 'begin', order: o.order, ms: o.ms }), { file: 'alice/alice_begin_idle.png', frames: 4, order: [0, 3, 0, 2], ms: [700, 220, 700, 140] });
    assert.deepEqual(D.spriteState({ state: 'idle', id: 'alice', form: 'begin' }).order, D.STATES.idle.order, '안 주면 기본');
    const a = D.actor({ id: 'alice', form: 'begin', states: ['still', 'idle', 'walk'], walk: { speed: 63, dy: [0, 0, 0, 0, 0, 0] }, orders: { idle: o } });
    assert.deepEqual(a.states.idle.order, [0, 3, 0, 2]); assert.deepEqual(a.states.walk.order, [0, 1, 2, 3, 4, 5], '다른 상태는 기본');
    const r = D.record({ state: 'idle', id: 'alice', form: 'begin', atelier: 'book', date: '2026-10-28', args: [], info: { hand_edits: 2 }, order: o.order, ms: o.ms });
    assert.deepEqual([r.playback.order, r.playback.ms, r.cleaned.hand_edits], [[0, 3, 0, 2], [700, 220, 700, 140], 2], '기록의 재생·손본 횟수');
    n++;
  }

  /* ── 그리기 — gpt 그림 API 요청의 꼴. fetch 를 바꿔 끼워 본다: 주소·열쇠·모델·크기·품질·투명 바탕·PNG·첨부 차례, 오류 말 ── */
  {
    const calls = [];
    const reply = (status, body) => () => Promise.resolve({ ok: status === 200, status, text: () => Promise.resolve(JSON.stringify(body)) });
    const good = (url, init) => { calls.push({ url, init }); return reply(200, { data: [{ b64_json: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64') }], usage: { total_tokens: 1234, input_tokens: 1000, output_tokens: 234 } })(); };
    const r = await D.generate('sk-x', { prompt: 'Pixel art…', images: [{ bytes: new Uint8Array([9, 9]), name: 'a.webp', type: 'image/webp' }, { bytes: new Uint8Array([1]), name: 'b.png' }], quality: 'high' }, good);
    assert.deepEqual(Array.from(r.bytes), [0x89, 0x50, 0x4e, 0x47], '받은 b64 를 바이트로'); assert.equal(r.usage.total_tokens, 1234);
    assert.equal(calls[0].url, D.GEN.url); assert.equal(calls[0].init.method, 'POST'); assert.equal(calls[0].init.headers.Authorization, 'Bearer sk-x');
    const f = calls[0].init.body;
    assert.equal(f.get('model'), 'gpt-image-2.5-sunburst', '모델 기본은 sunburst — gpt-image-1 은 2026-10-23 에 끝났다'); assert.equal(f.get('size'), '1024x1536'); assert.equal(f.get('quality'), 'high'); assert.equal(f.get('n'), '1');
    assert.equal(f.get('background'), 'transparent'); assert.equal(f.get('output_format'), 'png'); assert.equal(f.get('input_fidelity'), null, '2 세대는 input_fidelity 를 안 받는다'); assert.equal(f.get('prompt'), 'Pixel art…');
    const ims = f.getAll('image[]');
    assert.deepEqual(ims.map(b => [b.name, b.type, b.size]), [['a.webp', 'image/webp', 2], ['b.png', 'image/png', 1]], '첨부가 차례대로 image[]');
    assert.equal(D.genForm({ prompt: 'x', images: [], quality: 'bogus' }).get('quality'), 'medium', '모르는 품질은 보통');
    assert.equal(D.genForm({ prompt: 'x', images: [], size: '2160x3840' }).get('size'), '2160x3840', '4K'); assert.equal(D.genForm({ prompt: 'x', images: [], size: '999x999' }).get('size'), '1024x1536', '모르는 크기는 보통');
    /* 크기에 따라 지시문의 화소 블록·칸·발 기준선이 바뀐다 — 보통은 전과 같은 글 */
    const big = { state: 'still', subject: 'woman', id: 'alice', form: 'begin', size: '2160x3840' }, small = Object.assign({}, big, { size: '1024x1536' });
    assert(D.prompt(small).text.includes('crisp 12 x 12 square') && D.prompt(small).text.includes('Portrait canvas 1024 x 1536'), '보통 정지');
    assert(D.prompt(big).text.includes('crisp 25 x 25 square') && D.prompt(big).text.includes('Portrait canvas 2160 x 3840'), '4K 정지');
    const w4 = D.prompt(Object.assign({}, big, { state: 'walk' })).text, w1 = D.prompt(Object.assign({}, small, { state: 'walk' })).text;
    assert(w1.includes('cell 341 x 768') && w1.includes('crisp 6 x 6 square'), '보통 걷기 시트'); assert(w4.includes('canvas 2160 x 3840, 6 frames in a 3 x 2 grid (cell 720 x 1920)') && w4.includes('crisp 13 x 13 square'), '4K 걷기 시트');
    assert(D.prompt(Object.assign({}, big, { state: 'idle' })).text.includes('cell 1080 x 1920'), '4K 2x2 칸');
    assert(D.prompt(Object.assign({}, big, { state: 'walk4', frame: 1 })).text.includes('baseline about 84 pixels') && D.prompt(Object.assign({}, small, { state: 'walk4', frame: 1 })).text.includes('baseline about 40 pixels'), '단칸의 발 기준선');
    assert.equal(D.genForm({ prompt: 'x', images: [], model: 'gpt-image-2.5-flare' }).get('model'), 'gpt-image-2.5-flare', '빠른 모델');
    assert.equal(D.genForm({ prompt: 'x', images: [], model: 'gpt-image-1' }).get('model'), 'gpt-image-2.5-sunburst', '끝난 모델 이름은 기본으로');
    assert.deepEqual(Object.keys(D.GEN.quality), ['low', 'medium', 'high', 'xhigh']);
    assert.deepEqual(Object.keys(D.GEN.models), ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare']);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(404, { error: { message: 'The model `gpt-image-1` does not exist or you do not have access to it.' } })), /그 모델을 못 쓴다.*gpt-image-1/);
    await assert.rejects(D.generate('', { prompt: 'p', images: [] }, good), /열쇠가 없다/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(401, { error: { message: 'Incorrect API key' } })), /401/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(429, { error: { message: 'quota' } })), /429.*quota/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(400, { error: { message: 'Your request was rejected by the safety system.' } })), /안전 필터.*safety/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(400, { error: { message: 'Invalid value: size' } })), /400 Invalid value/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, reply(200, { data: [] })), /그림이 없다/);
    await assert.rejects(D.generate('k', { prompt: 'p', images: [] }, () => Promise.reject(new Error('net down'))), /못 닿았다.*net down/);
    n += 3;
  }

  /* ── 도트 재생기 복사본 — 옆에 받아 둔 다섯 공방 저장소의 lib/sprite-actor.{js,css} 가 여기 원본과 같다 ── */
  const copies = [];
  for (const repo of ['atelier', 'pkm-atelier', 'myth-atelier', 'book-atelier', 'sam-atelier']) {
    for (const f of ['sprite-actor.js', 'sprite-actor.css']) {
      const p = path.join(ROOT, '..', repo, 'lib', f);
      if (!fs.existsSync(path.join(ROOT, '..', repo))) continue;
      assert(fs.existsSync(p), repo + '/lib/' + f + ' 가 없다');
      assert.equal(fs.readFileSync(p, 'utf8'), fs.readFileSync(path.join(ROOT, f), 'utf8'), repo + '/lib/' + f + ' 가 원본과 다르다');
    }
    if (fs.existsSync(path.join(ROOT, '..', repo))) copies.push(repo);
  }
  n++;

  /* ── 공방 그림 목록 — 옆에 저장소가 있으면 실제 자료로 ── */
  const near = (dir, f) => { const p = path.join(ROOT, '..', dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const seen = [];
  for (const A of D.ATELIERS) {
    const dir = A.data.split('/')[1], doc = near(dir, A.data.split('/').slice(2).join('/'));
    if (!doc) continue;
    const nm = A.names ? near(dir, A.names.split('/').slice(2).join('/')) : null;
    const list = D.cards(A, doc, nm);
    assert(list.length > 10, A.key + ' 인물 목록');
    assert(list.every(c => c.files.length && c.files.every(f => f.url.startsWith(A.bases[0].split('/').slice(0, 2).join('/')))), A.key + ' 주소');
    seen.push(A.key + ' ' + list.length);
    if (A.key === 'book') { const al = list.find(c => c.key === 'alice'); assert.equal(al.id, 'alice'); assert.equal(al.name, '이상한 나라의 앨리스'); assert(al.files.some(f => f.file === 'alice_end_literary_fantasy_f.webp')); }
    if (A.key === 'pkm') {
      const pk = list.find(c => c.key === '피카츄'); assert.equal(pk.id, 'pikachu');
      const doc2 = doc.where && Object.keys(doc.where)[0];
      if (doc2) { const f = list.flatMap(c => c.files).find(f => f.file === doc2); assert(f.url.startsWith('/pkm-atelier-img-2/img/'), '둘째 저장소 그림'); }
    }
    if (A.key === 'samguk') assert(list[0].files[0].url.startsWith('/sam-atelier/images/portraits/'));
  }
  n++;

  console.log('PASS 도트 공방: ' + n + '가지 · wasm 이 소스와 같다 · book 기록 ' + same + '장을 다시 정리해 화소 하나 다르지 않다(걷기 dy·빠르기까지) · 지시문·요청문·이름·기록·인물 칸 · 그리기 요청 꼴·오류 말 · 재생기 복사본 ' + copies.length + '곳 = 원본 · 그림 목록 ' + seen.join(' · '));
})().catch(e => { console.error(e); process.exit(1); });
