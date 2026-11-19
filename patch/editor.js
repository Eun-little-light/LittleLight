// 편집 탭 — 누끼(배경 제거)
//  - 그림 고르기: 파일 열기 · 끌어다 놓기 · 최근 생성 그림 · 그림 상세 창의 '✂ 누끼 따기'
//  - 배경 제거: ComfyUI 기본 노드(LoadBackgroundRemovalModel → RemoveBackground, BiRefNet)로 마스크를 만들고 투명 PNG로
//    앱의 ComfyUI 중계(/comfy/upload/image · /comfy/prompt · /comfy/history)로 직접 보냄 — 생성 기록에는 안 남음
//    결과는 ComfyUI output\[LittleLight\]edit\nukki_*.png 에도 저장됨
//  - 다듬기(브라우저에서): 가장자리 정리(문턱값) · 부드럽게(번짐) · 여백 자르기 · 배경(투명/흰색/검정/색) → PNG 다운로드
//  - 모델: ComfyUI models\background_removal\ 에 BiRefNet(birefnet.safetensors)이 있어야 함 — 없으면 화면에 받는 곳 안내
// Little Light와 Ghost가 같은 파일을 씀
(() => {
  const MODEL_URL = "https://huggingface.co/Comfy-Org/BiRefNet/blob/main/background_removal/birefnet.safetensors";
  const PREFIX = window.LL ? "LittleLight/edit/nukki" : "edit/nukki";
  const $e = (s, r = document) => r.querySelector(s);

  // ---------- 탭 ----------
  const after = document.querySelector('#tabs button[data-tab="gallery"]') || document.querySelector("#tabs button:last-child");
  if (!after) return;
  const tb = document.createElement("button"); tb.dataset.tab = "edit"; tb.textContent = "편집";
  after.after(tb); tb.addEventListener("click", () => showTab("edit"));
  const sec = document.createElement("section"); sec.id = "tab-edit"; sec.className = "tab";
  sec.innerHTML = `
<div class="ed-wrap">
  <div class="card">
    <div class="card-head"><h3>1. 그림 고르기</h3><div class="head-tools"><button class="mini primary-ghost" id="edOpen">파일 열기</button><input type="file" id="edFile" accept="image/*" hidden></div></div>
    <div class="ed-drop" id="edDrop">그림을 여기로 끌어다 놓거나, 아래 최근 그림을 누르세요 (그림 상세 창의 '✂ 누끼 따기'로도 가져올 수 있음)</div>
    <div class="ed-recent" id="edRecent"></div>
  </div>
  <div class="card">
    <div class="card-head"><h3>2. 누끼 (배경 제거)</h3><div class="head-tools"><button class="mini primary" id="edRun" disabled>배경 제거</button></div></div>
    <div class="ed-model" id="edModel">모델 확인 중…</div>
    <div class="ed-opts">
      <label>가장자리 정리 <input type="range" id="edTh" min="0" max="90" value="0"><span id="edThV">0</span></label>
      <label>부드럽게 <input type="range" id="edFe" min="0" max="8" value="1"><span id="edFeV">1px</span></label>
      <label class="check"><input type="checkbox" id="edCrop"> 여백 자르기</label>
      <label>배경 <select id="edBg"><option value="none">투명</option><option value="#ffffff">흰색</option><option value="#000000">검정</option><option value="custom">색 고르기</option></select><input type="color" id="edCol" value="#88ccff" hidden></label>
    </div>
    <div class="ed-tip muted">권장: <b>가장자리 정리 0~10 · 부드럽게 1px</b> (가는 머리카락 유지) · 배경 잔티·흐린 테두리가 남으면 정리 <b>15~25</b> · 30 이상은 머리카락 끝이 사라짐 · 부드럽게 2px 이상은 테두리가 흐려짐</div>
    <div class="ed-stage"><div class="ed-view" id="edView"><div class="ed-empty">그림을 고르면 여기에 보입니다</div></div></div>
    <div class="row ed-acts"><button class="mini" id="edOrig" disabled>원본 보기</button><button class="mini primary-ghost" id="edSave" disabled>PNG 다운로드</button><span class="muted" id="edStat"></span></div>
  </div>
</div>`;
  (document.querySelector("main") || document.body).append(sec);
  const css = document.createElement("style");
  css.textContent = `#tab-edit .ed-wrap{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:16px;align-items:start}
@media (max-width:900px){#tab-edit .ed-wrap{grid-template-columns:1fr}}
.ed-drop{border:1.5px dashed var(--border,rgba(127,127,127,.35));border-radius:12px;padding:18px;text-align:center;font-size:12.5px;color:var(--muted);margin-bottom:10px}
.ed-drop.over{border-color:var(--accent);color:var(--accent)}
.ed-recent{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;max-height:520px;overflow:auto}
.ed-recent img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:8px;cursor:pointer;display:block}
.ed-recent img:hover{outline:2px solid var(--accent)}
.ed-model{font-size:12.5px;margin:0 0 8px}.ed-model.bad{color:var(--danger,#ff453a)}
.ed-opts{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;font-size:12.5px;margin-bottom:10px}
.ed-opts label{display:flex;align-items:center;gap:6px}.ed-opts input[type=range]{width:110px}
.ed-tip{font-size:12px;margin:-2px 0 10px;line-height:1.5}
.ed-stage{border-radius:12px;overflow:hidden}
.ed-view{min-height:320px;display:grid;place-items:center;padding:8px;background:repeating-conic-gradient(#8884 0 25%,#0000 0 50%) 0 0/20px 20px}
.ed-view canvas,.ed-view img{max-width:100%;max-height:72vh;display:block}
.ed-empty{color:var(--muted);font-size:13px}
.ed-acts{margin-top:10px;gap:8px;align-items:center}`;
  document.head.append(css);

  // ---------- 상태 ----------
  let src = null;      // {blob, url, name}
  let res = null;      // {img: HTMLImageElement(RGBA), alpha: Uint8ClampedArray, w, h}
  let showOrig = false, model = null;
  const stat = (t, bad) => { const s = $e("#edStat"); s.textContent = t || ""; s.style.color = bad ? "var(--danger,#ff453a)" : ""; };

  // 모델 확인 (ComfyUI models\background_removal)
  async function checkModel() {
    const box = $e("#edModel");
    try {
      const r = await fetch("/comfy/object_info/LoadBackgroundRemovalModel");
      if (!r.ok) throw new Error(r.status === 404 ? "old" : "HTTP " + r.status);
      const j = await r.json(), x = (((j.LoadBackgroundRemovalModel || {}).input || {}).required || {}).bg_removal_name;
      const opts = !x ? [] : Array.isArray(x[0]) ? x[0] : (x[1] && x[1].options) || [];
      if (!Object.keys(j).length) throw new Error("old");
      model = opts.find((o) => /birefnet/i.test(o)) || opts[0] || null;
      box.className = "ed-model" + (model ? "" : " bad");
      box.innerHTML = model ? `모델: <b>${esc(model)}</b> (BiRefNet)` :
        `배경 제거 모델이 없습니다. <a href="${MODEL_URL}" target="_blank" rel="noopener">birefnet.safetensors (약 444MB)</a>를 받아 ComfyUI <code>models\\background_removal\\</code> 폴더에 넣고 ComfyUI를 다시 켜세요.`;
    } catch (e) {
      model = null; box.className = "ed-model bad";
      box.textContent = String(e.message) === "old" ? "이 ComfyUI에는 배경 제거 기본 노드가 없습니다. ComfyUI를 최신 버전으로 업데이트하세요." : "ComfyUI에 연결되지 않았습니다 (" + e.message + ")";
    }
    $e("#edRun").disabled = !(model && src);
  }

  // ---------- 그림 고르기 ----------
  function setSource(blob, name) {
    if (src && src.url) URL.revokeObjectURL(src.url);
    src = { blob, url: URL.createObjectURL(blob), name: name || "image.png" }; res = null; showOrig = false;
    draw(); $e("#edRun").disabled = !model; $e("#edSave").disabled = true; $e("#edOrig").disabled = true; stat("");
  }
  async function fromURL(url, name) {
    try { const b = await (await fetch(url)).blob(); setSource(b, name); showTab("edit"); }
    catch (e) { toast("그림을 불러오지 못했습니다\n" + e.message, "err"); }
  }
  $e("#edOpen").onclick = () => $e("#edFile").click();
  $e("#edFile").onchange = (e) => { const f = e.target.files[0]; if (f) setSource(f, f.name); e.target.value = ""; };
  const drop = $e("#edDrop");
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); const f = [...(e.dataTransfer.files || [])].find((x) => /^image\//.test(x.type)); if (f) setSource(f, f.name); };
  async function drawRecent() {
    try { if (!state.history || !state.history.length) state.history = await api("/api/history"); } catch {}
    const list = (state.history || []).filter((h) => h.images && h.images.length).slice(0, 40);
    $e("#edRecent").innerHTML = list.length ? list.map((h, i) => `<img loading="lazy" data-i="${i}" src="${imgURL(h.images[0])}" alt="" title="${esc(new Date(h.time * 1000).toLocaleString())}">`).join("") : '<div class="muted" style="font-size:12px">아직 생성한 그림이 없습니다</div>';
    $e("#edRecent").onclick = (e) => { const im = e.target.closest("img[data-i]"); if (!im) return; const h = list[+im.dataset.i]; fromURL(imgURL(h.images[0]), h.images[0].filename); };
  }

  // ---------- 배경 제거 (ComfyUI) ----------
  let retried = false;
  $e("#edRun").addEventListener("pointerdown", () => { retried = false; });   // 사용자가 직접 누를 때마다 재시도 기회 초기화
  $e("#edRun").onclick = async () => {
    if (!src || !model) return;
    const btn = $e("#edRun"); btn.disabled = true;
    try {
      stat("ComfyUI에 그림 올리는 중…");
      const name = "ll_edit_" + Date.now() + ".png", fd = new FormData();
      fd.append("image", src.blob, name); fd.append("subfolder", "edit_tmp"); fd.append("type", "input"); fd.append("overwrite", "true");
      const up = await fetch("/comfy/upload/image", { method: "POST", body: fd });
      if (!up.ok) throw new Error("그림 올리기 실패 (" + up.status + ")");
      const u = await up.json(), path = (u.subfolder ? u.subfolder + "/" : "") + u.name;
      const prompt = {
        1: { class_type: "LoadImage", inputs: { image: path } },
        2: { class_type: "LoadBackgroundRemovalModel", inputs: { bg_removal_name: model } },
        3: { class_type: "RemoveBackground", inputs: { bg_removal_model: ["2", 0], image: ["1", 0] } },
        4: { class_type: "InvertMask", inputs: { mask: ["3", 0] } },            // JoinImageWithAlpha는 마스크를 뒤집어 쓰므로 미리 뒤집음
        5: { class_type: "JoinImageWithAlpha", inputs: { image: ["1", 0], alpha: ["4", 0] } },
        6: { class_type: "SaveImage", inputs: { images: ["5", 0], filename_prefix: PREFIX } },
      };
      stat("배경 제거 중… (지금 생성 중인 그림이 있으면 그 한 장이 끝난 뒤 바로 처리)");
      const pr = await fetch("/comfy/prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, client_id: "ll-editor", front: true })   /* 몇 초면 끝나는 작업이라 생성 대기열 맨 앞으로 */ });
      const pj = await pr.json().catch(() => ({}));
      if (!pr.ok || !pj.prompt_id) throw new Error("ComfyUI 작업 실패: " + ((pj.error && pj.error.message) || JSON.stringify(pj.node_errors || pj).slice(0, 200)));
      let out = null;
      for (let t = 0; t < 600 && !out; t++) {
        await new Promise((r) => setTimeout(r, 1000));
        const h = await (await fetch("/comfy/history/" + pj.prompt_id)).json().catch(() => ({}));
        const e = h[pj.prompt_id]; if (!e) continue;
        if (e.status && e.status.status_str === "error") throw new Error("ComfyUI 오류: " + JSON.stringify((e.status.messages || []).slice(-1)).slice(0, 300));
        const im = e.outputs && e.outputs["6"] && e.outputs["6"].images && e.outputs["6"].images[0];
        if (im) out = im; else if (e.status && e.status.completed) throw new Error("결과 그림이 없습니다");
      }
      if (!out) throw new Error("시간 초과");
      const url = "/comfy/view?" + new URLSearchParams({ filename: out.filename, subfolder: out.subfolder || "", type: out.type || "output" });
      const img = new Image(); await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error("결과 그림을 읽지 못했습니다")); img.src = url; });   // decode()는 화면에 안 보이는 창에서 멈출 수 있음
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), alpha = new Uint8ClampedArray(c.width * c.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = d.data[i * 4 + 3];
      { let lo = 0, hi = 0; for (let i = 0; i < alpha.length; i++) { if (alpha[i] < 10) lo++; else if (alpha[i] > 245) hi++; }
        if ((lo > alpha.length * 0.995 || hi > alpha.length * 0.995) && !retried) {   // 마스크가 비었음 (다른 작업과 겹쳐 계산이 깨진 경우 등) → 한 번 더
          retried = true; stat("결과가 비어 있어 한 번 더 시도합니다…"); return await $e("#edRun").onclick();
        }
        if (lo > alpha.length * 0.995 || hi > alpha.length * 0.995) stat("배경과 인물을 구분하지 못했습니다 — 다른 그림이거나 ComfyUI를 다시 켠 뒤 시도해 보세요", true); }
      res = { canvas: c, data: d, alpha, w: c.width, h: c.height, file: out.filename };
      showOrig = false; draw();
      $e("#edSave").disabled = false; $e("#edOrig").disabled = false;
      if ($e("#edStat").style.color) return;   // 위에서 실패 안내를 띄웠으면 그대로
      stat(`완료 — ComfyUI output\\${(out.subfolder || "").replace(/\//g, "\\")}\\${out.filename}에도 저장됨`);
    } catch (e) { stat(String(e.message || e), true); }
    finally { btn.disabled = !(model && src); }
  };

  // ---------- 다듬기 · 미리보기 · 저장 ----------
  function blurAlpha(a, w, h, r) {
    if (r <= 0) return a;
    const tmp = new Float32Array(w * h), out = new Uint8ClampedArray(w * h), k = 2 * r + 1;
    for (let y = 0; y < h; y++) { let s = 0; for (let i = -r; i <= r; i++) s += a[y * w + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) { tmp[y * w + x] = s / k; s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    return out;
  }
  function render() {   // 다듬은 결과 캔버스 (배경 · 자르기 포함)
    const { w, h } = res, th = +$e("#edTh").value / 100, fe = +$e("#edFe").value;
    let a = res.alpha;
    if (th > 0) { const b = new Uint8ClampedArray(a.length), lo = th * 255; for (let i = 0; i < a.length; i++) b[i] = a[i] <= lo ? 0 : (a[i] - lo) / (255 - lo) * 255; a = b; }
    a = blurAlpha(a, w, h, fe);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), d = x.createImageData(w, h);
    d.data.set(res.data.data); for (let i = 0; i < a.length; i++) d.data[i * 4 + 3] = a[i];
    x.putImageData(d, 0, 0);
    let box = [0, 0, w, h];
    if ($e("#edCrop").checked) {
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) if (a[y * w + xx] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= x0) { const pad = Math.round(Math.max(w, h) * 0.02); x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad); box = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; }
    }
    const o = document.createElement("canvas"); o.width = box[2]; o.height = box[3];
    const ox = o.getContext("2d"), bg = $e("#edBg").value;
    if (bg !== "none") { ox.fillStyle = bg === "custom" ? $e("#edCol").value : bg; ox.fillRect(0, 0, o.width, o.height); }
    ox.drawImage(c, box[0], box[1], box[2], box[3], 0, 0, box[2], box[3]);
    return o;
  }
  function draw() {
    const v = $e("#edView");
    if (!src) { v.innerHTML = '<div class="ed-empty">그림을 고르면 여기에 보입니다</div>'; return; }
    if (!res || showOrig) { v.innerHTML = `<img src="${src.url}" alt="">`; $e("#edOrig").textContent = res ? "누끼 보기" : "원본 보기"; return; }
    v.innerHTML = ""; v.append(render()); $e("#edOrig").textContent = "원본 보기";
  }
  ["#edTh", "#edFe", "#edCrop", "#edBg", "#edCol"].forEach((s) => $e(s).addEventListener("input", () => {
    $e("#edThV").textContent = $e("#edTh").value; $e("#edFeV").textContent = $e("#edFe").value + "px";
    $e("#edCol").hidden = $e("#edBg").value !== "custom"; if (res) draw(); }));
  $e("#edOrig").onclick = () => { showOrig = !showOrig; draw(); };
  $e("#edSave").onclick = () => {
    if (!res) return;
    render().toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (src.name || "image").replace(/\.[^.]+$/, "") + "_누끼.png"; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, "image/png");
  };

  // 탭을 열 때마다 모델·최근 그림 새로 확인 (탭 전환 함수는 다른 모듈이 바꿀 수 있어 화면의 active 표시를 지켜봄)
  new MutationObserver(() => { const on = sec.classList.contains("active"); if (on && !sec._on) { checkModel(); drawRecent(); } sec._on = on; }).observe(sec, { attributes: true, attributeFilter: ["class"] });
  // iOS 탭 막대(ios.js가 나중에 만듦)에 가위 아이콘
  { let n = 0; const t = setInterval(() => { const b = document.querySelector('.ios-tabbar button[data-tab="edit"] svg'); if (b) { b.innerHTML = '<circle cx="6.5" cy="6.5" r="2.8"/><circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.6 8.4L20 18M8.6 15.6L20 6"/>'; clearInterval(t); } else if (++n > 40) clearInterval(t); }, 250); }

  // 그림 상세 창에 '✂ 누끼 따기'
  const _render = renderModal;
  renderModal = () => {
    _render();
    const b = $e("#mInfo .btns"), st = modalState; if (!b || !st || !st.entry || !st.entry.images) return;
    const im = st.entry.images[st.i]; const x = document.createElement("button");
    x.textContent = "✂ 누끼 따기"; x.onclick = () => { closeModal(); fromURL(imgURL(im), im.filename); };
    b.append(x);
  };
  window.BC_EDITOR = { open: fromURL, checkModel };
})();
