// iOS 스타일 UI · 상호작용 레이어 (테마, 내비게이션 바, 플로팅 탭 바, 시트, 알림창, 배너, 스위치, 제스처)
(() => {
  const root = document.documentElement;
  root.classList.add("ios");
  const $q = (s, r = document) => r.querySelector(s);
  const $qa = (s, r = document) => [...r.querySelectorAll(s)];
  const EASE = "cubic-bezier(.32,.72,0,1)";
  const ls = { get(k, d) { try { return localStorage.getItem("ios_" + k) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem("ios_" + k, v); } catch {} } };

  // ---------------- 테마 ----------------
  const LIGHT = `--bg:#f2f2f7;--panel:#ffffff;--panel2:#f2f2f7;--line:rgba(60,60,67,.18);--sep:rgba(60,60,67,.24);
--text:#000;--muted:rgba(60,60,67,.62);--accent:#007aff;--accent2:#5856d6;--danger:#ff3b30;--ok:#34c759;
--c0:#007aff;--c1:#ff3b30;--c3:#af52de;--c4:#34c759;--c5:#ff9500;--cx:#8e8e93;
--fill:rgba(118,118,128,.12);--fill2:rgba(118,118,128,.2);--field:rgba(118,118,128,.12);
--glass:rgba(249,249,251,.72);--glass-strong:rgba(250,250,252,.86);--glass-line:rgba(0,0,0,.08);
--sheet:#ffffff;--seg-on:#ffffff;--shadow:0 12px 36px rgba(0,0,0,.14);--grab:rgba(60,60,67,.3);color-scheme:light;`;
  const DARK = `--bg:#000000;--panel:#1c1c1e;--panel2:#2c2c2e;--line:rgba(84,84,88,.5);--sep:rgba(84,84,88,.6);
--text:#ffffff;--muted:rgba(235,235,245,.6);--accent:#0a84ff;--accent2:#5e5ce6;--danger:#ff453a;--ok:#30d158;
--c0:#0a84ff;--c1:#ff453a;--c3:#bf5af2;--c4:#30d158;--c5:#ff9f0a;--cx:#98989d;
--fill:rgba(118,118,128,.24);--fill2:rgba(118,118,128,.34);--field:rgba(118,118,128,.24);
--glass:rgba(28,28,30,.7);--glass-strong:rgba(44,44,46,.86);--glass-line:rgba(255,255,255,.1);
--sheet:#1c1c1e;--seg-on:#636366;--shadow:0 12px 36px rgba(0,0,0,.55);--grab:rgba(235,235,245,.3);color-scheme:dark;`;
  const applyTheme = (v) => { if (v === "light" || v === "dark") root.dataset.iosTheme = v; else delete root.dataset.iosTheme; };
  applyTheme(ls.get("theme", "auto"));

  const chevron = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='16' viewBox='0 0 12 16'%3E%3Cpath d='M3 6l3-3 3 3M3 10l3 3 3-3' fill='none' stroke='%238e8e93' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
  const magnifier = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='7' cy='7' r='5' fill='none' stroke='%238e8e93' stroke-width='1.8'/%3E%3Cpath d='M11 11l3.5 3.5' stroke='%238e8e93' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E";

  const css = document.createElement("style");
  css.id = "ios-style";
  css.textContent = `
:root.ios{${LIGHT}}
@media (prefers-color-scheme: dark){:root.ios:not([data-ios-theme=light]){${DARK}}}
:root.ios[data-ios-theme=dark]{${DARK}}
:where(:root.ios){font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Apple SD Gothic Neo","Pretendard","Malgun Gothic",system-ui,sans-serif;-webkit-font-smoothing:antialiased;--radius:14px}
:where(:root.ios) body{font-size:15px;letter-spacing:-.01em;background:var(--bg);color:var(--text);transition:background-color .3s}
:where(:root.ios) ::selection{background:color-mix(in srgb,var(--accent) 30%,transparent)}
:where(:root.ios) ::-webkit-scrollbar{width:10px;height:10px}
:where(:root.ios) ::-webkit-scrollbar-thumb{background:var(--fill2);border-radius:999px;border:3px solid transparent;background-clip:padding-box}
:where(:root.ios) ::-webkit-scrollbar-track{background:transparent}

/* 내비게이션 바 */
:where(:root.ios) header{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:10px 20px;background:transparent;border-bottom:.5px solid transparent;transition:background-color .25s,border-color .25s}
:root.ios header.scrolled{background:var(--glass);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);border-bottom-color:var(--sep)}
:root.ios header #tabs{display:none}
:where(:root.ios) .brand{font-size:15px;font-weight:600;letter-spacing:0;color:var(--muted)}
:where(:root.ios) .brand span{color:inherit}
.ios-navtitle{font-size:17px;font-weight:600;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;white-space:nowrap}
header.scrolled .ios-navtitle{opacity:1;transform:none}
:where(:root.ios) .conn{justify-self:end;background:var(--fill);padding:5px 11px;border-radius:999px;font-size:12px;color:var(--muted)}
:where(:root.ios) .conn i{width:8px;height:8px}
:where(:root.ios) .conn.on i{box-shadow:none}
:where(:root.ios) main{padding:2px 20px 130px;max-width:1500px;margin:0 auto}
.ios-large{font-size:34px;line-height:1.15;font-weight:700;letter-spacing:.005em;margin:2px 4px 16px}

/* 플로팅 탭 바 */
.ios-tabbar{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;display:flex;gap:2px;padding:6px;border-radius:999px;background:var(--glass);-webkit-backdrop-filter:saturate(180%) blur(26px);backdrop-filter:saturate(180%) blur(26px);border:.5px solid var(--glass-line);box-shadow:var(--shadow)}
.ios-tabbar button{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:74px;padding:6px 12px 5px;border:0;border-radius:999px;background:transparent;color:var(--text);font-size:10.5px;font-weight:500;cursor:pointer;transition:background-color .3s ${EASE},color .3s,transform .15s}
.ios-tabbar button:hover{background:var(--fill)}
.ios-tabbar button.on{color:var(--accent);background:var(--fill)}
.ios-tabbar button:active{transform:scale(.92);opacity:1}
.ios-tabbar svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.ios-tabbar button.on svg{stroke-width:2.1}

/* 카드 · 탭 전환 */
:where(:root.ios) .card{background:var(--panel);border:0;border-radius:var(--radius);padding:16px;margin-bottom:16px}
:where(:root.ios) .card h3{font-size:15px;font-weight:600}
:where(:root.ios) .tab.active{animation:iosTabIn .35s ${EASE}}
@keyframes iosTabIn{from{opacity:0;transform:translateY(8px)}}
:where(:root.ios) .field>label{font-size:13px;color:var(--muted);margin-bottom:6px}
:where(:root.ios) hr{border-top:.5px solid var(--sep)}
:where(:root.ios) .hint,:where(:root.ios) .muted{color:var(--muted)}

/* 버튼 */
:where(:root.ios) button{background:var(--fill);border:0;border-radius:10px;padding:8px 14px;color:var(--accent);font-weight:500;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .14s ease,opacity .14s ease,background-color .2s,filter .2s}
:where(:root.ios) button:hover{background:var(--fill2);border-color:transparent}
:where(:root.ios) button:active{transform:scale(.96);opacity:.65}
:where(:root.ios) button:disabled{opacity:.4;transform:none}
:where(:root.ios) button.primary{background:var(--accent);color:#fff;font-weight:600}
:where(:root.ios) button.primary:hover{background:var(--accent);filter:brightness(1.08)}
:where(:root.ios) button.primary-ghost{background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);border:0}
:where(:root.ios) button.primary-ghost:hover{background:color-mix(in srgb,var(--accent) 22%,transparent)}
:where(:root.ios) button.danger-ghost{background:transparent;color:var(--danger);border:0}
:where(:root.ios) button.danger-ghost:hover{background:color-mix(in srgb,var(--danger) 12%,transparent)}
:where(:root.ios) button.mini{padding:5px 11px;font-size:12.5px;border-radius:999px}
:where(:root.ios) button.big{padding:14px 18px;font-size:17px;border-radius:14px;font-weight:600}
:where(:root.ios) button.link{background:none;padding:0 4px;color:var(--accent)}
:where(:root.ios) .gen-buttons{gap:10px}

/* 입력 */
:where(:root.ios) :is(input[type=text],input[type=number],input[type=search],select,textarea){background-color:var(--field);border:0;border-radius:10px;padding:9px 12px;color:var(--text);transition:box-shadow .2s}
:where(:root.ios) :is(input,select,textarea):focus{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 35%,transparent);border-color:transparent}
:where(:root.ios) select{-webkit-appearance:none;appearance:none;background-image:url("${chevron}");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
:where(:root.ios) select option{background:var(--panel);color:var(--text)}
:where(:root.ios) select optgroup{background:var(--panel2);color:var(--accent);font-weight:700;font-style:normal}
:where(:root.ios) select optgroup option{background:var(--panel);color:var(--text);font-weight:400}
:where(:root.ios) input[type=search]{background-image:url("${magnifier}");background-repeat:no-repeat;background-position:10px center;padding-left:32px}
:where(:root.ios) textarea{font-family:"SF Mono",ui-monospace,Menlo,Consolas,"D2Coding",monospace;font-size:13.5px;line-height:1.55}
:where(:root.ios) .mini-select{background-color:var(--fill);color:var(--accent);border-radius:999px;padding:5px 26px 5px 11px;font-size:12.5px;background-position:right 8px center}

/* 스위치 */
:where(:root.ios) input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:none;width:46px;height:28px;margin:0;border-radius:999px;background:var(--fill2);position:relative;cursor:pointer;transition:background-color .25s;vertical-align:middle}
:where(:root.ios) input[type=checkbox]::before{content:"";position:absolute;top:2px;left:2px;width:24px;height:24px;border-radius:999px;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.15),0 1px 1px rgba(0,0,0,.16);transition:transform .32s cubic-bezier(.3,1.35,.5,1),width .2s ease}
:where(:root.ios) input[type=checkbox]:checked{background:var(--ok)}
:where(:root.ios) input[type=checkbox]:checked::before{transform:translateX(18px)}
:where(:root.ios) input[type=checkbox]:active::before{width:30px}
:where(:root.ios) input[type=checkbox]:checked:active::before{transform:translateX(12px)}
:where(:root.ios) label.check{display:flex;align-items:center;gap:10px;white-space:normal;line-height:1.35}
:where(:root.ios) label.check input{order:9;margin-left:auto}
:where(:root.ios) .settings label.check{margin:0;padding:12px 0;border-bottom:.5px solid var(--sep);font-size:15px}
:where(:root.ios) .checks label.check{padding:6px 0}
:where(:root.ios) .row label.check{white-space:nowrap;flex:none;margin:0}
:where(:root.ios) .row label.check input{margin-left:0}
:root.ios #sizePreset{flex:none;width:auto;min-width:122px}

/* 슬라이더 · 진행 */
:where(:root.ios) input[type=range]{-webkit-appearance:none;appearance:none;height:28px;background:transparent;--p:50%}
:where(:root.ios) input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:linear-gradient(to right,var(--accent) var(--p),var(--fill2) var(--p))}
:where(:root.ios) input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-11px;border-radius:50%;background:#fff;box-shadow:0 .5px 4px rgba(0,0,0,.12),0 6px 13px rgba(0,0,0,.14);transition:transform .15s}
:where(:root.ios) input[type=range]:active::-webkit-slider-thumb{transform:scale(1.1)}
:where(:root.ios) .progress{height:4px;background:var(--fill2);border-radius:999px}
:where(:root.ios) #progressBar{background:var(--accent);transition:width .3s ${EASE}}

/* 칩 · 자동완성 */
:where(:root.ios) .chip{border:0;background:color-mix(in srgb,var(--cc) 16%,var(--panel));border-radius:999px;padding:4px 11px;font-size:13px;transition:transform .12s}
:where(:root.ios) .chip:active{transform:scale(.95)}
:where(:root.ios) .chip .ctl::before{background:var(--glass-strong);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:.5px solid var(--glass-line);border-radius:10px}
:where(:root.ios) .chip .b{background:none;color:var(--text);border-radius:7px}
:where(:root.ios) .chip .b:active{transform:none}
:where(:root.ios) .ac{background:var(--glass-strong);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border:.5px solid var(--glass-line);border-radius:14px;box-shadow:var(--shadow);padding:6px;animation:iosPop .25s ${EASE}}
:where(:root.ios) .ac-item{border-radius:8px}
:where(:root.ios) .ac-item.sel,:where(:root.ios) .ac-item:hover{background:var(--fill)}

/* 생성 결과 · 갤러리 · 기타 */
:where(:root.ios) .results img{border-radius:12px}
:where(:root.ios) .g-item{border:0;border-radius:16px;transition:transform .2s ${EASE}}
:where(:root.ios) .g-item:active{transform:scale(.97)}
:where(:root.ios) .g-item .badge{border-radius:999px;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);background:rgba(0,0,0,.45)}
:where(:root.ios) .wf-info{background:var(--field);border:0;border-radius:12px}
:where(:root.ios) .notice{border:0;border-radius:14px;background:color-mix(in srgb,var(--c5) 15%,var(--panel))}
:where(:root.ios) .drop{border:2px dashed var(--sep);border-radius:16px}
:where(:root.ios) .wf-list .wf{border:0;border-bottom:.5px solid var(--sep);border-radius:0;padding:12px 2px;margin:0}
:where(:root.ios) .legend{color:var(--muted)}
:where(:root.ios) code{background:var(--fill);border-radius:6px}

/* 시트 (갤러리 상세 · 태그 선택기) */
:root.ios .modal,:root.ios #tp{align-items:flex-end;padding:28px 0 0;background:rgba(0,0,0,.4);animation:iosFade .3s ease}
:root.ios .modal-body{border:0;border-radius:18px 18px 0 0;max-width:1400px;width:100%;height:100%;max-height:none;margin:0 auto;padding:30px 16px 16px;background:var(--sheet);box-shadow:0 -10px 40px rgba(0,0,0,.25);animation:iosSheetUp .5s ${EASE}}
:root.ios #tp>div{margin:0 auto;height:100%;border:0;border-radius:18px 18px 0 0;background:var(--sheet);position:relative;box-shadow:0 -10px 40px rgba(0,0,0,.25);animation:iosSheetUp .5s ${EASE}}
:root.ios #tpL,:root.ios #tpR{padding-top:28px}
:root.ios #tpR{border-left:.5px solid var(--sep)}
:root.ios #tp h4{font-size:13px;font-weight:600;color:var(--muted);margin:16px 0 8px}
:root.ios #tp .b{border-radius:999px;padding:7px 14px;color:var(--text)}
:root.ios #tp .b.on{background:var(--accent);color:#fff;font-weight:600;border-color:transparent}
:root.ios #tp .t{border:0;background:color-mix(in srgb,var(--accent) 15%,transparent);border-radius:999px;padding:3px 10px}
:root.ios #tp .t.k{background:color-mix(in srgb,var(--c5) 18%,transparent);color:var(--c5)}
:root.ios #tp .t.x{background:var(--fill);color:var(--muted)}
:root.ios #tpO{background:var(--field);border:0;border-radius:12px}
:root.ios #tp label{font-size:13px;gap:10px}
:root.ios #tp label input[type=checkbox]{order:0;margin-left:0}
:root.ios #tp input[type=number]{background:var(--field);border:0;border-radius:8px}
:root.ios .modal-close{z-index:5;top:12px;right:14px;width:30px;height:30px;padding:0;border-radius:50%;background:var(--fill);color:var(--muted);font-size:18px;line-height:30px;text-align:center}
:root.ios .modal-img{background:var(--bg);border-radius:14px;overflow:hidden;touch-action:pan-y}
:root.ios .modal-img img{transition:transform .3s ${EASE}}
:root.ios .modal-img .nav{width:40px;height:40px;padding:0;border-radius:50%;background:var(--glass);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);color:var(--text);font-size:24px}
:root.ios .modal-info .p{background:var(--field);border:0;border-radius:12px}
.ios-grabber{position:absolute;top:7px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:999px;background:var(--grab);z-index:4;pointer-events:none}
.ios-dragzone{position:absolute;top:0;left:0;right:0;height:26px;cursor:grab;z-index:3;touch-action:none}
.ios-dragzone:active{cursor:grabbing}
@keyframes iosSheetUp{from{transform:translateY(100%)}}
@keyframes iosFade{from{background-color:rgba(0,0,0,0)}}

/* 프리셋 드롭다운 (팝오버) */
:root.ios .pg-btn{background-color:var(--field);color:var(--text);font-weight:400;border-radius:10px;padding:9px 12px}
:root.ios .pg-btn:active{transform:none;opacity:.8}
:root.ios .pg-btn b{color:var(--muted);font-weight:400}
:root.ios .pg-pop{background:var(--glass-strong);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border:.5px solid var(--glass-line);border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,.3);transform-origin:top left;animation:iosPop .38s ${EASE}}
:root.ios .pg-top{background:transparent}
:root.ios .pg-top input{background-color:var(--field);border:0}
:root.ios .pg-tabs button{border-radius:999px;color:var(--text)}
:root.ios .pg-tabs button.on{background:var(--accent);color:#fff}
:root.ios .pg-sec h4{font-size:13px}
:root.ios .pg-tile{border-radius:14px;color:var(--text);background:var(--fill);min-height:62px}
:root.ios .pg-tile.on{background:var(--accent);color:#fff;font-weight:600}
@keyframes iosPop{from{opacity:0;transform:scale(.9) translateY(-8px)}}

/* 배너 알림 */
:root.ios #toasts{top:10px;bottom:auto;left:50%;right:auto;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));gap:8px;z-index:200;pointer-events:none}
.ios-banner{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:var(--glass-strong);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border:.5px solid var(--glass-line);box-shadow:0 12px 40px rgba(0,0,0,.25);font-size:14px;line-height:1.4;white-space:pre-wrap;cursor:pointer;touch-action:none;user-select:none;animation:iosBannerIn .55s ${EASE};transition:transform .35s ${EASE},opacity .35s}
.ios-banner.out{transform:translateY(-150%);opacity:0}
.ios-banner i{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:15px;color:#fff;background:var(--accent)}
.ios-banner.ok i{background:var(--ok)}.ios-banner.err i{background:var(--danger)}
.ios-banner div{min-width:0;overflow-wrap:anywhere}
@keyframes iosBannerIn{from{transform:translateY(-150%);opacity:0}}

/* 알림창 */
.ios-alert-back{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.35);display:grid;place-items:center;animation:iosFade .2s ease;transition:opacity .18s}
.ios-alert-back.out{opacity:0}
.ios-alert{width:280px;border-radius:16px;overflow:hidden;text-align:center;background:var(--glass-strong);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border:.5px solid var(--glass-line);box-shadow:0 20px 60px rgba(0,0,0,.3);animation:iosAlertIn .32s ${EASE}}
.ios-alert .bd{padding:20px 16px 16px}
.ios-alert h5{margin:0 0 4px;font-size:17px;font-weight:600;line-height:1.3}
.ios-alert p{margin:0;font-size:13px;line-height:1.4;white-space:pre-wrap;color:var(--text)}
.ios-alert input{margin-top:14px;width:100%;background:var(--panel)!important;border-radius:8px!important;font-size:14px}
.ios-alert .bt{display:flex;border-top:.5px solid var(--sep)}
.ios-alert .bt button{flex:1;background:none;border-radius:0;padding:12px 8px;font-size:17px;font-weight:400;color:var(--accent)}
.ios-alert .bt button+button{border-left:.5px solid var(--sep)}
.ios-alert .bt button.def{font-weight:600}
.ios-alert .bt button.red{color:var(--danger)}
.ios-alert .bt button:hover{background:var(--fill)}
.ios-alert .bt button:active{transform:none;opacity:1;background:var(--fill2)}
@keyframes iosAlertIn{from{transform:scale(1.15);opacity:0}}

/* 세그먼트 컨트롤 */
.ios-seg{display:inline-flex;background:var(--fill);border-radius:10px;padding:2px;gap:2px}
.ios-seg button{background:transparent;color:var(--text);border-radius:8px;padding:6px 18px;font-size:13px;font-weight:500}
.ios-seg button:hover{background:transparent}
.ios-seg button.on{background:var(--seg-on);font-weight:600;box-shadow:0 3px 8px rgba(0,0,0,.12),0 3px 1px rgba(0,0,0,.04)}
.ios-seg button:active{transform:scale(.97);opacity:1}
.ios-theme-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 12px;border-bottom:.5px solid var(--sep);margin-bottom:4px}
.ios-theme-row>span{font-size:15px}

@media (max-width:640px){.ios-tabbar button{min-width:58px;padding:6px 8px 5px}.ios-large{font-size:30px}:where(:root.ios) main{padding:2px 14px 130px}}
@media (prefers-reduced-motion:reduce){:root.ios *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
  document.head.append(css);

  // ---------------- 내비게이션 바 · 라지 타이틀 · 탭 바 ----------------
  const header = $q("header"), main = $q("main");
  const TABS = $qa("#tabs button").map((b) => ({ id: b.dataset.tab, label: b.textContent.trim() }));
  const SHORT = { tagger: "태그 추출", seq: "연작" };
  const ICON = {
    gen: '<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    seq: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    gallery: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 16l-4.5-4.5-8.5 8"/>',
    tagger: '<path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.5"/>',
    workflows: '<rect x="3" y="3.5" width="7" height="7" rx="2"/><rect x="14" y="13.5" width="7" height="7" rx="2"/><path d="M10 7h3.5a3 3 0 0 1 3 3v3.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  const navTitle = document.createElement("div");
  navTitle.className = "ios-navtitle";
  $q("#tabs").after(navTitle);
  const large = document.createElement("h1");
  large.className = "ios-large";
  main.prepend(large);
  const bar = document.createElement("nav");
  bar.className = "ios-tabbar";
  bar.innerHTML = TABS.map((t) => `<button type="button" data-tab="${t.id}"><svg viewBox="0 0 24 24">${ICON[t.id] || '<circle cx="12" cy="12" r="8"/>'}</svg><span>${SHORT[t.id] || t.label}</span></button>`).join("");
  document.body.append(bar);

  let cur = ($q(".tab.active") || { id: "tab-gen" }).id.slice(4);
  const scrollPos = {};
  const labelOf = (id) => (TABS.find((t) => t.id === id) || { label: id }).label;
  function syncChrome() {
    large.textContent = navTitle.textContent = labelOf(cur);
    $qa("button", bar).forEach((b) => b.classList.toggle("on", b.dataset.tab === cur));
    header.classList.toggle("scrolled", scrollY > 30);
    $qa('input[type=range]').forEach(fillRange);
  }
  const origShowTab = showTab;
  showTab = function (name) {   // eslint-disable-line no-global-assign
    if (name !== cur) scrollPos[cur] = scrollY;
    const r = origShowTab.apply(this, arguments);
    cur = name;
    syncChrome();
    window.scrollTo({ top: scrollPos[name] || 0, behavior: "instant" });
    return r;
  };
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tab === cur) window.scrollTo({ top: 0, behavior: "smooth" });   // 같은 탭 다시 누르면 맨 위로
    else showTab(b.dataset.tab);
  });
  addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 30), { passive: true });
  navTitle.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));   // 상태 표시줄 탭 = 맨 위로

  // ---------------- 슬라이더 채움 ----------------
  function fillRange(r) {
    const min = +r.min || 0, max = +r.max || 100, p = ((+r.value - min) / (max - min || 1)) * 100;
    r.style.setProperty("--p", Math.max(0, Math.min(100, p)) + "%");
  }
  document.addEventListener("input", (e) => { if (e.target.type === "range") fillRange(e.target); });

  // ---------------- 배너 알림 (toast 대체) ----------------
  const box = $q("#toasts");
  toast = function (msg, kind = "") {   // eslint-disable-line no-global-assign
    const t = document.createElement("div");
    t.className = "ios-banner " + kind;
    t.innerHTML = `<i>${kind === "ok" ? "✓" : kind === "err" ? "!" : "i"}</i><div></div>`;
    t.lastChild.textContent = msg;
    box.prepend(t);
    while (box.children.length > 3) box.lastChild.remove();
    let gone = false;
    const dismiss = () => { if (gone) return; gone = true; t.classList.add("out"); setTimeout(() => t.remove(), 360); };
    let timer = setTimeout(dismiss, kind === "err" ? 7000 : 3200);
    let y0 = null;
    t.addEventListener("pointerdown", (e) => { y0 = e.clientY; t.setPointerCapture(e.pointerId); t.style.transition = "none"; clearTimeout(timer); });
    t.addEventListener("pointermove", (e) => { if (y0 == null) return; const dy = Math.min(0, e.clientY - y0); t.style.transform = `translateY(${dy}px)`; });
    t.addEventListener("pointerup", (e) => {
      const dy = e.clientY - y0; y0 = null; t.style.transition = ""; t.style.transform = "";
      if (dy < -24 || Math.abs(dy) < 4) dismiss(); else timer = setTimeout(dismiss, 2000);
    });
  };

  // ---------------- 알림창 (confirm / prompt 대체) ----------------
  function iosAlert({ title = "", message = "", input = false, value = "", buttons }) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "ios-alert-back";
      back.innerHTML = `<div class="ios-alert" role="alertdialog"><div class="bd"><h5></h5><p></p>${input ? "<input type='text'>" : ""}</div><div class="bt"></div></div>`;
      $q("h5", back).textContent = title;
      $q("p", back).textContent = message;
      if (!title) $q("h5", back).remove();
      if (!message) $q("p", back).remove();
      const inp = $q("input", back);
      if (inp) inp.value = value || "";
      const bt = $q(".bt", back);
      buttons.forEach((b, i) => {
        const el = document.createElement("button");
        el.type = "button"; el.textContent = b.text;
        if (b.def) el.classList.add("def");
        if (b.red) el.classList.add("red");
        el.onclick = () => done(i);
        bt.append(el);
      });
      const cancelIdx = buttons.findIndex((b) => b.cancel), defIdx = buttons.findIndex((b) => b.def || b.red);
      const key = (e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(cancelIdx); }
        if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); done(defIdx); }
      };
      function done(i) {
        document.removeEventListener("keydown", key, true);
        back.classList.add("out");
        setTimeout(() => back.remove(), 180);
        resolve({ i, value: inp ? inp.value : null, ok: i !== cancelIdx && i >= 0 });
      }
      document.addEventListener("keydown", key, true);
      document.body.append(back);
      (inp || $q("button.def,button.red", back) || $q("button", back)).focus();
      if (inp) inp.select();
    });
  }
  window.iosAlert = iosAlert;

  // 앱 코드의 동기 confirm/prompt → iOS 알림창. 사용자가 확인하면 같은 이벤트를 다시 실행하고 그때 답을 돌려준다.
  const nativeConfirm = window.confirm.bind(window), nativePrompt = window.prompt.bind(window);
  let answer = null, lastSel = null;
  document.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") lastSel = { t: e.target, v: e.target.value }; }, true);
  function replay(t, type, v) {
    answer = { v };
    try {
      if (type === "change") { if (lastSel && lastSel.t === t) t.value = lastSel.v; t.dispatchEvent(new Event("change", { bubbles: true })); }
      else t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    } finally { answer = null; }
  }
  const split = (msg) => { const [a, ...b] = String(msg).split("\n"); return { title: a, message: b.join("\n") }; };
  window.confirm = function (msg) {
    if (answer) { const v = answer.v; answer = null; return v; }
    const ev = window.event;
    if (!ev || !ev.target || !ev.type) return nativeConfirm(msg);
    const t = ev.target, type = ev.type, red = /삭제|지울|지우/.test(msg);
    iosAlert({ ...split(msg), buttons: [{ text: "취소", cancel: true }, red ? { text: /지울|지우/.test(msg) ? "지우기" : "삭제", red: true } : { text: "확인", def: true }] })
      .then((r) => { if (r.ok) replay(t, type, true); });
    return false;
  };
  window.prompt = function (msg, def) {
    if (answer) { const v = answer.v; answer = null; return v; }
    const ev = window.event;
    if (!ev || !ev.target || !ev.type) return nativePrompt(msg, def);
    const t = ev.target, type = ev.type;
    iosAlert({ title: msg, input: true, value: def, buttons: [{ text: "취소", cancel: true }, { text: "저장", def: true }] })
      .then((r) => { if (r.ok && r.value) replay(t, type, r.value); });
    return null;
  };

  // ---------------- 시트 (밀어서 닫기 + 닫힘 애니메이션) ----------------
  function sheet(el, panel, close) {
    if (!el || !panel) return;
    if (getComputedStyle(panel).position === "static") panel.style.position = "relative";
    panel.insertAdjacentHTML("afterbegin", '<div class="ios-grabber"></div><div class="ios-dragzone" title="아래로 끌어서 닫기"></div>');
    const cl = el.classList, add = cl.add.bind(cl);
    let closing = false;
    cl.add = function (...a) {   // 'hidden' 이 붙을 때 아래로 내려가며 닫힘
      if (!a.includes("hidden") || cl.contains("hidden") || closing) return add(...a);
      closing = true;
      panel.style.transition = `transform .34s ${EASE}`;
      panel.style.transform = "translateY(105%)";
      el.style.transition = "background-color .3s";
      el.style.backgroundColor = "rgba(0,0,0,0)";
      setTimeout(() => {
        add(...a);
        panel.style.transition = panel.style.transform = el.style.transition = el.style.backgroundColor = "";
        closing = false;
      }, 320);
    };
    const zone = $q(".ios-dragzone", panel);
    let y0 = null, t0 = 0, dy = 0;
    zone.addEventListener("pointerdown", (e) => { y0 = e.clientY; t0 = performance.now(); dy = 0; zone.setPointerCapture(e.pointerId); panel.style.transition = "none"; });
    zone.addEventListener("pointermove", (e) => {
      if (y0 == null) return;
      dy = e.clientY - y0;
      panel.style.transform = `translateY(${dy > 0 ? dy : dy / 4}px)`;   // 위로는 고무줄처럼
    });
    const end = () => {
      if (y0 == null) return;
      const v = dy / Math.max(1, performance.now() - t0);
      y0 = null;
      if (dy > 120 || (dy > 30 && v > 0.6)) close();
      else { panel.style.transition = `transform .4s ${EASE}`; panel.style.transform = ""; }
    };
    zone.addEventListener("pointerup", end);
    zone.addEventListener("pointercancel", end);
  }
  sheet($q("#modal"), $q("#modal .modal-body"), () => closeModal());
  sheet($q("#tp"), $q("#tp > div"), () => $q("#tp").classList.add("hidden"));

  // 갤러리 상세: 사진처럼 좌우로 밀어서 넘기기
  const mImgBox = $q(".modal-img"), mImg = $q("#mImg");
  if (mImgBox && mImg) {
    let x0 = null, dx = 0;
    mImgBox.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; x0 = e.clientX; dx = 0; mImgBox.setPointerCapture(e.pointerId); mImg.style.transition = "none"; });
    mImgBox.addEventListener("pointermove", (e) => { if (x0 == null) return; dx = e.clientX - x0; mImg.style.transform = `translateX(${dx}px)`; });
    const endSwipe = () => {
      if (x0 == null) return; x0 = null;
      mImg.style.transition = ""; mImg.style.transform = "";
      const many = $q("#mNext") && $q("#mNext").style.display !== "none";
      if (many && dx < -60) $q("#mNext").click();
      else if (many && dx > 60) $q("#mPrev").click();
    };
    mImgBox.addEventListener("pointerup", endSwipe);
    mImgBox.addEventListener("pointercancel", endSwipe);
  }

  // ---------------- 설정: 화면 모드 세그먼트 ----------------
  const settings = $q(".settings");
  if (settings) {
    const row = document.createElement("div");
    row.className = "ios-theme-row";
    row.innerHTML = `<span>화면 모드</span><div class="ios-seg"><button type="button" data-v="auto">자동</button><button type="button" data-v="light">라이트</button><button type="button" data-v="dark">다크</button></div>`;
    settings.prepend(row);
    const seg = $q(".ios-seg", row);
    const mark = () => $qa("button", seg).forEach((b) => b.classList.toggle("on", b.dataset.v === ls.get("theme", "auto")));
    seg.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; ls.set("theme", b.dataset.v); applyTheme(b.dataset.v); mark(); };
    mark();
  }

  // ---------------- 햅틱 (터치 기기) ----------------
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && e.target.closest("button,input[type=checkbox],.pg-tile,.chip") && navigator.vibrate) navigator.vibrate(8);
  }, { passive: true });

  syncChrome();
  setTimeout(syncChrome, 800);   // 설정값이 채워진 뒤 슬라이더·제목 다시 맞춤
})();
