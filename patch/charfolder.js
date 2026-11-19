// 캐릭터별 폴더 저장 — 생성할 때 프롬프트로 캐릭터를 알아보고, ComfyUI output 아래 캐릭터 폴더(이름은 charnames.js)에 저장
// Little Light와 Ghost가 같은 파일을 씀 (Little Light는 output\LittleLight\<폴더>, Ghost는 output\<폴더>)
// 방법: 고른 워크플로의 "캐릭터용 사본"(이름@캐릭터, 목록엔 숨김)을 생성 직전에 최신 상태로 만들고 SaveImage 저장 경로만 바꿔서 그 사본으로 생성
//       ComfyUI와 연동된 워크플로는 ComfyUI의 원본 파일을 매번 새로 읽어 사본을 만들기 때문에 ComfyUI에서 고친 내용도 그대로 반영됨
(() => {
  // 캐릭터 = 바뀌지 않는 외모 태그(머리·눈)가 모두 들어 있으면 그 캐릭터 (의상은 바뀔 수 있으므로 보지 않음)
  // 캐릭터 목록·이름·저장 폴더는 charnames.js (설정 탭 '캐릭터 이름'에서 이름을 바꾸면 폴더도 그 이름)
  const CN = window.BC_CHARNAMES;
  const CHARS = () => CN.DEFS.map((d) => ({ id: d.id, ko: CN.name(d.id), en: CN.folder(d.id), sig: d.sig, keep: !!d.keep }));
  window.BC_CHARS = CHARS;
  const OTHER_IPA = 0.5;   // keep이 아닌 캐릭터의 마녀 화풍 참조 최대 가중치 (원래 1인 0.9 · 2인 0.6 · 5인 0.5) — 0.9면 머리·옷 색이 마녀(흑발·검은 옷)로 끌려감
  const DATA = window.LL ? "LittleLightData" : "BooruComfy_data", PREFIX = window.LL ? "LittleLight/" : "";  const KEY = "ll_charfolder";
  const on = () => { try { return localStorage.getItem(KEY) !== "0"; } catch { return true; } };
  const norm = (t) => t.trim().replace(/^BREAK\s*/i, "").replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").replace(/_/g, " ").toLowerCase();
  function find(positive) {
    const tags = new Set(String(positive || "").split(",").map(norm));
    return CHARS().find((c) => c.sig.every((t) => tags.has(t))) || null;   // 여러 캐릭터가 함께 나오면 목록 순서상 첫 캐릭터
  }
  const detect = (positive) => { const c = find(positive); return c ? c.en : ""; };   // 저장 폴더 이름
  window.BC_CHAR_DETECT = detect;
  window.BC_CHAR_ID = (positive) => { const c = find(positive); return c ? c.id : ""; };

  // ---------- 캐릭터용 사본 워크플로 ----------
  const made = new Map();   // 사본 이름 -> 마지막으로 저장한 그래프(JSON 문자열)
  async function variant(baseName, folder, keep) {
    const list = await api("/api/workflows");
    const base = list.find((w) => w.name === baseName);
    if (!base || !base.prompt) return baseName;
    let graph = base.prompt;
    if (base.source) { try { const u = await api("/api/comfy/userworkflow?path=" + encodeURIComponent(base.source)); if (u && u.prompt) graph = u.prompt; } catch {} }   // ComfyUI 원본 최신본
    graph = JSON.parse(JSON.stringify(graph));
    let saves = 0;
    for (const n of Object.values(graph)) {
      // ComfyUI output\[LittleLight\]<폴더>에 저장 (내 빌드는 앱 데이터 폴더 images\<폴더>가 그 폴더로 이어진 연결(정션)이라 거기서도 보임)
      if (n && n.class_type === "SaveImage" && n.inputs) { const p = String(n.inputs.filename_prefix || "BooruComfy"); n.inputs.filename_prefix = `${PREFIX}${folder}/${p.split("/").pop()}`; saves++; }
    }
    if (!saves) return baseName;   // 저장 노드가 없는 워크플로는 그대로
    // 마녀 그림(ref_witch)을 화풍 참조로 거는 워크플로: keep이 아닌 캐릭터는 참조를 약하게
    if (!keep) {
      const witch = new Set(Object.entries(graph).filter(([, n]) => n && n.class_type === "LoadImage" && /ref_witch/i.test(String(n.inputs && n.inputs.image))).map(([k]) => k));
      for (const n of Object.values(graph))
        if (n && /^IPAdapter/.test(n.class_type) && n.inputs && typeof n.inputs.weight === "number" && Array.isArray(n.inputs.image) && witch.has(String(n.inputs.image[0])))
          n.inputs.weight = Math.min(n.inputs.weight, OTHER_IPA);
    }
    const name = `${baseName}@${folder}`, js = JSON.stringify(graph);
    const old = list.find((w) => w.name === name);
    if (made.get(name) !== js && !(old && JSON.stringify(old.prompt) === js)) {
      await api("/api/workflows", { json: { name, prompt: graph, positive: base.positive, negative: base.negative, seeds: base.seeds, checkpoint: base.checkpoint || null, latent: base.latent || "", sampler: base.sampler || "", source: "" } });
    }
    made.set(name, js);
    return name;
  }
  window.BC_CHAR_VARIANT = variant;
  // 모든 생성 요청(생성 탭 · 연작 · 그 밖)을 가로채서 캐릭터용 사본으로 보냄
  const _api = api;
  api = async (url, opt) => {
    if (url === "/api/generate" && opt && opt.json && on()) {
      const j = opt.json, wf = j.workflow;
      if (wf && wf !== "builtin" && !wf.includes("@")) {
        const c = find(j.positive);
        if (c) {
          try { opt = { ...opt, json: { ...j, workflow: await variant(wf, c.en, c.keep) } }; }
          catch (e) { console.warn("캐릭터 폴더 사본을 만들지 못해 원래 워크플로로 생성", e); }
        }
      }
    }
    return _api(url, opt);
  };
  // 사본은 워크플로 선택 목록·워크플로 탭에서 숨김
  function hideVariants() {
    document.querySelectorAll("#wfSelect option").forEach((o) => { if (o.value.includes("@")) o.remove(); });
    document.querySelectorAll("#wfList .wf").forEach((d) => { const b = d.querySelector("b"); if (b && b.textContent.includes("@")) d.remove(); });
  }
  const _lw = loadWorkflows;
  loadWorkflows = async (...a) => { const r = await _lw(...a); hideVariants(); return r; };
  hideVariants(); setTimeout(hideVariants, 1500);

  // ---------- 설정 탭: 켜기/끄기 ----------
  function addSetting() {
    const anchor = document.querySelector("#tab-settings .field, #tab-settings .card");
    if (!anchor || document.querySelector("#bcCharFolder")) return !!anchor;
    const row = document.createElement("div");
    row.className = "field";
    row.innerHTML = `<label>캐릭터별 폴더 저장</label><label class="check"><input type="checkbox" id="bcCharFolder"> 캐릭터마다 따로 저장 <small class="muted">(ComfyUI output\\${PREFIX.replace("/", "\\")}&lt;캐릭터 폴더&gt; — 프롬프트의 머리·눈 태그로 알아봄, 폴더 이름은 아래 '캐릭터 이름'에서)</small></label>`;
    anchor.parentElement.insertBefore(row, anchor);
    const cb = row.querySelector("input");
    cb.checked = on();
    cb.onchange = () => { try { localStorage.setItem(KEY, cb.checked ? "1" : "0"); } catch {} toast(cb.checked ? "캐릭터별 폴더 저장을 켰습니다" : "캐릭터별 폴더 저장을 껐습니다", "ok"); };
    return true;
  }
  { let n = 0; const t = () => { if (!addSetting() && ++n < 20) setTimeout(t, 500); }; t(); }
})();
