/* 그림 검수판 — 여섯 공방(포켓몬 · 책 · 게임 · 원소 · 신화 · 삼국지)의 그림 작업과 데이터 반영을 검수 · 승인하는 화면(review.html)의 셈(2026-11-04).
   그림은 고치지 않는다 — 등록부(/<저장소>/data/img.json)와 잠금 파일(/<그림 저장소>/records/automation/claims/<카드>.json)을 읽고,
   검수 장부(브라우저 저장 + 내보내기 JSON)에 적는다. 브라우저(review.html)와 검사(tests/review.cjs)가 같은 파일을 쓴다.

   AtelierReview.PROJECTS        — 공방마다 규칙(rules) · 생성 기준(gen) · 쓰는 규칙 묶음(ruleSets) · 승인 뒤 할 일(post)
   AtelierReview.RULESETS        — 다시 쓰는 규칙 묶음(2:3 세로 · 성인 여성 1명 · 팔 2 · 손 2 · 손가락 5 …). 사용자 묶음을 더할 수 있다
   AtelierReview.checklist(p, item, custom)  → 그 작업의 검수 항목(묶음을 합친 것, 중복 id 는 한 번)
   AtelierReview.autoCheck(meta, p)           → 그림 파일 자체로 판정할 수 있는 항목(비율 · 크기 · 형식)
   AtelierReview.parseFile(p, file)           → {card, slot, style, cut} — 파일 이름 규칙대로
   AtelierReview.useStyles(p, table)          → 그 공방 화풍 표(p.styleTable — /<저장소>/data/style.json)의 열쇠로 p.styles 를 바꾼다(내린 화풍 포함)
   AtelierReview.candidates(p, imgDoc, opt)   → 최신 작업 후보(등록부 added 날짜 순) + 우선순위
   AtelierReview.parsePrompt(text)            → 지시문 트리(머리말 줄 · 번호 목록 · 갈래 글머리 · 마디)
   AtelierReview.composeCommand(ctx, reqs)    → 고쳐 달라는 명령문(한국어)
   AtelierReview.transition(item, to, me)     → 상태 옮기기(잠금 · 승인 전 잠금 · 승인 조건)
   AtelierReview.duplicates(items, cand)      → 같은 공방 · 카드 · 자리의 진행 중 작업, 같은 sha256 */
(function (root) {
  'use strict';

  /* ── 다시 쓰는 규칙 묶음 ── kind: auto(파일로 판정) · manual(사람이 본다). type: 오류 유형(ERROR_TYPES 열쇠) */
  var RULESETS = [
    { id: 'frame', name: '세로 2:3 판형', items: [
      { id: 'ratio', label: '세로 2:3 비율', type: 'composition', kind: 'auto' },
      { id: 'size', label: '1024×1536', type: 'composition', kind: 'auto' },
      { id: 'webp', label: 'WebP 로 올림(원본 PNG 는 안 올림)', type: 'record', kind: 'auto' }] },
    { id: 'one-woman', name: '성인 여성 1명', items: [
      { id: 'adult', label: '성인 여성(아이 같은 얼굴 · 비율 아님)', type: 'face', kind: 'manual' },
      { id: 'one', label: '주인공은 그녀 한 명 — 주인공을 다투는 인물 · 몸에 닿은 인물 · 같은 얼굴 둘 없음', type: 'count', kind: 'manual' }] },
    { id: 'limbs', name: '팔 2 · 손 2 · 손가락 5', items: [
      { id: 'arms', label: '팔 2개 — 어깨에 붙어 있고 관절이 사람 방향', type: 'arm', kind: 'manual' },
      { id: 'hands', label: '손 2개 — 장갑 · 효과가 손가락을 덮지 않음', type: 'hand', kind: 'manual' },
      { id: 'fingers', label: '손마다 손가락 5개(엄지 1 + 4), 붙거나 겹치지 않음', type: 'hand', kind: 'manual' },
      { id: 'legs', label: '다리 2개, 무릎 · 발목이 사람 방향', type: 'arm', kind: 'manual' }] },
    { id: 'face', name: '얼굴', items: [
      { id: 'face-cam', label: '얼굴이 카메라를 향함(정면 · 3/4, 뒷모습 아님)', type: 'face', kind: 'manual' },
      { id: 'face-sym', label: '눈 · 입이 어긋나지 않음(비대칭 · 녹은 얼굴 없음)', type: 'face', kind: 'manual' },
      { id: 'face-design', label: '설계표 얼굴(얼굴형 · 눈매 · 코 · 입)대로', type: 'face', kind: 'manual' }] },
    { id: 'frame-in', name: '구도', items: [
      { id: 'head-feet', label: '전신 — 머리와 발이 화면 안, 여백 있음', type: 'composition', kind: 'manual' },
      { id: 'no-border', label: '틀 · 테두리를 그리지 않음', type: 'composition', kind: 'manual' },
      { id: 'plan', label: '계획한 프레이밍 · 방향 · 자세 · 옷대로(다르면 먼저 묻는다)', type: 'composition', kind: 'manual' }] },
    { id: 'text-none', name: '글자 없음', items: [
      { id: 'text', label: '읽히는 글자 · 숫자 · 로고 · 워터마크 · 말풍선 없음', type: 'text', kind: 'manual' }] },
    { id: 'text-element', name: '글자 — 원소 기호와 원자 번호만', items: [
      { id: 'text', label: '글자는 그 원소의 기호와 원자 번호만(그 밖의 글자 · 숫자 · 로고 없음)', type: 'text', kind: 'manual' }] },
    { id: 'text-sam', name: '글자 — 깃발 · 인장 한 글자만', items: [
      { id: 'text', label: '글자는 깃발 · 인장의 한 글자(세력 · 성씨)만', type: 'text', kind: 'manual' }] },
    { id: 'no-creature', name: '생물 없음', items: [
      { id: 'creature', label: '두 번째 인물 · 생물(원작 생물 · 짐승 · 말) 없음 — 모티프는 옷으로만', type: 'count', kind: 'manual' }] },
    { id: 'casual-ref', name: '일상컷 — 첨부 그림 따름', items: [
      { id: 'casual-face', label: '첨부한 그림과 같은 얼굴 · 화풍(다시 그리지 않음)', type: 'face', kind: 'manual' },
      { id: 'casual-ref-rec', label: '기록에 첨부 그림 sha256(ref_sha256)', type: 'record', kind: 'manual' }] }
  ];

  var ERROR_TYPES = [
    { key: 'hand', label: '손' }, { key: 'arm', label: '팔 · 다리' }, { key: 'face', label: '얼굴' }, { key: 'composition', label: '구도' },
    { key: 'count', label: '인원 · 생물' }, { key: 'text', label: '글자' }, { key: 'style', label: '화풍' }, { key: 'record', label: '기록' }];
  var VERDICTS = [{ key: 'confirmed', label: '확인됨' }, { key: 'maybe_false', label: '오탐 가능' }, { key: 'needs_review', label: '검토 필요' }];
  var SCOPES = [
    { key: '', label: '정하지 않음' }, { key: 'none', label: '고칠 것 없음' }, { key: 'record', label: '기록만 고침' },
    { key: 'partial', label: '부분 보정(그 자리만)' }, { key: 'regen', label: '같은 지시문으로 다시' },
    { key: 'prompt', label: '지시문 고쳐 다시' }, { key: 'plan', label: '계획 바꿔 다시' }];
  var COMMIT = [{ key: 'none', label: '커밋 전' }, { key: 'local', label: '로컬 커밋' }, { key: 'pushed', label: '커밋 올림' }];
  var PUSH = [{ key: 'none', label: 'main 미반영' }, { key: 'pushed', label: 'main 반영 · 등록 대기' }, { key: 'registered', label: '등록 완료(썸네일 · 등록부)' }, { key: 'failed', label: '등록 실패' }];
  var STATUSES = [
    { key: 'candidate', label: '후보' }, { key: 'review', label: '검수 중' }, { key: 'pending', label: '승인 대기 · 잠금' },
    { key: 'approved', label: '승인' }, { key: 'done', label: '반영 끝' }, { key: 'hold', label: '보류' }];
  var PRIORITY = [{ key: 1, label: '긴급' }, { key: 2, label: '높음' }, { key: 3, label: '보통' }, { key: 4, label: '낮음' }];
  var ACTIVE = { candidate: 1, review: 1, pending: 1, approved: 1, hold: 1 };

  var BASE_SETS = ['frame', 'one-woman', 'limbs', 'face', 'frame-in'];
  function steps(list) { return list.map(function (s) { return typeof s === 'string' ? { label: s } : s; }); }
  var PROJECTS = [
    { key: 'pkm', name: '포켓몬 연구소', c: '#f4c542', repo: 'pkm-atelier', unit: '포켓몬',
      imgRepos: ['pkm-atelier-img', 'pkm-atelier-img-2', 'pkm-atelier-img-3', 'pkm-atelier-img-4'], upload: 'pkm-atelier-img-4', claims: false,
      /* 화풍 열쇠는 공방마다 그 공방 표(styleTable — pkm 은 lib/prompt-spec.js ART_STYLES 에서 뽑은 것, 내린 화풍도 옛 이름 읽기에 남는다)를 읽는다(useStyles). styles 는 표를 못 받을 때의 사본(2026-11-12) */
      styleTable: 'data/style.json',
      styles: ['cinematic_semi_real', 'game_keyart', 'glossy_kr_game', 'glossy_promo', 'mecha_cinematic_keyart', 'game_cgi', 'semi_real_paint', 'photoreal', 'anime_illust', 'cel_anime', 'painterly', 'retro_anime', 'ink_wash', 'bright_catalog', 'anime_gloss', 'gloss_daylight', 'anime_25d', 'anime_25d_gloss'],
      slots: ['light_overdrive', 'heavy_overdrive', 'mobility_overdrive', 'light', 'heavy', 'mobility'], webp: { q: 85, m: 6 },
      ruleSets: BASE_SETS.concat(['text-none', 'no-creature', 'casual-ref']),
      rules: [
        '한 포켓몬 = 폼 셋(경장 · 중장 · 고기동) + 폭주 셋 + 일상컷. 기준은 경장, 폭주는 그 폼 그림을 첨부해 같은 구도.',
        '화풍 열쇠는 그림마다 생성 기록대로(기본 anime_25d_gloss — 그 전 캐릭터는 시작한 화풍 그대로). 외형으로 화풍을 추정해 파일 이름에 넣지 않는다.',
        '지시문은 생성기 · 지시문 묶음(tools/prompt-pack.cjs)의 출력 그대로 — 세션이 고쳐 쓰지 않았는지 prompt-pack submitted 로 대조.',
        '원작 생물 · 두 번째 인물 · 글자 없음. 모티프는 판 · 언더슈트 · 머리 · 장신구로만.',
        '다시 그린 그림은 앞 그림의 sha256 을 records/<캐릭터>-<날짜>-*/replacement.json 에, 앞 판은 git 이력에 남긴다.'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 85 · method 6', '그림 저장소: pkm-atelier-img-4(새로 올리는 곳)', '일상컷은 경장 그림을 첨부(얼굴 · 화풍을 첨부에 맡기는 STYLE · FACE · 표정 줄)', '안전 필터: 같은 지시문 한 번 더 → 노출 한 단계씩 → 계획 한 번 바꿈 → 보고'],
      post: steps(['원본 PNG → WebP(품질 85 · method 6) — PNG 는 올리지 않는다', '기록 폴더 records/<캐릭터>-<날짜>-<종류>/ 에 지시문 · qa.json · classification.json', '교체면 replacement.json 에 앞 그림 sha256 · 날짜 · 까닭', 'pkm-atelier-img-4 main 에 커밋 하나로 올림(강제 push 없음)', '그림 등록 워크플로가 썸네일 · data/img.json 을 올렸는지 확인']) },
    { key: 'book', name: '책의 서재', c: '#e39b6b', repo: 'book-atelier', unit: '책',
      imgRepos: ['book-atelier-img'], claims: true, styleTable: 'data/style.json', styles: ['literary_fantasy'],
      slots: ['begin_open', 'middle_open', 'end_open', 'begin', 'middle', 'end'], webp: { q: 90, m: 6 },
      ruleSets: BASE_SETS.concat(['text-none']),
      rules: [
        '한 책 = 폼 셋(발단 · 전개 · 결말) + 개방 셋 + 일상컷 다섯. 처음 확정한 한 장이 정본 — 나머지는 그 그림을 첨부.',
        '화풍은 책마다 하나(literary_fantasy). 판(v1)은 파일 이름이 아니라 기록에.',
        '책은 손에 들지 않는다(입는 재료로만). 틀은 그리지 않는다 — 서가가 장정대로 둘러 준다.',
        '배경 속 흐릿한 사람은 괜찮다. 주인공을 다투는 사람 · 몸에 닿은 사람 · 같은 얼굴은 다시.',
        '단계마다 다른 표정(발단 호기심 · 전개 결의 · 결말).'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 90 · method 6', '잠금: tools/image-claim.cjs claim → done', '안전 필터: 다시 → 노출 낮춤 → 계획 한 번 바꿈'],
      post: steps(['WebP(품질 90 · method 6), 기록에 원본 sha256', '교체면 그림 저장소 records/replacement.json 에 앞 sha256 · 까닭', 'book-atelier-img main 에 커밋 하나', 'image-claim done <책> --execution <id>', '썸네일 · 등록부 갱신 확인']) },
    { key: 'game', name: '게임 오락실', c: '#ff6ad5', repo: 'game-atelier', unit: '게임',
      imgRepos: ['game-atelier-img'], claims: true, styleTable: 'data/style.json', styles: ['glossy_kr_game'],
      slots: ['title_open', 'middle_open', 'ending_open', 'title', 'middle', 'ending'], webp: { q: 90, m: 6 },
      ruleSets: BASE_SETS.concat(['text-none']),
      rules: [
        '게임 속 캐릭터를 그리지 않는다 — 게임이라는 작품을 사람으로 만든 원작 여성 한 명. 원작 캐릭터 얼굴 · 몸 · 로고 · 타이틀 글자 · HUD 는 다시.',
        '원작은 알아보게 — 설계표 signature(소품 · 장소 · 색 · 진영 문장)와 forms.<폼>.homage.',
        '처음 확정한 한 장이 정본. 나머지 폼 · 일상은 그 그림을, 개방은 그 폼 그림을 첨부.',
        '화풍은 glossy_kr_game 하나(폼 · 개방은 text, 일상컷은 casual 문장).',
        '이미 등록된 그림은 덮지 않는다 — 바꿔 달라고 한 그림만, 앞 sha256 은 replacement.json.'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 90 · method 6', '잠금: tools/image-claim.cjs', '안전 필터: 다시 → 노출 낮춤 → 계획 한 번 바꿈'],
      post: steps(['WebP(품질 90 · method 6), 기록에 원본 sha256', '교체면 replacement.json', 'game-atelier-img main 에 커밋 하나', 'image-claim done <게임> --execution <id>', '썸네일 · 등록부 갱신 확인']) },
    { key: 'element', name: '원소의 섬', c: '#5fd3e8', repo: 'element-atelier', unit: '카드',
      imgRepos: ['element-atelier-img'], claims: true, styleTable: 'data/style.json', styles: ['game_keyart', 'game_cgi', 'cinematic_keyart', 'jp_paint_anime'],
      slots: ['fantasy', 'steampunk', 'mecha'], worldSlots: true, webp: { q: 90, m: 6 },
      ruleSets: BASE_SETS.concat(['text-element', 'casual-ref']),
      rules: [
        '원소 · 물질 · 물건을 사람으로 만든 여성 한 명. 주민은 물건을 들지 않는다(모티브로만).',
        '그 원소의 기호와 원자 번호는 읽혀도 된다 — 그 밖의 글자 · 숫자 · 로고는 안 된다.',
        '세계(판타지 · 스팀펑크 · 메카)마다 다른 사람. 세계 그림은 기준 그림 없이 한 장씩.',
        '일상컷은 세계 그림을 첨부(세계마다 다섯 장). 세계 그림이 없으면 일상컷을 만들지 않는다.',
        '기본 화풍 jp_paint_anime(그 전 그림은 game_keyart 그대로). 화풍 판은 기록 styleVersion 에.'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 90 · method 6', '기록: records/<카드>/<세계>[-casualN].<화풍>-ui.json', '잠금: tools/image-claim.cjs claim · done', '교체: records/replacement.json + img/thumb/<파일> 지우기'],
      post: steps(['WebP(품질 90 · method 6), 기록 JSON(prompt · styleVersion · generation{png_sha256 · prompt_sha256 · ref_sha256} · qa · acceptance)', '교체면 records/replacement.json 에 {file · replaced · old_webp_sha256 · old_png_sha256 · old_date · why}, img/thumb/<파일> 지움', 'element-atelier-img main 에 커밋 하나', 'image-claim done <카드> --execution <id>', '썸네일 워크플로 성공 확인']) },
    { key: 'myth', name: '신화 무기 대장간', c: '#d9b45a', repo: 'myth-atelier', unit: '무기',
      imgRepos: ['myth-atelier-img'], claims: true, styleTable: 'data/style.json', styles: ['game_keyart', 'cinematic_semi_real', 'glossy_kr_game', 'game_cgi', 'semi_real_paint', 'glossy_promo', 'mecha_cinematic_keyart', 'photoreal', 'anime_illust', 'cel_anime', 'painterly', 'retro_anime', 'ink_wash', 'bright_catalog'],
      slots: [], webp: { q: 90, m: 6 },
      ruleSets: BASE_SETS.concat(['text-none', 'casual-ref']),
      rules: [
        '무기당 액션 한 장이 그 캐릭터. 각성 · 저주는 액션 그림을 첨부해 같은 구도.',
        '파일 이름의 카드는 card.json name, 공백은 밑줄. _f 는 반드시.',
        '글자 · 로고 · 테두리 없음(훈민정음 낱자 문양만 예외).',
        '스킨 열쇠는 card.json skins 에 먼저 적는다.'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 90', '잠금: tools/image-claim.cjs', '일상컷은 액션 그림 첨부(STYLE · FACE 줄)'],
      post: steps(['WebP(품질 90), 기록에 원본 sha256', '교체면 replacement.json', 'myth-atelier-img main 에 커밋 하나', 'image-claim done', '썸네일 · 등록부 갱신 확인']) },
    { key: 'sam', name: '삼국지 군막', c: '#c9a227', repo: 'sam-atelier', unit: '장수',
      /* 그림 저장소 둘(2026-11-12 — 첫 저장소가 약 1.0 GB 로 찼다): 0 번 sam-atelier-img 닫힘(교체만 · 잠금 파일은 그대로 여기), 1 번 sam-atelier-img-2 열림. 주소는 등록부 where 로 */
      imgRepos: ['sam-atelier-img', 'sam-atelier-img-2'], upload: 'sam-atelier-img-2', claims: true, styleTable: 'data/style.json', styles: ['kr_mmorpg', 'game_keyart', 'glossy_kr_game'],
      slots: ['samguk', 'fantasy', 'mecha'], worldSlots: true, webp: { q: 90, m: 6 },
      ruleSets: BASE_SETS.concat(['text-sam', 'no-creature', 'casual-ref']),
      rules: [
        '삼국지 장수 한 명을 사람으로 만든 여성 한 명. 게임 초상(images/)은 쓰지도 덮지도 않는다.',
        '세계 셋(삼국시대 · 중세 판타지 · 메카), 세계마다 다른 사람. 일상컷 세계마다 다섯 장 — 계획기로만 짠다.',
        '말 · 짐승 · 두 번째 인물 없음. 글자는 깃발 · 인장 한 글자만.',
        '일상컷은 무기를 들지 않는다(본뜬 작은 장신구로).',
        '기본 화풍 kr_mmorpg. 체형은 볼륨 · 굴곡이 있게.'],
      gen: ['세로 2:3 · 1024×1536', 'WebP 품질 90 · method 6', '그림 저장소: sam-atelier-img-2(새로 올리는 곳 — 교체는 그 파일이 있는 저장소)', '일상컷: images/edits + ref_sha256', '교체: records/replacement.json + 옛 썸네일 지우기'],
      post: steps(['WebP(품질 90 · method 6), 기록에 원본 sha256 · endpoint · ref_sha256', '교체면 records/replacement.json, 옛 썸네일 지움', 'sam-atelier-img-2 main 에 커밋 하나(교체는 그 파일이 있는 저장소)', 'image-claim done', '썸네일 · 등록부 갱신 확인']) }
  ];
  function project(key) { for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].key === key) return PROJECTS[i]; return null; }

  /* ── 파일 이름 → 카드 · 자리 ── <카드>[_<자리>]_<화풍>_f[_casualN|_extraN|_awaken|_cursed|_skin_<열쇠>[_awaken|_cursed]].webp */
  function parseFile(p, file) {
    var m = /^(.+)_f(?:_(casual\d+|extra\d+|awaken|cursed|skin_[a-z0-9]+(?:_awaken|_cursed)?))?\.webp$/.exec(file || '');
    if (!m) return null;
    var head = m[1], cut = m[2] || '', style = '', styles = (p.styles || []).slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < styles.length; i++) { var s = '_' + styles[i]; if (head.length > s.length && head.slice(-s.length) === s) { style = styles[i]; head = head.slice(0, -s.length); break; } }
    if (!style) return null;
    var slot = '', slots = (p.slots || []).slice().sort(function (a, b) { return b.length - a.length; });
    for (var j = 0; j < slots.length; j++) { var t = '_' + slots[j]; if (head.length > t.length && head.slice(-t.length) === t) { slot = slots[j]; head = head.slice(0, -t.length); break; } }
    var where = cut ? (slot ? slot + ' · ' + cut : cut) : (slot || '기본');
    return { card: head, slot: slot, cut: cut, style: style, place: where };
  }
  /* 공방 화풍 표 → 화풍 열쇠. 표 꼴 둘 — {styles: [{key, name, retired?}]}(pkm · myth) · {styles: {열쇠: {name, versions, retired?}}}(book · game · element · sam).
     내린(retired) 화풍도 옛 파일 이름을 읽으려 넣는다. 표가 비었거나 꼴이 다르면 그대로 둔다(사본) — 바꿨으면 true */
  function useStyles(p, table) {
    var st = table && table.styles, rows = Array.isArray(st) ? st.map(function (r) { return r && r.key; }) : st && typeof st === 'object' ? Object.keys(st) : [], keys = [];
    rows.forEach(function (k) { if (typeof k === 'string' && /^[a-z0-9_]+$/.test(k) && keys.indexOf(k) < 0) keys.push(k); });
    if (!p || !keys.length) return false;
    p.styles = keys;
    return true;
  }
  function slotKey(item) { return [item.project, item.card, item.place || item.slot || ''].join('|'); }

  /* 그림 주소 — 포켓몬 · 삼국지는 where(파일 → 저장소 번호, imgRepos 차례) */
  function imageURL(p, file, doc, thumb) {
    var n = (doc && doc.where && doc.where[file]) || 0, repo = p.imgRepos[n] || p.imgRepos[0];
    return 'https://polos0117.github.io/' + repo + '/img/' + (thumb ? 'thumb/' : '') + encodeURIComponent(file).replace(/'/g, '%27');
  }

  /* ── 최신 작업 후보 ── 등록부 added(파일 → 날짜)에서 가장 최근 날부터. 우선순위: 마지막 날 = 높음, 그 앞 이틀 = 보통, 나머지 낮음 */
  function candidates(p, doc, opt) {
    opt = opt || {};
    var added = (doc && doc.added) || {}, at = (doc && doc.added_at) || {}, out = [];
    Object.keys(added).forEach(function (f) { var info = parseFile(p, f); if (info) out.push({ file: f, date: added[f], at: at[f] || '', info: info }); });
    out.sort(function (a, b) { return (b.at || b.date) < (a.at || a.date) ? -1 : (b.at || b.date) > (a.at || a.date) ? 1 : (a.file < b.file ? -1 : 1); });
    var days = []; out.forEach(function (c) { if (days.indexOf(c.date) < 0) days.push(c.date); });
    out.forEach(function (c) { var d = days.indexOf(c.date); c.priority = d === 0 ? 2 : d <= 2 ? 3 : 4; });
    return out.slice(0, opt.limit || 60);
  }

  /* ── 검수 항목 ── 묶음 id 차례대로, 같은 항목 id 는 처음 것만(글자 규칙은 공방 묶음이 하나만 싣는다) */
  function ruleSet(id, custom) {
    var all = RULESETS.concat(custom || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function checklist(p, item, custom, extraSets) {
    var ids = (p.ruleSets || []).concat(extraSets || []), seen = {}, out = [], isCasual = item && /casual/.test(item.place || '');
    ids.forEach(function (id) {
      var s = ruleSet(id, custom); if (!s) return;
      if (id === 'casual-ref' && !isCasual) return;
      s.items.forEach(function (it) { if (seen[it.id]) return; seen[it.id] = 1; out.push({ id: it.id, label: it.label, type: it.type, kind: it.kind || 'manual', set: s.id, setName: s.name }); });
    });
    return out;
  }

  /* 파일로 판정 — meta {w, h, type, name} */
  function autoCheck(meta) {
    var r = {};
    if (!meta || !meta.w) return r;
    var ratio = meta.w / meta.h;
    r.ratio = Math.abs(ratio - 2 / 3) <= 0.005 ? 'pass' : 'fail';
    r.size = meta.w === 1024 && meta.h === 1536 ? 'pass' : 'fail';
    if (meta.type || meta.name) r.webp = (meta.type === 'image/webp' || /\.webp$/i.test(meta.name || '')) ? 'pass' : 'fail';
    return r;
  }

  /* ── 지시문 트리 ──
     마디(빈 줄로 나뉜 단락) → 머리말(KEY: 값, 「FACE — …:」, 「WORLD — FANTASY:」) 또는 번호 목록(1. 작화 스타일) 아래 글머리(* · -) →
     값은 「;」 · 「 — 」 로 갈래, 글머리 「이름: 값」 은 이름이 갈래. 노드: {id, label, text, kind, children, start, end} (start · end 는 원문 자리) */
  function parsePrompt(text) {
    text = String(text || '').replace(/\r\n?/g, '\n');
    var rootNode = { id: 'root', label: '지시문', text: text, kind: 'root', children: [], start: 0, end: text.length }, seq = 0;
    function node(label, t, kind, start) { return { id: 'n' + (++seq), label: label, text: t, kind: kind, children: [], start: start, end: start + t.length }; }
    function clauses(parent, value, offset) {
      var parts = [], re = /;\s+|\s—\s/g, last = 0, m;
      while ((m = re.exec(value))) { parts.push([last, m.index]); last = m.index + m[0].length; }
      parts.push([last, value.length]);
      if (parts.length < 2) return;
      parts.forEach(function (q) {
        var raw = value.slice(q[0], q[1]); var lead = raw.length - raw.replace(/^\s+/, '').length; var t = raw.trim(); if (!t) return;
        var c = node(t.length > 60 ? t.slice(0, 57) + '…' : t, t, 'clause', offset + q[0] + lead);
        var lm = /^([^:]{1,40}):\s+(.+)$/.exec(t); if (lm) c.label = lm[1];
        parent.children.push(c);
      });
    }
    /* 머리말: 대문자 낱말(FACE · WORLD — FANTASY · ELEMENT TRAITS of …) 뒤 첫 「:」 까지, 또는 짧은 「Use case:」 꼴 */
    var head = /^(?:([A-Z][A-Z0-9&'\/-]+(?: [A-Z][A-Z0-9&'\/-]+)*)([^:\n]{0,200}?)|([A-Z][a-z]+(?: [a-z]+){0,2})()):\s+/;
    var lines = text.split('\n'), pos = 0, cur = null, section = null, block = null;
    lines.forEach(function (line) {
      var start = pos; pos += line.length + 1;
      var t = line.trim();
      if (!t) { block = null; cur = null; return; }
      var num = /^(\d+)\.\s+(.+)$/.exec(t);
      if (num && t.length < 40) { section = node(num[1] + '. ' + num[2], t, 'section', start); rootNode.children.push(section); cur = null; block = null; return; }
      var bullet = /^(\s*)([*\-•·])\s+(.+)$/.exec(line);
      var parent = block || section || rootNode;
      if (bullet) {
        var b = bullet[3], bs = start + line.indexOf(bullet[3]);
        var bm = /^([^:]{1,40}):\s*(.*)$/.exec(b);
        var n = node(bm ? bm[1] : (b.length > 60 ? b.slice(0, 57) + '…' : b), b, 'item', bs);
        (section || rootNode).children.push(n); block = n; cur = n;
        if (bm && bm[2]) clauses(n, bm[2], bs + b.indexOf(bm[2]));
        return;
      }
      var hm = head.exec(t);
      if (hm) {
        var label = ((hm[1] || hm[3] || '') + (hm[2] || '')).trim(), lead = line.indexOf(t);
        if (label.length > 48) label = label.slice(0, 46) + '…';
        var n2 = node(label, t, 'key', start + lead);
        (section || rootNode).children.push(n2); cur = n2; block = null;
        var v = t.slice(hm[0].length); if (v) clauses(n2, v, start + lead + hm[0].length);
        return;
      }
      var sub = /^(0\d)\s+(.+)$/.exec(t);
      if (sub) { var s2 = node(sub[1] + ' ' + sub[2], t, 'sub', start); (section || rootNode).children.push(s2); block = s2; cur = s2; return; }
      if (cur && cur.kind !== 'section') { cur.text += '\n' + t; cur.end = start + line.length; var lm2 = /^([^:]{1,40}):\s+(.+)$/.exec(t); var c3 = node(lm2 ? lm2[1] : (t.length > 60 ? t.slice(0, 57) + '…' : t), t, 'line', start + line.indexOf(t)); cur.children.push(c3); if (lm2) clauses(c3, lm2[2], start + line.indexOf(lm2[2])); return; }
      var p2 = node(t.length > 60 ? t.slice(0, 57) + '…' : t, t, 'para', start + line.indexOf(t));
      parent.children.push(p2); cur = p2; block = null;
      clauses(p2, t, start + line.indexOf(t));
    });
    return rootNode;
  }
  function flatten(n, depth, out) { out = out || []; depth = depth || 0; if (n.kind !== 'root') out.push({ node: n, depth: depth }); n.children.forEach(function (c) { flatten(c, depth + (n.kind === 'root' ? 0 : 1), out); }); return out; }
  function findNode(n, id) { if (n.id === id) return n; for (var i = 0; i < n.children.length; i++) { var f = findNode(n.children[i], id); if (f) return f; } return null; }
  function pathOf(rootN, id) { var out = []; (function walk(n, trail) { if (n.id === id) { out = trail.concat(n); return true; } return n.children.some(function (c) { return walk(c, n.kind === 'root' ? trail : trail.concat(n)); }); })(rootN, []); return out.map(function (n) { return n.label; }); }

  /* ── 명령문 ── reqs: [{path:[…], quote, action, text, why}] */
  var ACTIONS = [
    { key: 'replace', label: '바꾸기' }, { key: 'remove', label: '빼기' }, { key: 'add', label: '뒤에 더하기' },
    { key: 'weaken', label: '약하게' }, { key: 'strengthen', label: '강하게' }, { key: 'keep', label: '그대로 지키기' }];
  function short(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function composeCommand(ctx, reqs) {
    ctx = ctx || {}; reqs = reqs || [];
    var p = project(ctx.project) || { name: ctx.project || '' };
    var lines = [];
    lines.push('[' + (p.name || '') + '] ' + (ctx.card || '') + (ctx.place ? ' · ' + ctx.place : '') + ' — 지시문 수정 요청');
    if (ctx.file) lines.push('대상 그림: ' + ctx.file + (ctx.sha256 ? ' (sha256 ' + ctx.sha256.slice(0, 12) + '…)' : ''));
    lines.push('');
    reqs.forEach(function (r, i) {
      var where = (r.path || []).join(' › '), q = r.quote ? '「' + short(r.quote, 120) + '」' : '';
      var t = r.text ? '「' + short(r.text, 200) + '」' : '';
      var body = r.action === 'replace' ? q + ' 을(를) ' + t + ' 로 바꿔줘'
        : r.action === 'remove' ? q + ' 을(를) 빼줘'
        : r.action === 'add' ? q + ' 뒤에 ' + t + ' 를 더해줘'
        : r.action === 'weaken' ? q + ' 을(를) 한 단계 약하게 써줘' + (t ? ' — 예: ' + t : '')
        : r.action === 'strengthen' ? q + ' 을(를) 더 분명하게 써줘' + (t ? ' — 예: ' + t : '')
        : q + ' 은(는) 바꾸지 말아줘';
      lines.push((i + 1) + '. [' + where + '] ' + body + (r.why ? ' (까닭: ' + short(r.why, 160) + ')' : ''));
    });
    if (reqs.length) {
      lines.push('');
      lines.push('지킬 것: 위 줄 말고는 지시문을 그대로 두고, 생성기 · 지시문 묶음의 칸(덧붙임 · 추가 연출)으로 고칠 수 있으면 그 칸에서 고쳐줘. 고친 지시문을 먼저 보여 주고, 그림은 내가 본 뒤에 다시 그려줘.');
      if (ctx.errors && ctx.errors.length) lines.push('검수에서 나온 것: ' + ctx.errors.map(function (e) { return e.label + '(' + e.verdict + ')' + (e.note ? ' ' + short(e.note, 60) : ''); }).join(' · '));
    }
    return lines.join('\n');
  }

  /* ── 상태 옮기기 ── 잠금: 검수 중부터 잠근 사람만 고친다. 승인 대기 = 승인 전 잠금(검수 칸 읽기만). 승인 조건 = 손으로 볼 항목이 다 판정, 확인된 오류는 수정 범위가 정해짐 */
  var MOVES = { candidate: ['review', 'hold'], review: ['pending', 'candidate', 'hold'], pending: ['approved', 'review'], approved: ['done', 'review'], done: ['review'], hold: ['candidate', 'review'] };
  function lockedFor(item, me) { return !!(item.lock && item.lock.by && item.lock.by !== me); }
  function readOnly(item, me) { return lockedFor(item, me) || item.status === 'pending' || item.status === 'approved' || item.status === 'done'; }
  function approveProblems(item, list) {
    var out = [], checks = item.checks || {};
    (list || []).forEach(function (c) { if (!checks[c.id]) out.push('판정 안 함: ' + c.label); });
    (item.errors || []).forEach(function (e) {
      if (e.verdict === 'needs_review') out.push('검토 필요 오류가 남음: ' + e.type);
      if (e.verdict === 'confirmed' && (!item.scope || item.scope === 'none')) out.push('확인된 오류(' + e.type + ')의 수정 범위가 없음');
    });
    if ((list || []).some(function (c) { return checks[c.id] === 'fail'; }) && (!item.scope || item.scope === 'none')) out.push('어긋난 항목이 있는데 수정 범위가 없음');
    if (item.replacement && item.replacement.on && !(item.replacement.reason || '').trim()) out.push('교체 사유가 비었음');
    if (item.replacement && item.replacement.on && !/^[0-9a-f]{64}$/.test(item.replacement.oldSha || '')) out.push('교체 — 앞 그림 sha256 이 없음');
    return out;
  }
  function transition(item, to, me, list, now) {
    now = now || new Date().toISOString();
    if (!me) return { ok: false, why: '검수자 이름을 먼저 적어줘' };
    if ((MOVES[item.status] || []).indexOf(to) < 0) return { ok: false, why: item.status + ' 에서 ' + to + ' 로는 못 간다' };
    if (lockedFor(item, me)) return { ok: false, why: item.lock.by + ' 가 잠근 작업이다' };
    if (to === 'pending' || to === 'approved') { var pr = approveProblems(item, list); if (pr.length) return { ok: false, why: pr.join('\n') }; }
    if (to === 'approved' && item.lock && item.lock.by === me && item.reviewer === me && item.requireSecond) return { ok: false, why: '승인은 검수한 사람과 다른 사람이' };
    var next = JSON.parse(JSON.stringify(item));
    next.status = to; next.updated = now;
    if (to === 'review') next.lock = { by: me, at: now };
    if (to === 'candidate' || to === 'hold') next.lock = null;
    if (to === 'pending') next.reviewer = me;
    if (to === 'approved') { next.approvedBy = me; next.approvedAt = now; }
    (next.history = next.history || []).push({ at: now, by: me, what: item.status + ' → ' + to });
    return { ok: true, item: next };
  }

  /* ── 중복 ── 같은 공방 · 카드 · 자리로 진행 중인 작업, 같은 sha256(원본 · 보정) */
  function duplicates(items, cand) {
    var key = slotKey(cand), out = [];
    (items || []).forEach(function (it) {
      if (it.id === cand.id) return;
      if (ACTIVE[it.status] && slotKey(it) === key) out.push({ item: it, why: '같은 자리로 진행 중(' + it.status + ')' });
      var shas = [it.original && it.original.sha256, it.revised && it.revised.sha256].filter(Boolean);
      [cand.original && cand.original.sha256, cand.revised && cand.revised.sha256].filter(Boolean).forEach(function (s) { if (shas.indexOf(s) >= 0) out.push({ item: it, why: '같은 그림(sha256 ' + s.slice(0, 10) + '…)' }); });
    });
    return out;
  }
  /* 잠금 파일(image-claim) — 마지막 run 이 working · blocked 면 다른 세션이 잡은 것 */
  function claimState(doc) {
    var runs = (doc && doc.runs) || []; var last = runs[runs.length - 1];
    if (!last) return null;
    return { status: last.status, execution: last.execution, at: last.claimed_at || '', busy: last.status === 'working' || last.status === 'blocked', missing: last.missing || [] };
  }

  /* ── 승인 뒤 할 일 ── 공방 차례 + 작업에 따라(교체 · 다시 그림) */
  function postSteps(p, item) {
    var out = [];
    if (item.scope === 'prompt' || item.scope === 'regen' || item.scope === 'plan' || item.scope === 'partial') {
      var sc = ''; SCOPES.forEach(function (s) { if (s.key === item.scope) sc = s.label; });
      out.push({ id: 'redo', label: '수정 범위대로 다시 만들기(' + sc + ') — 결과를 보여 주고 「올릴까?」 묻기' });
    }
    p.post.forEach(function (s, i) { out.push({ id: 'p' + i, label: s.label }); });
    if (item.replacement && item.replacement.on) out.push({ id: 'repl', label: '교체 기록 확인 — 앞 ' + short(item.replacement.oldSha, 14) + ' → 새 ' + short(item.replacement.newSha || '(올릴 그림)', 14) + ' · 까닭' });
    out.push({ id: 'ledger', label: '이 장부에 커밋 SHA · main 반영 상태를 적고 「반영 끝」으로' });
    return out;
  }

  /* ── 찾기 · 거르기 · 줄 세우기 ── */
  function matches(it, f) {
    f = f || {};
    if (f.project && it.project !== f.project) return false;
    if (f.status && it.status !== f.status) return false;
    if (f.priority && String(it.priority) !== String(f.priority)) return false;
    if (f.error && !(it.errors || []).some(function (e) { return e.type === f.error; })) return false;
    if (f.verdict && !(it.errors || []).some(function (e) { return e.verdict === f.verdict; })) return false;
    if (f.q) { var q = f.q.toLowerCase(), hay = [it.card, it.place, it.file, it.note, it.lock && it.lock.by, it.reviewer].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  }
  function sortItems(items, by) {
    var a = items.slice();
    var key = { priority: function (x) { return [x.priority || 9, x.updated || '']; }, updated: function (x) { return [x.updated || '']; }, date: function (x) { return [x.date || '']; }, name: function (x) { return [x.card || '']; }, regen: function (x) { return [-(x.regen || 0)]; } }[by] || function (x) { return [x.priority || 9]; };
    var desc = by === 'updated' || by === 'date';
    a.sort(function (x, y) { var p = key(x), q = key(y); for (var i = 0; i < p.length; i++) { if (p[i] < q[i]) return desc ? 1 : -1; if (p[i] > q[i]) return desc ? -1 : 1; } return (x.card || '') < (y.card || '') ? -1 : 1; });
    return a;
  }

  function newItem(fields, now) {
    now = now || new Date().toISOString();
    var it = { id: 'r' + now.replace(/\D/g, '').slice(0, 14) + Math.random().toString(36).slice(2, 6), status: 'candidate', priority: 3, lock: null,
      checks: {}, errors: [], scope: '', regen: 0, commit: { state: 'none', sha: '' }, push: { state: 'none' },
      replacement: { on: false, oldSha: '', newSha: '', reason: '' }, prompt: '', requests: [], steps: {}, history: [{ at: now, what: '만듦' }], created: now, updated: now };
    Object.keys(fields || {}).forEach(function (k) { it[k] = fields[k]; });
    return it;
  }
  /* 장부 합치기 — 같은 id 는 updated 가 늦은 쪽 */
  function mergeLedger(a, b) {
    var m = {}; (a || []).concat(b || []).forEach(function (it) { if (!it || !it.id) return; if (!m[it.id] || (it.updated || '') > (m[it.id].updated || '')) m[it.id] = it; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }

  var API = { RULESETS: RULESETS, ERROR_TYPES: ERROR_TYPES, VERDICTS: VERDICTS, SCOPES: SCOPES, COMMIT: COMMIT, PUSH: PUSH, STATUSES: STATUSES, PRIORITY: PRIORITY, ACTIONS: ACTIONS, PROJECTS: PROJECTS,
    project: project, parseFile: parseFile, useStyles: useStyles, slotKey: slotKey, imageURL: imageURL, candidates: candidates, ruleSet: ruleSet, checklist: checklist, autoCheck: autoCheck,
    parsePrompt: parsePrompt, flatten: flatten, findNode: findNode, pathOf: pathOf, composeCommand: composeCommand,
    lockedFor: lockedFor, readOnly: readOnly, approveProblems: approveProblems, transition: transition, duplicates: duplicates, claimState: claimState,
    postSteps: postSteps, matches: matches, sortItems: sortItems, newItem: newItem, mergeLedger: mergeLedger };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.AtelierReview = API;
})(this);
