# 픽시브 인기 작가 → Danbooru 작가 태그 연결 (앱에 내장된 태그 DB 기준)
# 입력: pixiv_popular_raw.tsv (uid, 랭킹 횟수, 최고 순위, 픽시브 계정 ID, 트위터, 영문 이름) — 자동 계정 ID(user_abcd1234·숫자)는 무시  출력: pixiv_popular.tsv
# 후보: 픽시브 계정 ID · 트위터 아이디 · 영문 닉네임 — 태그 이름/별칭이 같거나, 태그 괄호 안 한정어가 같으면 연결
$here = $PSScriptRoot
$b = [IO.File]::ReadAllBytes((Join-Path (Split-Path (Split-Path $here -Parent) -Parent) "patch\base_v1.6.1.exe"))
$lat = [Text.Encoding]::GetEncoding(28591).GetString($b)
$name = @{}; $alias = @{}; $qual = @{}; $basen = @{}
foreach ($m in [regex]::Matches($lat, '(?m)^([^,\r\n"]{1,80}),1,(\d+),("[^"\r\n]*"|[^\r\n]*)')) {
  $t = $m.Groups[1].Value; $c = [int]$m.Groups[2].Value
  $name[$t] = $c
  foreach ($a in ($m.Groups[3].Value.Trim('"') -split ',')) { if ($a) { $alias[$a.ToLower()] = $t } }
  if ($t -match '^(.+)_\((.+)\)$') { $qual[$Matches[2].ToLower()] = $t; if (-not $basen[$Matches[1]]) { $basen[$Matches[1]] = @() }; $basen[$Matches[1]] += $t }
}
$users = Get-Content "$here\pixiv_popular_raw.tsv" -Encoding UTF8 | ? { $_.Trim() } | % { $c = $_.Split("`t"); [pscustomobject]@{ uid = $c[0]; n = [int]$c[1]; best = [int]$c[2]; acc = $(if ($c[3] -match "^user_[a-z]{4}\d{4}$|^\d+$") { "" } else { $c[3] }); tw = $c[4]; name = $c[5] } }
$out = foreach ($u in $users) {
  $cands = @($u.acc, $u.tw) + $(if ($u.name -match '^[A-Za-z0-9 ._-]+$') { $u.name }) | ? { $_ } | % { ($_.ToLower() -replace '[ .-]+', '_').Trim('_') } | select -Unique
  $hit = ""; $how = ""
  foreach ($c in $cands) {
    if ($name.ContainsKey($c)) { $hit = $c; $how = "이름"; break }
    if ($alias.ContainsKey($c)) { $hit = $alias[$c]; $how = "별칭"; break }
    if ($qual.ContainsKey($c)) { $hit = $qual[$c]; $how = "괄호"; break }
  }
  if (-not $hit) { foreach ($c in $cands) { if ($basen[$c] -and $basen[$c].Count -eq 1) { $hit = $basen[$c][0]; $how = "이름(괄호 추정)"; break } } }
  [pscustomobject]@{ uid = $u.uid; n = $u.n; best = $u.best; tag = $hit; count = $(if ($hit) { $name[$hit] } else { 0 }); how = $how; cands = ($cands -join ' ') }
}
$out | Export-Csv "$here\pixiv_popular.tsv" -Delimiter "`t" -NoTypeInformation -Encoding UTF8
"전체 $($out.Count)명, 태그 연결 $(@($out | ? tag).Count)명"
