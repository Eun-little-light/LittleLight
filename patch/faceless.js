// 남자 얼굴 숨기기 보정 — 모든 생성 요청(/api/generate)에 적용 (Little Light · Ghost 공용)
//  태그 선택기·시퀀스의 '남자 얼굴 숨기기'는 긍정 끝에 faceless male을 붙이는데, 긴 프롬프트 맨 끝(100번째 이후)이라 거의 안 먹음
//  → 긍정에 faceless male이 있으면 인원 태그(1boy · 2boys · hetero …) 바로 뒤로 옮기고 가중치 1.3
//  → 부정의 male face · detailed male face(Danbooru 태그 아님)는 가중치 1.3으로
//  faceless male이 없으면(남자 얼굴 숨기기를 끈 경우) 아무것도 안 함
(() => {
  const W = 1.3;
  const norm = (t) => t.trim().replace(/^BREAK\s+/i, "").replace(/^\(+|\)+$/g, "").replace(/:[\d.]+$/, "").replace(/_/g, " ").toLowerCase();
  const HEAD = /^(\d\+?(boys?|girls?|others?)|multiple (boys|girls)|hetero|group sex|\dpeople)$/;
  function fix(pos, neg) {
    const segs = String(pos || "").split(",").map((x) => x.trim()).filter(Boolean);
    const i = segs.findIndex((s) => norm(s) === "faceless male");
    if (i < 0) return null;
    const m = segs[i].match(/^(BREAK\s+)/i);
    segs.splice(i, 1, ...(m ? ["BREAK"] : []));                     // BREAK 구획은 유지
    let at = -1; segs.slice(0, 15).forEach((s, k) => { if (HEAD.test(norm(s))) at = k; });   // 앞쪽(15개 안) 인원 태그 중 마지막 것 바로 뒤
    segs.splice(at + 1, 0, `(faceless male:${W})`);
    const n = String(neg || "").split(",").map((x) => x.trim()).filter(Boolean)
      .map((t) => (/^(male face|detailed male face)$/.test(norm(t)) && !/:\s*[\d.]+\)\s*$/.test(t) ? `(${norm(t)}:${W})` : t));
    if (!n.some((t) => norm(t) === "male face")) n.push(`(male face:${W})`);
    return { positive: segs.join(", "), negative: n.join(", ") };
  }
  const _api = api;
  api = (url, opt) => {
    if (url === "/api/generate" && opt && opt.json) { const r = fix(opt.json.positive, opt.json.negative); if (r) opt = { ...opt, json: { ...opt.json, ...r } }; }
    return _api(url, opt);
  };
  window.BC_FACELESS = { fix };
})();
