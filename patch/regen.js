// 다시 생성 — 그림이 잘못 나왔을 때 같은 프롬프트·워크플로·설정으로 새 시드로 다시 만들기
//  - 생성 탭 결과 아래: "↻ 다시 생성" (방금 그림 그대로) · "↻ 다시 생성 + 이 그림 기록 삭제"
//  - 그림을 눌러 여는 상세 창(갤러리·연작/시퀀스 결과 포함): 같은 두 버튼
//  - 연작/시퀀스 결과 칸의 ↻ 버튼은 series.js / sequence.js 안에 있음 (그 칸 자리에 다시 생성)
// Little Light와 BooruComfy(Ghost)가 같은 파일을 씀
(() => {
  const wfOf = (e) => { const w = String(e.workflow || "").split("@")[0]; return w === "기본 txt2img" || !w ? "builtin" : w; };   // 캐릭터 폴더 사본(이름@캐릭터)은 원래 워크플로로
  async function regen(entry, del) {
    if (!entry || !entry.positive) { toast("이 기록에는 프롬프트가 없어 다시 생성할 수 없습니다", "err"); return false; }
    const wf = wfOf(entry);
    if (wf !== "builtin" && state.wfMap && !state.wfMap[wf]) { toast(`워크플로 '${wf}'가 없어 다시 생성할 수 없습니다`, "err"); return false; }
    if (del && !confirm("같은 설정·새 시드로 다시 생성하고, 지금 그림의 기록은 삭제할까요?\n(로컬 사본 이미지도 삭제, ComfyUI 출력 폴더의 원본은 유지)")) return false;
    try {
      const res = await api("/api/generate", { json: { workflow: wf, positive: entry.positive, negative: entry.negative || "", params: { ...(entry.params || {}) }, randomSeed: true } });
      state.myPrompts.add(res.prompt_id); state.currentPrompt = res.prompt_id; state.lastSeed = res.seed;
      busy++;
      setProgress(0, `다시 생성 — 대기열에 추가됨 (시드 ${res.seed})`);
      toast(`다시 생성을 대기열에 넣었습니다 (시드 ${res.seed})`, "ok");
    } catch (e) { toast("다시 생성 실패:\n" + e.message, "err"); return false; }
    if (del && entry.id) {
      try {
        await api("/api/history?id=" + encodeURIComponent(entry.id), { method: "DELETE" });
        state.history = state.history.filter((h) => h.id !== entry.id);
        if ($("#tab-gallery").classList.contains("active")) renderGallery();
      } catch (e) { toast("기록 삭제 실패:\n" + e.message, "err"); }
    }
    return true;
  }
  window.BC_REGEN = regen;

  const css = document.createElement("style");
  css.textContent = ".bc-regen{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px}.bc-regen button{font-size:13px}";
  document.head.append(css);
  const bar = (entry, after) => {
    const d = document.createElement("div"); d.className = "bc-regen";
    d.innerHTML = '<button class="primary-ghost" data-r="0">↻ 다시 생성</button><button class="danger-ghost" data-r="1">↻ 다시 생성 + 이 그림 기록 삭제</button>';
    d.querySelectorAll("button").forEach((b) => (b.onclick = async () => { b.disabled = true; const ok = await regen(entry, b.dataset.r === "1"); b.disabled = false; if (ok && after) after(); }));
    return d;
  };

  // 생성 탭 결과 아래
  const _show = showResults;
  showResults = (entry) => { _show(entry); if (entry && entry.images && entry.images.length && entry.positive) $("#results").append(bar(entry)); };

  // 상세 창
  const _render = renderModal;
  renderModal = () => {
    _render();
    const entry = modalState && modalState.entry, b = $("#mInfo .btns");
    if (b && entry && entry.positive) b.after(bar(entry, () => { closeModal(); showTab("gen"); }));
  };
})();
