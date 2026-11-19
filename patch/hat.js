// 모자 처리 — 모든 생성 요청(/api/generate)에 고정 적용
//   guard : 남자가 여자 모자를 쓰지 않게 부정 프롬프트에 고정 문구 추가 (기본)
//   hide  : 모자 태그를 모두 빼고 no headwear + 부정에 모자 태그 → 모자가 아예 안 보이게
//   off   : 아무것도 안 함
// 설정은 프리셋 API 의 "@설정" 항목에 저장 → 어느 버전/포트에서든 같은 값
(() => {
  const REC = "@설정 (자동 저장 · 수정 금지)";
  const GUARD_NEG = ["hat on male", "male wearing hat", "man wearing hat", "boy wearing hat", "headwear on male", "male witch hat"];
  const HIDE_NEG = ["hat", "witch hat", "beret", "baseball cap", "top hat", "sun hat", "straw hat", "beanie", "holding hat", "hat removed"];
  const HIDE_POS = ["no headwear"];
  const HAT_RE = /\b(hats?|headwear|beret|caps?|beanie|bonnet|helmet|hood|witch hat)\b/i;
  const MODES = { guard: "남자 모자 방지 (부정 프롬프트 고정)", hide: "모자 아예 숨기기 (no headwear)", off: "끄기" };

  let settings = { hat: "guard" };
  const norm = (t) => t.trim().replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").replace(/_/g, " ").toLowerCase();
  const tokens = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
  function addMissing(str, add) {
    const have = new Set(tokens(str).map((t) => norm(t.replace(/^BREAK\s+/i, ""))));
    const extra = add.filter((t) => !have.has(norm(t)));
    return extra.length ? [String(str || "").trim().replace(/,\s*$/, ""), ...extra].filter(Boolean).join(", ") : String(str || "");
  }
  function stripHats(str) {   // 긍정에서 모자 태그 제거 (BREAK 접두는 유지)
    return tokens(str).map((seg) => {
      const m = seg.match(/^(BREAK\s+)(.*)$/i);
      const body = m ? m[2] : seg;
      if (HAT_RE.test(norm(body)) && !/^no headwear$/i.test(norm(body))) return m ? "BREAK" : null;
      return seg;
    }).filter(Boolean).join(", ");
  }
  function apply(positive, negative, mode = settings.hat) {
    let pos = positive || "", neg = negative || "";
    if (mode === "guard") neg = addMissing(neg, GUARD_NEG);
    else if (mode === "hide") { pos = addMissing(stripHats(pos), HIDE_POS); neg = addMissing(neg, [...GUARD_NEG, ...HIDE_NEG]); }
    return { positive: pos, negative: neg };
  }

  // 생성 요청 가로채기 — 생성 탭 · 시퀀스 · 그 밖의 모든 생성에 적용
  const origApi = api;
  api = function (path, opts = {}) {   // eslint-disable-line no-global-assign
    if (path === "/api/generate" && opts.json && settings.hat !== "off") {
      const r = apply(opts.json.positive, opts.json.negative);
      opts = { ...opts, json: { ...opts.json, positive: r.positive, negative: r.negative } };
    }
    return origApi.call(this, path, opts);
  };

  async function load() {
    try {
      const rec = (await origApi("/api/presets")).find((p) => p.name === REC);
      if (rec) settings = { ...settings, ...JSON.parse(rec.positive || "{}") };
    } catch {}
    sync();
  }
  async function save() {
    try { await origApi("/api/presets", { json: { name: REC, positive: JSON.stringify(settings), negative: "" } }); } catch (e) { toast("설정 저장 실패: " + e.message, "err"); }
  }
  const selects = new Set();
  function sync() { selects.forEach((s) => (s.value = settings.hat)); dispatchEvent(new Event("bc-hat-changed")); }
  function makeSelect() {
    const s = document.createElement("select");
    s.className = "bc-hat-select";
    s.innerHTML = Object.entries(MODES).map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
    s.value = settings.hat;
    s.onchange = async () => { settings.hat = s.value; sync(); await save(); toast("모자 처리: " + MODES[s.value], "ok"); };
    selects.add(s);
    return s;
  }

  // 설정 탭
  const st = document.querySelector(".settings");
  if (st) {
    const f = document.createElement("div");
    f.className = "field";
    f.innerHTML = `<label>모자 처리 <small class="muted">(모든 생성에 고정 적용 — 남자 캐릭터가 여자 모자를 쓰는 문제 방지)</small></label>`;
    f.append(makeSelect());
    const hr = st.querySelector("hr");
    hr ? hr.before(f) : st.append(f);
  }

  window.BC_HAT = { apply: (p, n) => (settings.hat === "off" ? { positive: p, negative: n } : apply(p, n)), makeSelect, get mode() { return settings.hat; }, MODES };
  load();
})();
