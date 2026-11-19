// 캐릭터 이름 · 내 캐릭터 — 설정 탭에서 바꾸고 추가함 (캐릭터 목록 · 캐릭터별 저장 폴더에 쓰임)
//  - 기본 캐릭터 이름: 소스에는 없음. 내 빌드는 patch\charnames_local.js(저장소에 올리지 않음, window.LL_CHAR_LOCAL)가 채움, 배포용(make.ps1 -Dist)은 이름 없음
//  - 내 캐릭터: 이름 · 설명 · 외모 태그(항상 유지) · 의상 태그(연작/시퀀스에서 복장을 고르면 교체) · 인식 태그 · 마녀 화풍 유지
//  - 저장: 프리셋 API의 "@캐릭터 이름" · "@내 캐릭터" 항목 → 어느 버전/포트에서든 같은 값
//  - 저장 폴더: 이름을 정하면 그 이름, 아니면 로컬 파일의 영문 폴더 이름 · 없으면 Character1…
//  - sig = 이 캐릭터로 알아볼 외모 태그(모두 있어야 함), keep = 마녀 화풍 참조(ref_witch)를 약하게 하지 않음
// Little Light와 Ghost가 같은 파일을 씀. characters.js · charfolder.js보다 앞에 있어야 함
(() => {
  const REC = "@캐릭터 이름 (자동 저장 · 수정 금지)", REC_MINE = "@내 캐릭터 (자동 저장 · 수정 금지)";
  // 기본 캐릭터 — 이름 없이 외모 설명만. 내 빌드는 charnames_local.js(저장소에 올리지 않음)가 기본 이름·폴더를 채움
  const BUILTIN = [
    { id: "c1", desc: "마녀", sig: ["long black hair", "twintails", "red eyes"], keep: true },
    { id: "c2", desc: "흑발 셔츠·주름치마", sig: ["black hair", "messy hair", "purple eyes"] },
    { id: "c3", desc: "은발 베레모·세일러", sig: ["grey hair", "silver hair", "purple eyes"] },
    // 순서 중요: 오드아이 메이드가 청안 메이드보다 앞 (오드아이 프롬프트에도 black hair · very long hair · blue eyes가 있음)
    { id: "c4", desc: "흑발 오드아이 메이드", sig: ["black hair", "very long hair", "heterochromia"], keep: true },
    { id: "c5", desc: "흑발 청안 메이드", sig: ["black hair", "very long hair", "blue eyes"], keep: true },
    { id: "c6", desc: "흰 긴 머리 메이드", sig: ["white hair", "very long hair", "blue eyes"] },
  ].map((d, i) => ({ ko: "", en: `Character${i + 1}`, ...d }));
  if (!window.LL_DIST && window.LL_CHAR_LOCAL) for (const d of BUILTIN) Object.assign(d, window.LL_CHAR_LOCAL[d.id] || {});  const DIST = !!window.LL_DIST;
  let custom = {}, mine = [];
  const norm = (t) => t.trim().replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").replace(/_/g, " ").toLowerCase();
  const tags = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
  const safe = (s) => String(s || "").trim().replace(/[\\/:*?"<>|.]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  const SKIP_SIG = new Set(["adult", "mature female", "1girl", "1boy", "solo", "female", "male"]);
  // 인식 태그를 비워 두면 외모 태그에서 인원·나이 태그를 빼고 앞의 3개
  const autoSig = (body) => tags(body).map(norm).filter((t) => !SKIP_SIG.has(t)).slice(0, 3);
  const mineDefs = () => mine.map((m) => ({ id: m.id, ko: m.name, en: safe(m.name) || m.id, desc: m.desc || "", sig: m.sig && m.sig.length ? m.sig : autoSig(m.body), keep: !!m.keep, mine: true, body: m.body, wear: m.wear || "" }));
  const all = () => [...BUILTIN, ...mineDefs()];
  const def = (id) => all().find((d) => d.id === id);
  const name = (id) => { const d = def(id); if (!d) return ""; if (d.mine) return d.ko; return id in custom ? custom[id] : DIST ? "" : d.ko; };
  const folder = (id) => {
    const d = def(id); if (!d) return "";
    if (d.mine) return d.en;
    if (id in custom && safe(custom[id])) return safe(custom[id]);
    return d.en;
  };
  const label = (id) => { const n = name(id), d = def(id); return n && d.desc ? `${n} · ${d.desc}` : n || d.desc; };

  async function load() {
    try {
      const ps = await api("/api/presets");
      const r = ps.find((p) => p.name === REC); if (r) custom = JSON.parse(r.positive || "{}") || {};
      const OLD = window.LL_CHAR_OLD_IDS || {}; for (const [a, b] of Object.entries(OLD)) if (a in custom && !(b in custom)) { custom[b] = custom[a]; delete custom[a]; }
      const m = ps.find((p) => p.name === REC_MINE); if (m) mine = (JSON.parse(m.positive || "[]") || []).filter((x) => x && x.id && x.name && x.body);
    } catch {}
    dispatchEvent(new Event("bc-charnames-changed"));
    draw();
  }
  async function put(rec, val, msg) {
    try { await api("/api/presets", { json: { name: rec, positive: JSON.stringify(val), negative: "" } }); }
    catch (e) { toast("저장 실패: " + e.message, "err"); return false; }
    dispatchEvent(new Event("bc-charnames-changed"));
    if (msg) toast(msg, "ok");
    return true;
  }

  // ---------- 화면: 설정 탭 + 캐릭터 선택 옆 '✎ 캐릭터' 창 (같은 내용, 어디서 바꿔도 함께 갱신) ----------
  const views = [];   // {box: 이름 칸, mbox: 내 캐릭터 칸}
  let editing = null;
  const q = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  function drawView(v) {
    v.box.innerHTML = `<label>캐릭터 이름 <small class="muted">— 기본 캐릭터 목록과 캐릭터별 저장 폴더에 쓰임. 비워 두면 ${DIST ? "이름 없이 외모 설명만" : "기본 이름"}</small></label>` +
      `<div class="bc-cn">${BUILTIN.map((d) => `<label><span>${d.desc}</span><input type="text" data-id="${d.id}" maxlength="20" value="${d.id in custom ? q(custom[d.id]) : ""}" placeholder="${DIST ? "이름 없음" : d.ko}"><small class="muted">폴더: ${q(folder(d.id))}</small></label>`).join("")}</div>` +
      `<div class="row"><button type="button" class="primary-ghost mini" data-act="save">이름 저장</button><button type="button" class="mini" data-act="reset">${DIST ? "모두 지우기" : "기본 이름으로"}</button></div>`;
    const e = editing ? mine.find((m) => m.id === editing) || {} : {};
    v.mbox.innerHTML = `<label>내 캐릭터 <small class="muted">— 직접 만든 캐릭터. 기본 캐릭터 목록과 연작/시퀀스 캐릭터에 솔로 · 솔로 제외 · 여럿 한 번에 세 가지로 나옴</small></label>` +
      (mine.length ? `<div class="bc-mc">${mine.map((m) => `<div class="r"><b>${q(m.name)}</b><span class="muted">${q(m.desc || "")} · 폴더 ${q(folder(m.id))} · 인식: ${q((def(m.id).sig || []).join(", "))}</span><button type="button" class="mini" data-edit="${m.id}">수정</button><button type="button" class="mini danger-ghost" data-del="${m.id}">삭제</button></div>`).join("")}</div>` : `<div class="muted" style="font-size:12px;margin:2px 0 6px">아직 없음</div>`) +
      `<div class="bc-mf">
        <label>이름<input type="text" data-f="name" maxlength="20" value="${q(e.name)}" placeholder="예: 하루"></label>
        <label>설명 <small class="muted">(선택)</small><input type="text" data-f="desc" maxlength="30" value="${q(e.desc)}" placeholder="예: 갈색 단발 후드티"></label>
        <label class="w">외모 태그 <small class="muted">— 머리·눈 등 항상 유지 (영문 Danbooru 태그, 쉼표로 구분 · adult, mature female은 자동으로 붙음)</small><textarea data-f="body" rows="2" spellcheck="false" placeholder="brown hair, short hair, bob cut, green eyes">${q(e.body)}</textarea></label>
        <label class="w">의상 태그 <small class="muted">— 연작/시퀀스에서 복장을 고르면 이 태그는 빠지고 고른 복장으로</small><textarea data-f="wear" rows="2" spellcheck="false" placeholder="hoodie, denim shorts, sneakers">${q(e.wear)}</textarea></label>
        <label class="w">인식 태그 <small class="muted">(선택) — 프롬프트에 모두 있으면 이 캐릭터 폴더에 저장. 비우면 외모 태그 앞 3개</small><input type="text" data-f="sig" value="${q((e.sig || []).join(", "))}" placeholder="brown hair, bob cut, green eyes"></label>
        <label class="check w"><input type="checkbox" data-f="keep"${e.keep ? " checked" : ""}> 마녀 화풍 참조를 그대로(약하게 하지 않음) <small class="muted">— 기본은 머리·옷 색이 마녀 쪽으로 끌려가지 않게 약하게</small></label>
      </div>
      <div class="row"><button type="button" class="primary-ghost mini" data-act="add">${editing ? "수정 저장" : "캐릭터 추가"}</button>${editing ? '<button type="button" class="mini" data-act="cancel">취소</button>' : ""}</div>`;
  }
  function draw() { views.forEach(drawView); }
  async function onNames(v, e) {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    if (b.dataset.act === "reset") { custom = {}; if (await put(REC, custom, "캐릭터 이름을 지웠습니다")) draw(); return; }
    const next = {};
    v.box.querySelectorAll("input[data-id]").forEach((i) => { const t = i.value.trim(); if (t) next[i.dataset.id] = t; });
    custom = next; if (await put(REC, custom, "캐릭터 이름을 저장했습니다")) draw();
  }
  async function onMine(v, e) {
    const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]"), act = e.target.closest("[data-act]");
    if (ed) { editing = ed.dataset.edit; draw(); return; }
    if (del) {
      const m = mine.find((x) => x.id === del.dataset.del);
      if (!m || !confirm(`내 캐릭터 '${m.name}'을(를) 삭제할까요?\n(이미 만든 그림은 그대로)`)) return;
      mine = mine.filter((x) => x.id !== m.id); if (editing === m.id) editing = null;
      await put(REC_MINE, mine, `'${m.name}' 삭제`); draw(); return;
    }
    if (!act) return;
    if (act.dataset.act === "cancel") { editing = null; draw(); return; }
    const val = (f) => { const el = v.mbox.querySelector(`[data-f="${f}"]`); return el.type === "checkbox" ? el.checked : el.value.trim(); };
    const nm = val("name"); let body = tags(val("body"));
    if (!nm) return toast("이름을 입력하세요", "err");
    if (!body.length) return toast("외모 태그를 입력하세요 (머리색·눈색 등)", "err");
    const BAD = /\b(child|loli|shota|toddler|kid|young|petite|aged down|underage)\b/i;
    if ([...body, ...tags(val("wear"))].some((t) => BAD.test(norm(t)))) return toast("어린 캐릭터를 뜻하는 태그는 쓸 수 없습니다 (성인 캐릭터만)", "err");
    const have = new Set(body.map(norm));
    body = [...(have.has("adult") ? [] : ["adult"]), ...(have.has("mature female") ? [] : ["mature female"]), ...body];
    const item = { id: editing || "m" + Date.now().toString(36), name: nm, desc: val("desc"), body: body.join(", "), wear: tags(val("wear")).join(", "), sig: tags(val("sig")).map(norm), keep: val("keep") };
    if (mine.some((m) => m.name === nm && m.id !== item.id) || BUILTIN.some((d) => name(d.id) === nm)) return toast("같은 이름의 캐릭터가 이미 있습니다", "err");
    mine = editing ? mine.map((m) => (m.id === item.id ? item : m)) : [...mine, item];
    const was = editing; editing = null;
    if (await put(REC_MINE, mine, was ? `'${nm}' 수정` : `'${nm}' 추가 — 기본 캐릭터 목록에 나옵니다`)) draw();
  }
  function makeView() {
    const v = { box: document.createElement("div"), mbox: document.createElement("div") };
    v.box.className = "field bc-charnames"; v.mbox.className = "field bc-mychars";
    v.box.onclick = (e) => onNames(v, e); v.mbox.onclick = (e) => onMine(v, e);
    views.push(v); drawView(v);
    return v;
  }
  function addSetting() {
    const st = document.querySelector(".settings");
    if (!st) return false;
    if (st.querySelector(".bc-charnames")) return true;
    const v = makeView(), hr = st.querySelector("hr");
    if (hr) { hr.before(v.box); hr.before(v.mbox); } else st.append(v.box, v.mbox);
    return true;
  }
  // '✎ 캐릭터' 창
  let dlg = null;
  function openDlg() {
    if (!dlg) {
      dlg = document.createElement("div"); dlg.className = "bc-cdlg hidden";
      dlg.innerHTML = `<div class="in"><div class="hd"><b>캐릭터 이름 · 내 캐릭터</b><button type="button" class="mini" data-x>닫기</button></div><div class="bd"></div></div>`;
      document.body.append(dlg);
      const v = makeView(); dlg.querySelector(".bd").append(v.box, v.mbox);
      dlg.onclick = (e) => { if (e.target === dlg || e.target.closest("[data-x]")) dlg.classList.add("hidden"); };
      addEventListener("keydown", (e) => { if (e.key === "Escape") dlg.classList.add("hidden"); });
    }
    draw(); dlg.classList.remove("hidden");
  }
  // 캐릭터 선택 상자(생성 탭 '기본 캐릭터 ▾' · 연작 #serChar · 시퀀스 #seqChar) 옆에 버튼
  function addButtons() {
    let n = 0;
    for (const id of ["charSelect", "serChar", "seqChar"]) {
      const sel = document.getElementById(id); if (!sel) continue; n++;
      if (sel.nextElementSibling && sel.nextElementSibling.classList.contains("bc-cbtn")) continue;
      const b = document.createElement("button"); b.type = "button"; b.className = "mini bc-cbtn"; b.textContent = "✎ 캐릭터";
      b.title = "캐릭터 이름 지정 · 내 캐릭터 추가"; b.onclick = openDlg; sel.after(b);
    }
    return n;
  }  const css = document.createElement("style");
  css.textContent = ".bc-cn{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin:4px 0 8px}" +
    ".bc-cn label,.bc-mf label{display:flex;flex-direction:column;gap:3px;font-size:12px}.bc-cn label span{color:var(--muted)}.bc-cn input,.bc-mf input[type=text],.bc-mf textarea{width:100%}" +
    ".bc-mf{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 8px}.bc-mf .w{grid-column:1/-1}.bc-mf label.check{flex-direction:row;align-items:center;gap:6px}" +
    ".bc-mc{display:flex;flex-direction:column;gap:4px;margin:4px 0 6px}.bc-mc .r{display:flex;align-items:center;gap:8px;font-size:12.5px}.bc-mc .r span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".bc-cbtn{margin-left:6px;white-space:nowrap}" +
    ".bc-cdlg{position:fixed;inset:0;z-index:250;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}.bc-cdlg.hidden{display:none}" +
    ".bc-cdlg .in{background:var(--panel,#1c1c1e);color:var(--text,inherit);border-radius:16px;width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4)}" +
    ".bc-cdlg .hd{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border,rgba(127,127,127,.25))}.bc-cdlg .bd{padding:12px 16px;overflow:auto}";
  document.head.append(css);
  { let n = 0; const t = () => { if (!addSetting() && ++n < 20) setTimeout(t, 500); }; t(); }
  { let n = 0; const t = () => { addButtons(); if (++n < 20) setTimeout(t, 500); }; t(); }
  window.BC_CHARNAMES = { get DEFS() { return all(); }, BUILTIN, DIST, name, folder, label, def, mine: mineDefs, load, open: openDlg };
  load();
})();
