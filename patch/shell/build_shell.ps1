# 전용 창 프로그램 빌드 (Little Light · Ghost 공용) — Windows 기본 C# 컴파일러(csc, .NET Framework 4.x)로
#  & .\patch\shell\build_shell.ps1 -Name "Little Light" -Id LittleLight -Pattern '^LittleLight_v([\d.]+)\.exe$' -Hint "LittleLight_v*.exe" -Port 7866 -Icon sun -Out "...\Little Light.exe"
#  WebView2 부품(lib\)은 exe 안에 리소스로 넣음 → exe 하나만 있으면 됨 (처음 켤 때 %LOCALAPPDATA%\<Id>\shell\ 에 풀림)
param(
  [Parameter(Mandatory = $true)][string]$Name, [Parameter(Mandatory = $true)][string]$Id,
  [Parameter(Mandatory = $true)][string]$Pattern, [Parameter(Mandatory = $true)][string]$Hint,
  [Parameter(Mandatory = $true)][int]$Port, [ValidateSet("sun", "ghost")][string]$Icon = "sun",
  [Parameter(Mandatory = $true)][string]$Out, [string]$Ver = "1.0.0"
)
$ErrorActionPreference = 'Stop'
$S = $PSScriptRoot; $lib = Join-Path $S "lib"
$csc = Get-ChildItem "$env:WINDIR\Microsoft.NET\Framework64" -Recurse -Filter csc.exe | sort FullName | select -Last 1 -Expand FullName
$fw = Split-Path $csc
$tmp = Join-Path $env:TEMP ("shellbuild_" + [guid]::NewGuid().ToString('N')); New-Item -ItemType Directory $tmp | Out-Null
try {
  $esc = { param($t) $t.Replace('\', '\\').Replace('"', '\"') }
  $cfg = @"
// 빌드할 때 build_shell.ps1이 만드는 설정
[assembly: System.Reflection.AssemblyTitle("$(& $esc $Name)")]
[assembly: System.Reflection.AssemblyProduct("$(& $esc $Name)")]
[assembly: System.Reflection.AssemblyVersion("$Ver")]
[assembly: System.Reflection.AssemblyFileVersion("$Ver")]
static class Config {
  public static string Name = "$(& $esc $Name)";
  public static string Id = "$(& $esc $Id)";
  public static string ExePattern = "$(& $esc $Pattern)";
  public static string ExeHint = "$(& $esc $Hint)";
  public static int Port = $Port;
}
"@
  [IO.File]::WriteAllText("$tmp\Config.cs", $cfg, (New-Object Text.UTF8Encoding $true))
  # 아이콘 (256 · 64 · 48 · 32 · 16, PNG 담은 ICO)
  Add-Type -AssemblyName System.Drawing
  $sizes = 256, 64, 48, 32, 16; $pngs = @()
  foreach ($z in $sizes) {
    $bmp = New-Object Drawing.Bitmap $z, $z; $g = [Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode = 'AntiAlias'; $k = $z / 32.0
    $dark = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(29, 29, 31))
    if ($Icon -eq "sun") {
      $g.FillEllipse($dark, 0.5 * $k, 0.5 * $k, 31 * $k, 31 * $k)
      $y = [Drawing.Color]::FromArgb(255, 214, 10); $g.FillEllipse((New-Object Drawing.SolidBrush $y), 9 * $k, 9 * $k, 14 * $k, 14 * $k)
      $pen = New-Object Drawing.Pen $y, ([Math]::Max(1, 2 * $k)); $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
      foreach ($a in 0..7) { $r = $a * [Math]::PI / 4; $c = 16 * $k
        $g.DrawLine($pen, [float]($c + [Math]::Cos($r) * 9.8 * $k), [float]($c + [Math]::Sin($r) * 9.8 * $k), [float]($c + [Math]::Cos($r) * 13 * $k), [float]($c + [Math]::Sin($r) * 13 * $k)) }
    } else {
      $path = New-Object Drawing.Drawing2D.GraphicsPath
      $path.AddArc(0, 0, 32 * $k, 32 * $k, 180, 90); $path.AddArc(0, 0, 32 * $k, 32 * $k, 270, 90)
      $g.FillRectangle($dark, 0, 0, 32 * $k, 32 * $k)
      $w = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(245, 245, 247))
      $gp = New-Object Drawing.Drawing2D.GraphicsPath
      $gp.AddArc(8 * $k, 6 * $k, 16 * $k, 16 * $k, 180, 180)
      $gp.AddLine(24 * $k, 14 * $k, 24 * $k, 27 * $k)
      $pts = @(@(24, 27), @(21.3, 24.8), @(18.7, 27), @(16, 24.8), @(13.3, 27), @(10.7, 24.8), @(8, 27)) | % { New-Object Drawing.PointF ([float]($_[0] * $k)), ([float]($_[1] * $k)) }
      $gp.AddLines([Drawing.PointF[]]$pts); $gp.CloseFigure(); $g.FillPath($w, $gp)
      $g.FillEllipse($dark, 11.2 * $k, 12.2 * $k, 3.6 * $k, 3.6 * $k); $g.FillEllipse($dark, 17.2 * $k, 12.2 * $k, 3.6 * $k, 3.6 * $k)
    }
    $g.Dispose(); $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $pngs += , $ms.ToArray(); $bmp.Dispose()
  }
  $ico = New-Object IO.MemoryStream; $bw = New-Object IO.BinaryWriter $ico
  $bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count); $off = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) { $z = $sizes[$i]; $bw.Write([byte]($(if ($z -ge 256) { 0 } else { $z }))); $bw.Write([byte]($(if ($z -ge 256) { 0 } else { $z }))); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$pngs[$i].Length); $bw.Write([uint32]$off); $off += $pngs[$i].Length }
  foreach ($p in $pngs) { $bw.Write($p) }; $bw.Flush(); [IO.File]::WriteAllBytes("$tmp\app.ico", $ico.ToArray())
  # 컴파일
  $refs = @("System.dll", "System.Core.dll", "System.Drawing.dll", "System.Windows.Forms.dll", "$lib\Microsoft.Web.WebView2.Core.dll", "$lib\Microsoft.Web.WebView2.WinForms.dll") | % { "/reference:$_" }
  $res = @("Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll") | % { "/resource:$lib\$_,$_" }
  $outTmp = "$tmp\out.exe"
  $log = & $csc /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/win32icon:$tmp\app.ico" "/out:$outTmp" @refs @res "$S\AppShell.cs" "$tmp\Config.cs" 2>&1
  if ($LASTEXITCODE -ne 0) { $log | Out-String | Write-Host; throw "컴파일 실패" }
  [IO.File]::Copy($outTmp, $Out, $true)   # 경로에 [ ]가 있어도 되게
  "전용 창 빌드: $Out ($([math]::Round((Get-Item -LiteralPath $Out).Length/1KB))KB)"
} finally { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
