# BooruComfy exe 에 태그 선택기(picker.js)와 캐릭터 태그 타일(tiles.js)을 넣는 패치 (용량 제한 없음)
# 사용: powershell -File build2.ps1 -Src ..\BooruComfy_v1.6.1.exe -Dst ..\BooruComfy_v1.6.1-picker.exe
# 방식: exe 끝에 새 PE 섹션(.bcui)을 추가하고, 내장 app.js(원본 + picker.js + tiles.js)를 그 안에 둔 뒤
#       Go embed 파일 테이블의 app.js (포인터, 길이)를 새 위치로 바꾼다. 원본 html/css 는 건드리지 않는다.
param([string]$Src, [string]$Dst, [string[]]$Add = @("$PSScriptRoot\picker.js", "$PSScriptRoot\presetgrid.js"))
$ErrorActionPreference = 'Stop'
$u = New-Object Text.UTF8Encoding $false
$b = [IO.File]::ReadAllBytes($Src)
function U16($o) { [BitConverter]::ToUInt16($b, $o) }
function U32($o) { [BitConverter]::ToUInt32($b, $o) }
function U64($o) { [BitConverter]::ToUInt64($b, $o) }
function Put($o, [byte[]]$v) { [Array]::Copy($v, 0, $b, $o, $v.Length) }

# --- PE 헤더 ---
$pe = [BitConverter]::ToInt32($b, 0x3c)
if ((U32 $pe) -ne 0x4550) { throw "PE 파일이 아닙니다" }
$nsec = U16 ($pe + 6); $optSz = U16 ($pe + 20); $opt = $pe + 24
if ((U16 $opt) -ne 0x20b) { throw "PE32+ 만 지원" }
$imageBase = U64 ($opt + 24); $secAlign = U32 ($opt + 32); $fileAlign = U32 ($opt + 36); $hdrSize = U32 ($opt + 60)
$secTab = $opt + $optSz
$secs = for ($i = 0; $i -lt $nsec; $i++) { $o = $secTab + 40 * $i
  [pscustomobject]@{ Name = [Text.Encoding]::ASCII.GetString($b, $o, 8).TrimEnd([char]0); VS = U32 ($o + 8); VA = U32 ($o + 12); RawSz = U32 ($o + 16); Raw = U32 ($o + 20) } }
if ($secs.Name -contains '.bcui') { throw "이미 패치된 exe 입니다. 원본을 Src 로 지정하세요." }
if ($secTab + 40 * ($nsec + 1) -gt $hdrSize) { throw "섹션 헤더를 추가할 공간이 없습니다" }

# --- 내장 app.js 찾기 (시작 문자열 ~ 첫 NUL) ---
$lat = [Text.Encoding]::GetEncoding(28591).GetString($b)
$off = -1; $js = $null
while (($off = $lat.IndexOf('"use strict";', $off + 1)) -ge 0) {
  $e = [Array]::IndexOf($b, [byte]0, $off); $t = $u.GetString($b, $off, $e - $off)
  if ($t.Contains('const editors')) { $js = $t; $len = $e - $off; break }
}
if (-not $js) { throw "내장 app.js 를 찾지 못했습니다" }
$sec = $secs | ? { $off -ge $_.Raw -and $off -lt $_.Raw + $_.RawSz } | select -First 1
$va = $imageBase + $sec.VA + ($off - $sec.Raw)

# --- embed 테이블의 (ptr,len) 위치 찾기 ---
$pat = [BitConverter]::GetBytes([uint64]$va) + [BitConverter]::GetBytes([uint64]$len)
$hits = @()
for ($i = 0; $i -le $b.Length - 16; $i += 8) {
  if ($b[$i] -ne $pat[0] -or $b[$i + 1] -ne $pat[1] -or $b[$i + 2] -ne $pat[2] -or $b[$i + 3] -ne $pat[3]) { continue }
  $ok = $true; for ($k = 4; $k -lt 16; $k++) { if ($b[$i + $k] -ne $pat[$k]) { $ok = $false; break } }
  if ($ok) { $hits += $i }
}
if ($hits.Count -ne 1) { throw "app.js 헤더 위치가 $($hits.Count)개 — 중단" }
"app.js @0x{0:x} ({1}B, VA 0x{2:x}) header @0x{3:x}" -f $off, $len, $va, $hits[0]

# --- 새 app.js = 원본 + 추가 스크립트 ---
$newJs = $js
foreach ($f in $Add) { $newJs += "`n;// ---- " + (Split-Path $f -Leaf) + " ----`n" + [IO.File]::ReadAllText($f, $u) }
$data = $u.GetBytes($newJs)

# --- 새 섹션 추가 ---
function Align($v, $a) { [uint64]([Math]::Ceiling($v / $a) * $a) }
$last = $secs | sort VA | select -Last 1
$newVA = Align ($last.VA + [Math]::Max($last.VS, $last.RawSz)) $secAlign
$newRaw = Align $b.Length $fileAlign
$rawSz = Align ($data.Length + 1) $fileAlign
$out = New-Object byte[] ($newRaw + $rawSz)
[Array]::Copy($b, $out, $b.Length); [Array]::Copy($data, 0, $out, $newRaw, $data.Length)
$b = $out
$h = $secTab + 40 * $nsec
Put $h ([Text.Encoding]::ASCII.GetBytes(".bcui`0`0`0"))
Put ($h + 8) ([BitConverter]::GetBytes([uint32]($data.Length + 1)))
Put ($h + 12) ([BitConverter]::GetBytes([uint32]$newVA))
Put ($h + 16) ([BitConverter]::GetBytes([uint32]$rawSz))
Put ($h + 20) ([BitConverter]::GetBytes([uint32]$newRaw))
Put ($h + 24) (New-Object byte[] 12)
Put ($h + 36) ([BitConverter]::GetBytes([uint32]0x40000040))   # INITIALIZED_DATA | MEM_READ
Put ($pe + 6) ([BitConverter]::GetBytes([uint16]($nsec + 1)))
Put ($opt + 56) ([BitConverter]::GetBytes([uint32](Align ($newVA + $data.Length + 1) $secAlign)))  # SizeOfImage
Put ($opt + 8) ([BitConverter]::GetBytes([uint32]((U32 ($opt + 8)) + $rawSz)))                      # SizeOfInitializedData
Put ($opt + 64) ([BitConverter]::GetBytes([uint32]0))                                                # CheckSum

# --- app.js 포인터·길이를 새 섹션으로 ---
Put $hits[0] ([BitConverter]::GetBytes([uint64]($imageBase + $newVA)))
Put ($hits[0] + 8) ([BitConverter]::GetBytes([uint64]$data.Length))

[IO.File]::WriteAllBytes($Dst, $b)
"app.js {0}B -> {1}B, new section VA 0x{2:x} raw 0x{3:x} | written {4}" -f $len, $data.Length, $newVA, $newRaw, $Dst
