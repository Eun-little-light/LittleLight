# 픽시브 인기 작가 100명 → patch\artists_pixiv.js  (pixiv_top100.tsv + pixiv_names.tsv)
$here = $PSScriptRoot
$dst = Join-Path (Split-Path (Split-Path $here -Parent) -Parent) "patch\artists_pixiv.js"
$nm = @{}; foreach ($l in [IO.File]::ReadAllLines("$here\pixiv_names.tsv", [Text.Encoding]::UTF8)) { if ($l.Trim()) { $a = $l.Split("`t"); $nm[$a[0]] = $a[1] } }
$rows = Import-Csv "$here\pixiv_top100.tsv" -Delimiter "`t" | % { '{t:' + (ConvertTo-Json ([string]$_.tag) -Compress) + ',pid:' + $_.uid + ',pn:' + (ConvertTo-Json ([string]$nm[$_.uid]) -Compress) + '}' }
$js = "// 자동 생성 — reference\artists\make_pixiv_data.ps1`n// 픽시브 월간 랭킹(최근 3개월, 일반 작품 위주 작가) 중 Danbooru 작가 태그가 있는 100명 — 랭킹 등장 횟수·최고 순위 순`nwindow.LL_ARTISTS_PIXIV=[`n" + ($rows -join ",`n") + "`n];`n"
[IO.File]::WriteAllText($dst, $js, (New-Object Text.UTF8Encoding $false))
"$($rows.Count)명 → $dst"
