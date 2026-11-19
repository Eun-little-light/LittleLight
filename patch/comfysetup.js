// ComfyUI 자동 설정 — exe만으로 쓸 수 있게, ComfyUI에 연결되면 한 번 실행
//  1. 참고 그림(embed.js의 LL_REF_IMAGES)이 ComfyUI input에 없으면 앱의 ComfyUI 중계(/comfy/upload/image)로 올림
//     → ComfyUI 설치 위치와 상관없이 동작 (실행기의 파일 복사가 없어도 됨). 이미 있으면 건드리지 않음
//  2. exe에 들어 있는 워크플로(embed.js의 LL_EMBED_WFS — 마녀 화풍 5개)가 앱 목록에 없으면 등록
//     (파스텔·Plain·푸른 밤 워크플로는 pastel.js가 등록)
//  3. 워크플로가 찾는 모델 파일이 없으면, 확장자만 다른 같은 이름(4x-AnimeSharp.pth 등)이나 Civitai 원래 파일 이름(ALIASES)으로 고침
//  - ComfyUI가 나중에 켜지면 연결되는 순간 실행 (10초마다 확인, 성공하면 멈춤)
//  - ComfyUI 화면의 워크플로 목록에 넣는 것은 앱 중계가 막혀 있어 하지 않음 (생성에는 필요 없음)
// Little Light와 Ghost가 같은 파일을 씀
(() => {
  const REFS = window.LL_REF_IMAGES || {}, WFS = window.LL_EMBED_WFS || [];
  let busy = false, done = false;
  // ComfyUI input 폴더의 그림 목록 (못 읽으면 null → 올리지 않음: 이미 있는 그림을 이름 (1)로 또 올리지 않게)
  async function inputFiles() { const o = await options("LoadImage", "image"); return o ? new Set(o) : null; }
  // 3. 모델 파일 이름 자동 맞춤 — 워크플로가 찾는 파일이 ComfyUI에 없고, 확장자만 다른 같은 이름 파일이 하나 있으면 그 파일로 고쳐 저장
  //    (예: 4x-AnimeSharp.safetensors가 없고 원본 4x-AnimeSharp.pth만 있을 때). 하위 폴더(bbox/ 등)가 달라도 이름이 같으면 맞춤
  const MODEL_FIELDS = { CheckpointLoaderSimple: "ckpt_name", LoraLoader: "lora_name", IPAdapterModelLoader: "ipadapter_file", CLIPVisionLoader: "clip_name", UpscaleModelLoader: "model_name", UltralyticsDetectorProvider: "model_name" };
  const stem = (p) => String(p).split(/[\\/]/).pop().replace(/\.[^.]+$/, "").toLowerCase();
  // 배포처에서 받은 원래 파일 이름 (Civitai 등) — 이 이름으로 넣어도 워크플로가 찾는 이름 대신 씀 (이름은 소문자 · 확장자 없이)
  const ALIASES = {
    "waiillustrioussdxl_v170": ["wai-nsfw-illustrious-17"],
    "il_saturation_slider": ["il_saturation_slider_d1"],
    "il_color_temp_slider_d1": ["il_color_temp_slider"],
    "apocryphal-pastel-il_v18": ["herrscheragga2025_apocryphal-ultmt-il_v2"],
    "smooth-lighting-enhancer-noobai-illustrious": ["sle_v2", "smooth_lighting_enhancer"],
    "noobipamark1_mark1": ["noob-ipa-mark1"],
  };
  async function options(cls, field) {
    const r = await fetch("/comfy/object_info/" + cls); if (!r.ok) return null;
    const v = (((await r.json())[cls] || {}).input || {}).required || {}, x = v[field];
    if (!Array.isArray(x)) return null;
    if (Array.isArray(x[0])) return x[0];                       // 예전 형식: [[...이름들], {...}]
    if (x[0] === "COMBO" && x[1] && Array.isArray(x[1].options)) return x[1].options;   // 새 형식: ["COMBO", {options}]
    return null;
  }
  async function fixModels() {
    const list = await api("/api/workflows");
    if (!Array.isArray(list)) return [];
    const opt = {}, fixed = [];
    for (const w of list) {
      if (!w.prompt || String(w.name).includes("@")) continue;   // 캐릭터용 사본은 원본에서 다시 만들어짐
      let changed = false;
      for (const n of Object.values(w.prompt)) {
        const field = n && MODEL_FIELDS[n.class_type]; if (!field || !n.inputs || typeof n.inputs[field] !== "string") continue;
        if (!(n.class_type in opt)) opt[n.class_type] = await options(n.class_type, field);
        const have = opt[n.class_type]; if (!have || !have.length) continue;
        const cur = n.inputs[field]; if (have.includes(cur)) continue;
        let hit = have.filter((h) => stem(h) === stem(cur));   // 확장자만 다른 같은 이름
        for (const a of ALIASES[stem(cur)] || []) { if (hit.length) break; hit = have.filter((h) => stem(h) === a); }   // 배포처 원래 이름
        if (hit.length === 1) { n.inputs[field] = hit[0]; changed = true; fixed.push(`${cur} → ${hit[0]}`); }
      }
      if (changed) { try { await api("/api/workflows", { json: w }); } catch (e) { console.warn("모델 이름 맞춤 저장 실패", w.name, e); } }
    }
    return [...new Set(fixed)];
  }
  async function run() {
    if (busy || done) return;
    busy = true;
    try {
      const s = await fetch("/comfy/system_stats");
      if (!s.ok) return;
      const have = await inputFiles(), up = [];
      if (have) for (const [name, url] of Object.entries(REFS)) {
        if (have.has(name)) continue;
        const fd = new FormData();
        fd.append("image", await (await fetch(url)).blob(), name);
        fd.append("type", "input"); fd.append("overwrite", "false");
        const r = await fetch("/comfy/upload/image", { method: "POST", body: fd });
        if (r.ok) up.push(name); else console.warn("참고 그림 올리기 실패", name, r.status);
      }
      let n = 0;
      const list = await api("/api/workflows");
      if (Array.isArray(list)) for (const w of WFS) {
        if (list.some((x) => x.name === w.name)) continue;
        try { await api("/api/workflows", { json: w }); n++; } catch (e) { console.warn("워크플로 등록 실패", w.name, e); }
      }
      let fx = []; try { fx = await fixModels(); } catch (e) { console.warn("모델 이름 맞춤 실패", e); }
      if ((n || fx.length) && typeof loadWorkflows === "function") { try { await loadWorkflows(); } catch {} }
      if (up.length || n || fx.length) toast(`ComfyUI 자동 설정: ${[up.length ? `참고 그림 ${up.length}장 올림 (${up.join(", ")})` : "", n ? `워크플로 ${n}개 등록` : "", fx.length ? `모델 이름 맞춤 ${fx.join(", ")}` : ""].filter(Boolean).join(" · ")}`, "ok");
      done = true;
    } catch (e) { console.warn("ComfyUI 자동 설정 대기", e); }
    finally { busy = false; }
  }
  setTimeout(run, 1500);
  const t = setInterval(() => { if (done) clearInterval(t); else run(); }, 10000);
  window.BC_COMFY_SETUP = { run, get done() { return done; } };
})();
