// 프롬프트 자동 정리 — 모든 생성(/api/generate) 직전, 다른 보정이 끝난 최종 프롬프트에 적용 (Little Light · Ghost 공용)
//  SDXL은 약 75토큰씩 덩어리로 읽고 앞쪽 단어를 더 강하게 반영 → 태그가 많고 핵심이 뒤에 있으면 잘 안 먹음
//  1. 중복 제거: 같은 태그는 하나만(가중치 큰 쪽), 더 강한 태그에 포함되는 태그 정리 (sweat + heavy sweat → heavy sweat 등)
//  2. 정렬: 인원 → 작가 화풍 → 핵심 체위 → 캐릭터 외모 → 그 밖의 동작 → 복장 → 표정·기타 → 배경 → 연출·화풍 → 품질
//     (같은 분류 안에서는 원래 순서 유지 · 분류는 태그 선택기 그룹 제목과 캐릭터 정의로)
//  3. 가중치 과잉 정리: 가중치 붙은 태그가 8개를 넘으면 핵심(인원·작가·체위·캐릭터 외모) 외에는 1.0으로
//  - BREAK로 인물을 나눈 프롬프트는 구조를 지키려고 순서는 그대로 두고 중복만 지움
//  - 부정 프롬프트는 중복만 지움 · 설정 탭에서 끄고 켜기, 마지막 정리 결과 보기
//  이 모듈은 다른 생성 보정 모듈보다 먼저 불러와야 함(가장 안쪽 = 맨 마지막에 실행)
(() => {
  const KEY_ON = "bc_tidy_on";
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  let on = ls.get(KEY_ON, true), last = null;
  const MAX_WEIGHTED = 8;
  const norm = (t) => { let s = String(t).trim().replace(/^BREAK\s+/i, ""); const m = s.match(/^\((.+):\s*[\d.]+\)$/);
    if (m) s = m[1]; else if (s.startsWith("(") && s.endsWith(")") && !s.endsWith("\\)")) s = s.slice(1, -1);   // 이스케이프된 괄호(작가 태그 \( \))는 지킴
    return s.replace(/_/g, " ").toLowerCase().trim(); };
  const weightOf = (t) => { const m = t.trim().match(/^\((.+):\s*([\d.]+)\)$/); return m ? parseFloat(m[2]) : 1; };
  const bare = (t) => { const m = t.trim().match(/^\((.+):\s*([\d.]+)\)$/); return m ? m[1].trim() : t.trim(); };
  const HEAD = /^(\d\+?(boys?|girls?|others?)|multiple (boys|girls|others)|hetero|yuri|yaoi|group sex|solo|solo focus|\dpeople|faceless male|faceless female)$/;
  const QUALITY = new Set(["masterpiece", "best quality", "high quality", "amazing quality", "very aesthetic", "aesthetic", "absurdres", "highres", "ultra detailed", "very awa", "newest", "great quality", "good quality", "normal quality", "detailed", "8k", "4k"]);
  // 더 강한(구체적인) 태그가 있으면 지울 태그
  const SUP = { "sweat": ["heavy sweat", "sweating profusely"], "nude": ["completely nude"], "blush": ["full-face blush", "heavy blush"], "long hair": ["very long hair", "absurdly long hair"],
    "very long hair": ["absurdly long hair"], "smile": ["grin", "evil smile", "seductive smile", "light smile"], "open mouth": ["wide open mouth"], "tears": ["streaming tears"], "saliva": ["saliva trail", "drooling"] };
  const CAT = { head: 1, artist: 1.5, pose: 2, look: 3, act: 3.5, wear: 4, misc: 5, bg: 6, style: 7, quality: 9 };   // pose = 핵심 체위(KEY), act = 그 밖의 동작
  function groupCat(g) {
    const t = String(g.t || "");
    if (t === "작가 화풍") return CAT.artist;
    if (g.c) return g.kind === "outfit" || g.kind === "outfitExpo" ? CAT.wear : g.kind === "bg" ? CAT.bg : CAT.misc;
    if (/체위|후배위|기승위|좌위|측위|입위|1인|2인|5인|자위|장면|자세|동작|움직임|활동|액션|Posture/.test(t)) return CAT.act;
    if (/복장|속옷|알몸|착의|의상|상의|하의|스타킹|신발|머리 장식|소품|옷/.test(t)) return CAT.wear;
    if (/배경|장소|상황|계절|날씨|조명/.test(t)) return CAT.bg;
    if (/화풍|분위기|이펙트|연출|카메라|구도|파스텔|푸른 밤|피부|음문/.test(t)) return CAT.style;
    if (/감정|표정|반응|흥분|눈|손동작|Gestures|Expression/.test(t)) return CAT.misc;
    return null;
  }
  let mapCache = null, mapSig = "";
  function catMap() {
    const T = window.BC_TAGS, chars = (typeof state !== "undefined" && state.defaultCharacters) || [];   // state는 앱 스크립트 전역(window에 없음)
    const sig = (T ? T.G.length : 0) + ":" + chars.length;
    if (mapCache && mapSig === sig) return mapCache;
    const m = new Map(), put = (tag, c) => { const k = norm(tag); if (k && !m.has(k)) m.set(k, c); };
    // 캐릭터 외모·복장 (먼저 — 태그 선택기 분류보다 우선)
    for (const c of chars) { String(c.body || "").split(",").forEach((t) => put(t, CAT.look)); String(c.wear || "").split(",").forEach((t) => put(t, CAT.wear)); }
    if (T) {
      (T.KEY ? [...T.KEY] : []).forEach((t) => put(t, CAT.pose));
      for (const g of T.G || []) { const c = groupCat(g); if (c == null) continue; for (const it of g.it || []) (it.tags || []).forEach((t) => put(t, c)); }
    }
    mapCache = m; mapSig = sig; return m;
  }
  function catOf(key, m) {
    if (HEAD.test(key)) return CAT.head;
    if (QUALITY.has(key)) return CAT.quality;
    if (m.has(key)) return m.get(key);
    if (/breasts?$|^flat chest$/.test(key)) return CAT.look;
    return CAT.misc;
  }
  function dedupe(tokens) {
    const best = new Map(), order = [];
    tokens.forEach((t, i) => { const k = norm(t); if (!k) return; const b = best.get(k);
      if (!b) { best.set(k, { t, i }); order.push(k); } else if (weightOf(t) > weightOf(b.t)) b.t = t; });
    const keys = new Set(order);
    const drop = new Set(order.filter((k) => (SUP[k] || []).some((s) => keys.has(s))));
    return order.filter((k) => !drop.has(k)).map((k) => ({ k, t: best.get(k).t, i: best.get(k).i }));
  }
  function tidyPos(pos) {
    const raw = String(pos || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (raw.some((t) => /^BREAK\b/i.test(t))) {   // 인물별 구획: 구획 안에서만 중복 제거
      const out = []; let seg = [];
      const flush = () => { out.push(...dedupe(seg).sort((a, b) => a.i - b.i).map((x) => x.t)); seg = []; };
      for (const t of raw) { if (/^BREAK\b/i.test(t)) { flush(); out.push(t); } else seg.push(t); }
      flush(); return { text: out.join(", "), before: raw.length, after: out.length, reordered: false };
    }
    const m = catMap(), items = dedupe(raw).map((x) => ({ ...x, c: catOf(x.k, m) }));
    items.sort((a, b) => a.c - b.c || a.i - b.i);
    const weighted = items.filter((x) => weightOf(x.t) > 1.001);
    let unweighted = 0;
    if (weighted.length > MAX_WEIGHTED) for (const x of weighted) if (x.c > CAT.look) { x.t = bare(x.t); unweighted++; }
    return { text: items.map((x) => x.t).join(", "), before: raw.length, after: items.length, unweighted, reordered: true };
  }
  function tidyNeg(neg) { const raw = String(neg || "").split(",").map((x) => x.trim()).filter(Boolean); return dedupe(raw).sort((a, b) => a.i - b.i).map((x) => x.t).join(", "); }

  const _api = api;
  api = (url, opt) => {
    if (on && url === "/api/generate" && opt && opt.json && opt.json.positive) {
      try {
        const p = tidyPos(opt.json.positive), n = tidyNeg(opt.json.negative);
        last = { time: Date.now(), before: p.before, after: p.after, unweighted: p.unweighted || 0, reordered: p.reordered, positive: p.text };
        opt = { ...opt, json: { ...opt.json, positive: p.text, negative: n } };
        drawSetting();
      } catch (e) { console.warn("프롬프트 정리 실패 — 원래대로 보냄", e); }
    }
    return _api(url, opt);
  };

  // ---------- 설정 탭 ----------
  let box = null;
  function drawSetting() {
    if (!box) return;
    const l = last ? `마지막 정리: 태그 ${last.before} → ${last.after}개${last.unweighted ? ` · 가중치 정리 ${last.unweighted}개` : ""}${last.reordered ? "" : " (BREAK 프롬프트 — 순서 유지)"}` : "아직 정리한 생성 없음";
    box.innerHTML = `<label>프롬프트 자동 정리 <small class="muted">— 생성 직전에 중복 제거 · 핵심 태그를 앞으로 정렬(인원 → 작가 → 핵심 체위 → 외모 → 동작 → 복장 → 표정 → 배경 → 연출 → 품질) · 가중치 과잉 정리</small></label>` +
      `<label class="check"><input type="checkbox" data-t="on"${on ? " checked" : ""}> 켜기</label><div class="muted" style="font-size:12px;margin-top:4px">${l}</div>` +
      (last ? `<details style="font-size:12px;margin-top:4px"><summary>정리된 마지막 프롬프트 보기</summary><div style="white-space:pre-wrap;word-break:break-word;margin-top:4px">${String(last.positive).replace(/</g, "&lt;")}</div></details>` : "");
    box.querySelector('[data-t="on"]').onchange = (e) => { on = e.target.checked; ls.set(KEY_ON, on); toast(on ? "프롬프트 자동 정리를 켰습니다" : "프롬프트 자동 정리를 껐습니다", "ok"); };
  }
  function addSetting() {
    const st = document.querySelector(".settings"); if (!st) return false;
    if (st.querySelector(".bc-tidy")) return true;
    box = document.createElement("div"); box.className = "field bc-tidy";
    const hr = st.querySelector("hr"); hr ? hr.before(box) : st.append(box);
    drawSetting(); return true;
  }
  { let n = 0; const t = () => { if (!addSetting() && ++n < 20) setTimeout(t, 500); }; t(); }
  window.BC_TIDY = { tidyPos, tidyNeg, get on() { return on; }, get last() { return last; } };
})();
