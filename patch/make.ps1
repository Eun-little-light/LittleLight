# Little Light 빌드:  & .\patch\make.ps1 -Ver 1.0.0
# BooruComfy v1.6.1 원본 exe에 Little Light 모듈을 넣어 LittleLight_v<Ver>.exe 생성
#  - 화면: 로고 "Little Light" + 버전, 창 제목
#  - 데이터 폴더: exe 옆 LittleLightData (BooruComfy_data와 따로 — 프리셋·기록·내 태그가 섞이지 않음)
#  - 캐릭터별 폴더: LittleLightData\images\<폴더> = ComfyUI output\LittleLight\<폴더> 로 이어진 연결(정션) — 폴더 이름은 patch\charnames_local.js(내 빌드 전용)
# 배포용:  & .\patch\make.ps1 -Ver 1.0.0 -Dist  → 캐릭터 기본 이름 없이 빌드해 바탕화면\[LittleLight][배포용.Rev.1]에 최신 버전만 남김 — 엔진은 Little Light.exe 안에 들어가 폴더엔 창 exe만 (patch\dist.ps1)
param([Parameter(Mandatory = $true)][string]$Ver, [switch]$Dist)
$ErrorActionPreference = 'Stop'
$P = $PSScriptRoot
$App = Split-Path $P -Parent
$u = New-Object Text.UTF8Encoding $false
$js = @"
// 빌드할 때 make.ps1이 만드는 파일 — 로고·창 제목을 Little Light로, 버전 표시
(() => {
  const V = "v$Ver";
  window.BC_VER = V; window.LL = true;$(if ($Dist) { " window.LL_DIST = true;" })
  document.title = "Little Light " + V;
  const b = document.querySelector("header .brand");
  if (b) b.innerHTML = 'Little<span>Light</span><small class="bc-ver">' + V + '</small>';
  const c = document.createElement("style");
  c.textContent = ".bc-ver{margin-left:6px;font-size:11px;font-weight:600;letter-spacing:0;color:var(--accent);opacity:.85;vertical-align:1px}";
  document.head.append(c);
  const ic = document.querySelector('link[rel=icon]');
  if (ic) ic.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#1d1d1f"/><circle cx="16" cy="16" r="7" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="2" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g></svg>');
})();
"@
[IO.File]::WriteAllText("$P\version.js", $js, $u)
$add = @("version") + $(if (-not $Dist -and (Test-Path "$P\charnames_local.js")) { @("charnames_local") } else { @() }) + @("charnames", "tidy", "picker", "presetgrid", "hat", "bust", "faceless", "queue", "fast", "charfolder", "pastel", "artists_pixiv", "artists_thumbs", "artists", "bluenight", "embed", "comfysetup", "updater", "taggroups", "customtags", "characters", "series", "regen", "editor",
  "kodict1", "kodict2", "kodict3", "kodict4", "kodict5", "kodict6", "kodict7", "kodict8", "kodict9", "kodict10", "kodict_ll", "ko", "weight", "ios", "fit") | % { "$P\$_.js" }
$DistDir = [IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "[LittleLight][배포용.Rev.1]")
if ($Dist) { [IO.Directory]::CreateDirectory($DistDir) | Out-Null; foreach ($f in [IO.Directory]::GetFiles($DistDir, "*.exe")) { [IO.File]::Delete($f) } }
$dst = if ($Dist) { [IO.Path]::Combine($DistDir, "LittleLight_v$Ver.exe") } else { "$App\LittleLight_v$Ver.exe" }
& "$P\build2.ps1" -Src "$P\base_v1.6.1.exe" -Dst $dst -Add $add

# 데이터 폴더 이름 BooruComfy_data → LittleLightData (같은 15글자라 그대로 바꿔 넣을 수 있음)
$b = [IO.File]::ReadAllBytes($dst)
$lat = [Text.Encoding]::GetEncoding(28591).GetString($b)
$i = $lat.IndexOf("BooruComfy_dataGET /api/config")
if ($i -lt 0) { throw "데이터 폴더 이름을 찾지 못했습니다" }
$new = [Text.Encoding]::ASCII.GetBytes("LittleLightData")
[Array]::Copy($new, 0, $b, $i, $new.Length)
[IO.File]::WriteAllBytes($dst, $b)
"데이터 폴더 → LittleLightData (@0x{0:x})" -f $i

# 전용 창 프로그램 (Little Light.exe) — 앱 exe 옆에 둠 (patch\shell\build_shell.ps1, WebView2)
$shellOut = [IO.Path]::Combine((Split-Path $dst -Parent), "Little Light.exe")
try { & "$P\shell\build_shell.ps1" -Name "Little Light" -Id LittleLight -Pattern '^LittleLight_v([\d.]+)\.exe$' -Hint "LittleLight_v*.exe" -Port 7866 -Icon sun -Out $shellOut -Ver $Ver -DataName LittleLightData -Engine $dst -Clean:$Dist; $shellOk = $true }   # 엔진은 창 exe 안에 (내 빌드도)
catch { $shellOk = $false; Write-Warning "전용 창을 만들지 못했습니다 (실행 중이면 닫고 다시): $_" }
if ($Dist) { & "$P\dist.ps1" -App $App -Name LittleLight -Exe $dst -Vbs "Little Light 실행 (ComfyUI 같이).vbs" -Data LittleLightData; [IO.File]::Delete($dst); "엔진은 Little Light.exe 안에 들어감 → 배포 폴더에서 $([IO.Path]::GetFileName($dst)) 지움"; return }
# 캐릭터별 폴더 연결: LittleLightData\images\<이름> → ComfyUI output\LittleLight\<이름>
$out = "$env:LOCALAPPDATA\Comfy-Desktop\ComfyUI-Shared\output"
if (Test-Path $out) {
  $local = "$P\charnames_local.js"; $names = if (Test-Path $local) { [regex]::Matches([IO.File]::ReadAllText($local), 'en:\s*"([^"]+)"') | % { $_.Groups[1].Value } } else { @() }
  foreach ($n in $names) {
    New-Item -ItemType Directory -Force "$out\LittleLight\$n", "$App\LittleLightData\images" | Out-Null
    if (-not (Test-Path "$App\LittleLightData\images\$n")) { cmd /c mklink /J "$App\LittleLightData\images\$n" "$out\LittleLight\$n" | Out-Null }
  }
  "캐릭터 폴더 연결 확인 완료"
}
# 내 빌드: 엔진은 Little Light.exe 안에 들어갔으니 폴더의 엔진 exe는 지움 (창 exe가 .engine 숨김 폴더에 풀어 씀)
if ($shellOk) { [IO.File]::Delete($dst); "엔진은 Little Light.exe 안에 들어감 → $([IO.Path]::GetFileName($dst)) 지움" }
