// 기본 캐릭터 추가 — 앱의 "기본 캐릭터" 목록(생성 탭 · 태그 선택기 기본 프롬프트 · 연작/시퀀스 캐릭터)에 함께 나옴
// 캐릭터 프롬프트엔 외모·의상만 (체위·표정·배경은 태그 선택기/연작/시퀀스가 붙임). 성인 캐릭터로 고정.
// 각 캐릭터마다 "솔로"(1girl, solo 포함) / "솔로 제외"(인원 태그 없이) / "여럿 한 번에 생성 시 사용"(1girl만) 세 가지.
// body = 외모(머리색·눈색 — 항상 유지), wear = 의상(연작/시퀀스에서 복장을 고르면 이 태그는 빠지고 고른 복장으로 교체)
// 이름은 charnames.js(설정 탭 '캐릭터 이름')에서 — 이름을 바꾸면 목록과 저장된 연작/시퀀스 캐릭터 선택도 새 이름으로
// Little Light와 Ghost가 같은 파일을 씀
(() => {
  const CN = window.BC_CHARNAMES;
  const QUALITY = "masterpiece, best quality, amazing quality, very aesthetic, absurdres";
  const NEG = "bad quality, worst quality, worst detail, lowres, sketch, censor, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, signature, logo, blurry, jpeg artifacts, child, loli, shota, petite";
  const MULTI = window.LL ? "여럿 한 번에 생성 시 사용" : "여러 체위 한 번에 생성 시 사용";
  // 머리색·눈색·옷 색을 빠짐없이 — 핵심 색은 가중치로 고정 (Danbooru에 없는 색 이름은 보조 단어로: silver hair, navy blue)
  const LOOKS = [
    ["c2",
      "adult, mature female, (black hair:1.2), medium hair, messy hair, hair between eyes, sidelocks, purple eyes",
      "(white shirt:1.2), collared shirt, sleeves rolled up, breast pocket, necklace, pendant, " +
      "(blue skirt:1.2), navy blue, pleated skirt, (black thighhighs:1.2)"],
    ["c3",
      "adult, mature female, (grey hair:1.2), silver hair, medium hair, hair between eyes, sidelocks, purple eyes",
      "(white hat:1.2), beret, hat ribbon, blue ribbon, hat bow, blue bow, " +
      "(white shirt:1.1), crop top, off-shoulder shirt, bare shoulders, (blue sailor collar:1.2), sailor collar, neck ribbon, " +
      "puffy short sleeves, frilled sleeves, sleeve ribbon, (blue wrist cuffs:1.1), frilled wrist cuffs, wrist bow, midriff, navel, " +
      "(white skirt:1.2), pleated skirt, blue trim, (white thighhighs:1.2), cross-laced legwear, necklace, pendant, blue gemstone"],
    ["c4",
      "adult, mature female, (black hair:1.2), very long hair, floating hair, hair between eyes, (heterochromia:1.2), blue eyes, red eyes, hair ribbon, red ribbon",
      "(maid headdress:1.1), maid, (black dress:1.2), collared dress, buttons, long dress, puffy sleeves, juliet sleeves, long sleeves, wrist cuffs, " +
      "(white apron:1.1), waist apron, frilled apron, neck ribbon, white gloves, frills"],
    ["c5",
      "adult, mature female, (black hair:1.2), very long hair, floating hair, hair between eyes, (blue eyes:1.1), hair ribbon, red ribbon",
      "(maid headdress:1.1), maid, (blue dress:1.2), long dress, juliet sleeves, long sleeves, wrist cuffs, " +
      "(white apron:1.2), frilled apron, neck ribbon, white gloves, frills"],
    ["c6",
      "adult, mature female, (white hair:1.2), very long hair, floating hair, hair between eyes, (blue eyes:1.1)",
      "(maid headdress:1.1), maid, (blue dress:1.2), long dress, juliet sleeves, long sleeves, " +
      "(white apron:1.2), frilled apron, neck ribbon, white gloves, frills"],
  ];
  // raw: 캐릭터 고유 태그 — 태그 선택기·연작/시퀀스가 "장면 태그 정리"를 할 때도 지우지 않음 (wear는 복장을 고를 때만 교체)
  // 내 캐릭터(설정 · '✎ 캐릭터'에서 추가)도 같은 방식으로 뒤에 붙임
  const build = () => [...LOOKS, ...(CN ? CN.mine().map((d) => [d.id, d.body, d.wear]) : [])].flatMap(([id, body, wear]) => {
    const name = CN ? CN.label(id) : id, look = wear ? `${body}, ${wear}` : body;
    const c = { negative: NEG, width: 832, height: 1216, raw: true, body, wear, cid: id };
    return [
      { ...c, label: `${name} (솔로)`, positive: `1girl, solo, ${look}, ${QUALITY}` },
      { ...c, label: `${name} (솔로 제외)`, positive: `${look}, ${QUALITY}` },
      // "여러 장면/체위 한 번에"용 — 여자 1명만 고정하고 solo는 넣지 않음 (장면마다 인원 태그를 연작/시퀀스가 붙임)
      { ...c, label: `${name} (${MULTI})`, positive: `1girl, ${look}, ${QUALITY}`, multi: true },
    ];
  });
  // 앱에 원래 있는 마녀 캐릭터("마녀 (원본)" 등)는 앞에 이름만 붙임
  const WITCH = /^(?:.+ · )?(마녀 .*)$/;
  function inject() {
    if (!Array.isArray(state.defaultCharacters)) return false;
    const before = new Map(state.defaultCharacters.map((c) => [c.cid || (WITCH.test(c.label) ? "c1:" + c.label.replace(WITCH, "$1") : c.label), c.label]));
    // 예전 이름(솔로/제외 구분 없던 것)과 지난번에 넣은 캐릭터는 지우고 다시 넣음
    state.defaultCharacters = state.defaultCharacters.filter((c) => !c.cid && !/^(흑발 \(셔츠·주름치마\)|은발 \(베레모·세일러\))$/.test(c.label));
    const sn = CN ? CN.name("c1") : "";
    for (const c of state.defaultCharacters) if (WITCH.test(c.label)) { c.witch = c.label.replace(WITCH, "$1"); c.label = sn ? `${sn} · ${c.witch}` : c.witch; }
    state.defaultCharacters.push(...build());
    // 저장된 연작/시퀀스 캐릭터 선택: 예전 이름 → 지금 이름
    const now = new Map(); for (const c of state.defaultCharacters) now.set(c.witch ? "c1:" + c.witch : c.label, c.label);
    const relabel = (old) => {
      for (const c of state.defaultCharacters) {
        if (c.witch && WITCH.test(old) && old.replace(WITCH, "$1") === c.witch) return c.label;
        if (c.cid) { const suffix = c.label.slice(c.label.lastIndexOf(" (")); const desc = CN ? CN.def(c.cid).desc : ""; if (desc && old.endsWith(desc + suffix)) return c.label; }
      }
      return old;
    };
    for (const k of ["ser_charLabel", "seq_charLabel"]) try {
      const old = JSON.parse(localStorage.getItem(k) || '""');
      if (old) { const neu = relabel(String(old)); if (neu !== old) localStorage.setItem(k, JSON.stringify(neu)); }
    } catch {}
    const sel = document.querySelector("#charSelect");   // 생성 탭 "기본 캐릭터 ▾"
    if (sel) sel.innerHTML = '<option value="">기본 캐릭터 ▾</option>' + state.defaultCharacters.map((c, i) => `<option value="${i}">${esc(c.label)}</option>`).join("");
    dispatchEvent(new Event("bc-chars-changed"));
    return true;
  }
  let n = 0;
  const tick = () => { if (!inject() && ++n < 60) setTimeout(tick, 250); };
  tick();
  addEventListener("bc-charnames-changed", () => inject());
})();
