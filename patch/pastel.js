// 파스텔 홀로그램 화풍 — 흰 배경 · 파스텔 + 무지갯빛(유리·프리즘 굴절) · 흩날리는 긴 머리 · 반투명 날개 · 비눗방울 느낌
// 기존 워크플로(마녀 그림 IP-Adapter + 채도 낮춤)는 그대로 두고, 이 화풍 전용 워크플로를 따로 등록한다.
//  - Claude_Anime_PastelHolo            : 화풍 태그 + 파스텔 LoRA (참고 그림 없이)
//  - Claude_Anime_PastelHolo_IPAdapter  : 위 + 참고 그림(ComfyUI input\ref_pastel_holo.png)을 IP-Adapter 화풍 참조로
//  - Claude_Anime_PastelHolo_Duo_2people / _Party_5people : 2인 · 5인 장면용 (참고 그림 없이, CFG 5.5)
// 태그 선택기 · 연작에서 '파스텔 홀로그램' 항목을 고르면 이 워크플로가 자동으로 골라지고, 부정 프롬프트에 어두운·탁한 색 태그가 붙는다.
(() => {
  const VER = 2;   // 워크플로 내용을 바꾸면 올림 → 앱이 켜질 때 다시 등록 (2: 푸른 밤 워크플로 추가)
  const REF_IMAGE = "ref_pastel_holo.png", BLUENIGHT_IMAGE = "ref_bluenight.png";
  const NEG_ADD = ["dark", "dark background", "muted colors", "desaturated", "greyscale", "monochrome", "high contrast", "thick outline", "realistic", "3d"];
  const PLAIN_NEG = "bad quality, worst quality, worst detail, lowres, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, signature, logo, blurry, jpeg artifacts, child, loli, nsfw, nude";
  const MATTE_NEG = ["(shiny clothes:1.3)", "latex", "satin", "shiny", "glossy", "reflective clothes", "wet clothes"];
  const POS_DROP =["muted colors", "desaturated", "grey palette", "dark", "monochrome", "greyscale"];
  const QUALITY_NEG = "bad quality, worst quality, worst detail, lowres, sketch, censor, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, signature, logo, blurry, jpeg artifacts, " + NEG_ADD.join(", ") + ", child, loli, nsfw, nude";

  function graph({ name, ipa, cfg, steps, w, h, pastel, smooth, ipaW, temp = 0.3, neg = QUALITY_NEG, ref = REF_IMAGE }) {
    const L = (title, lora, wt, from) => ({ _meta: { title }, class_type: "LoraLoader", inputs: { lora_name: lora, strength_model: wt, strength_clip: wt, model: [from, 0], clip: [from, 1] } });
    const g = {
      1: { _meta: { title: "Checkpoint (WAI Illustrious SDXL v17)", ll_pastel: VER }, class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "waiIllustriousSDXL_v170.safetensors" } },
      14: L("Slider: Saturation (0 = 원래 채도)", "il_saturation_slider.safetensors", 0, "1"),
      15: L("Slider: Color temp (+ = colder, 라벤더·청색 쪽)", "il_color_temp_slider_d1.safetensors", temp, "14"),
      16: L("Pastel style LoRA", "Apocryphal-Pastel-IL_V18.safetensors", pastel, "15"),
      17: L("Smooth lighting LoRA", "smooth-lighting-enhancer-noobai-illustrious.safetensors", smooth, "16"),
      2: { _meta: { title: "Positive" }, class_type: "CLIPTextEncode", inputs: { clip: ["17", 1], text: "1girl, solo, pastel colors, iridescent, white background, masterpiece, best quality" } },
      3: { _meta: { title: "Negative" }, class_type: "CLIPTextEncode", inputs: { clip: ["17", 1], text: neg } },
      4: { _meta: { title: "Size" }, class_type: "EmptyLatentImage", inputs: { batch_size: 1, width: w, height: h } },
      5: { _meta: { title: "Base pass" }, class_type: "KSampler", inputs: { cfg, denoise: 1, latent_image: ["4", 0], model: ["M", 0], negative: ["3", 0], positive: ["2", 0], sampler_name: "euler_ancestral", scheduler: "normal", seed: 0, steps } },
      6: { _meta: { title: "VAEDecode" }, class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
      7: { _meta: { title: "Anime face detector" }, class_type: "UltralyticsDetectorProvider", inputs: { model_name: "bbox/anime_face_detect_v1.4_s.pt" } },
      8: { _meta: { title: "Face fix (denoise 0.35)" }, class_type: "FaceDetailer", inputs: { bbox_crop_factor: 3, bbox_detector: ["7", 0], bbox_dilation: 10, bbox_threshold: 0.4, cfg, clip: ["17", 1], cycle: 1, denoise: 0.35, drop_size: 10, feather: 5, force_inpaint: true, guide_size: 512, guide_size_for: true, image: ["6", 0], inpaint_model: false, max_size: 1024, model: ["M", 0], negative: ["3", 0], noise_mask: true, noise_mask_feather: 20, positive: ["2", 0], sam_bbox_expansion: 0, sam_detection_hint: "center-1", sam_dilation: 0, sam_mask_hint_threshold: 0.7, sam_mask_hint_use_negative: "False", sam_threshold: 0.93, sampler_name: "euler_ancestral", scheduler: "normal", seed: 0, steps: 20, tiled_decode: false, tiled_encode: false, vae: ["1", 2], wildcard: "" } },
      9: { _meta: { title: "UpscaleModelLoader" }, class_type: "UpscaleModelLoader", inputs: { model_name: "4x-AnimeSharp.safetensors" } },
      10: { _meta: { title: "Tiled upscale x1.5" }, class_type: "UltimateSDUpscale", inputs: { batch_size: 1, cfg, denoise: 0.25, force_uniform_tiles: true, image: ["8", 0], mask_blur: 8, mode_type: "Linear", model: ["M", 0], negative: ["3", 0], positive: ["2", 0], sampler_name: "euler_ancestral", scheduler: "normal", seam_fix_denoise: 1, seam_fix_mask_blur: 8, seam_fix_mode: "None", seam_fix_padding: 16, seam_fix_width: 64, seed: 0, steps: 16, tile_height: 1024, tile_padding: 32, tile_width: 1024, tiled_decode: true, upscale_by: 1.5, upscale_model: ["9", 0], vae: ["1", 2] } },
      11: { _meta: { title: "SaveImage" }, class_type: "SaveImage", inputs: { filename_prefix: "Claude/" + name.replace(/^Claude_Anime_/, "").toLowerCase(), images: ["10", 0] } },
    };
    let model = "17";
    if (ipa) {
      g[20] = { _meta: { title: "STYLE REFERENCE IMAGE (ComfyUI input)" }, class_type: "LoadImage", inputs: { image: ref } };
      g[21] = { _meta: { title: "IP-Adapter (NoobAI MARK1)" }, class_type: "IPAdapterModelLoader", inputs: { ipadapter_file: "noobIPAMARK1_mark1.safetensors" } };
      g[22] = { _meta: { title: "Image encoder (ViT-bigG)" }, class_type: "CLIPVisionLoader", inputs: { clip_name: "CLIP-ViT-bigG-14-laion2B-39B-b160k.safetensors" } };
      g[23] = { _meta: { title: `IP-Adapter style transfer (weight ${ipaW})` }, class_type: "IPAdapterAdvanced", inputs: { clip_vision: ["22", 0], combine_embeds: "concat", embeds_scaling: "V only", end_at: 1, image: ["20", 0], ipadapter: ["21", 0], model: ["17", 0], start_at: 0, weight: ipaW, weight_type: "style transfer" } };
      model = "23";
    }
    for (const k of [5, 8, 10]) g[k].inputs.model = [model, 0];
    return {
      name, prompt: g, positive: { node: "2", field: "text" }, negative: { node: "3", field: "text" },
      seeds: [{ node: "5", field: "seed" }, { node: "8", field: "seed" }, { node: "10", field: "seed" }],
      checkpoint: { node: "1", field: "ckpt_name" }, latent: "4", sampler: "5", source: "",
    };
  }
  // 비교 결과(같은 시드): 태그만 → 발밑 거품·진한 색이 조금 남음 / +파스텔 LoRA 0.6 → 부드럽고 깨끗 (채택)
  //   / +조명 LoRA는 차이 작음(0으로 두고 노드만 남김) / 참고 그림 IP-Adapter 0.6 → 라벤더→진청 머리·연회색 배경이 가장 비슷 (파스텔 LoRA와 겹치면 과해서 0)
  const BASE = { pastel: 0.6, smooth: 0, ipaW: 0.6 };
  const WFS = [
    graph({ ...BASE, name: "Claude_Anime_PastelHolo", ipa: false, cfg: 5, steps: 28, w: 832, h: 1216 }),
    graph({ ...BASE, name: "Claude_Anime_PastelHolo_IPAdapter", ipa: true, pastel: 0, cfg: 5, steps: 28, w: 832, h: 1216 }),
    graph({ ...BASE, name: "Claude_Anime_PastelHolo_Duo_2people", ipa: false, cfg: 5.5, steps: 30, w: 832, h: 1216 }),
    graph({ ...BASE, name: "Claude_Anime_PastelHolo_Party_5people", ipa: false, cfg: 5.5, steps: 30, w: 1216, h: 832 }),
    // 작가 화풍용: 화풍 참조·화풍 LoRA·색 보정 없이 체크포인트 그대로 (작가 태그가 화풍을 정하도록)
    ...[["Claude_Anime_Plain", 5, 28, 832, 1216], ["Claude_Anime_Plain_Duo_2people", 5.5, 30, 832, 1216], ["Claude_Anime_Plain_Party_5people", 5.5, 30, 1216, 832]].map(([name, cfg, steps, w, h]) =>
      graph({ name, ipa: false, pastel: 0, smooth: 0, temp: 0, cfg, steps, w, h, neg: PLAIN_NEG })),
    // 푸른 밤: 푸른 단색조 · 강한 역광 그림(ComfyUI input\ref_bluenight.png)을 IP-Adapter 화풍 참조로 (색온도 슬라이더 +0.3 = 차가운 쪽)
    graph({ name: "Claude_Anime_BlueNight_IPAdapter", ipa: true, ref: BLUENIGHT_IMAGE, pastel: 0, smooth: 0, ipaW: 0.6, temp: 0.3, cfg: 5, steps: 28, w: 832, h: 1216, neg: PLAIN_NEG }),
  ];

  // ---------- 워크플로 등록 (없거나 예전 버전이면) ----------
  async function install() {
    let list;
    try { list = await api("/api/workflows"); } catch { return false; }
    if (!Array.isArray(list)) return false;
    let n = 0;
    for (const wf of WFS) {
      const old = list.find((x) => x.name === wf.name);
      const ver = old && old.prompt && old.prompt["1"] && old.prompt["1"]._meta && old.prompt["1"]._meta.ll_pastel;
      if (old && ver >= VER) continue;
      try { await api("/api/workflows", { json: wf }); n++; } catch (e) { console.warn("파스텔 워크플로 등록 실패", wf.name, e); }
    }
    if (n && typeof loadWorkflows === "function") { try { await loadWorkflows(); } catch {} }
    return true;
  }
  { let k = 0; const t = () => install().then((ok) => { if (!ok && ++k < 20) setTimeout(t, 1000); }); setTimeout(t, 800); }

  // ---------- 어떤 워크플로를 고를지 ----------
  // 태그 선택기·연작의 항목 이름 → 원하는 워크플로 (참고 그림 화풍 항목이면 IP-Adapter 판)
  const isPastelItem = (n) => /^파스텔 홀로그램/.test(n);
  const wantsRef = (n) => /참고 그림/.test(n);
  // names: 고른 항목 이름들, list: 후보 워크플로 이름들(이미 인원수로 거른 것) → 정렬 비교 함수
  // 작가 화풍 항목(artists.js가 이름 목록을 넣음)을 고르면 화풍 참조 없는 Plain 워크플로 — 파스텔을 함께 고르면 파스텔이 우선
  const ARTIST_NAMES = new Set();
  // 푸른 밤 항목(bluenight.js)은 작가 화풍처럼 Plain 워크플로, '참고 그림' 항목이면 Claude_Anime_BlueNight_IPAdapter
  const isBlueNightItem = (n) => /^푸른 밤/.test(n);
  const isArtistItem = (n) => ARTIST_NAMES.has(n) || isBlueNightItem(n);
  function prefer(names) {
    const on = names.some(isPastelItem), ref = names.some(wantsRef), art = !on && names.some(isArtistItem);
    const yz = !on && names.some((n) => isBlueNightItem(n) && wantsRef(n));
    return (a, b) => {
      const ya = /_BlueNight/.test(a), yb = /_BlueNight/.test(b);
      if (ya !== yb) return yz ? yb - ya : ya - yb;   // 푸른 밤 참고 그림이면 푸른 밤 워크플로 먼저, 아니면 맨 뒤로
      const xa = /_Plain/.test(a), xb = /_Plain/.test(b);
      if (xa !== xb) return art ? xb - xa : xa - xb;   // 작가 화풍이면 Plain 먼저, 아니면 맨 뒤로
      const pa = /PastelHolo/.test(a), pb = /PastelHolo/.test(b);
      if (pa !== pb) return on ? pb - pa : pa - pb;   // 파스텔 항목을 고르면 파스텔 워크플로 먼저, 아니면 맨 뒤로
      if (on && pa && pb) { const ia = /IPAdapter/.test(a), ib = /IPAdapter/.test(b); if (ia !== ib) return ref ? ib - ia : ia - ib; }
      return 0;
    };
  }

  // ---------- 생성 요청: 파스텔 워크플로면 부정 프롬프트에 어두운·탁한 색 태그 추가 ----------
  const norm = (t) => t.trim().replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").toLowerCase();
  const _api = api;
  api = async (url, opt) => {
    if (url === "/api/generate" && opt && opt.json && /PastelHolo/.test(String(opt.json.workflow || ""))) {
      const j = opt.json, neg = String(j.negative || ""), have = new Set(neg.split(",").map(norm)), pos = new Set(String(j.positive || "").split(",").map(norm));
      const add = NEG_ADD.filter((t) => !have.has(t) && (!pos.has(t) || POS_DROP.includes(t)));
      let positive = String(j.positive || "");
      // '아주 길게 흩날리는 머리'를 고르면 캐릭터의 중간·짧은 머리 길이 태그는 빼서 충돌을 막음
      if (pos.has("absurdly long hair")) positive = positive.split(",").filter((t) => !/^(medium hair|short hair)$/.test(norm(t))).join(",");
      // 기본 프롬프트에 남아 있는 '탁한 색' 태그(마녀 화풍용)는 파스텔과 부딪치므로 이 워크플로에서만 뺌
      positive = positive.split(",").filter((t) => !POS_DROP.includes(norm(t))).join(",");
      opt = { ...opt, json: { ...j, positive, negative: add.length ? [neg.trim().replace(/,\s*$/, ""), ...add].filter(Boolean).join(", ") : neg } };
    }
    // 푸른 밤(워크플로 · 캐릭터 · 화풍 태그 blue theme): 옷은 무광 천 — 광택 태그는 긍정에서 빼고 부정에 추가 (참고 그림이 공단처럼 번들거려 그대로 두면 라텍스처럼 나옴)
    if (url === "/api/generate" && opt && opt.json) {
      const j = opt.json, posS = String(j.positive || ""), pos = new Set(posS.split(",").map(norm));
      const yz = /_BlueNight/.test(String(j.workflow || "")) || pos.has("blue theme") || (window.BC_CHAR_ID && window.BC_CHAR_ID(posS) === "c6")   /* c6 = 흰 긴 머리 메이드 */;
      if (yz) {
        const neg = String(j.negative || ""), have = new Set(neg.split(",").map(norm));
        const add = MATTE_NEG.filter((t) => !have.has(norm(t)));
        const positive = posS.split(",").filter((t) => !MATTE_NEG.map(norm).includes(norm(t))).join(",");
        opt = { ...opt, json: { ...j, positive, negative: add.length ? [neg.trim().replace(/,\s*$/, ""), ...add].filter(Boolean).join(", ") : neg } };
      }
    }
    return _api(url, opt);
  };

  window.LL_PASTEL = { WFS, prefer, isPastelItem, isArtistItem, isBlueNightItem, ARTIST_NAMES, install, REF_IMAGE, BLUENIGHT_IMAGE };
})();
