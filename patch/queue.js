// 생성 우선순위 — ComfyUI 대기열 창 (Little Light · Ghost 공용)
//  - 생성 버튼 위 '대기열' 줄: 지금 대기 수 · [대기열 보기] · [새 생성은 맨 앞으로] 스위치
//  - 대기열 창: 실행 중 1개 + 기다리는 작업 목록 — 작업마다 '맨 앞으로' · '맨 뒤로' · '취소', 실행 중은 '중단'
//  - 순서 바꾸기: ComfyUI에는 순서 변경 기능이 없어서, 작업을 대기열에서 빼고 같은 작업 번호(prompt_id)로 앞/뒤에 다시 넣음
//    → 앱의 진행 표시·결과 연결·연작/시퀀스 칸은 그대로 이어짐
//  - '새 생성은 맨 앞으로': 앱에서 넣는 생성(/api/generate)을 넣자마자 맨 앞으로. 연작/시퀀스처럼 한꺼번에 넣으면 그 묶음의 순서는 유지
//  - 예상 완료 시간: 대기열 줄에 '약 N분 뒤 모두 완료 (시각)', 대기열 창에 작업마다 한 장 시간·완료 시각 (빠른 모드 작업은 ⚡ 표시, steps가 줄어 짧게 계산)
(() => {
  const KEY = "bc_queue_front";
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  let frontNew = ls.get(KEY, false);
  const getQ = async () => { const r = await fetch("/comfy/queue"); if (!r.ok) throw new Error("대기열 " + r.status); return r.json(); };
  const post = (u, b) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

  // 작업 하나를 맨 앞(front=true) 또는 맨 뒤로 — 빼고 같은 번호로 다시 넣기
  async function move(id, front, q) {
    q = q || await getQ();
    const e = (q.queue_pending || []).find((x) => x[1] === id);
    if (!e) return false;                                   // 이미 실행 중이거나 끝남
    const [, pid, prompt, extra] = e;
    await post("/comfy/queue", { delete: [pid] });
    const body = { prompt, prompt_id: pid, extra_data: extra || {}, front: !!front };
    if (extra && extra.client_id) body.client_id = extra.client_id;
    const r = await post("/comfy/prompt", body);
    if (!r.ok) { const t = await r.text().catch(() => ""); throw new Error("다시 넣기 실패 " + r.status + " " + t.slice(0, 160)); }
    return true;
  }
  async function cancel(id) { await post("/comfy/queue", { delete: [id] }); }
  async function stopRunning() { await fetch("/comfy/interrupt", { method: "POST" }); }

  // 앱에서 넣는 생성 → 맨 앞으로 (묶음은 순서 유지: 마지막 것부터 앞으로 보내면 원래 순서대로 맨 앞에 놓임)
  let batch = [], timer = 0;
  async function flush() {
    const ids = batch; batch = [];
    try { const q = await getQ(); for (const id of ids.slice().reverse()) await move(id, true, q); } catch (e) { console.warn("맨 앞으로 실패", e); }
    refresh();
  }
  const _api = api;
  api = async (url, opt) => {
    const r = await _api(url, opt);
    if (url === "/api/generate" && frontNew && r && r.prompt_id) { batch.push(r.prompt_id); clearTimeout(timer); timer = setTimeout(flush, 500); }
    else if (url === "/api/generate" && r && r.prompt_id) { clearTimeout(timer); timer = setTimeout(refresh, 400); }   // 넣자마자 예상 완료 시간 갱신
    return r;
  };

  // ---------- 생성 버튼 위 줄 ----------
  const css = document.createElement("style");
  css.textContent = ".bc-queue{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12.5px}.bc-queue .n b{color:var(--accent)}" +
    ".bc-qdlg{position:fixed;inset:0;z-index:250;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}.bc-qdlg.hidden{display:none}" +
    ".bc-qdlg .in{background:var(--panel,#1c1c1e);color:var(--text,inherit);border-radius:16px;width:min(720px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4)}" +
    ".bc-qdlg .hd{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border,rgba(127,127,127,.25))}.bc-qdlg .bd{padding:10px 16px 14px;overflow:auto}" +
    ".bc-qi{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border,rgba(127,127,127,.15));font-size:12.5px}" +
    ".bc-qi .no{width:26px;text-align:right;color:var(--muted);flex:none}.bc-qi .tx{flex:1;min-width:0}.bc-qi .tx b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".bc-qi .tx small{display:block;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bc-qi.run .no{color:var(--accent)}.bc-qi button{flex:none}";
  document.head.append(css);
  const rows = new Set();
  function makeRow() {
    const d = document.createElement("div"); d.className = "field bc-queue";
    d.innerHTML = `<span class="n">대기열 <b>-</b></span><button type="button" class="mini" data-q="open">대기열 보기 · 순서 바꾸기</button><label class="check"><input type="checkbox" data-q="front"> 새 생성은 맨 앞으로</label>`;
    d.querySelector('[data-q="open"]').onclick = openDlg;
    const cb = d.querySelector('[data-q="front"]'); cb.checked = frontNew;
    cb.onchange = () => { frontNew = cb.checked; ls.set(KEY, frontNew); rows.forEach((x) => (x.querySelector('[data-q="front"]').checked = frontNew)); toast(frontNew ? "새 생성을 대기열 맨 앞에 넣습니다" : "새 생성을 대기열 맨 뒤에 넣습니다 (기본)", "ok"); };
    rows.add(d); return d;
  }
  const place = () => document.querySelectorAll(".gen-buttons").forEach((g) => {
    if (g.parentElement.querySelector(":scope > .bc-queue")) return;
    const bust = g.previousElementSibling && g.previousElementSibling.classList.contains("bc-bust") ? g.previousElementSibling : g;
    bust.before(makeRow());
  });
  { let n = 0; const t = setInterval(() => { place(); if (++n > 14) clearInterval(t); }, 500); place(); }

  // ---------- 대기열 창 ----------
  let dlg = null, live = 0;
  const esc2 = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function describe(prompt, extra) {
    const nodes = Object.values(prompt || {});
    const save = nodes.find((n) => n && n.class_type === "SaveImage");
    const text = nodes.map((n) => n && n.class_type === "CLIPTextEncode" && typeof n.inputs.text === "string" ? n.inputs.text : "").find((t) => t) || "";
    const ks = nodes.find((n) => n && /KSampler/.test(n.class_type) && n.inputs && n.inputs.seed != null);
    const isEdit = extra && extra.client_id === "ll-editor" || nodes.some((n) => n && n.class_type === "RemoveBackground");
    const title = isEdit ? "✂ 누끼 (배경 제거)" : save ? String(save.inputs.filename_prefix || "").replace(/^Claude\//, "") : "작업";
    return { title, sub: isEdit ? "편집 탭" : (ks ? "시드 " + ks.inputs.seed + " · " : "") + text.slice(0, 120) };
  }
  // ---------- 예상 완료 시간 ----------
  //  작업마다 실제로 들어간 설정(인원 · KSampler/얼굴 보정/업스케일 steps · IPAdapter)으로 한 장 시간을 어림
  //  → 빠른 모드로 넣은 작업은 steps가 줄어 있어서 자동으로 짧게 계산됨
  //  이 PC에서 끝난 생성 시간(ComfyUI 기록)을 같은 설정끼리 배워서 점점 정확해짐 (처음엔 RTX 3080 측정값)
  const KEY_T = "bc_eta_v1", KEY_S = "bc_eta_seen";
  let times = ls.get(KEY_T, {}); const seen = new Set(ls.get(KEY_S, []));
  const runSeen = new Map();   // 실행 중 작업을 처음 본 시각
  function sig(prompt) {
    let ks = 0, fd = 0, up = 0, upb = 1, ipa = false, edit = false, text = "";
    for (const n of Object.values(prompt || {})) {
      if (!n || !n.inputs) continue; const c = String(n.class_type || "");
      if (c === "RemoveBackground") edit = true;
      if (/^KSampler/.test(c)) ks = Math.max(ks, +n.inputs.steps || 0);
      if (/Detailer/.test(c)) fd = Math.max(fd, +n.inputs.steps || 0);
      if (/^UltimateSDUpscale/.test(c)) { up = Math.max(up, +n.inputs.steps || 0); upb = +n.inputs.upscale_by || 1; }
      if (/IPAdapter/.test(c)) ipa = true;
      if (c === "CLIPTextEncode" && !text && typeof n.inputs.text === "string") text = n.inputs.text;
    }
    if (edit) return { key: "edit", edit: true };
    let people = 0; text.replace(/(?:^|[\s,(])(\d)\+?(?:girls?|boys?|others?)\b/gi, (m, d) => { people += +d; return m; });
    people = Math.min(Math.max(people, 1), 6);
    const fast = (fd > 0 && fd <= 12) || (up > 0 && up <= 8);
    return { key: `${people}|${ks}|${fd}|${up}|${upb}|${ipa ? 1 : 0}`, people, fast, ipa };
  }
  const guess = (s) => s.edit ? 8 : (s.fast ? 43 + 6 * (s.people - 1) : 58 + 8 * (s.people - 1)) + (s.ipa ? 5 : 0);
  const est = (prompt) => { const s = sig(prompt), t = times[s.key]; return t && t.n ? t.avg : guess(s); };
  async function learn() {
    let h; try { const r = await fetch("/comfy/history?max_items=8"); if (!r.ok) return; h = await r.json(); } catch { return; }
    let changed = false;
    for (const [id, v] of Object.entries(h || {})) {
      if (seen.has(id)) continue; seen.add(id); changed = true;
      const msgs = (v.status && v.status.messages) || []; let st = 0, en = 0;
      for (const m of msgs) { if (m[0] === "execution_start") st = m[1].timestamp; if (m[0] === "execution_success") en = m[1].timestamp; }
      const g = v.prompt && v.prompt[2]; if (!st || !en || !g) continue;
      const d = (en - st) / 1000, s = sig(g), e = est(g);
      if (d < 2 || d > e * 3 + 30) continue;   // 모델 처음 올리기 · 캐시로 건너뛴 것 같은 튀는 값은 빼고
      const t = times[s.key]; times[s.key] = t && t.n ? { avg: t.avg * 0.7 + d * 0.3, n: t.n + 1 } : { avg: d, n: 1 };
    }
    if (changed) { ls.set(KEY_T, times); ls.set(KEY_S, [...seen].slice(-300)); }
  }
  const fmtDur = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return m ? `${m}분${s % 60 ? " " + (s % 60) + "초" : ""}` : `${s}초`; };
  const fmtAt = (s) => new Date(Date.now() + s * 1000).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  window.BC_ETA = { sig, est, guess, get times() { return times; } };

  async function refresh() {
    let q; try { q = await getQ(); } catch { return; }
    learn();
    const run = q.queue_running || [], pend = (q.queue_pending || []).slice().sort((a, b) => a[0] - b[0]);
    // 완료까지 남은 시간: 실행 중(어림 - 지난 시간) + 기다리는 작업 합
    const now = Date.now(); for (const id of [...runSeen.keys()]) if (!run.some((e) => e[1] === id)) runSeen.delete(id);
    let acc = 0; const done = new Map();
    for (const e of run) { if (!runSeen.has(e[1])) runSeen.set(e[1], now); const t = est(e[2]); acc += Math.max(t - (now - runSeen.get(e[1])) / 1000, t * 0.1); done.set(e[1], acc); }
    for (const e of pend) { acc += est(e[2]); done.set(e[1], acc); }
    const etaTxt = acc > 0 ? ` · <span style="white-space:nowrap">약 ${fmtDur(acc)} 뒤 모두 완료 (${fmtAt(acc)})</span>` : "";
    rows.forEach((d) => (d.querySelector(".n b").innerHTML = run.length + pend.length ? `${run.length ? "실행 1" : "실행 0"} · 대기 ${pend.length}${etaTxt}` : "비어 있음"));
    if (!dlg || dlg.classList.contains("hidden")) return;
    const item = (e, i, isRun) => { const d = describe(e[2], e[3]), s = sig(e[2]), left = done.get(e[1]) || 0;
      d.sub = `${s.fast ? "⚡ 빠른 모드 · " : ""}한 장 약 ${fmtDur(est(e[2]))} · ${fmtAt(left)}쯤 완료 · ` + d.sub;
      return `<div class="bc-qi${isRun ? " run" : ""}"><span class="no">${isRun ? "▶" : i + 1}</span><span class="tx"><b>${esc2(d.title)}</b><small>${esc2(d.sub)}</small></span>` +
        (isRun ? `<button type="button" class="mini danger-ghost" data-a="stop">중단</button>` :
          `<button type="button" class="mini" data-a="front" data-id="${e[1]}"${i === 0 ? " disabled" : ""}>맨 앞으로</button><button type="button" class="mini" data-a="back" data-id="${e[1]}"${i === pend.length - 1 ? " disabled" : ""}>맨 뒤로</button><button type="button" class="mini danger-ghost" data-a="cancel" data-id="${e[1]}">취소</button>`) + `</div>`; };
    dlg.querySelector(".bd").innerHTML = (run.length || pend.length) ? run.map((e) => item(e, 0, true)).join("") + pend.map((e, i) => item(e, i, false)).join("") : '<div class="muted" style="padding:10px 0">대기열이 비어 있습니다</div>';
  }
  function openDlg() {
    if (!dlg) {
      dlg = document.createElement("div"); dlg.className = "bc-qdlg hidden";
      dlg.innerHTML = `<div class="in"><div class="hd"><b>생성 대기열 — 우선순위</b><span class="muted" style="font-size:12px;flex:1">ComfyUI 전체 대기열 (다른 프로그램에서 넣은 작업 포함) · 예상 시간은 이 PC에서 끝난 생성 기록으로 어림</span><button type="button" class="mini" data-x>닫기</button></div><div class="bd"></div></div>`;
      document.body.append(dlg);
      dlg.onclick = async (e) => {
        if (e.target === dlg || e.target.closest("[data-x]")) { dlg.classList.add("hidden"); clearInterval(live); return; }
        const b = e.target.closest("button[data-a]"); if (!b) return;
        b.disabled = true;
        try {
          if (b.dataset.a === "stop") await stopRunning();
          else if (b.dataset.a === "cancel") await cancel(b.dataset.id);
          else if (!(await move(b.dataset.id, b.dataset.a === "front"))) toast("이미 실행 중이거나 끝난 작업입니다");
        } catch (err) { toast(String(err.message || err), "err"); }
        refresh();
      };
    }
    dlg.classList.remove("hidden"); refresh(); clearInterval(live); live = setInterval(refresh, 2000);
  }
  setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5000); refresh();
  window.BC_QUEUE = { move, cancel, open: openDlg, refresh };
})();
