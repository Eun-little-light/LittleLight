// "내 태그" — 사용자가 직접 만든 태그 그룹을 태그 선택기와 연작 연출·효과에 추가
// 저장: 프리셋 API 의 "@내태그" 항목(positive = JSON) → 앱 서버의 presets.json 에 보관, 어느 버전/포트에서든 공유
(() => {
  const T = window.BC_TAGS;
  if (!T) return;
  const G = T.G;
  const KEYNAME = "@내태그 (자동 저장 · 수정 금지)";
  const $c = (s, r = document) => r.querySelector(s);
  const escH = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STAGE_NAMES = ["초기 흥분", "고조", "절정 직전", "절정", "흔적"];
  const splitTags = (s) => String(s).split(/,|\n/).map((t) => t.trim()).filter(Boolean);

  let data = [];      // [{ g, items: [{ n, tags, from, until }] }]
  let draft = null;   // 편집 중 사본
  let dirty = false;

  // ---------- 불러오기 / 저장 / 적용 ----------
  async function load() {
    try {
      const list = await api("/api/presets");
      const rec = list.find((p) => p.name === KEYNAME);
      data = rec ? JSON.parse(rec.positive || "[]") : [];
      if (!Array.isArray(data)) data = [];
    } catch (e) { data = []; }
    // 종류가 생기기 전에 저장된 그룹: 이름으로 종류·부위를 정해 줌 (예: 속옷 → 복장·속옷/속옷만, 실내 장소 → 배경)
    for (const g of data) {
      if (!g.kind || (!g.kindSet && g.kind === "fx" && guessKind(g.g || "") !== "fx")) g.kind = guessKind(g.g || "");   // 직접 고른 종류(kindSet)는 그대로
      if (g.kind === "outfit") {
        const gp = guessPart(g.g || "");
        // 부위를 직접 고른 적 없는(전부 "풀세트") 예전 그룹은 그룹 이름으로 부위를 정함 (예: 속옷 → 속옷만, 상의 → 상의만)
        const allFull = (g.items || []).every((it) => !it.part || it.part === "full");
        for (const it of g.items || []) if (!it.part || (allFull && !g.kindSet && !it.partSet && gp !== "full")) it.part = guessPart(it.n || "") !== "full" ? guessPart(it.n || "") : gp;
      }
    }
    apply();
  }
  async function save(next) {
    await api("/api/presets", { json: { name: KEYNAME, positive: JSON.stringify(next), negative: "" } });
    data = next;
    apply();
    try { await loadPresets(); } catch {}
  }
  // 그룹 종류: 효과·연출(연작 연출·효과) / 복장·속옷(연작 복장 목록) / 배경(연작 배경 목록)
  const KINDS = { fx: "효과·연출", outfit: "복장·속옷", bg: "배경" };
  const PARTS = { full: "풀세트", top: "상의만", bottom: "하의만", under: "속옷만", leg: "스타킹·가터만", acc: "소품만", expo: "착의노출 (3단계부터 자동)", etc: "기타" };
  const guessKind = (name) => (/배경|장소|실내|실외|날씨|background|location/i.test(name) ? "bg" : /의상|복장|옷|속옷|란제리|오피스|메이드|바니|알몸|전라|수영복|유니폼|상의|하의|신발|다리|스타킹|모자|액세서리|outfit|lingerie|cloth|wear/i.test(name) ? "outfit" : "fx");
  const guessPart = (name) => (/착의노출|노출\s*상태/.test(name) ? "expo" : /상의/.test(name) ? "top" : /하의/.test(name) ? "bottom" : /스타킹|가터|니삭스|다리|신발/.test(name) ? "leg" : /소품|모자|액세서리|머리 장식/.test(name) ? "acc" : /속옷|브라|팬티/.test(name) ? "under" : "full");
  function apply() {
    for (let i = G.length - 1; i >= 0; i--) if (G[i].c) G.splice(i, 1);   // 이전 내 태그 그룹 제거
    const mine = new Set();
    for (const grp of data) {
      const kind = grp.kind || "fx";
      const it = (grp.items || []).filter((x) => x.n && splitTags(x.tags).length)
        .map((x) => ({ n: x.n, tags: splitTags(x.tags), from: +x.from || 0, until: x.until == null ? 4 : +x.until, part: x.part || "full" }));
      if (!grp.g || !it.length) continue;
      it.forEach((x) => x.tags.forEach((t) => mine.add(t.toLowerCase().replace(/_/g, " "))));
      if (kind === "outfit") {
        const wear = it.filter((x) => x.part !== "expo"), expo = it.filter((x) => x.part === "expo");
        // 풀세트 항목만 있는 그룹은 "복장 하나" 규칙, 부위 항목(상의·하의 등)이 있으면 여러 개 같이 고를 수 있게
        const setOnly = wear.every((x) => x.part === "full" || x.part === "etc");
        if (wear.length) G.push({ t: "★ " + grp.g, m: setOnly ? "o" : "m", c: true, kind, it: wear, expo: expo.flatMap((x) => x.tags) });
        if (expo.length) G.push({ t: "★ " + grp.g + " · 착의노출", m: "m", c: true, kind: "outfitExpo", it: expo });
      } else if (kind === "bg") G.push({ t: "★ " + grp.g, m: "s", c: true, kind, it });
      else G.push({ t: "★ " + grp.g, m: "m", c: true, kind: "fx", it });
    }
    window.BC_MINE = mine;   // 내 태그에 들어 있는 태그 목록 (★ 표시용)
    T.reset && T.reset();
    dispatchEvent(new Event("bc-tags-changed"));
  }
  window.BC_CUSTOM_PARTS = PARTS;

  // ---------- txt 가져오기 ( "[그룹]" 줄 + "■ 이름" 다음 줄 = 태그 ) ----------
  function parseTxt(txt) {
    const out = [];
    let group = "가져온 태그", cur = null;
    const lines = String(txt).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^[=\-]{3,}$/.test(line)) continue;
      const h = line.match(/^\[(.+?)\]/);
      if (h) {
        if (/booru|가이드|팁|guide|tip/i.test(h[1])) { group = null; continue; }   // 안내 문단은 건너뜀
        group = h[1].replace(/^(PART\s*)?[\dA-Z]+([.\-]\d+)*\.?\s*/i, "").trim() || h[1];
        cur = null; continue;
      }
      const m = line.match(/^■\s*(.+)$/);
      if (m && group) {
        let j = i + 1; while (j < lines.length && !lines[j].trim()) j++;
        const tags = (lines[j] || "").trim();
        if (!tags || /^[■\[=]/.test(tags)) continue;
        if (!cur || cur.g !== group) { cur = out.find((x) => x.g === group) || { g: group, kind: guessKind(group), items: [] }; if (!out.includes(cur)) out.push(cur); }
        const name = m[1].replace(/\s*\([^)]*\)\s*$/, "").replace(/_/g, " ").trim();
        if (cur.kind !== "outfit" && guessKind(name) === "bg" && cur.items.length === 0) cur.kind = "bg";
        cur.items.push({ n: name, tags, from: 0, until: 4, part: guessPart(name) });
        i = j;
      }
    }
    return out;
  }
  function merge(target, add) {
    let nG = 0, nI = 0;
    for (const a of add) {
      let g = target.find((x) => x.g === a.g);
      if (!g) { g = { g: a.g, kind: a.kind || "fx", items: [] }; target.push(g); nG++; }
      for (const it of a.items) {
        const ex = g.items.find((x) => x.n === it.n);
        if (ex) ex.tags = it.tags; else { g.items.push(it); nI++; }
      }
    }
    return { nG, nI };
  }

  // ---------- 관리 창 ----------
  const css = document.createElement("style");
  css.textContent = `
.ct-back{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;padding-top:28px}
.ct-back.hidden{display:none}
.ct-panel{width:min(980px,100%);height:100%;background:var(--sheet,var(--panel));border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -10px 40px rgba(0,0,0,.3);animation:ctUp .45s cubic-bezier(.32,.72,0,1)}
@keyframes ctUp{from{transform:translateY(100%)}}
.ct-head{display:flex;align-items:center;gap:8px;padding:16px 18px 12px;border-bottom:.5px solid var(--sep,var(--line))}
.ct-head h3{margin:0;font-size:17px;flex:1}
.ct-body{flex:1;overflow:auto;padding:14px 18px 40px}
.ct-imp{background:var(--panel2);border-radius:14px;padding:12px;margin-bottom:14px}
.ct-imp summary{cursor:pointer;font-weight:600;font-size:14px}
.ct-imp textarea{margin-top:10px;min-height:110px;font-size:12.5px}
.ct-imp .row{margin-top:8px;flex-wrap:wrap}
.ct-g{background:var(--panel2);border-radius:14px;padding:12px;margin-bottom:12px}
.ct-gh{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.ct-gh input{flex:1;font-weight:600}
.ct-gh .ct-kind{width:auto;flex:none}
.ct-it{display:grid;grid-template-columns:minmax(120px,180px) 1fr auto;gap:8px;align-items:start;padding:8px 0;border-top:.5px solid var(--sep,var(--line))}
.ct-it textarea{min-height:52px;font-size:12.5px;resize:vertical}
.ct-it .side{display:flex;flex-direction:column;gap:6px;min-width:158px}
.ct-it select{font-size:12px;padding:5px 26px 5px 8px}
.ct-empty{color:var(--muted);text-align:center;padding:30px 10px;line-height:1.7}
.ct-imp .row select{width:auto;flex:1;min-width:180px}
.ct-imp .row input[type=text],.ct-imp .row input[type=search]{flex:1;min-width:160px}
.ct-dbtags{display:flex;flex-wrap:wrap;gap:6px;max-height:300px;overflow:auto;margin:10px 0;padding:2px}
.ct-chip{border-radius:999px;padding:5px 11px;font-size:12.5px;color:var(--text)}
.ct-chip small{color:var(--muted);margin-left:5px;font-size:10.5px}
.ct-chip.have{box-shadow:inset 0 0 0 1.5px var(--ok)}
.ct-chip.on{background:var(--accent)!important;color:#fff!important}
.ct-chip.on small{color:rgba(255,255,255,.8)}
@media (max-width:700px){.ct-it{grid-template-columns:1fr}}`;
  document.head.append(css);

  const back = document.createElement("div");
  back.className = "ct-back hidden";
  back.innerHTML = `<div class="ct-panel"><div class="ct-head"><h3>내 태그</h3><button class="primary" data-a="save">저장</button><button data-a="close">닫기</button></div><div class="ct-body"></div></div>`;
  document.body.append(back);
  const body = $c(".ct-body", back);

  const stageSel = (v, kind) => `<select data-f="${kind}">${STAGE_NAMES.map((s, i) => `<option value="${i}"${i === +v ? " selected" : ""}>${kind === "from" ? `${i + 1}. ${s}부터` : i === 4 ? "끝까지" : `${i + 1}. ${s}까지`}</option>`).join("")}</select>`;
  // 고정 상단: Danbooru 태그 그룹 고르기 + txt 가져오기 (목록을 다시 그려도 선택 상태 유지)
  const DB = window.BC_TAGGROUPS || [];
  const counts = new Map();   // 태그 -> 게시물 수 (없는 태그는 null)
  const dbSel = new Set();
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n));
  function renderTop() {
    body.innerHTML = `
<details class="ct-imp" id="ctDb"><summary>Danbooru 태그 그룹에서 고르기</summary>
<div class="muted small" style="margin-top:6px">그룹을 고르고 원하는 태그만 탭해서 선택한 뒤 [선택한 태그 추가]를 누르세요. 앱 내장 Danbooru 태그 DB에 있는 태그만, 게시물 수가 많은 순으로 보입니다.</div>
<div class="row" style="margin-top:10px"><select id="ctDbGroup">${DB.map((g, i) => `<option value="${i}">${escH(g.name)}</option>`).join("")}</select><input type="search" id="ctDbQ" placeholder="모든 그룹에서 검색"></div>
<div class="ct-dbtags" id="ctDbTags"></div>
<div class="row wrap"><span class="muted small" id="ctDbCount">0개 선택</span><button class="mini" type="button" id="ctDbAll">보이는 것 모두</button><button class="mini" type="button" id="ctDbNone">선택 해제</button></div>
<div class="row wrap"><input type="text" id="ctDbTarget" placeholder="넣을 내 태그 그룹 이름"><select id="ctDbMode"><option value="each">태그마다 항목으로</option><option value="one">한 항목으로 묶기</option></select><input type="text" id="ctDbItem" placeholder="묶을 항목 이름" class="hidden"><button class="primary-ghost" type="button" id="ctDbAdd">선택한 태그 추가</button></div>
</details>
<details class="ct-imp"${draft.length ? "" : " open"}><summary>txt 가져오기 / 붙여넣기</summary>
<div class="muted small" style="margin-top:6px">형식: <code>[그룹 이름]</code> 줄 아래에 <code>■ 항목 이름</code>, 그 다음 줄에 쉼표로 구분한 태그. 지금까지 쓰던 txt 파일을 그대로 넣으면 됩니다.</div>
<textarea id="ctImpText" spellcheck="false" placeholder="[3-1. 오피스룩]&#10;■ 오피스_풀세트_정장&#10;office lady, business suit, ..."></textarea>
<div class="row"><input type="file" id="ctFile" accept=".txt,text/plain"><button class="primary-ghost" data-a="import">가져오기</button></div></details>
<div id="ctList"></div>`;
    const grpSel = $c("#ctDbGroup", body), q = $c("#ctDbQ", body), tagsBox = $c("#ctDbTags", body);
    const target = $c("#ctDbTarget", body), mode = $c("#ctDbMode", body), itemName = $c("#ctDbItem", body);
    const groupLabel = () => (DB[+grpSel.value] ? DB[+grpSel.value].name.replace(/\s*\(.*\)\s*$/, "") : "Danbooru 태그");
    let shown = [];
    async function ensureCounts(tags) {
      const need = tags.filter((t) => !counts.has(t));
      if (!need.length) return;
      try {
        const res = await api("/api/tags/lookup", { json: need.map((t) => t.replace(/ /g, "_")) });
        for (const t of need) { const r = res[t.replace(/ /g, "_")]; counts.set(t, r ? r.count : null); }
      } catch { for (const t of need) counts.set(t, 0); }   // 조회 실패 시엔 그냥 보여줌
    }
    function haveTags() { const s = new Set(); draft.forEach((g) => g.items.forEach((it) => splitTags(it.tags).forEach((t) => s.add(t.toLowerCase())))); return s; }
    async function drawTags() {
      const kw = q.value.trim().toLowerCase();
      const pool = kw ? [...new Set(DB.flatMap((g) => g.tags))].filter((t) => t.toLowerCase().includes(kw)) : (DB[+grpSel.value]?.tags || []);
      tagsBox.innerHTML = '<span class="muted small">불러오는 중…</span>';
      await ensureCounts(pool);
      shown = pool.filter((t) => counts.get(t) !== null).sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
      const have = haveTags();
      tagsBox.innerHTML = shown.length ? shown.map((t) => `<button type="button" class="ct-chip${dbSel.has(t) ? " on" : ""}${have.has(t.toLowerCase()) ? " have" : ""}" data-t="${escH(t)}" title="${have.has(t.toLowerCase()) ? "이미 내 태그에 있음" : ""}">${escH(t)}<small>${counts.get(t) ? fmt(counts.get(t)) : ""}</small></button>`).join("")
        : '<span class="muted small">맞는 태그가 없습니다</span>';
      $c("#ctDbCount", body).textContent = `${dbSel.size}개 선택`;
      if (!target.value || target.dataset.auto === "1") { target.value = kw ? "Danbooru 검색" : groupLabel(); target.dataset.auto = "1"; }
    }
    grpSel.onchange = () => { q.value = ""; drawTags(); };
    q.oninput = () => { clearTimeout(q._t); q._t = setTimeout(drawTags, 200); };
    target.oninput = () => (target.dataset.auto = "0");
    mode.onchange = () => itemName.classList.toggle("hidden", mode.value !== "one");
    tagsBox.onclick = (e) => {
      const b = e.target.closest(".ct-chip"); if (!b) return;
      const t = b.dataset.t; dbSel.has(t) ? dbSel.delete(t) : dbSel.add(t);
      b.classList.toggle("on"); $c("#ctDbCount", body).textContent = `${dbSel.size}개 선택`;
    };
    $c("#ctDbAll", body).onclick = () => { shown.forEach((t) => dbSel.add(t)); drawTags(); };
    $c("#ctDbNone", body).onclick = () => { dbSel.clear(); drawTags(); };
    $c("#ctDbAdd", body).onclick = () => {
      if (!dbSel.size) return toast("추가할 태그를 먼저 고르세요", "err");
      const g = target.value.trim() || groupLabel(), tags = [...dbSel];
      const items = mode.value === "one" ? [{ n: itemName.value.trim() || `${g} 묶음`, tags: tags.join(", "), from: 0, until: 4 }] : tags.map((t) => ({ n: t, tags: t, from: 0, until: 4 }));
      const src = DB[+grpSel.value] ? DB[+grpSel.value].name : g;
      const kind = guessKind(g + " " + src), part = guessPart(src);
      if (kind === "outfit") items.forEach((x) => (x.part = part));
      const r = merge(draft, [{ g, kind, items }]);
      dirty = true; dbSel.clear(); render(); drawTags();
      toast(`'${g}'에 ${r.nI}개 추가 — [저장]을 눌러야 적용됩니다`, "ok");
    };
    $c("#ctDb", body).addEventListener("toggle", (e) => { if (e.target.open && !tagsBox.children.length) drawTags(); });
  }
  function render() {
    $c("#ctList", body).innerHTML = `
${draft.length ? draft.map((g, gi) => `
<div class="ct-g" data-g="${gi}"><div class="ct-gh"><input type="text" data-f="g" value="${escH(g.g)}" placeholder="그룹 이름"><select data-f="kind" class="ct-kind" title="이 그룹이 연작 어디에 나타날지">${Object.entries(KINDS).map(([v, t]) => `<option value="${v}"${(g.kind || "fx") === v ? " selected" : ""}>${t}</option>`).join("")}</select><button class="mini" data-a="addItem">+ 항목</button><button class="mini danger-ghost" data-a="delGroup">그룹 삭제</button></div>
${g.items.map((it, ii) => `<div class="ct-it" data-i="${ii}"><input type="text" data-f="n" value="${escH(it.n)}" placeholder="항목 이름">
<textarea data-f="tags" spellcheck="false" placeholder="태그, 태그, ...">${escH(it.tags)}</textarea>
<div class="side">${(g.kind || "fx") === "outfit"
    ? `<select data-f="part" title="부위">${Object.entries(PARTS).map(([v, t]) => `<option value="${v}"${(it.part || "full") === v ? " selected" : ""}>${t}</option>`).join("")}</select>`
    : (g.kind || "fx") === "bg" ? `<span class="muted small">배경 항목</span>`
    : stageSel(it.from || 0, "from") + stageSel(it.until == null ? 4 : it.until, "until")}<button class="mini danger-ghost" data-a="delItem">항목 삭제</button></div></div>`).join("")}
</div>`).join("") : `<div class="ct-empty">아직 내 태그가 없습니다.<br>위의 txt 가져오기를 쓰거나 아래에서 그룹을 추가하세요.</div>`}
<button data-a="addGroup">+ 그룹 추가</button>
<p class="muted small">저장하면 그룹 종류에 따라 나타납니다 — <b>효과·연출</b>: 태그 선택기 + 연작 "연출 · 효과" / <b>복장·속옷</b>: 태그 선택기(복장 하나) + 연작 "복장" 목록, 부위별(풀세트·상의만·하의만·속옷만·스타킹·가터만·소품만)로 고를 수 있고 "착의노출" 항목은 3단계부터 자동으로 붙음 / <b>배경</b>: 태그 선택기 + 연작 "배경" 목록. 모두 <b>★ 그룹 이름</b>으로 표시됩니다.</p>`;
  }
  const open = () => { draft = JSON.parse(JSON.stringify(data)); dirty = false; renderTop(); render(); back.classList.remove("hidden"); };
  const close = () => back.classList.add("hidden");
  function tryClose() {
    if (dirty && !confirm("저장하지 않은 변경이 있습니다.\n저장하지 않고 닫을까요?")) return;
    close();
  }

  body.addEventListener("input", (e) => {
    const el = e.target, f = el.dataset.f; if (!f) return;
    const gEl = el.closest(".ct-g"); if (!gEl) return;
    const g = draft[+gEl.dataset.g];
    if (f === "g") g.g = el.value;
    else if (f === "kind") {
      g.kind = el.value; g.kindSet = true;   // 사용자가 직접 고른 종류 — 자동 추측보다 우선
      if (g.kind === "outfit") g.items.forEach((it) => { if (!it.part) it.part = guessPart(it.n || ""); });
      dirty = true; render(); return;
    }
    else { const it = g.items[+el.closest(".ct-it").dataset.i]; it[f] = f === "from" || f === "until" ? +el.value : el.value; if (f === "part") it.partSet = true; }
    dirty = true;
  });
  body.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "ctFile" && el.files[0]) { const r = new FileReader(); r.onload = () => { $c("#ctImpText", body).value = r.result; }; r.readAsText(el.files[0], "utf-8"); }
  });
  back.addEventListener("click", async (e) => {
    if (e.target === back) return tryClose();
    const b = e.target.closest("[data-a]"); if (!b) return;
    const a = b.dataset.a, gEl = b.closest(".ct-g"), gi = gEl ? +gEl.dataset.g : -1;
    if (a === "close") return tryClose();
    if (a === "save") {
      const clean = draft.map((g) => ({ g: (g.g || "").trim(), kind: g.kind || "fx", ...(g.kindSet ? { kindSet: true } : {}), items: g.items.filter((x) => (x.n || "").trim() && splitTags(x.tags).length).map((x) => ({ n: x.n.trim(), tags: splitTags(x.tags).join(", "), from: +x.from || 0, until: x.until == null ? 4 : +x.until, part: x.part || "full", ...(x.partSet ? { partSet: true } : {}) })) })).filter((g) => g.g && g.items.length);
      try { await save(clean); dirty = false; draft = JSON.parse(JSON.stringify(data)); render(); toast(`내 태그 저장됨 — 그룹 ${clean.length}개, 항목 ${clean.reduce((s, g) => s + g.items.length, 0)}개`, "ok"); }
      catch (err) { toast("저장 실패: " + err.message, "err"); }
      return;
    }
    if (a === "import") {
      const add = parseTxt($c("#ctImpText", body).value);
      if (!add.length) return toast("가져올 항목을 찾지 못했습니다 (■ 이름 + 다음 줄 태그 형식)", "err");
      const r = merge(draft, add); dirty = true; render();
      toast(`가져옴: 새 그룹 ${r.nG}개, 새 항목 ${r.nI}개 — [저장]을 눌러야 적용됩니다`, "ok");
      return;
    }
    if (a === "addGroup") { draft.push({ g: "새 그룹", items: [{ n: "", tags: "", from: 0, until: 4 }] }); dirty = true; render(); body.scrollTop = body.scrollHeight; return; }
    if (a === "addItem") { draft[gi].items.push({ n: "", tags: "", from: 0, until: 4 }); dirty = true; render(); return; }
    if (a === "delItem") { draft[gi].items.splice(+b.closest(".ct-it").dataset.i, 1); dirty = true; render(); return; }
    if (a === "delGroup") {
      if (!confirm(`'${draft[gi].g}' 그룹을 삭제할까요?\n([저장]을 눌러야 실제로 지워집니다)`)) return;
      draft.splice(gi, 1); dirty = true; render(); return;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !back.classList.contains("hidden") && !document.querySelector(".ios-alert-back")) $c('[data-a="close"]', back).click(); });

  // 설정 탭에도 진입 버튼
  const settings = document.querySelector(".settings");
  if (settings) {
    const row = document.createElement("div");
    row.className = "field";
    row.innerHTML = `<label>내 태그</label><div class="row"><button class="primary-ghost" type="button">내 태그 관리</button><span class="muted small">직접 만든 태그를 태그 선택기 · 연작에 추가</span></div>`;
    $c("button", row).onclick = open;
    const hr = settings.querySelector("hr");
    hr ? hr.before(row) : settings.append(row);
  }

  window.BC_CUSTOM = { open, load, parseTxt };
  load();
})();
