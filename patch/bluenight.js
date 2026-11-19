// 푸른 밤 — 태그 선택기 '푸른 밤' 그룹 (연작의 연출·효과에도 나옴)
// 참고 그림(reference\style_ref_bluenight.webp): 푸른 단색조 · 강한 역광 · 흩날리는 흰 긴 머리 · 클래식 메이드복 · 눈 내린 밤 정원
// 원작자를 찾지 못해(역검색 결과 없음) 작가 태그 대신 화풍 태그 묶음 + 참고 그림 IP-Adapter로 구성
// 옷은 무광 천 — shiny clothes는 넣지 않고, 푸른 밤으로 생성할 때 pastel.js가 광택 태그(shiny clothes·latex·satin…)를 부정에 붙임
// 항목을 고르면 화풍 참조 없는 Plain 워크플로, '참고 그림' 항목이면 Claude_Anime_BlueNight_IPAdapter가 자동으로 골라짐 (pastel.js)
(() => {
  const T = window.BC_TAGS;
  if (!T) return;
  const STYLE = ["blue theme", "limited palette", "high contrast", "backlighting", "depth of field", "blurry background", "film grain"];
  const HAIR = ["white hair", "very long hair", "floating hair", "wind", "hair between eyes"];
  const MAID = ["maid", "maid headdress", "long dress", "blue dress", "white apron", "frilled apron", "neck ribbon", "juliet sleeves", "white gloves", "frills"];
  const POSE = ["skirt hold", "closed eyes", "smile", "open mouth"];
  const SCENE = ["outdoors", "night", "snow", "winter", "bare tree", "pillar"];
  const FULL = [...STYLE, ...HAIR, ...MAID, ...POSE, ...SCENE, "cowboy shot"];
  T.G.push({ t: "푸른 밤", m: "m", z: "", it: [
    { n: "푸른 밤 화풍", tags: STYLE },
    { n: "푸른 밤 풀세트", tags: FULL },
    { n: "푸른 밤 · 참고 그림 화풍", tags: FULL },
    { n: "푸른 밤 · 흩날리는 흰 긴 머리", tags: HAIR },
    { n: "푸른 밤 · 클래식 메이드복", tags: MAID },
    { n: "푸른 밤 · 치마 잡고 눈 감은 미소", tags: POSE },
    { n: "푸른 밤 · 눈 내린 밤 정원", tags: SCENE },
  ] });
})();
