// 작가 화풍 — 태그 선택기 '작가 화풍' 그룹 (연작의 연출·효과에도 나옴)
// 목록: 픽시브 월간 랭킹 작가 중 Danbooru 작가 태그가 있는 100명 (artists_pixiv.js — reference\artists\make_pixiv_data.ps1)
// 버튼: 픽시브 이름 · Danbooru 태그 — 실제 프롬프트에는 태그만 들어감
// 작가 태그를 고르면 화풍 참조(IP-Adapter)·화풍 LoRA가 없는 Claude_Anime_Plain 워크플로가 자동으로 골라짐 (pastel.js)
(() => {
  const T = window.BC_TAGS, A = window.LL_ARTISTS_PIXIV || [];
  if (!T || !A.length) return;
  const tagOf = (t) => t.replace(/_/g, " ").replace(/\(/g, "\\(").replace(/\)/g, "\\)");   // 괄호는 가중치로 읽히지 않게 이스케이프
  const TH = window.LL_ARTIST_THUMBS || {};   // 견본 썸네일 (artists_thumbs.js — reference\artists\make_samples.ps1 → make_thumbs.ps1)
  const items = A.map((a) => ({ n: `${a.pn} · ${a.t.replace(/_/g, " ")}`, tags: [tagOf(a.t)], ...(TH[a.t] || {}) }));
  T.G.push({ t: "작가 화풍", m: "m", z: "", it: items });
  if (window.LL_PASTEL) for (const it of items) window.LL_PASTEL.ARTIST_NAMES.add(it.n);
})();
