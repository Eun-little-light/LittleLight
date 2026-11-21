// 빠른 모드 — 그림체를 정하는 기본 생성(KSampler)은 그대로 두고, 손질 단계의 steps만 줄여서 생성 시간을 줄임 (Little Light · Ghost 공용)
//  - 얼굴 보정(FaceDetailer 등 *Detailer*): steps → 최대 12 (원래 20, denoise 0.35라 12면 충분)
//  - 업스케일(UltimateSDUpscale): steps → 최대 8 (원래 16, denoise 0.25라 거의 차이 없음)
//  방법: 고른 워크플로의 "빠른 사본"(이름~fast, 목록엔 숨김)을 생성 직전에 최신 상태로 만들어 그 사본으로 생성
//        ComfyUI와 연동된 워크플로는 ComfyUI 원본을 새로 읽어 사본을 만듦 (charfolder.js와 같은 방식)
//  charfolder보다 먼저 불러와야 함(안쪽) → 캐릭터용 사본(이름@캐릭터)이 정해진 뒤 그 사본의 빠른 사본을 씀
//  설정 탭·생성 버튼 위 대기열 줄에서 켜고 끔
(() => {
  const KEY = "bc_fast_on", TAG = "~fast";
  const LIMIT = [[/Detailer/, 12], [/^UltimateSDUpscale/, 8]];
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  let on = ls.get(KEY, true);
  const made = new Map();

  function shrink(graph) {
    let n = 0;
    for (const node of Object.values(graph)) {
      if (!node || !node.inputs || typeof node.inputs.steps !== "number") continue;
      const lim = LIMIT.find(([re]) => re.test(String(node.class_type || "")));
      if (lim && node.inputs.steps > lim[1]) { node.inputs.steps = lim[1]; n++; }
    }
    return n;
  }
  async function variant(baseName) {
    const list = await _api("/api/workflows");
    const base = list.find((w) => w.name === baseName);
    if (!base || !base.prompt) return baseName;
    let graph = base.prompt;
    if (base.source) { try { const u = await _api("/api/comfy/userworkflow?path=" + encodeURIComponent(base.source)); if (u && u.prompt) graph = u.prompt; } catch {} }
    graph = JSON.parse(JSON.stringify(graph));
    if (!shrink(graph)) return baseName;   // 줄일 단계가 없는 워크플로는 그대로
    const name = baseName + TAG, js = JSON.stringify(graph);
    const old = list.find((w) => w.name === name);
    if (made.get(name) !== js && !(old && JSON.stringify(old.prompt) === js))
      await _api("/api/workflows", { json: { name, prompt: graph, positive: base.positive, negative: base.negative, seeds: base.seeds, checkpoint: base.checkpoint || null, latent: base.latent || "", sampler: base.sampler || "", source: "" } });
    made.set(name, js);
    return name;
  }
  const _api = api;
  api = async (url, opt) => {
    if (on && url === "/api/generate" && opt && opt.json) {
      const wf = opt.json.workflow;
      if (wf && wf !== "builtin" && !String(wf).endsWith(TAG)) {
        try { opt = { ...opt, json: { ...opt.json, workflow: await variant(wf) } }; }
        catch (e) { console.warn("빠른 사본을 만들지 못해 원래 워크플로로 생성", e); }
      }
    }
    return _api(url, opt);
  };
  window.BC_FAST = { variant, shrink, get on() { return on; } };

  // 빠른 사본은 워크플로 선택 목록·워크플로 탭에서 숨김
  function hide() {
    document.querySelectorAll("#wfSelect option").forEach((o) => { if (o.value.endsWith(TAG)) o.remove(); });
    document.querySelectorAll("#wfList .wf").forEach((d) => { const b = d.querySelector("b"); if (b && b.textContent.trim().endsWith(TAG)) d.remove(); });
  }
  const _lw = loadWorkflows;
  loadWorkflows = async (...a) => { const r = await _lw(...a); hide(); return r; };
  hide(); setTimeout(hide, 1500);

  // ---------- 켜고 끄기: 설정 탭 + 생성 버튼 위 대기열 줄 ----------
  const boxes = new Set();
  function set(v) { on = v; ls.set(KEY, on); boxes.forEach((b) => (b.checked = on)); toast(on ? "빠른 모드를 켰습니다 (얼굴 보정·업스케일 steps 줄임)" : "빠른 모드를 껐습니다 (워크플로 원래 설정)", "ok"); }
  function bind(cb) { cb.checked = on; cb.onchange = () => set(cb.checked); boxes.add(cb); }
  function addSetting() {
    const st = document.querySelector(".settings"); if (!st) return false;
    if (st.querySelector(".bc-fast")) return true;
    const d = document.createElement("div"); d.className = "field bc-fast";
    d.innerHTML = `<label>빠른 모드 <small class="muted">— 기본 생성은 그대로, 얼굴 보정 steps 최대 12 · 업스케일 steps 최대 8로 줄여 생성 시간 단축 (그림체·구도는 같음)</small></label><label class="check"><input type="checkbox"> 켜기</label>`;
    const hr = st.querySelector("hr"); hr ? hr.before(d) : st.append(d);
    bind(d.querySelector("input")); return true;
  }
  function addRow() {
    document.querySelectorAll(".bc-queue").forEach((q) => {
      if (q.querySelector(".bc-fast-cb")) return;
      const l = document.createElement("label"); l.className = "check bc-fast-cb"; l.title = "얼굴 보정·업스케일 steps를 줄여 더 빨리 생성";
      l.innerHTML = `<input type="checkbox"> 빠른 모드`;
      q.append(l); bind(l.querySelector("input"));
    });
  }
  { let n = 0; const t = setInterval(() => { addSetting(); addRow(); if (++n > 16) clearInterval(t); }, 500); }
})();
