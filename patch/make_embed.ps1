# exe에 넣을 데이터 만들기 — patch\embed.js
#  - 참고 그림(reference\ref_pastel_holo.png · ref_bluenight.png)을 data URI로
#  - 마녀 화풍 워크플로(workflows\*.json 중 ref_witch.png를 쓰는 것, 원본 경로 연결 없이)
# comfysetup.js가 앱을 켤 때 이걸로 ComfyUI input에 그림을 올리고, 앱에 없는 워크플로를 등록함
# Little Light · Ghost가 같은 embed.js를 씀 — 만든 뒤 Ghost patch 폴더에도 복사
# 사용: & .\patch\make_embed.ps1
$ErrorActionPreference = 'Stop'
$P = $PSScriptRoot; $Root = Split-Path $P -Parent
$imgs = foreach ($n in "ref_pastel_holo.png", "ref_bluenight.png") {
  '"' + $n + '":"data:image/png;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes("$Root\reference\$n")) + '"' }
$wfs = foreach ($f in Get-ChildItem "$Root\workflows" -Filter *.json) {
  $t = [IO.File]::ReadAllText($f.FullName)
  if ($t -notmatch 'ref_witch\.png') { continue }
  $w = $t | ConvertFrom-Json
  $w.PSObject.Properties.Remove("source")
  $w | ConvertTo-Json -Depth 40 -Compress }
$js = "// 자동 생성 — patch\make_embed.ps1 (참고 그림 · 마녀 화풍 워크플로)`n" +
  "window.LL_REF_IMAGES={`n" + ($imgs -join ",`n") + "`n};`n" +
  "window.LL_EMBED_WFS=[`n" + ($wfs -join ",`n") + "`n];`n"
[IO.File]::WriteAllText("$P\embed.js", $js, (New-Object Text.UTF8Encoding $false))
"embed.js: 그림 $(@($imgs).Count)장 · 워크플로 $(@($wfs).Count)개 · $([math]::Round((Get-Item "$P\embed.js").Length/1KB))KB"
