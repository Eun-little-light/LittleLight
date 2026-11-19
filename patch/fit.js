// 작은 창 대응 — 창을 줄였을 때 버튼 글자가 한 글자씩 세로로 꺾이거나 가로로 넘치는 문제 정리 (Little Light · Ghost 공용)
//  - 버튼·선택칸 글자는 줄바꿈하지 않고, 대신 버튼 줄(카드 머리·도구 모음·생성 버튼 줄)이 다음 줄로 넘어감
//  - 긴 설명이 붙은 체크 항목은 넘치지 않고 안에서 줄바꿈
//  - 태그 선택기를 위아래로 쌓는 좁은 창(820px 이하)에서 오른쪽 칸이 태그 목록을 눌러 버리지 않게 높이 제한
//  맨 마지막 모듈(ios 테마 뒤)로 넣음
(() => {
  const css = document.createElement("style");
  css.id = "bc-fit";
  css.textContent = `
button,select,.chip,.brand{white-space:nowrap}
.card-head{flex-wrap:wrap;row-gap:6px}
.card-head h3{min-width:min(100%,8em);flex:0 1 auto;overflow-wrap:anywhere}
.card-head h3 small{white-space:normal}
.head-tools{flex-wrap:wrap;justify-content:flex-end;min-width:0;row-gap:6px}
.gen-buttons{flex-wrap:wrap}
label.check{flex-wrap:wrap;min-width:0}
.toolbar{flex-wrap:wrap;row-gap:6px}
.toolbar>span{white-space:nowrap}
.toolbar input[type=search]{min-width:0;flex:1 1 160px}
.link-badge{white-space:nowrap;display:inline-block}
.bc-qdlg .hd{flex-wrap:wrap}
.ed-recent>.muted{grid-column:1/-1}
@media (max-width:820px){#tp>div{grid-template-rows:minmax(0,1fr) auto!important}#tpR{max-height:42vh;overflow:auto}#tpL{min-height:0}}
`;
  document.head.append(css);
})();
