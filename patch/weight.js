// 가중치 다중 선택 — 여러 태그를 한꺼번에 골라 가중치를 같이 조절
//  · 칩: Shift+클릭(또는 "다중 선택" 켜고 클릭)으로 여러 개 선택 → 아래 막대에서 −0.05 / +0.05 / 값 지정 / 1.0으로
//  · 입력칸: 여러 태그를 드래그로 선택한 뒤 Ctrl+↑/↓ → 선택 범위의 태그 전부 ±0.05
(() => {
  const STEP = 0.05;
  const css = document.createElement("style");
  css.textContent = `
.chip.wsel{outline:2px solid var(--accent);outline-offset:1px;background:color-mix(in srgb,var(--accent) 22%,var(--panel))!important}
.wbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--accent) 10%,var(--panel2))}
.wbar.hidden{display:none}
.wbar b{font-size:12.5px;margin-right:4px}
.wbar input{width:70px!important;padding:4px 8px!important}
.wbar .sp{flex:1}
.wmode.on{background:var(--accent)!important;color:#fff!important}`;
  document.head.append(css);

  function setup(ed) {
    const card = ed.ta.closest(".prompt-card");
    if (!card) return;
    const sel = new Set();
    let mode = false, lastCount = -1;

    // 다중 선택 토글 버튼 (터치용)
    const tools = card.querySelector(".head-tools");
    const tbtn = document.createElement("button");
    tbtn.className = "mini wmode"; tbtn.type = "button"; tbtn.textContent = "다중 선택";
    tbtn.title = "켜면 칩을 누를 때 가중치용으로 여러 개 선택 (Shift+클릭도 가능)";
    tools && tools.prepend(tbtn);
    // 가중치 초기화: 이 칸의 모든 태그를 1.0으로
    const rbtn = document.createElement("button");
    rbtn.className = "mini"; rbtn.type = "button"; rbtn.textContent = "가중치 초기화";
    rbtn.title = "이 프롬프트의 모든 태그 가중치를 1.0으로 (태그는 그대로)";
    rbtn.onclick = () => {
      const r = ed.raws(); let n = 0;
      const out = r.map((x) => { if (isBreak(x)) return x; const { text, weight } = parseToken(x); if (Math.abs(weight - 1) > 0.001) n++; return formatToken(text, 1); });
      if (!n) return toast("가중치가 붙은 태그가 없습니다");
      sel.clear(); lastCount = out.length; ed.setTokens(out);
      toast(`${n}개 태그 가중치를 1.0으로 초기화했습니다`, "ok");
    };
    tbtn.after(rbtn);

    // 선택 막대
    const bar = document.createElement("div");
    bar.className = "wbar hidden";
    bar.innerHTML = `<b class="cnt"></b><button class="mini" data-w="-1">−0.05</button><button class="mini" data-w="1">+0.05</button>
<input type="number" step="0.05" min="0" max="3" value="1.2" title="지정할 가중치"><button class="mini primary-ghost" data-w="set">값 적용</button><button class="mini" data-w="reset">1.0으로</button>
<span class="sp"></span><button class="mini" data-w="all">모두 선택</button><button class="mini" data-w="none">선택 해제</button>`;
    ed.chips.after(bar);

    const chipEls = () => [...ed.chips.querySelectorAll(".chip")];
    function paint() {
      const els = chipEls();
      if (lastCount !== -1 && els.length !== lastCount) sel.clear();   // 태그 수가 바뀌면 선택 초기화
      lastCount = els.length;
      els.forEach((el, i) => el.classList.toggle("wsel", sel.has(i)));
      bar.classList.toggle("hidden", !sel.size);
      bar.querySelector(".cnt").textContent = `${sel.size}개 선택`;
      tbtn.classList.toggle("on", mode);
    }
    new MutationObserver(paint).observe(ed.chips, { childList: true });

    // 칩 클릭 가로채기 (Shift 또는 다중 선택 모드일 때만)
    ed.chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || !(e.shiftKey || mode) || e.target.closest("button")) return;
      e.stopPropagation(); e.preventDefault();
      const i = chipEls().indexOf(chip);
      if (chip.classList.contains("brk")) return;
      sel.has(i) ? sel.delete(i) : sel.add(i);
      paint();
    }, true);

    function apply(fn) {
      const r = ed.raws();
      let n = 0;
      for (const i of sel) {
        if (i >= r.length || isBreak(r[i])) continue;
        const { text, weight } = parseToken(r[i]);
        r[i] = formatToken(text, Math.max(0, Math.round(fn(weight) * 100) / 100));
        n++;
      }
      lastCount = r.length;   // 같은 개수로 다시 그려지므로 선택 유지
      ed.setTokens(r);
      return n;
    }
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-w]"); if (!b) return;
      const w = b.dataset.w;
      if (w === "none") { sel.clear(); paint(); return; }
      if (w === "all") { chipEls().forEach((el, i) => { if (!el.classList.contains("brk")) sel.add(i); }); paint(); return; }
      let n = 0;
      if (w === "set") { const v = parseFloat(bar.querySelector("input").value); if (!(v >= 0)) return toast("가중치 값을 확인하세요", "err"); n = apply(() => v); toast(`${n}개 태그 가중치 → ${v.toFixed(2)}`, "ok"); }
      else if (w === "reset") { n = apply(() => 1); toast(`${n}개 태그 가중치 1.0으로`, "ok"); }
      else n = apply((x) => x + (+w) * STEP);
    });
    tbtn.addEventListener("click", () => { mode = !mode; if (!mode) sel.clear(); paint(); });

    // 입력칸에서 여러 태그를 드래그 선택 후 Ctrl+↑/↓
    ed.ta.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey) || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const a = ed.ta.selectionStart, z = ed.ta.selectionEnd;
      if (a === z) return;   // 범위 선택이 없으면 원래 동작(커서 위치 태그 하나)
      const toks = ed.tokens();
      const idx = toks.map((t, i) => (t.start < z && t.end > a && !isBreak(t.raw) ? i : -1)).filter((i) => i >= 0);
      if (idx.length < 2) return;   // 한 개면 원래 동작
      e.preventDefault(); e.stopImmediatePropagation();
      const d = e.key === "ArrowUp" ? STEP : -STEP;
      const r = ed.raws();
      for (const i of idx) { const { text, weight } = parseToken(r[i]); r[i] = formatToken(text, Math.max(0, Math.round((weight + d) * 100) / 100)); }
      ed.setTokens(r);
      const nt = ed.tokens();   // 바뀐 길이에 맞춰 같은 태그 범위를 다시 선택
      ed.ta.setSelectionRange(nt[idx[0]].start, nt[idx[idx.length - 1]].end);
      ed.ta.focus();
    }, true);

    paint();
  }
  ["positive", "negative"].forEach((k) => editors[k] && setup(editors[k]));
})();
