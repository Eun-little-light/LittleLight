// 태그 한국어 표시 — 화면에만 한국어 뜻을 붙이고, 프롬프트에는 영어 태그 그대로 적용
//  · 프롬프트 칩 / 자동완성 / 태그 선택기 칩 / Danbooru 태그 그룹 칩 / 태그 추출 결과에 뜻 표시
//  · 자동완성에서 한국어로 검색 (예: "미소" → smile)
(() => {
  const KO = window.BC_KO || {};
  const root = document.documentElement;
  const LS = "bc_ko_show";
  const norm = (t) => String(t).trim().replace(/\\([()])/g, "$1").replace(/^\(+|\)+$/g, "").replace(/^(.+?):[\d.]+$/, "$1").replace(/_/g, " ").toLowerCase().trim();   // ":3" 같은 이모티콘 태그는 가중치로 보지 않음
  const ko = (t) => { const n = norm(t); return KO[n] || (window.BC_KO_COMPOSE ? window.BC_KO_COMPOSE(n) : "") || ""; };
  window.BC_KO_LOOKUP = ko;

  let on = true;
  try { on = localStorage.getItem(LS) !== "0"; } catch {}
  root.classList.toggle("ko-on", on);

  const css = document.createElement("style");
  css.textContent = `
.ko{display:none}
.ko-on .ko{display:inline}
.chip .ko{margin-left:5px;font-size:11px;color:var(--muted);font-weight:400}
.ac-item .ko{margin-left:6px;font-size:12px;color:var(--muted)}
#tp .t .ko,.ct-chip .ko{margin-left:4px;font-size:11px;opacity:.75}
.ct-chip.on .ko,#tp .t.on .ko{opacity:.9}
.chip.mine{box-shadow:inset 0 0 0 1.5px var(--c5)}
.chip.mine .t::before{content:"★ ";color:var(--c5)}`;
  document.head.append(css);

  // ---------- 화면에 뜻 붙이기 ----------
  function tag(el, text, where = "append") {
    if (el.dataset.ko) return;
    el.dataset.ko = "1";
    const k = ko(text);
    if (!k) return;
    const s = document.createElement("span");
    s.className = "ko";
    s.textContent = k;
    if (where === "after") el.after(s); else el.append(s);
    const host = el.closest(".chip,.ct-chip,.t,.ac-item");
    if (host && !host.title.includes(k)) host.title = (host.title ? host.title + " · " : "") + k;
  }
  // 내 태그(★)에 들어 있는 태그는 프롬프트 칩에 ★ 표시 — 실제로 들어갔는지 눈으로 확인용
  function markMine(rootEl) {
    const M = window.BC_MINE;
    rootEl.querySelectorAll(".chips .chip:not(.brk)").forEach((c) => {
      const t = c.querySelector(".t");
      const on = !!(M && t && M.has(norm(t.textContent)));
      if (c.classList.contains("mine") !== on) c.classList.toggle("mine", on);
    });
  }
  addEventListener("bc-tags-changed", () => markMine(document.body));
  function scan(rootEl) {
    if (!(rootEl instanceof Element)) return;
    markMine(rootEl);
    rootEl.querySelectorAll(".chip:not(.brk) > .t").forEach((t) => tag(t, t.textContent, "after"));     // 프롬프트 칩
    rootEl.querySelectorAll(".ac-item .n").forEach((n) => tag(n, n.firstChild ? n.firstChild.textContent : n.textContent));   // 자동완성
    rootEl.querySelectorAll("#tp .t[data-t]").forEach((t) => tag(t, t.dataset.t));                      // 태그 선택기
    rootEl.querySelectorAll(".ct-chip[data-t]").forEach((c) => { if (c.dataset.ko) return; const sm = c.querySelector("small"); const s0 = document.createElement("span"); if (sm) { c.dataset.ko = "1"; const k = ko(c.dataset.t); if (k) { s0.className = "ko"; s0.textContent = k; c.insertBefore(s0, sm); c.title = (c.title ? c.title + " · " : "") + k; } } else tag(c, c.dataset.t); });
    // 이름이 영어 태그인 항목(내 태그에 Danbooru 태그로 추가한 것 등)은 이름 자체를 한국어로
    rootEl.querySelectorAll("#tp .b:not([data-kl]), .seq-fx:not([data-kl]), .seq-fxsel .r:not([data-kl])").forEach((el) => {
      el.dataset.kl = "1";
      const tn = el.firstChild;
      if (!tn || tn.nodeType !== 3) return;
      const k = KO[norm(tn.textContent)];
      if (k) { el.title = (el.title ? el.title + " · " : "") + tn.textContent.trim(); tn.textContent = k; }
    });
    rootEl.querySelectorAll(".big-chips .chip:not([data-ko])").forEach((c) => {                         // 태그 추출 결과
      if (c.querySelector(".t")) return;
      const txt = [...c.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
      if (txt) tag(c, txt);
    });
  }
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; scan(document.body); }, 0);   // rAF는 창이 가려지면 멈춰서 setTimeout 사용
  }).observe(document.body, { childList: true, subtree: true });
  scan(document.body);

  // ---------- 자동완성 한국어 검색 ----------
  const HANGUL = /[ㄱ-ㆎ가-힣]/;
  const entries = Object.entries(KO);
  const prevApi = api;
  api = async function (path, opts) {   // eslint-disable-line no-global-assign
    if (typeof path === "string" && path.startsWith("/api/tags?")) {
      const q = decodeURIComponent((path.match(/[?&]q=([^&]*)/) || [])[1] || "").trim();
      if (q && HANGUL.test(q)) {
        if (!/[?&]online=0/.test(path)) return [];   // 온라인 보완은 하지 않음
        const ranked = entries
          .map(([en, k]) => ({ en, k, r: k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : 9 }))
          .filter((x) => x.r < 9)
          .sort((a, b) => a.r - b.r)
          .slice(0, 60);
        if (!ranked.length) return [];
        let info = {};
        try { info = await prevApi("/api/tags/lookup", { json: ranked.map((x) => x.en.replace(/ /g, "_")) }); } catch {}
        const limit = (state.settings && state.settings.suggestLimit) || 15;
        return ranked
          .map((x) => { const i = info[x.en.replace(/ /g, "_")]; return i ? { name: x.en.replace(/ /g, "_"), cat: i.cat, count: i.count, r: x.r } : null; })
          .filter((s, i, arr) => s && arr.findIndex((o) => o && o.name === s.name) === i)
          .sort((a, b) => a.r - b.r || b.count - a.count)
          .slice(0, limit)
          .map(({ r, ...s }) => s);
      }
    }
    return prevApi.apply(this, arguments);
  };

  // ---------- 설정: 켜기/끄기 ----------
  const st = document.querySelector(".settings");
  if (st) {
    const lab = document.createElement("label");
    lab.className = "check";
    lab.innerHTML = `<input type="checkbox"> 태그 한국어 뜻 표시 <small class="muted">(화면에만 표시 — 프롬프트에는 영어 태그로 적용, 자동완성에서 한국어 검색 가능)</small>`;
    const cb = lab.querySelector("input");
    cb.checked = on;
    cb.onchange = () => { on = cb.checked; root.classList.toggle("ko-on", on); try { localStorage.setItem(LS, on ? "1" : "0"); } catch {} };
    const hr = st.querySelector("hr");
    hr ? hr.before(lab) : st.append(lab);
  }
})();
