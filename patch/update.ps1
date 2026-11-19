# 배포용 업데이트 — 실행기(.vbs)가 프로그램을 켜기 전에 부름 (Little Light · Ghost 공용)
#  같은 폴더의 update.txt에 적힌 GitHub 저장소의 최신 릴리스를 확인 → 지금 exe보다 새 버전이면 물어보고
#  배포본 zip(*_dist.zip)을 받아 exe · 실행기 · 안내문 · 참고 그림 · 워크플로를 바꿈. 예전 exe는 지움
#  프리셋 · 기록 · 설정 · 내 캐릭터 같은 데이터는 건드리지 않음 (zip의 데이터 폴더에는 workflows만 있음)
#  인터넷이 안 되거나 GitHub에 닿지 않으면 조용히 넘어감
#  -Yes: 묻지 않고 바로 업데이트 (시험용)
param([switch]$Yes)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfg = Join-Path $here 'update.txt'
if (-not (Test-Path -LiteralPath $cfg)) { exit 0 }
$lines = @([IO.File]::ReadAllLines($cfg) | ? { $_.Trim() })
$repo = $lines[0].Trim()
$verLine = $lines | ? { $_ -match '^version=([\d.]+)' } | select -First 1   # 엔진이 창 exe 안에 들어간 배포판은 여기 적힌 버전으로 비교
Add-Type -AssemblyName System.Windows.Forms
$ask = { param($msg, $buttons = 'YesNo', $icon = 'Question') if ($Yes) { return 'Yes' }; [Windows.Forms.MessageBox]::Show($msg, '업데이트', $buttons, $icon) }
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}
try { $rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'app-updater' } -TimeoutSec 8 } catch { exit 0 }
$ver = { param($s) try { [version]($s -replace '^v', '') } catch { [version]'0.0' } }
$exes = @(Get-ChildItem -LiteralPath $here -Filter '*_v*.exe' | ? { $_.Name -match '_v([\d.]+)\.exe$' })
if ($exes.Count) {
  $cur = $exes | sort { & $ver ([regex]::Match($_.Name, '_v([\d.]+)\.exe$').Groups[1].Value) } | select -Last 1
  $curV = & $ver ([regex]::Match($cur.Name, '_v([\d.]+)\.exe$').Groups[1].Value)
} elseif ($verLine) { $curV = & $ver ([regex]::Match($verLine, 'version=([\d.]+)').Groups[1].Value) }
else { exit 0 }
$newV = & $ver $rel.tag_name
if ($newV -le $curV) { exit 0 }
$asset = @($rel.assets) | ? { $_.name -like '*_dist.zip' } | select -First 1
if (-not $asset) { exit 0 }
# 프로그램이 켜져 있으면 exe를 바꿀 수 없음
$run = Get-Process -ErrorAction SilentlyContinue | ? { try { $_.Path -and @($here, (Join-Path $here '.engine')) -contains [IO.Path]::GetDirectoryName($_.Path) -and [IO.Path]::GetFileName($_.Path) -match '_v[\d.]+\.exe$' } catch { $false } }   # 앱 서버만 (이 스크립트를 부른 전용 창은 제외)
if ($run) { & $ask "새 버전 $($rel.tag_name)이 나왔습니다 (지금 v$curV).`n프로그램이 켜져 있어서 지금은 업데이트할 수 없습니다. 프로그램을 끄고 실행기를 다시 실행하세요." 'OK' 'Information' | Out-Null; exit 0 }
if ((& $ask "새 버전 $($rel.tag_name)이 나왔습니다 (지금 v$curV).`n지금 업데이트할까요?`n`n프리셋 · 기록 · 설정 · 내 캐릭터는 그대로 유지됩니다.") -ne 'Yes') { exit 0 }
$tmp = Join-Path $env:TEMP ("app_update_" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $zip = Join-Path $tmp 'update.zip'
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip -UseBasicParsing -Headers @{ 'User-Agent' = 'app-updater' } -TimeoutSec 300
  $ex = Join-Path $tmp 'x'
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $ex)
  # zip 안은 배포용 폴더 하나 — 그 안의 파일을 이 폴더로 (덮어쓰기)
  $root = $ex; $dirs = @([IO.Directory]::GetDirectories($ex)); if ($dirs.Count -eq 1 -and -not [IO.Directory]::GetFiles($ex).Count) { $root = $dirs[0] }
  $newExe = @([IO.Directory]::GetFiles($root, '*_v*.exe')) + @([IO.Directory]::GetFiles($root, '*.exe')) | select -First 1   # 예전: 엔진 exe · 지금: 창 exe 하나
  if (-not $newExe) { throw "배포본에 exe가 없습니다" }
  foreach ($f in [IO.Directory]::GetFiles($root, '*', 'AllDirectories')) {
    $rel2 = $f.Substring($root.Length).TrimStart('\'); $dst = Join-Path $here $rel2
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($dst)) | Out-Null
    try { [IO.File]::Copy($f, $dst, $true) }
    catch { if ([IO.File]::Exists($dst)) { $old = "$dst.old"; if ([IO.File]::Exists($old)) { [IO.File]::Delete($old) }; [IO.File]::Move($dst, $old); [IO.File]::Copy($f, $dst, $true) } else { throw } }   # 실행 중인 전용 창: 이름을 .old로 바꾸고 새로 (다음 실행 때 지워짐)
  }
  $keep = [IO.Path]::GetFileName($newExe)
  foreach ($e in $exes) { if ($e.Name -ne $keep) { try { [IO.File]::Delete($e.FullName) } catch {} } }
  & $ask "$($rel.tag_name)(으)로 업데이트했습니다." 'OK' 'Information' | Out-Null
} catch {
  & $ask "업데이트하지 못했습니다:`n$($_.Exception.Message)`n`n지금 버전으로 실행합니다." 'OK' 'Warning' | Out-Null
} finally { try { [IO.Directory]::Delete($tmp, $true) } catch {} }
exit 0
