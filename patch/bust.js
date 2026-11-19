// 가슴 크기 — 필수 선택 (끄기 없음). 모든 생성 요청(/api/generate)에 고정 적용
//  - 긍정 프롬프트의 가슴 크기 태그(flat chest ~ gigantic breasts, 가중치 포함)를 모두 빼고 고른 크기 하나만 인원 태그(1girl 등) 뒤에 넣음
//  - 여자 인물 태그(girl·female·woman)가 없는 프롬프트(남자만)는 건드리지 않음
//  - 선택 칸: 생성 탭 · 연작/시퀀스의 생성 버튼 위, 설정 탭 — 어디서 바꿔도 같은 값
//  - 저장: 프리셋 API의 "@체형" 항목 → 어느 버전/포트에서든 같은 값
// Little Light와 Ghost가 같은 파일을 씀
(() => {
  const REC = "@체형 (자동 저장 · 수정 금지)";
  const SIZES = [["small", "작게", "small breasts"], ["medium", "보통", "medium breasts"], ["large", "크게", "large breasts"], ["huge", "아주 크게", "huge breasts"]];
  const ALL = new Set(["flat chest", "small breasts", "medium breasts", "large breasts", "huge breasts", "gigantic breasts", "big breasts"]);
  const HEAD = /^(\d\+?girls?|1girl|multiple girls|\d\+?others?)$/;
  let cur = "medium";
  const norm = (t) => t.trim().replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").replace(/_/g, " ").toLowerCase();
  const tagOf = (k) => (SIZES.find((s) => s[0] === k) || SIZES[1])[2];
  function apply(positive) {
    const segs = String(positive || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!segs.some((s) => /girls?\b|female|wom[ae]n/.test(norm(s.replace(/^BREAK\s+/i, ""))))) return String(positive || "");
    const out = [];
    for (const s of segs) {
      const m = s.match(/^(BREAK\s+)(.*)$/i), body = m ? m[2] : s;
      if (ALL.has(norm(body))) { if (m) out.push("BREAK"); continue; }   // BREAK 구획은 유지
      out.push(s);
    }
    const i = out.findIndex((s) => HEAD.test(norm(s.replace(/^BREAK\s+/i, ""))));
    out.splice(i >= 0 ? i + 1 : 0, 0, tagOf(cur));
    return out.join(", ");
  }

  const origApi = api;
  api = function (path, opts = {}) {   // eslint-disable-line no-global-assign
    if (path === "/api/generate" && opts.json) opts = { ...opts, json: { ...opts.json, positive: apply(opts.json.positive) } };
    return origApi.call(this, path, opts);
  };

  async function load() {
    try { const r = (await origApi("/api/presets")).find((p) => p.name === REC); if (r) { const v = JSON.parse(r.positive || "{}").bust; if (SIZES.some((s) => s[0] === v)) cur = v; } } catch {}
    sync();
  }
  async function save() {
    try { await origApi("/api/presets", { json: { name: REC, positive: JSON.stringify({ bust: cur }), negative: "" } }); } catch (e) { toast("가슴 크기 저장 실패: " + e.message, "err"); }
  }
  const boxes = new Set();
  function sync() { boxes.forEach((b) => b.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.v === cur))); }
  function make() {
    const f = document.createElement("div");
    f.className = "field bc-bust";
    f.innerHTML = `<label>가슴 크기 <b class="req">필수</b> <small class="muted">— 모든 생성에 적용 (프롬프트의 다른 크기 태그는 이걸로 바뀜)</small></label><div class="seg">${SIZES.map(([v, k, t]) => `<button type="button" data-v="${v}" title="${t}">${k}</button>`).join("")}</div>`;
    f.querySelectorAll("button").forEach((b) => (b.onclick = async () => { cur = b.dataset.v; sync(); await save(); toast("가슴 크기: " + b.textContent + " (" + tagOf(cur) + ")", "ok"); }));
    boxes.add(f); return f;
  }
  const css = document.createElement("style");
  css.textContent = ".bc-bust .req{font-size:10px;font-weight:700;color:#fff;background:var(--danger,#ff3b30);border-radius:6px;padding:1px 5px;margin-left:4px;vertical-align:1px}" +
    ".bc-bust .seg{display:flex;gap:4px;flex-wrap:wrap}.bc-bust .seg button{flex:1;min-width:64px;padding:7px 6px;font-size:13px}" +
    ".bc-bust .seg button.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}";
  document.head.append(css);

  // 생성 버튼 위 (생성 탭 · 연작/시퀀스 — 나중에 만들어지는 탭도 잡도록 몇 번 다시 확인)
  const place = () => {
    document.querySelectorAll(".gen-buttons").forEach((g) => { if (!g.previousElementSibling || !g.previousElementSibling.classList.contains("bc-bust")) g.before(make()); });
    const st = document.querySelector(".settings");
    if (st && !st.querySelector(".bc-bust")) { const hr = st.querySelector("hr"); const f = make(); hr ? hr.before(f) : st.append(f); }
    sync();
  };
  let n = 0; const t = setInterval(() => { place(); if (++n > 12) clearInterval(t); }, 500);
  place();

  window.BC_BUST = { apply, get size() { return cur; }, SIZES };
  load();
})();
