# 작가 견본 → 썸네일 데이터 patch\artists_thumbs.js (태그 선택기 '작가 화풍' 버튼 그림, exe 안에 들어감)
# 썸네일 204×298 JPEG(버튼 102×149의 2배) data URI + 원본은 앱의 /comfy/view 주소(가운데 휠 클릭으로 크게 보기)
# Little Light · Ghost 둘 다 같은 파일을 씀 — 만든 뒤 Ghost patch 폴더에도 복사
param([string]$Py = "$env:LOCALAPPDATA\Comfy-Desktop\ComfyUI-Installs\Claude\standalone-env\python.exe")
$ErrorActionPreference = 'Stop'
$LL = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$out = "$env:LOCALAPPDATA\Comfy-Desktop\ComfyUI-Shared\output\artist_samples"
$code = @'
import sys, os, io, base64, re, json
from PIL import Image
src, js = sys.argv[1], sys.argv[2]
tags = re.findall(r'\{t:"([^"]+)"', open(js, encoding="utf-8").read())
res = {}
for t in tags:
    name = re.sub(r'[^A-Za-z0-9_\-]', '_', t)
    files = sorted(f for f in os.listdir(src) if f.startswith(name + "_") and f.endswith(".png") and re.fullmatch(re.escape(name) + r"_\d{5}_\.png", f))
    if not files: continue
    f = files[-1]
    im = Image.open(os.path.join(src, f)).convert("RGB")
    w, h = 204, 298
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, tp = (im.width - w) // 2, 0
    im = im.crop((l, tp, l + w, tp + h))
    b = io.BytesIO(); im.save(b, "JPEG", quality=72, optimize=True)
    res[t] = {"img": "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode(), "file": f}
print(json.dumps(res))
'@
$tmp = Join-Path $env:TEMP "ll_thumbs.py"; [IO.File]::WriteAllText($tmp, $code)
$json = & $Py -I $tmp $out "$LL\patch\artists_pixiv.js"
$data = $json | ConvertFrom-Json
$lines = foreach ($p in $data.PSObject.Properties) {
  $full = "/comfy/view?filename=" + [uri]::EscapeDataString($p.Value.file) + "&subfolder=artist_samples&type=output"
  '"' + $p.Name + '":{img:"' + $p.Value.img + '",full:"' + $full + '"}'
}
$js = "// 자동 생성 — reference\artists\make_thumbs.ps1 (견본: make_samples.ps1, 같은 프롬프트·시드 31415)`nwindow.LL_ARTIST_THUMBS={`n" + ($lines -join ",`n") + "`n};`n"
[IO.File]::WriteAllText("$LL\patch\artists_thumbs.js", $js, (New-Object Text.UTF8Encoding $false))
"썸네일 $(@($lines).Count)개 → patch\artists_thumbs.js ($([math]::Round((Get-Item "$LL\patch\artists_thumbs.js").Length/1KB))KB)"
