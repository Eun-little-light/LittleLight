# 작가 화풍 견본 만들기 — artists_pixiv.js의 100명을 같은 프롬프트·같은 시드로 ComfyUI에서 한 장씩 생성
# 워크플로: Claude_Anime_Plain(화풍 참조 없음)에서 얼굴 보정·업스케일을 뺀 빠른 판 (기본 패스만, 832×1216)
# 저장: ComfyUI output\artist_samples\<태그>_00001_.png  →  make_thumbs.ps1로 썸네일(artists_thumbs.js) 생성
# 사용: & .\reference\artists\make_samples.ps1   (이미 있는 견본은 건너뜀, -Force면 다시)
param([switch]$Force, [string]$Comfy = "http://127.0.0.1:8188")
$ErrorActionPreference = 'Stop'
$LL = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$out = "$env:LOCALAPPDATA\Comfy-Desktop\ComfyUI-Shared\output\artist_samples"
$src = [IO.File]::ReadAllText("$LL\patch\artists_pixiv.js")
$list = [regex]::Matches($src, '\{t:"([^"]+)",pid:(\d+),pn:"([^"]*)"\}') | % { [pscustomobject]@{ t = $_.Groups[1].Value; pid = $_.Groups[2].Value; pn = $_.Groups[3].Value } }
$wf = Get-Content "$LL\LittleLightData\workflows\Claude_Anime_Plain.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$POS = "1girl, medium breasts, solo, long hair, smile, looking at viewer, upper body, white shirt, outdoors, blue sky, masterpiece, best quality"
$NEG = "bad quality, worst quality, worst detail, lowres, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, signature, logo, blurry, jpeg artifacts, child, loli, nsfw, nude"
$SEED = 31415
$safe = { param($t) ($t -replace '[^A-Za-z0-9_\-]', '_') }
$ids = @()
foreach ($a in $list) {
  $name = & $safe $a.t
  if (-not $Force -and (Test-Path "$out\${name}_00001_.png")) { continue }
  $tag = $a.t.Replace("_", " ").Replace("(", "\(").Replace(")", "\)")
  $g = $wf.prompt | ConvertTo-Json -Depth 20 | ConvertFrom-Json
  foreach ($k in "7", "8", "9", "10") { $g.PSObject.Properties.Remove($k) }
  $g."2".inputs.text = "$tag, $POS"
  $g."3".inputs.text = $NEG
  $g."5".inputs.seed = $SEED
  $g."11".inputs.images = @("6", 0)
  $g."11".inputs.filename_prefix = "artist_samples/$name"
  $body = @{ prompt = $g; client_id = "ll-artist-samples" } | ConvertTo-Json -Depth 30 -Compress
  $r = Invoke-RestMethod -Method Post -Uri "$Comfy/prompt" -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8"
  $ids += $r.prompt_id
}
"대기열에 $($ids.Count)장 추가"
# 끝날 때까지 기다림
while ($ids.Count) {
  Start-Sleep 10
  $q = Invoke-RestMethod "$Comfy/queue"
  $live = @($q.queue_running + $q.queue_pending | % { $_[1] })
  $ids = @($ids | ? { $live -contains $_ })
  "남은 견본 $($ids.Count)장"
}
"완료: $((Get-ChildItem $out -Filter *.png).Count)장 — $out"
