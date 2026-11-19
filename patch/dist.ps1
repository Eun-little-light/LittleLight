# 배포용 폴더 정리 — make.ps1 -Dist가 부름 (Little Light · Ghost 공용)
#  바탕화면\[<이름>][배포용] 에 최신 버전만 남김:
#   예전 exe 삭제 → 새 exe · 실행기 · 라이선스 · 참고 그림(ref_pastel_holo/ref_bluenight) · 데이터폴더\workflows(최신 workflows\)
#   · '사용 안내.md' · '필요한 것.txt' (patch\dist_guide.md · dist_needs.txt에 exe 이름·버전을 채움)
param(
  [Parameter(Mandatory = $true)][string]$App,      # 프로젝트 폴더
  [Parameter(Mandatory = $true)][string]$Name,     # LittleLight / Ghost
  [Parameter(Mandatory = $true)][string]$Exe,      # 방금 만든 exe (배포 폴더 안)
  [Parameter(Mandatory = $true)][string]$Vbs,      # 실행기 파일 이름
  [Parameter(Mandatory = $true)][string]$Data      # 데이터 폴더 이름
)
$ErrorActionPreference = 'Stop'
$D = Split-Path $Exe -Parent
$bom = New-Object Text.UTF8Encoding $true; $u8 = New-Object Text.UTF8Encoding $false
$cp = { param($s, $d) [IO.File]::Copy($s, $d, $true) }
# 실행기(.vbs)는 전용 창(<이름>.exe, make.ps1이 만듦)으로 바뀜 — 배포 폴더에 남은 .vbs는 지움
foreach ($f in [IO.Directory]::GetFiles($D, "*.vbs")) { [IO.File]::Delete($f) }
& $cp ([IO.Path]::Combine($App, "TAGDATA_LICENSE.txt")) ([IO.Path]::Combine($D, "TAGDATA_LICENSE.txt"))
# 업데이트: update.ps1 + 저장소 이름(update.txt) — 실행기가 켤 때 GitHub 최신 릴리스를 확인
& $cp ([IO.Path]::Combine($App, "patch", "update.ps1")) ([IO.Path]::Combine($D, "update.ps1"))
[IO.File]::WriteAllText([IO.Path]::Combine($D, "update.txt"), "Eun-little-light/$Name
", $u8)
$ref = [IO.Path]::Combine($D, "reference"); [IO.Directory]::CreateDirectory($ref) | Out-Null
foreach ($f in [IO.Directory]::GetFiles($ref)) { [IO.File]::Delete($f) }
foreach ($n in "ref_pastel_holo.png", "ref_bluenight.png") { & $cp ([IO.Path]::Combine($App, "reference", $n)) ([IO.Path]::Combine($ref, $n)) }
$wf = [IO.Path]::Combine($D, $Data, "workflows"); [IO.Directory]::CreateDirectory($wf) | Out-Null
foreach ($f in [IO.Directory]::GetFiles($wf)) { [IO.File]::Delete($f) }
foreach ($f in [IO.Directory]::GetFiles([IO.Path]::Combine($App, "workflows"), "*.json")) { & $cp $f ([IO.Path]::Combine($wf, [IO.Path]::GetFileName($f))) }
# 안내문 — 배포용 원본(patch\dist_guide.md · dist_needs.txt)에 지금 exe 이름·버전을 채워 넣음 (예전 README.md는 지움)
$en = [IO.Path]::GetFileName($Exe); $ver = [regex]::Match($en, 'v[\d.]+(?=\.exe)').Value
$fill = { param($t) $t.Replace("{VER}", $ver).Replace("{EXE}", $en) }
[IO.File]::WriteAllText([IO.Path]::Combine($D, "사용 안내.md"), (& $fill ([IO.File]::ReadAllText([IO.Path]::Combine($App, "patch", "dist_guide.md")))), $u8)
[IO.File]::WriteAllText([IO.Path]::Combine($D, "필요한 것.txt"), (& $fill ([IO.File]::ReadAllText([IO.Path]::Combine($App, "patch", "dist_needs.txt")))).Replace("`r`n", "`n").Replace("`n", "`r`n"), $bom)
$old = [IO.Path]::Combine($D, "README.md"); if ([IO.File]::Exists($old)) { [IO.File]::Delete($old) }
$left = [IO.Directory]::GetFiles($D, "*.exe") | % { [IO.Path]::GetFileName($_) }
"배포용 폴더 정리 완료: $D  (exe: $($left -join ', '))"
