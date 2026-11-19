// Little Light "연작" 탭 — 장면(1인·2인·5인)과 연작 테마(하루 일과·사계절·감정 모음…)를 고르면
// 같은 캐릭터·복장·연출로 테마의 장면마다 한 장씩 자동 생성. 여러 장면을 고르면 1인 → 2인 (→ 5인) 순서로 이어서,
// 장면(워크플로)이 바뀔 때는 앞 장면이 다 끝난 뒤 다음 워크플로로 전환. 중단하거나 앱을 껐다 켜도 "이어서 생성".
(() => {
  const T = window.BC_TAGS;
  if (!T) return;
  const { G, NEG, KEY, BLK, rm } = T;
  const $s = (s, r = document) => r.querySelector(s);
  const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const st = { get(k, d) { try { const v = localStorage.getItem("ser_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem("ser_" + k, JSON.stringify(v)); } catch {} } };
  const koName = (n) => (window.BC_KO_LOOKUP && window.BC_KO_LOOKUP(n)) || n;
  const norm = (t) => t.trim().replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").toLowerCase();

  // ---------- 연작 테마 (scene = 장소·시간을 테마가 정함 → "배경"은 이 테마엔 안 붙임) ----------
  const THEME_SRC = `하루 일과|scene
아침 기상|morning, waking up, bed, bedroom, sunlight, stretching, sleepy, half-closed eyes
아침 식사|morning, eating, breakfast, table, toast, cup, smile, indoors
외출 준비|morning, mirror, reflection, bedroom, adjusting hair, smile
거리 산책|walking, street, city, day, sunlight, light smile
카페에서|cafe, sitting, cup, coffee, window, day, relaxing
노을 바라보기|sunset, orange sky, looking afar, wind, floating hair, outdoors
저녁 식사|night, eating, restaurant, food, table, smile, indoors
밤 독서|night, bedroom, reading, book, lamp, indoors, relaxing
#사계절|scene
봄|spring (season), cherry blossoms, falling petals, outdoors, smile, day
여름|summer, blue sky, cumulonimbus cloud, sunlight, beach, ocean, smile
가을|autumn, autumn leaves, maple leaf, outdoors, tree, light smile
겨울|winter, snow, snowing, breath, outdoors, smile
#시간대|scene
새벽|dawn, morning, sky, outdoors, fog
아침|morning, sunlight, light rays, outdoors, day
한낮|day, blue sky, cloud, sunlight, outdoors
노을|sunset, orange sky, sunlight, outdoors, backlighting
황혼|twilight, evening, gradient sky, outdoors
밤|night, night sky, starry sky, moonlight, outdoors
#날씨|scene
맑음|blue sky, cloud, sunlight, day, outdoors, smile
흐림|cloudy sky, overcast, outdoors, day
비|rain, wet, umbrella, puddle, outdoors
눈|snow, snowing, winter, breath, outdoors
안개|fog, outdoors, morning
무지개|rainbow, blue sky, after rain, puddle, outdoors, smile
#감정 모음|
웃음|smile, :d, happy, open mouth
수줍음|blush, shy, embarrassed, looking to the side
놀람|surprised, wide-eyed, open mouth
화남|angry, frown, v-shaped eyebrows
슬픔|sad, tears, crying
결의|serious, determined, closed mouth
졸림|sleepy, half-closed eyes, yawning
장난|smirk, one eye closed, tongue out
평온|light smile, closed eyes, relaxing
감동|tearing up, smile, happy tears
#카메라 앵글|
정면 초상|upper body, portrait, straight-on, looking at viewer
옆모습|from side, profile, upper body
뒤돌아봄|from behind, looking back, cowboy shot
위에서|from above, full body, looking up
아래에서|from below, cowboy shot, looking down
전신|full body, standing, looking at viewer
클로즈업|close-up, portrait, looking at viewer
더치 앵글|dutch angle, cowboy shot, dynamic pose
#액션|
준비 자세|fighting stance, serious, cowboy shot
달려 나감|running, dynamic pose, motion lines, floating hair
도약|jumping, midair, dynamic pose, full body
공격|attack, fighting, dynamic pose, motion lines, foreshortening
회전|spinning, motion blur, floating hair, dynamic pose
착지|squatting, kneeling, dynamic pose, dust
승리 포즈|v, smile, confident, looking at viewer
휴식|sitting, relaxing, light smile, sweat`;
  const THEMES = THEME_SRC.split("\n#").map((b, ti) => {
    const [h, ...r] = b.split("\n"); const [t, f] = h.split("|");
    return { ti, t, scene: f === "scene", steps: r.filter(Boolean).map((l) => { const [n, s] = l.split("|"); return { n, tags: s.split(", ") }; }) };
  });
  // 연출·효과 칸: 태그 선택기의 여러 개 고르는 그룹 + 내 태그(효과·연출) 그룹 — 모든 장에 공통으로 붙음
  const FX_GROUPS = ["감정", "동작·움직임", "머리 장식", "구도·카메라", "조명", "화풍·분위기", "작가 화풍", "푸른 밤", "이펙트", "계절·날씨", "소품"];
  const SOLO_NEG = ["1boy", "multiple boys", "2girls", "multiple girls", "male", "2people", "3people"];
  const SAFE_NEG = ["nsfw", "nude"];

  // ---------- 고르기 칸: 누르면 펼쳐지는 사각 타일 + 체크 ----------
  function mtRender(box, cfg) {
    if (!box) return;
    const groups = cfg.groups(), all = groups.flatMap((g) => g.items);
    const cur = cfg.get().filter((v) => all.some((i) => i.v === v));
    const sel = new Set(cur), open = !!(box.querySelector("details.mt") || {}).open;
    const names = cur.map((v) => all.find((i) => i.v === v).n);
    box.innerHTML = `<details class="mt"${open ? " open" : ""}><summary><span class="mt-l">${escH(cfg.label)}</span><span class="mt-s${cur.length ? " has" : ""}" title="${escH(names.join(", "))}">${cur.length ? `<b>${cur.length}</b> ${escH(names.join(", "))}` : escH(cfg.empty)}</span>${cur.length ? '<button type="button" class="mt-x">지우기</button>' : ""}<span class="mt-a">▾</span></summary>`
      + `<div class="mt-b">${groups.map((g) => `${g.t ? `<h5>${escH(g.t)}</h5>` : ""}<div class="mt-g">${g.items.map((i) => `<button type="button" class="mt-t${sel.has(i.v) ? " on" : ""}" data-v="${escH(i.v)}"><i></i><span>${escH(i.n)}</span></button>`).join("")}</div>`).join("")}</div></details>`;
    box.onclick = (e) => {
      const x = e.target.closest(".mt-x");
      if (x) { e.preventDefault(); cfg.set([]); mtRender(box, cfg); return; }
      const t = e.target.closest(".mt-t"); if (!t) return;
      const v = t.dataset.v, now = cfg.get().filter((y) => all.some((i) => i.v === y));
      cfg.set(now.includes(v) ? now.filter((y) => y !== v) : [...now, v]);
      mtRender(box, cfg);
    };
  }
  const keyOf = (g, it) => `${g.t}::${it.n}`;
  const findItem = (key, pred) => { for (const g of G) if (pred(g)) for (const it of g.it) if (keyOf(g, it) === key) return { g, it }; return null; };
  const pickedItems = (keys, pred) => keys.map((k) => findItem(k, pred)).filter(Boolean);
  const isOutfitGroup = (g) => g.m === "o" || (g.c && g.kind === "outfit");
  const isSetItem = (g, it) => !g.c || !it.part || it.part === "full" || it.part === "etc";
  const isBgGroup = (g) => g.t === "배경" || (g.c && g.kind === "bg");
  const PART_SLOTS = [["top", "상의"], ["bottom", "하의"], ["under", "속옷"], ["leg", "스타킹·신발"], ["acc", "소품"]];
  const outfitGroups = () => G.filter(isOutfitGroup).filter((g) => g.it.some((it) => isSetItem(g, it))).map((g) => ({ t: g.c ? g.t : g.t.replace(/ 복장$/, ""), items: g.it.filter((it) => isSetItem(g, it)).map((it) => ({ v: keyOf(g, it), n: koName(it.n) })) }));
  const bgGroups = () => G.filter(isBgGroup).map((g) => ({ t: g.t, items: g.it.map((it) => ({ v: keyOf(g, it), n: koName(it.n) })) }));
  const partGroups = (part) => G.filter((g) => g.c && g.kind === "outfit" && g.it.some((it) => it.part === part)).map((g) => ({ t: g.t, items: g.it.filter((it) => it.part === part).map((it) => ({ v: keyOf(g, it), n: koName(it.n) })) }));
  const fxGroups = () => G.filter((g) => FX_GROUPS.includes(g.t) || (g.c && g.kind === "fx"));

  // ---------- 탭 + 화면 ----------
  const genBtn = $s('#tabs button[data-tab="gen"]');
  const tabBtn = document.createElement("button");
  tabBtn.dataset.tab = "seq"; tabBtn.textContent = "연작";
  genBtn.after(tabBtn);
  tabBtn.addEventListener("click", () => showTab("seq"));
  const sec = document.createElement("section");
  sec.id = "tab-seq"; sec.className = "tab";
  sec.innerHTML = `
<div class="seq-layout">
  <div class="card">
    <div class="card-head"><h3>1. 장면</h3><span class="muted" id="serPoseName">하나를 고르세요</span></div>
    <div class="seq-multi"><label class="check"><input type="checkbox" id="serMulti"> 여러 장면 한 번에</label><div class="muted small seq-mhint">"인원"에 보이는 장면 전부를 같은 캐릭터·복장·연출로 1인 → 2인 순서로 생성 · 빼고 싶은 장면은 눌러서 끔</div><label class="check" id="serWith5Box"><input type="checkbox" id="serWith5"> 5인 포함</label><button type="button" class="mini" id="serAllPose">전부 선택</button><button type="button" class="mini" id="serClearPose">비우기</button></div>
    <div id="serPoses"></div>
  </div>
  <div class="card seq-opts">
    <div class="card-head"><h3>2. 설정</h3><button class="mini" type="button" id="serReset">선택 초기화</button></div>
    <div class="field"><label>인원</label><div class="seq-seg" id="serPeople"><button type="button" data-v="all">전체</button><button type="button" data-v="1">혼자</button><button type="button" data-v="2">2인</button><button type="button" data-v="5">5인</button></div></div>
    <div class="field"><label>캐릭터 <small class="muted">(고르면 아래 "캐릭터 프롬프트"가 채워짐)</small></label><select id="serChar"></select></div>
    <div class="field"><label>복장 · 배경 <small class="muted">(눌러서 펼치고 여러 개 체크 — 복장을 고르면 캐릭터의 원래 옷 대신 들어감, 배경은 장소·시간이 정해진 테마엔 안 붙음)</small></label><div class="mt-stack"><div id="serOutfitBox"></div><div id="serBgBox"></div></div></div>
    <div class="field" id="serPartsBox"></div>
    <div class="field"><label>모자 처리</label><div id="serHatSlot"></div></div>
    <label class="check"><input type="checkbox" id="serSameSeed" checked> 모든 장 같은 시드 (캐릭터·구도 일관성)</label>
    <label class="check"><input type="checkbox" id="serAuto" checked> 인원수에 맞는 워크플로 · 크기 자동</label>
    <label class="check"><input type="checkbox" id="serKey" checked> 핵심 태그 가중치 사용</label>
    <div class="field"><label>가중치 <small class="muted">(1.0 = 없음 · 1.5 넘으면 그림이 깨질 수 있음)</small></label><div class="seq-wts" id="serWts"></div></div>
    <div class="gen-buttons"><button id="serRun" class="primary big">연작 생성 <small>테마의 장면마다 1장씩</small></button><button id="serPreview">미리보기</button><button id="serStop" class="danger-ghost">중단</button></div>
    <div class="muted" id="serInfo"></div>
  </div>
</div>
<div class="card">
  <div class="card-head"><h3>3. 연작 테마 <small class="muted">(여러 개 고를 수 있음 — 고른 테마의 장면이 모두 만들어짐)</small></h3><span class="muted small" id="serCount"></span></div>
  <div class="seq-grid ser-themes" id="serThemes"></div>
  <div class="ser-steps" id="serSteps"></div>
</div>
<div class="card seq-char">
  <div class="card-head"><h3>캐릭터 프롬프트 <small class="muted">(연작 전용 · 고정 — 장면·테마·복장·연출은 위에서 고른 대로 장마다 붙음)</small></h3></div>
  <div class="grid2">
    <div class="field"><label>긍정 (캐릭터)</label><textarea id="serPos" spellcheck="false" placeholder="예: 1girl, adult, long black hair, red eyes …"></textarea><div class="chips" id="serPosChips"></div></div>
    <div class="field"><label>부정</label><textarea id="serNeg" class="short" spellcheck="false" placeholder="비워 두면 기본 부정 프롬프트 사용"></textarea><div class="chips" id="serNegChips"></div></div>
  </div>
</div>
<div class="card">
  <div class="card-head"><h3>화풍 <small class="muted">(작가 · 파스텔 홀로그램 · 푸른 밤 — 여러 개 고를 수 있음, 모든 장에 적용 · 견본은 가운데 휠 클릭으로 크게)</small></h3></div>
  <div id="serStyle"></div>
</div>
<div class="card">
  <div class="card-head"><h3>4. 연출 · 효과 <small class="muted">(선택 — 모든 장에 공통으로 붙음)</small></h3><div class="head-tools"><button class="mini primary-ghost" id="serFxEdit">+ 내 태그</button><button class="mini" id="serFxClear">모두 끄기</button></div></div>
  <div class="grid2 seq-my" id="serFx"></div>
</div>
<div class="card">
  <div class="card-head"><h3>5. 결과 <span class="seq-prog" id="serProg"></span></h3><span class="muted" id="serSeed"></span></div>
  <div class="seq-resume hidden" id="serResume"><span></span><button type="button" class="primary" id="serResumeGo">이어서 생성</button><button type="button" class="mini" id="serResumeDrop">버리기</button></div>
  <div id="serSlots"></div>
</div>`;
  $s("#tab-gen").after(sec);
  if (window.BC_HAT) $s("#serHatSlot").append(window.BC_HAT.makeSelect()); else $s("#serHatSlot").closest(".field").remove();

  const css = document.createElement("style");
  css.textContent = `
.seq-char textarea{min-height:90px}
.seq-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,1.25fr);gap:14px;align-items:start}
@media (max-width:980px){.seq-layout{grid-template-columns:1fr}}
#serPoses h4{margin:12px 0 6px;font-size:12px;color:var(--muted);font-weight:600}
#serPoses h4:first-child{margin-top:0}
.seq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.seq-tile{min-height:54px;border-radius:12px;color:var(--text);font-size:13px;line-height:1.3;word-break:keep-all}
.seq-tile.on{background:var(--accent)!important;color:#fff!important;font-weight:600}
.seq-tile small{display:block;font-size:10.5px;font-weight:400;opacity:.75}
.seq-tile .ord{display:inline-block;min-width:18px;margin-right:4px;border-radius:999px;background:rgba(255,255,255,.25);font-size:11px}
.seq-pg.hidden,.seq-pg.off5{display:none}
.seq-multi{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.seq-multi .check{margin:0}
.seq-multi>.check:first-child,.seq-mhint{flex:1 1 100%}
.seq-mhint{margin:-4px 0 2px;font-size:11.5px}
.seq-multi button{flex:none}
.seq-seg{display:inline-flex;background:var(--fill,var(--panel2));border-radius:10px;padding:2px;gap:2px}
.seq-seg button{background:transparent;color:var(--text);border-radius:8px;padding:6px 18px;font-size:13px;font-weight:500;border:0}
.seq-seg button.on{background:var(--seg-on,var(--accent));color:var(--text);font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.12)}
#serStop,#serPreview{flex:none;white-space:nowrap}
.ser-steps{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.ser-steps:empty{display:none}
.ser-steps .r{font-size:12.5px;color:var(--muted)}
.ser-steps .r b{color:var(--text);margin-right:6px}
.seq-wts{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
.seq-wts label{display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:var(--muted);margin:0}
.seq-wts select{padding:4px 22px 4px 8px;font-size:12.5px}
.mt-stack{display:flex;flex-direction:column;gap:6px}
.seq-my{gap:6px}
.mt{border-radius:12px;background:var(--panel2)}
.mt summary{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;list-style:none;font-size:13px;min-height:40px}
.mt summary::-webkit-details-marker{display:none}
.mt-l{font-weight:600;flex:none;color:var(--text)}
.mt-s{flex:1;min-width:0;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mt-s.has{color:var(--text)}
.mt-s b{display:inline-block;min-width:18px;padding:0 5px;margin-right:4px;border-radius:999px;background:var(--accent);color:#fff;font-size:11px;text-align:center}
.mt-x{flex:none;padding:3px 10px;font-size:11.5px;border-radius:999px}
.mt-a{flex:none;color:var(--muted);transition:transform .2s}
.mt[open] .mt-a{transform:rotate(180deg)}
.mt-b{padding:2px 10px 10px;max-height:520px;overflow:auto}
.mt-b h5{margin:8px 0 5px;font-size:11.5px;color:var(--muted);font-weight:600}
.mt-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px}
.mt-t{display:flex;align-items:center;gap:7px;min-height:42px;padding:6px 9px;border-radius:10px;background:var(--panel);color:var(--text);font-size:12.5px;line-height:1.25;text-align:left;word-break:keep-all}
.mt-t i{flex:none;width:17px;height:17px;border-radius:5px;box-shadow:inset 0 0 0 1.6px var(--muted);display:grid;place-items:center;font-style:normal}
.mt-t.on{box-shadow:inset 0 0 0 1.6px var(--accent);font-weight:600}
.mt-t.on i{background:var(--accent);box-shadow:none}
.mt-t.on i::after{content:"✓";color:#fff;font-size:12px;line-height:1}
.seq-resume{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,var(--panel2))}
.seq-resume.hidden{display:none}
.seq-resume span{flex:1;min-width:180px;font-size:13px;font-weight:600}
.seq-prog{margin-left:8px;font-size:13px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}
.seq-prog small{font-weight:500;color:var(--muted);margin-left:4px}
.seq-grp{margin-bottom:16px}
.seq-gh{font-size:13.5px;font-weight:700;margin:0 0 8px}
.seq-gh small{font-weight:400;color:var(--muted);margin-left:6px}
#serStyle h4{margin:10px 0 6px;font-size:13px;color:var(--muted)}#serStyle h4:first-child{margin-top:0}
.sty-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px;max-height:560px;overflow:auto;padding:2px}
.sty-t{display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:4px;font-size:11px;line-height:1.25;text-align:left;border-radius:10px}
.sty-t img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:7px;display:block}
.sty-t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sty-t.on{box-shadow:0 0 0 2px var(--accent);border-color:var(--accent);color:var(--accent);font-weight:700}
.seq-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.seq-slot{background:var(--panel2);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.seq-slot .hd{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px 10px;font-size:13px;font-weight:600}
.seq-slot .hd span{font-weight:500;font-size:12px;color:var(--muted);flex:none}
.seq-slot .hd .re{display:none;flex:none;margin-left:6px;padding:2px 8px;font-size:13px;line-height:1.2;border-radius:8px}
.seq-slot.done .hd .re,.seq-slot.err .hd .re{display:inline-block}
.seq-slot .im{position:relative;aspect-ratio:var(--ar,2/3);background:var(--bg);display:grid;place-items:center;color:var(--muted);font-size:12px}
.seq-slot .im img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in}
.seq-slot .bar{position:absolute;left:0;bottom:0;height:3px;background:var(--accent);width:0;transition:width .3s}
.seq-slot.done .hd span{color:var(--ok)}.seq-slot.err .hd span{color:var(--danger)}.seq-slot.run .hd span{color:var(--accent)}
.seq-slot details{padding:6px 10px 10px;font-size:11.5px;color:var(--muted)}
.seq-slot details>div{margin-top:4px;max-height:220px;overflow:auto}
.sq-cs{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px}
.sq-c{background:var(--panel);border-radius:999px;padding:2px 8px;font-size:11.5px;color:var(--text)}
.sq-c.en{color:var(--muted)}
.sq-c small{color:var(--accent);margin-left:2px}
.sq-raw summary{cursor:pointer;font-size:11px}
.sq-raw div{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Consolas,monospace;font-size:11px;margin-top:4px}`;
  document.head.append(css);

  // ---------- 1. 장면 (1인·2인·5인) ----------
  const poseGroups = G.map((g, gi) => ({ ...g, gi })).filter((g) => g.m === "p");
  const headOf = (t) => (/^1인/.test(t) ? "1" : /^2인/.test(t) ? "2" : /^5인/.test(t) ? "5" : "all");
  const HEAD_ORDER = { 1: 0, 2: 1, 5: 2, all: 3 };
  $s("#serPoses").innerHTML = poseGroups.map((g) => `<div class="seq-pg" data-n="${headOf(g.t)}"><h4>${escH(g.t)}</h4><div class="seq-grid">${g.it.map((it, ii) => `<button type="button" class="seq-tile" data-p="${g.gi}-${ii}">${escH(it.n)}</button>`).join("")}</div></div>`).join("");
  const itemOf = (key) => { if (!key) return null; const [g, i] = key.split("-").map(Number); const gg = G[g]; return gg && gg.it[i] ? { g: gg, it: gg.it[i], key } : null; };
  let pose = st.get("pose", null), multi = st.get("multi", false), poses = st.get("poses", []), with5 = st.get("with5", false), people = st.get("people", "all");
  function selPoses() {
    if (!multi) { const p = itemOf(pose); return p ? [p] : []; }
    return poses.map(itemOf).filter(Boolean).filter((p) => with5 || headOf(p.g.t) !== "5").map((p, i) => ({ p, i }))
      .sort((a, b) => HEAD_ORDER[headOf(a.p.g.t)] - HEAD_ORDER[headOf(b.p.g.t)] || a.i - b.i).map((x) => x.p);
  }
  function selectAllVisible() {
    poses = [...sec.querySelectorAll(".seq-pg")].filter((d) => (people === "all" || d.dataset.n === people) && (with5 || d.dataset.n !== "5")).flatMap((d) => [...d.querySelectorAll(".seq-tile")].map((b) => b.dataset.p));
    st.set("poses", poses);
  }
  function markPose() {
    sec.querySelectorAll("#serPeople button").forEach((b) => b.classList.toggle("on", b.dataset.v === people));
    sec.querySelectorAll(".seq-pg").forEach((d) => { d.classList.toggle("hidden", people !== "all" && d.dataset.n !== people); d.classList.toggle("off5", multi && !with5 && d.dataset.n === "5"); });
    $s("#serMulti").checked = multi; $s("#serWith5").checked = with5;
    for (const id of ["#serWith5Box", "#serAllPose", "#serClearPose"]) $s(id).classList.toggle("hidden", !multi);
    const ps = selPoses(), order = ps.map((p) => p.key);
    sec.querySelectorAll(".seq-tile[data-p]").forEach((b) => {
      const on = multi ? order.includes(b.dataset.p) : b.dataset.p === pose;
      b.classList.toggle("on", on);
      const o = $s(".ord", b); if (o) o.remove();
      if (multi && on) b.prepend(Object.assign(document.createElement("span"), { className: "ord", textContent: order.indexOf(b.dataset.p) + 1 }));
    });
    $s("#serPoseName").textContent = multi ? (ps.length ? `${ps.length}개 장면 선택` : "여러 개를 고르세요") : ps[0] ? `${ps[0].g.t} · ${ps[0].it.n}` : "하나를 고르세요";
    countAll();
  }
  $s("#serPoses").onclick = (e) => {
    const b = e.target.closest(".seq-tile"); if (!b) return;
    if (multi) { if (!with5 && headOf(G[+b.dataset.p.split("-")[0]].t) === "5") return; const k = b.dataset.p; poses = poses.includes(k) ? poses.filter((x) => x !== k) : [...poses, k]; st.set("poses", poses); }
    else { pose = b.dataset.p; st.set("pose", pose); }
    markPose();
  };
  $s("#serMulti").onchange = () => {
    multi = $s("#serMulti").checked; st.set("multi", multi);
    if (multi) selectAllVisible(); else if (poses.length && !poses.includes(pose)) { pose = poses[0]; st.set("pose", pose); }
    switchCharVariant(); markPose();
  };
  $s("#serWith5").onchange = () => { with5 = $s("#serWith5").checked; st.set("with5", with5); selectAllVisible(); markPose(); };
  $s("#serAllPose").onclick = () => { selectAllVisible(); markPose(); };
  $s("#serClearPose").onclick = () => { poses = []; st.set("poses", poses); markPose(); };
  $s("#serPeople").onclick = (e) => {
    const b = e.target.closest("button[data-v]"); if (!b) return;
    people = b.dataset.v; st.set("people", people);
    if (multi) selectAllVisible(); else if (pose && people !== "all" && headOf(G[+pose.split("-")[0]].t) !== people) { pose = null; st.set("pose", null); }
    markPose();
  };

  // ---------- 3. 연작 테마 ----------
  let themes = st.get("themes", [0]);
  function drawThemes() {
    $s("#serThemes").innerHTML = THEMES.map((t) => `<button type="button" class="seq-tile${themes.includes(t.ti) ? " on" : ""}" data-t="${t.ti}">${escH(t.t)}<small>${t.steps.length}장${t.scene ? " · 장소·시간 포함" : ""}</small></button>`).join("");
    $s("#serSteps").innerHTML = THEMES.filter((t) => themes.includes(t.ti)).map((t) => `<div class="r"><b>${escH(t.t)}</b>${t.steps.map((s, i) => `${i + 1}. ${escH(s.n)}`).join(" → ")}</div>`).join("");
    countAll();
  }
  $s("#serThemes").onclick = (e) => {
    const b = e.target.closest(".seq-tile"); if (!b) return;
    const t = +b.dataset.t; themes = themes.includes(t) ? themes.filter((x) => x !== t) : [...themes, t].sort((a, b) => a - b); st.set("themes", themes); drawThemes();
  };
  const stepsPerPose = () => THEMES.filter((t) => themes.includes(t.ti)).reduce((n, t) => n + t.steps.length, 0);
  function countAll() {
    const el = $s("#serCount"); if (!el) return;
    const k = selPoses().length, n = stepsPerPose();
    el.textContent = n ? (k > 1 ? `장면당 ${n}장 × ${k} = ${n * k}장` : `${n}장`) : "테마를 고르세요";
  }

  // ---------- 2. 설정: 캐릭터 · 복장 · 배경 · 부위 · 가중치 ----------
  const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  let outfits = arr(st.get("outfits", [])), bgs = arr(st.get("bgs", [])), parts = st.get("parts", {}), fxSel = st.get("fx", {});
  const OUTFIT_CFG = { label: "복장", empty: "없음 (캐릭터 프롬프트 그대로)", groups: outfitGroups, get: () => outfits, set: (a) => { outfits = a; st.set("outfits", a); } };
  const BG_CFG = { label: "배경", empty: "없음", groups: bgGroups, get: () => bgs, set: (a) => { bgs = a; st.set("bgs", a); } };
  function renderParts() {
    const box = $s("#serPartsBox"), slots = PART_SLOTS.filter(([p]) => partGroups(p).length);
    box.innerHTML = slots.length ? `<label>부위별 복장 <small class="muted">(내 태그 복장 그룹의 부위 항목)</small></label><div class="grid2">${slots.map(([p]) => `<div data-part="${p}"></div>`).join("")}</div>` : "";
    for (const [p, name] of slots) mtRender($s(`[data-part="${p}"]`, box), { label: name, empty: "없음", groups: () => partGroups(p), get: () => parts[p] || [], set: (a) => { if (a.length) parts[p] = a; else delete parts[p]; st.set("parts", parts); } });
  }
  // 화풍 칸 — 연출·효과와 분리, 견본 썸네일 타일 (선택은 연출·효과와 같은 fxSel에 저장)
  const STYLE_G = ["화풍·분위기", "파스텔 홀로그램", "작가 화풍", "푸른 밤"];
  function renderStyle() {
    const box = $s("#serStyle"); if (!box) return;
    const groups = fxGroups().filter((g) => STYLE_G.includes(g.t));
    box.innerHTML = groups.map((g) => `<h4>${escH(g.t)}</h4><div class="sty-grid">${g.it.map((it) => `<button type="button" class="sty-t${it.img ? " th" : ""}${(fxSel[g.t] || []).includes(it.n) ? " on" : ""}" data-g="${escH(g.t)}" data-v="${escH(it.n)}"${it.full ? ` title="${escH(it.n)} — 가운데 휠 클릭: 견본 크게"` : ""}>${it.img ? `<img src="${it.img}" alt="" loading="lazy"${it.full ? ` data-full="${it.full}"` : ""}>` : ""}<span>${escH(koName(it.n))}</span></button>`).join("")}</div>`).join("");
  }
  $s("#serStyle").onclick = (e) => {
    const b = e.target.closest(".sty-t"); if (!b) return;
    const g = b.dataset.g, v = b.dataset.v, now = fxSel[g] || [];
    const a = now.includes(v) ? now.filter((x) => x !== v) : [...now, v];
    if (a.length) fxSel[g] = a; else delete fxSel[g];
    st.set("fx", fxSel); renderStyle();
  };
  $s("#serStyle").addEventListener("auxclick", (e) => { const t = e.target.closest(".sty-t"), im = t && t.querySelector("img[data-full]"); if (e.button === 1 && im) { e.preventDefault(); open(im.dataset.full, "_blank"); } });
  function renderFx() {
    renderStyle();
    const box = $s("#serFx"), groups = fxGroups().filter((g) => !STYLE_G.includes(g.t));
    box.innerHTML = groups.map((g, i) => `<div data-gi="${i}"></div>`).join("");
    groups.forEach((g, i) => mtRender($s(`[data-gi="${i}"]`, box), { label: g.t, empty: "없음", groups: () => [{ t: "", items: g.it.map((it) => ({ v: it.n, n: koName(it.n) })) }], get: () => fxSel[g.t] || [], set: (a) => { if (a.length) fxSel[g.t] = a; else delete fxSel[g.t]; st.set("fx", fxSel); } }));
  }
  const renderOutfitBg = () => { mtRender($s("#serOutfitBox"), OUTFIT_CFG); mtRender($s("#serBgBox"), BG_CFG); };
  const WT_SLOTS = [["key", "핵심 태그"], ["outfit", "복장"], ...PART_SLOTS];
  const WT_DEF = { key: 1.2, outfit: 1.2, top: 1.2, bottom: 1.2, under: 1.1, leg: 1.1, acc: 1.1 };
  let wts = { ...WT_DEF, ...st.get("wts", {}) };
  const renderWts = () => { $s("#serWts").innerHTML = WT_SLOTS.map(([k, n]) => `<label>${n}<select data-w="${k}">${[1, 1.1, 1.2, 1.3, 1.4, 1.5].map((v) => `<option value="${v}"${v === wts[k] ? " selected" : ""}>${v.toFixed(1)}</option>`).join("")}</select></label>`).join(""); };
  $s("#serWts").onchange = (e) => { const s = e.target.closest("select[data-w]"); if (!s) return; wts[s.dataset.w] = +s.value; st.set("wts", wts); };
  const OPT = ["serSameSeed", "serAuto", "serKey"];
  OPT.forEach((id) => { const el = $s("#" + id); el.checked = st.get(id, el.checked); el.onchange = () => st.set(id, el.checked); });
  addEventListener("bc-tags-changed", () => { renderOutfitBg(); renderParts(); renderFx(); });
  $s("#serFxEdit").onclick = () => window.BC_CUSTOM && window.BC_CUSTOM.open();
  $s("#serFxClear").onclick = () => { fxSel = {}; st.set("fx", fxSel); renderFx(); };

  // 캐릭터 프롬프트 (연작 전용)
  const ed = { pos: new PromptEditor($s("#serPos"), $s("#serPosChips")), neg: new PromptEditor($s("#serNeg"), $s("#serNegChips")) };
  ed.pos.value = store.get("prompt_serPos", "") || ""; ed.neg.value = store.get("prompt_serNeg", "") || "";
  const charSel = $s("#serChar");
  const chars = () => state.defaultCharacters || [];
  function fillChars() {
    const cur = st.get("charLabel", "");
    charSel.innerHTML = `<option value="">직접 입력 (아래 칸)</option>` + chars().map((c) => `<option value="${escH(c.label)}">${escH(c.label)}</option>`).join("");
    charSel.value = chars().some((c) => c.label === cur) ? cur : "";
    if (!ed.pos.value.trim() && charSel.value) { const c = chars().find((x) => x.label === charSel.value); ed.pos.value = c.positive || ""; ed.neg.value = c.negative || ""; }
  }
  fillChars(); setTimeout(fillChars, 1500); addEventListener("bc-chars-changed", fillChars);
  charSel.addEventListener("change", () => {
    const c = chars().find((x) => x.label === charSel.value);
    if (!c) { st.set("charLabel", ""); return; }
    ed.pos.value = c.positive || ""; ed.neg.value = c.negative || "";
    st.set("charLabel", c.label); toast(`캐릭터: ${c.label}`, "ok");
  });
  ed.pos.ta.addEventListener("input", () => { const c = chars().find((x) => x.label === charSel.value); if (c && ed.pos.value.trim() !== String(c.positive).trim()) { charSel.value = ""; st.set("charLabel", ""); } });
  // 여러 장면을 켜면 같은 캐릭터의 "여럿 한 번에 생성 시 사용" 버전으로 (끄면 솔로로)
  function switchCharVariant() {
    const cur = st.get("charLabel", ""), nm = cur.replace(/\s*\((솔로|솔로 제외|여럿 한 번에 생성 시 사용)\)$/, "");
    if (nm === cur) return;
    const want = `${nm} (${multi ? "여럿 한 번에 생성 시 사용" : "솔로"})`;
    if (want !== cur && chars().some((c) => c.label === want)) { charSel.value = want; charSel.dispatchEvent(new Event("change")); }
  }

  // ---------- 프롬프트 조립 ----------
  const wrap = (t, w) => (w && w !== 1 && !/^\(.*\)$/.test(t) ? `(${t}:${w})` : t);
  let _strip = null;
  const stripSet = () => _strip || (_strip = new Set(G.filter((g) => !g.c && g.m !== "o").flatMap((g) => g.it.flatMap((i) => i.tags.map((x) => x.toLowerCase())))
    .concat(THEMES.flatMap((t) => t.steps.flatMap((s) => s.tags))).concat(["5girls", "5others", "2girls", "1boy", "multiple girls", "multiple boys"])));
  function build(p, theme, step) {
    const k = $s("#serKey").checked, KW = wts.key || 1.2;
    const pt = p.it.tags, solo = p.g.t.startsWith("1인");
    const poseStr = pt.map((t) => (k && KEY.has(t) ? wrap(t, KW) : t)).join(", ");
    const ptSet = new Set(pt.map((x) => x.toLowerCase()));
    let base = ed.pos.value.trim();
    for (const t of [...(solo ? [] : ["solo", "solo focus"]), ...(pt.some((t) => /multiple girls|5girls|5others/.test(t)) ? ["1girl"] : []), ...pt]) { const n = rm(base, t); if (n != null) base = n; }
    const rc = chars().find((c) => c.label === st.get("charLabel", ""));
    const prot = new Set(rc && rc.raw ? rc.positive.split(",").map(norm) : []);
    for (const x of stripSet()) { if (ptSet.has(x) || prot.has(x)) continue; const n = rm(base, x); if (n != null) base = n; }
    const ofs = pickedItems(outfits, isOutfitGroup);
    const partItems = PART_SLOTS.flatMap(([slot]) => pickedItems(parts[slot] || [], isOutfitGroup).map((hit) => ({ slot, hit })));
    if (ofs.length || partItems.length) {   // 복장을 고르면 캐릭터의 원래 옷(wear)과 기본 복장 태그는 빼고 고른 복장으로
      const outfitTags = new Set(G.filter((g) => !g.c && g.m === "o").flatMap((g) => g.it.flatMap((i) => i.tags.map((x) => x.toLowerCase()))));
      for (const x of outfitTags) { if (ptSet.has(x)) continue; const n = rm(base, x); if (n != null) base = n; }
      if (rc && rc.wear) for (const raw of rc.wear.split(",")) { const x = norm(raw); if (!x || ptSet.has(x)) continue; const n = rm(base, x); if (n != null) base = n; }
    }
    const extra = [], W = new Map();
    for (const of of ofs) { extra.push(...of.it.tags); of.it.tags.forEach((t) => W.set(t, wts.outfit)); }
    for (const { slot, hit } of partItems) { extra.push(...hit.it.tags); hit.it.tags.forEach((t) => W.set(t, wts[slot])); }
    extra.push(...step.tags);
    for (const g of fxGroups()) for (const it of g.it.filter((x) => (fxSel[g.t] || []).includes(x.n))) extra.push(...it.tags);
    if (!theme.scene) for (const b of pickedItems(bgs, isBgGroup)) extra.push(...b.it.tags);
    const seen = new Set([...pt, ...base.split(",")].map(norm));
    const ex = extra.filter((t) => { const n = norm(t); if (!n || seen.has(n)) return false; seen.add(n); return true; });
    const exStr = ex.map((t) => wrap(t, Math.max(k && KEY.has(t) ? KW : 1, W.get(t) || 1))).join(", ");
    const positive = [poseStr, base, exStr].filter(Boolean).join(", ");
    let neg = ed.neg.value;
    const sel = new Set([...pt, ...ex].map(norm));
    for (const t of new Set([...(solo ? [] : BLK), ...sel])) { const n = rm(neg, t); if (n != null) neg = n; }
    if (!neg.trim()) neg = NEG;
    const have = new Set(neg.split(",").map(norm));
    const must = [...new Set([...SAFE_NEG, ...(solo ? SOLO_NEG : [])])].filter((t) => !have.has(t) && !sel.has(t));
    const negative = [neg.trim().replace(/,\s*$/, ""), ...must].filter(Boolean).join(", ");
    return window.BC_HAT ? window.BC_HAT.apply(positive, negative) : { positive, negative };
  }
  function pickWorkflow(p) {
    const sel = $s("#wfSelect");
    if (!$s("#serAuto").checked) return sel.value;
    const re = p.g.t.startsWith("1인") ? { test: (x) => !!x && x !== "builtin" && !x.includes("@") && !/2people|5people|duo|party/i.test(x) } : p.g.t.startsWith("5인") ? /5people/i : /2people|duo/i;
    const LP = window.LL_PASTEL, fxNames = Object.values(fxSel).flat();   // 연출·효과에서 '파스텔 홀로그램'을 고르면 파스텔 워크플로 먼저
    const c = [...sel.options].map((o) => o.value).filter((x) => re.test(x) && !x.includes("@")).sort((a, b) => (LP ? LP.prefer(fxNames)(a, b) : 0) || /RefStyle_IPAdapter/i.test(b) - /RefStyle_IPAdapter/i.test(a) || /WhiteUniform/.test(a) - /WhiteUniform/.test(b))[0];
    return c || sel.value;
  }
  function makePlan() {
    const ps = selPoses(), ts = THEMES.filter((t) => themes.includes(t.ti));
    const basePar = readParams(); basePar.batch = 1;
    const plan = ps.map((p, pi) => {
      const params = { ...basePar };
      if ($s("#serAuto").checked && p.g.z) { const [w, h] = p.g.z.split("x").map(Number); params.width = w; params.height = h; }
      return { p, pi, wf: pickWorkflow(p), params };
    });
    return { ps, ts, plan };
  }

  // ---------- 5. 결과 · 진행 · 이어서 생성 ----------
  let slots = [], run = null, runToken = 0, waiter = null, saveT = 0, saveWarned = false;
  const byId = new Map();
  const RUN_HTML = $s("#serRun").innerHTML;
  function koChips(str) {
    const look = window.BC_KO_LOOKUP || (() => "");
    return String(str || "").split(",").map((raw) => {
      let t = raw.trim(); if (!t) return "";
      const wm = t.match(/^\((.+):([\d.]+)\)$/), tag = wm ? wm[1] : t.replace(/^\(+|\)+$/g, ""), k = look(tag);
      return `<span class="sq-c${k ? "" : " en"}" title="${escH(t)}">${escH(k || tag)}${wm ? `<small>×${escH(wm[2])}</small>` : ""}</span>`;
    }).join("");
  }
  const showPrompt = (el, pos, neg) => { $s("details > div", el).innerHTML = `<b>긍정</b><div class="sq-cs">${koChips(pos)}</div><b>부정</b><div class="sq-cs">${koChips(neg)}</div><details class="sq-raw"><summary>영문 원문 (실제 적용)</summary><div>${escH("긍정: " + pos + "\n\n부정: " + neg)}</div></details>`; };
  const slotHTML = (it, g) => `<div class="seq-slot" data-k="${it.k}" style="--ar:${g.w}/${g.h}"><div class="hd">${escH(it.name)}<span>대기</span><button class="re" title="이 장만 같은 프롬프트·새 시드로 다시 생성">↻</button></div><div class="im">대기 중<div class="bar"></div></div><details><summary>프롬프트</summary><div></div></details></div>`;
  const runHTML = (r) => r.groups.map((g) => `<div class="seq-grp">${r.groups.length > 1 ? `<div class="seq-gh">${g.pi + 1}. ${escH(g.title)}<small>${escH(g.wf)} · ${g.w}×${g.h}</small></div>` : ""}<div class="seq-slots">${r.items.filter((it) => it.pi === g.pi).map((it) => slotHTML(it, g)).join("")}</div></div>`).join("");
  const finished = (s) => s.el.classList.contains("done") || s.el.classList.contains("err");
  function setSlot(s, cls, text, frac) {
    s.el.classList.remove("run", "done", "err"); if (cls) s.el.classList.add(cls);
    $s(".hd span", s.el).textContent = text;
    if (frac != null) $s(".bar", s.el).style.width = Math.round(frac * 100) + "%";
    updProg();
  }
  function updProg() {
    const el = $s("#serProg");
    if (!slots.length) { el.innerHTML = ""; return; }
    const done = slots.filter((s) => s.el.classList.contains("done")).length, end = slots.filter(finished).length, bad = end - done;
    el.innerHTML = `${end}/${slots.length}${bad ? `<small>(오류·중단 ${bad})</small>` : ""}${end === slots.length ? `<small>${bad ? "종료" : "완료"}</small>` : ""}`;
    const btn = $s("#serRun"); if (btn.disabled) btn.innerHTML = `진행 중… <small>${end}/${slots.length}장</small>`;
  }
  function saveRun(now) {
    clearTimeout(saveT);
    const f = () => { try { if (run) localStorage.setItem("ser_run", JSON.stringify(run)); else localStorage.removeItem("ser_run"); } catch { if (!saveWarned) { saveWarned = true; toast("진행 상황을 저장하지 못했습니다 — 이어서 생성이 안 될 수 있습니다", "err"); } } };
    if (now) f(); else saveT = setTimeout(f, 400);
  }
  const leftOf = (r) => (r ? r.items.filter((it) => it.st !== "done").length : 0);
  function showDone(s) {
    setSlot(s, "done", "완료", 1);
    const it = s.it; if (!it.img) return;
    const box = $s(".im", s.el); box.innerHTML = `<img alt="" src="${imgURL(it.img)}">`;
    $s("img", box).onclick = () => openModal((state.history || []).find((h) => h.id === it.pid) || { id: it.pid, images: [it.img] }, 0);
  }
  // 이 장만 다시 생성 (잘못 나온 그림) — 같은 프롬프트·워크플로·크기, 새 시드로 그 칸 자리에 다시 만듦
  async function regenSlot(s, btn) {
    const g = run && run.groups.find((x) => x.pi === s.pi);
    if (!g) return;
    btn.disabled = true;
    try {
      const res = await api("/api/generate", { json: { workflow: g.wf, positive: s.it.positive, negative: s.it.negative, params: { ...g.params }, randomSeed: true } });
      if (s.id) byId.delete(s.id);
      s.id = s.it.pid = res.prompt_id; s.it.st = "queued"; s.it.img = null; byId.set(res.prompt_id, s);
      state.myPrompts.add(res.prompt_id);
      $s(".im", s.el).innerHTML = '다시 생성 대기<div class="bar"></div>';
      setSlot(s, "", "다시 생성 대기열", 0); saveRun(true); drawResume();
    } catch (e) { toast("다시 생성 실패:\n" + e.message, "err"); }
    finally { btn.disabled = false; }
  }
  function mountRun(r) {
    $s("#serSlots").innerHTML = runHTML(r);
    slots = r.items.map((it) => ({ it, pi: it.pi, id: null, el: $s(`.seq-slot[data-k="${it.k}"]`) }));
    byId.clear();
    for (const s of slots) {
      showPrompt(s.el, s.it.positive, s.it.negative);
      if (s.it.st === "done") showDone(s); else if (s.it.st === "err") setSlot(s, "err", "오류"); else if (s.it.st === "stop") setSlot(s, "err", "중단됨"); else setSlot(s, "", "이어서 생성 대기", 0);
    }
    $s("#serInfo").textContent = r.groups.length > 1 ? `${r.groups.length}개 장면 · 총 ${r.items.length}장 — 한 장면이 다 끝나면 다음 장면의 워크플로로 전환` : `워크플로: ${r.groups[0].wf} · ${r.groups[0].w}×${r.groups[0].h}`;
    $s("#serSeed").textContent = r.same ? `시드 ${r.seed}` : "장마다 다른 시드";
    updProg(); drawResume();
  }
  function checkWait() { if (waiter && (waiter.my !== runToken || waiter.grp.every(finished))) { const r = waiter.res; clearInterval(waiter.t); waiter = null; r(); } }
  function waitGroup(grp, my) {
    return new Promise((res) => {
      let gone = 0;
      const t = setInterval(async () => {
        try {
          const q = await (await fetch("/comfy/queue")).json();
          const ids = new Set([...(q.queue_running || []), ...(q.queue_pending || [])].map((x) => x[1]));
          gone = grp.some((s) => ids.has(s.id)) ? 0 : gone + 1;
          if (gone >= 3) grp.forEach((s) => { if (!finished(s)) { s.it.st = "done"; saveRun(); setSlot(s, "done", "완료 (확인됨)", 1); } });
        } catch {}
        checkWait();
      }, 5000);
      waiter = { grp, res, my, t }; checkWait();
    });
  }
  async function runJobs(r) {
    const btn = $s("#serRun"); btn.disabled = true; drawResume();
    const my = ++runToken;
    try {
      const todoOf = (g) => slots.filter((s) => s.pi === g.pi && s.it.st !== "done");
      const active = r.groups.filter((g) => todoOf(g).length);
      active.forEach((g, i) => todoOf(g).forEach((s) => setSlot(s, "", i ? "앞 장면 끝나면 시작" : "대기", 0)));
      for (const [ai, g] of active.entries()) {
        if (my !== runToken) break;
        const todo = todoOf(g);
        for (const s of todo) {
          if (my !== runToken) break;
          const res = await api("/api/generate", { json: { workflow: g.wf, positive: s.it.positive, negative: s.it.negative, params: { ...g.params, seed: r.seed }, randomSeed: !r.same } });
          s.id = s.it.pid = res.prompt_id; s.it.st = "queued"; byId.set(res.prompt_id, s);
          state.myPrompts.add(res.prompt_id);
          if (r.same && res.seed != null) r.seed = res.seed;
          setSlot(s, "", "대기열", 0); saveRun();
        }
        saveRun(true);
        if (my !== runToken) break;
        const next = active[ai + 1];
        if (next) { toast(`${todo.length}장 대기열에 추가 — 끝나면 "${next.title}" (${next.wf})로 전환합니다`, "ok"); await waitGroup(todo, my); if (my !== runToken) break; toast(`${g.title} 완료 → ${next.title} (${next.wf})`, "ok"); }
        else toast(`${todo.length}장 대기열에 추가했습니다`, "ok");
      }
    } catch (e) { toast("연작 요청 실패:\n" + e.message, "err"); }
    finally { btn.disabled = false; btn.innerHTML = RUN_HTML; drawResume(); }
  }
  async function resumeRun() {
    if (!run || !leftOf(run) || $s("#serRun").disabled) return;
    const queued = run.items.filter((it) => it.st === "queued" && it.pid);
    if (queued.length) {
      let hist = []; try { hist = await api("/api/history"); } catch {}
      const H = new Map((Array.isArray(hist) ? hist : []).concat(state.history || []).map((h) => [h.id, h]));
      const stale = [];
      for (const it of queued) { const h = H.get(it.pid); if (h && h.images && h.images[0]) { it.st = "done"; it.img = h.images[0]; } else stale.push(it.pid); }
      if (stale.length) try {
        const q = await (await fetch("/comfy/queue")).json();
        if ((q.queue_running || []).some((x) => stale.includes(x[1]))) await fetch("/comfy/interrupt", { method: "POST" });
        await fetch("/comfy/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: stale }) });
      } catch {}
    }
    run.items.forEach((it) => { if (it.st !== "done") { it.st = "todo"; it.pid = null; } });
    saveRun(true); mountRun(run); await runJobs(run);
  }
  function drawResume() {
    const box = $s("#serResume"), n = leftOf(run), busy = $s("#serRun").disabled;
    box.classList.toggle("hidden", !n || busy);
    if (n && !busy) $s("span", box).textContent = `지난 연작: ${run.items.length - n}/${run.items.length}장 완료 · 남은 ${n}장`;
  }
  $s("#serResumeGo").onclick = () => resumeRun();
  $s("#serResumeDrop").onclick = () => { if (!confirm("지난 연작의 남은 장을 버릴까요?\n(이미 만든 이미지는 갤러리에 그대로 남습니다)")) return; run = null; saveRun(true); drawResume(); };
  $s("#serRun").onclick = async () => {
    const { ps, ts, plan } = makePlan();
    if (!ps.length) return toast(multi ? "장면을 하나 이상 고르세요" : "장면을 먼저 고르세요", "err");
    if (!ts.length) return toast("연작 테마를 하나 이상 고르세요", "err");
    const n = leftOf(run);
    if (n && !confirm(`지난 연작이 ${run.items.length - n}/${run.items.length}장에서 멈춰 있습니다.\n새로 시작하면 남은 ${n}장은 버려집니다 (이어서 하려면 '이어서 생성').\n새로 시작할까요?`)) return;
    const total = ps.length * stepsPerPose();
    if (total > 50 && !confirm(`${ps.length}개 장면 × ${stepsPerPose()}장 = ${total}장을 만듭니다.\n시간이 오래 걸릴 수 있습니다 (1장 약 1분 20초). 진행할까요?`)) return;
    run = {
      at: Date.now(), same: $s("#serSameSeed").checked,
      seed: $s("#randomSeed").checked ? Math.floor(Math.random() * 2 ** 48) : +$s("#seed").value,
      groups: plan.map(({ p, pi, wf, params }) => ({ pi, title: `${p.g.t} · ${p.it.n}`, wf, w: params.width, h: params.height, params })),
      items: plan.flatMap(({ p, pi }) => ts.flatMap((t) => t.steps.map((step, si) => { const j = build(p, t, step); return { k: `${pi}-${t.ti}-${si}`, pi, name: `${t.t} ${si + 1}. ${step.n}`, positive: j.positive, negative: j.negative, st: "todo", pid: null, img: null }; }))),
    };
    saveRun(true); mountRun(run); await runJobs(run);
  };
  $s("#serPreview").onclick = () => {
    const { ps, ts, plan } = makePlan();
    if (!ps.length) return toast(multi ? "장면을 하나 이상 고르세요" : "장면을 먼저 고르세요", "err");
    if (!ts.length) return toast("연작 테마를 하나 이상 고르세요", "err");
    const r = { groups: plan.map(({ p, pi, wf, params }) => ({ pi, title: `${p.g.t} · ${p.it.n}`, wf, w: params.width, h: params.height })), items: plan.flatMap(({ p, pi }) => ts.flatMap((t) => t.steps.map((step, si) => ({ k: `${pi}-${t.ti}-${si}`, pi, name: `${t.t} ${si + 1}. ${step.n}`, ...build(p, t, step) })))) };
    $s("#serSlots").innerHTML = runHTML(r); slots = []; byId.clear(); updProg();
    for (const it of r.items) { const el = $s(`.seq-slot[data-k="${it.k}"]`); $s(".hd span", el).textContent = "미리보기"; $s(".im", el).firstChild.textContent = "생성 전"; $s("details", el).open = r.items.length <= 12; showPrompt(el, it.positive, it.negative); }
    $s("#serInfo").textContent = `${r.groups.length}개 장면 · 총 ${r.items.length}장 (미리보기)`;
  };
  $s("#serStop").onclick = async () => {
    const pend = slots.filter((s) => s.id && !finished(s)).map((s) => s.id), later = slots.filter((s) => !s.id && !finished(s));
    if (!pend.length && !later.length) return toast("진행 중인 연작이 없습니다");
    runToken++; checkWait();
    if (pend.length) { try { await fetch("/comfy/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: pend }) }); } catch {} try { await fetch("/comfy/interrupt", { method: "POST" }); } catch {} }
    slots.forEach((s) => { if (pend.includes(s.id) || later.includes(s)) { s.it.st = "stop"; setSlot(s, "err", "중단됨"); } });
    saveRun(true); drawResume(); toast("연작을 중단했습니다 — '이어서 생성'으로 남은 장부터 다시 만들 수 있습니다");
  };
  $s("#serReset").onclick = () => {
    if (!confirm("연작 선택을 모두 초기화할까요?\n(장면·인원·복장·배경·연출·테마·스위치·가중치)")) return;
    pose = null; multi = false; poses = []; with5 = false; people = "all"; themes = [0];
    outfits = []; bgs = []; parts = {}; fxSel = {}; wts = { ...WT_DEF };
    for (const [k, v] of Object.entries({ pose, multi, poses, with5, people, themes, outfits, bgs, parts, fx: fxSel, wts })) st.set(k, v);
    OPT.forEach((id) => { $s("#" + id).checked = true; st.set(id, true); });
    renderOutfitBg(); renderParts(); renderFx(); renderWts(); drawThemes(); markPose();
    toast("연작 선택을 초기화했습니다", "ok");
  };
  new EventSource("/api/events").onmessage = (e) => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    const d = m.data || {}, s = byId.get(d.prompt_id || d.id);
    if (!s) return;
    switch (m.type) {
      case "execution_start": setSlot(s, "run", "생성 중", 0.02); $s(".im", s.el).firstChild.textContent = "생성 중…"; break;
      case "progress": setSlot(s, "run", `샘플링 ${d.value}/${d.max}`, d.value / d.max); break;
      case "execution_error": s.it.st = "err"; saveRun(); setSlot(s, "err", "오류"); $s(".im", s.el).firstChild.textContent = d.exception_message || "오류"; break;
      case "execution_interrupted": s.it.st = "stop"; saveRun(); setSlot(s, "err", "중단됨"); break;
      case "bc_done": {
        const im = d.images && d.images[0];
        if (!im) { s.it.st = "err"; saveRun(); setSlot(s, "err", d.error ? "오류" : "이미지 없음"); break; }
        s.it.st = "done"; s.it.img = im; saveRun(); showDone(s);
        if (slots.every(finished)) { toast("연작 완료", "ok"); saveRun(true); drawResume(); }
        break;
      }
    }
    checkWait();
  };

  $s("#serSlots").addEventListener("click", (e) => {
    const b = e.target.closest(".re"); if (!b) return;
    const s = slots.find((x) => x.el === b.closest(".seq-slot"));
    if (s && s.it) regenSlot(s, b);
  });

  // ---------- 시작 ----------
  renderOutfitBg(); renderParts(); renderFx(); renderWts(); drawThemes(); markPose();
  try { run = JSON.parse(localStorage.getItem("ser_run") || "null"); } catch { run = null; }
  if (run && Array.isArray(run.items) && run.items.length) {
    mountRun(run);
    const n = leftOf(run);
    if (n) toast(`지난 연작이 ${run.items.length - n}/${run.items.length}장에서 멈춰 있습니다\n연작 탭 '5. 결과'의 '이어서 생성'으로 남은 ${n}장을 만들 수 있습니다`);
  } else run = null;
  // 캐릭터 프롬프트 저장
  setInterval(() => { store.set("prompt_serPos", ed.pos.value); store.set("prompt_serNeg", ed.neg.value); }, 2000);
})();
