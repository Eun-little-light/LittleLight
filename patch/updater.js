// 새 버전 알림 — 배포용 빌드(window.LL_DIST)에서만. GitHub 최신 릴리스가 지금보다 새 버전이면 화면 위에 안내 막대
//  - 실제 교체는 실행기(.vbs → update.ps1)가 함: 프로그램을 끄고 실행기를 다시 켜면 물어보고 업데이트
//  - 막대의 '다운로드'는 배포본 zip을 바로 받음 (실행기 없이 직접 바꿀 때)
//  - 설정 탭 '업데이트 확인' 버튼 · 자동 확인은 6시간에 한 번 (GitHub API 횟수 제한 때문)
// Little Light와 Ghost가 같은 파일을 씀
(() => {
  if (!window.LL_DIST) return;
  const REPO = window.LL ? "Eun-little-light/LittleLight" : "Eun-little-light/Ghost";
  const KEY = "bc_update_check", HIDE = "bc_update_hide";
  const cur = String(window.BC_VER || "").replace(/^v/, "");
  const parts = (v) => String(v).replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const newer = (a, b) => { const x = parts(a), y = parts(b); for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
  const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  async function latest(force) {
    const c = ls.get(KEY);
    if (!force && c && Date.now() - c.t < 6 * 3600e3) return c.r;
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error("GitHub " + r.status);
    const j = await r.json(), a = (j.assets || []).find((x) => /_dist\.zip$/.test(x.name));
    const rel = { tag: j.tag_name, url: j.html_url, zip: a ? a.browser_download_url : j.html_url, notes: String(j.body || "") };
    ls.set(KEY, { t: Date.now(), r: rel });
    return rel;
  }
  const css = document.createElement("style");
  css.textContent = ".bc-upd{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:220;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100% - 24px);" +
    "padding:9px 12px;border-radius:12px;background:var(--accent,#0a84ff);color:#fff;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.3)}" +
    ".bc-upd a,.bc-upd button{color:#fff;background:rgba(255,255,255,.18);border:0;border-radius:8px;padding:4px 9px;font-size:12.5px;text-decoration:none;cursor:pointer}";
  document.head.append(css);
  function banner(rel) {
    if (document.querySelector(".bc-upd")) return;
    const d = document.createElement("div"); d.className = "bc-upd";
    d.innerHTML = `<span><b>새 버전 ${rel.tag}</b>이 나왔습니다 (지금 v${cur}) — 프로그램을 끄고 실행기를 다시 켜면 자동으로 업데이트됩니다</span>` +
      `<a href="${rel.zip}" target="_blank" rel="noopener">다운로드</a><a href="${rel.url}" target="_blank" rel="noopener">바뀐 점</a><button type="button">닫기</button>`;
    d.querySelector("button").onclick = () => { ls.set(HIDE, rel.tag); d.remove(); };
    document.body.append(d);
  }
  async function check(manual) {
    let rel;
    try { rel = await latest(manual); } catch (e) { if (manual) toast("업데이트를 확인하지 못했습니다 (인터넷 연결 확인)\n" + e.message, "err"); return; }
    if (!rel || !rel.tag || !newer(rel.tag, cur)) { if (manual) toast(`최신 버전입니다 (v${cur})`, "ok"); return; }
    if (manual || ls.get(HIDE) !== rel.tag) banner(rel);
  }
  // 설정 탭
  function addSetting() {
    const st = document.querySelector(".settings"); if (!st) return false;
    if (st.querySelector(".bc-updset")) return true;
    const f = document.createElement("div"); f.className = "field bc-updset";
    f.innerHTML = `<label>업데이트 <small class="muted">— 지금 v${cur} · 새 버전은 실행기를 켤 때 자동으로 물어봄 (github.com/${REPO})</small></label><div class="row"><button type="button" class="mini primary-ghost">업데이트 확인</button></div>`;
    f.querySelector("button").onclick = () => check(true);
    const hr = st.querySelector("hr"); hr ? hr.before(f) : st.append(f);
    return true;
  }
  { let n = 0; const t = () => { if (!addSetting() && ++n < 20) setTimeout(t, 500); }; t(); }
  setTimeout(() => check(false), 4000);
  window.BC_UPDATE = { check };
})();
