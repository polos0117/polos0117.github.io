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
  assert.equal(act.states.walk.speed, 60); assert.equal(act.flip, true);
  n++;

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

  console.log('PASS 도트 공방: ' + n + '가지 · wasm 이 소스와 같다 · book 기록 ' + same + '장을 다시 정리해 화소 하나 다르지 않다(걷기 dy·빠르기까지) · 지시문·요청문·이름·기록·인물 칸 · 재생기 복사본 ' + copies.length + '곳 = 원본 · 그림 목록 ' + seen.join(' · '));
})().catch(e => { console.error(e); process.exit(1); });
