// 프리셋 드롭다운 → 내렸을 때 사각 타일로 고르는 패널
(() => {
  const sel = document.querySelector("#presetSelect");
  if (!sel) return;

  // 이름 앞부분(첫 "_" 앞)으로 묶음. 표시 순서
  const ORDER = ["캐릭터", "체위", "5인", "5인보조", "오피스", "바니걸", "메이드", "흑속옷", "백속옷", "알몸", "복장", "오피스상태", "바니걸상태", "메이드상태", "속옷상태", "상태", "반응", "이펙트", "연출", "상황", "배경"];
  const TITLE = { "캐릭터": "캐릭터 · 기타", "5인보조": "5인 보조", "흑속옷": "검은 속옷", "백속옷": "흰 속옷", "오피스상태": "오피스 상태", "바니걸상태": "바니걸 상태", "메이드상태": "메이드 상태", "속옷상태": "속옷 상태" };
  const PRE = /^([^\s_()\-]+)_(.+)$/;   // "체위_정상위_기본" 처럼 공백 없는 접두어만 묶음
  const groupOf = (n) => (PRE.test(n) ? n.match(PRE)[1] : "캐릭터");
  const labelOf = (n) => (PRE.test(n) ? n.match(PRE)[2].replace(/_/g, " ") : n);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const st = document.createElement("style");
  st.textContent = `
.pg-wrap{position:relative;flex:1;min-width:180px}
.pg-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;background:var(--bg)}
.pg-btn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-btn.empty span{color:var(--muted)}
.pg-pop{position:absolute;left:0;top:calc(100% + 6px);z-index:40;width:min(760px,calc(100vw - 32px));max-height:min(70vh,640px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 12px 32px rgba(0,0,0,.45);padding:12px}
.pg-pop.hidden{display:none}
.pg-top{display:flex;gap:8px;align-items:center;position:sticky;top:-12px;background:var(--panel);padding:2px 0 10px;margin-top:-2px;z-index:1}
.pg-top input{flex:1;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 10px}
.pg-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.pg-tabs button{padding:4px 10px;font-size:12px;border-radius:8px}
.pg-tabs button.on{border-color:var(--accent);color:var(--accent);font-weight:700}
.pg-sec h4{margin:10px 0 6px;font-size:12px;color:var(--muted);font-weight:600}
.pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.pg-tile{min-height:58px;padding:8px;border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;line-height:1.3;word-break:keep-all}
.pg-tile.on{border-color:var(--accent);color:var(--accent);font-weight:700;background:color-mix(in srgb,var(--accent) 15%,var(--panel2))}
.pg-empty{color:var(--muted);padding:16px;text-align:center}`;
  document.head.append(st);

  const wrap = document.createElement("div");
  wrap.className = "pg-wrap";
  wrap.innerHTML = `<button type="button" class="pg-btn"><span></span><b>▾</b></button>
<div class="pg-pop hidden"><div class="pg-top"><input type="search" placeholder="프리셋 검색…"><button type="button" class="mini pg-close">닫기</button></div>
<div class="pg-tabs"></div><div class="pg-body"></div></div>`;
  sel.after(wrap);
  sel.style.display = "none";
  const btn = wrap.querySelector(".pg-btn"), pop = wrap.querySelector(".pg-pop"), body = wrap.querySelector(".pg-body"),
    tabs = wrap.querySelector(".pg-tabs"), search = wrap.querySelector("input");
  let tab = "전체";

  function names() { return [...sel.options].map((o) => o.value).filter((v) => v && !v.startsWith("@")); }   // "@"로 시작 = 내부 저장용
  function syncLabel() {
    const v = sel.value;
    btn.classList.toggle("empty", !v);
    btn.querySelector("span").textContent = v ? v : "— 프리셋 선택 —";
    btn.title = v || "";
  }
  function render() {
    const q = search.value.trim().toLowerCase();
    const groups = new Map();
    for (const n of names()) {
      if (q && !n.toLowerCase().includes(q)) continue;
      const g = groupOf(n);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(n);
    }
    const keys = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    if (tab !== "전체" && !groups.has(tab)) tab = "전체";
    tabs.innerHTML = ["전체", ...keys].map((k) => `<button type="button" class="${k === tab ? "on" : ""}" data-k="${esc(k)}">${esc(TITLE[k] || k)}${k === "전체" ? "" : ` <small>${groups.get(k).length}</small>`}</button>`).join("");
    const shown = tab === "전체" ? keys : [tab];
    body.innerHTML = shown.length ? shown.map((k) => `<div class="pg-sec"><h4>${esc(TITLE[k] || k)}</h4><div class="pg-grid">${groups.get(k).map((n) =>
      `<button type="button" class="pg-tile${n === sel.value ? " on" : ""}" data-n="${esc(n)}" title="${esc(n)}">${esc(labelOf(n))}</button>`).join("")}</div></div>`).join("")
      : `<div class="pg-empty">맞는 프리셋이 없습니다</div>`;
  }
  const open = () => { pop.classList.remove("hidden"); render(); search.focus(); };
  const close = () => pop.classList.add("hidden");

  btn.onclick = () => (pop.classList.contains("hidden") ? open() : close());
  wrap.querySelector(".pg-close").onclick = close;
  search.oninput = render;
  tabs.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.k; render(); };
  body.onclick = (e) => {
    const t = e.target.closest(".pg-tile"); if (!t) return;
    sel.value = t.dataset.n;
    sel.dispatchEvent(new Event("change"));
    close();
  };
  document.addEventListener("mousedown", (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // 앱 코드가 목록을 다시 채우거나 값을 바꿔도 표시를 맞춘다
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  Object.defineProperty(sel, "value", { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); syncLabel(); }, configurable: true });
  sel.addEventListener("change", syncLabel);
  new MutationObserver(() => { syncLabel(); if (!pop.classList.contains("hidden")) render(); }).observe(sel, { childList: true });
  syncLabel();
})();
