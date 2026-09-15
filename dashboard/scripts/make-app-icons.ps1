Add-Type -AssemblyName System.Drawing

$repo = 'd:\completed\Oday-system'
$srcPath = Join-Path $repo 'saas.png'
$dash = Join-Path $repo 'dashboard'
$mobile = Join-Path $repo 'oday-mobile\assets\images'

New-Item -ItemType Directory -Force -Path (Join-Path $dash 'build') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $dash 'public') | Out-Null
New-Item -ItemType Directory -Force -Path $mobile | Out-Null

function New-PaddedSquare([System.Drawing.Image]$source, [int]$size, [double]$padRatio, [System.Drawing.Color]$bg) {
  $canvas = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear($bg)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $inner = [int]($size * (1 - (2 * $padRatio)))
  $scale = [Math]::Min($inner / [double]$source.Width, $inner / [double]$source.Height)
  $dw = [Math]::Max(1, [int]($source.Width * $scale))
  $dh = [Math]::Max(1, [int]($source.Height * $scale))
  $x = [int](($size - $dw) / 2)
  $y = [int](($size - $dh) / 2)
  $g.DrawImage($source, $x, $y, $dw, $dh)
  $g.Dispose()
  return $canvas
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Get-DibImage([System.Drawing.Image]$source, [int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($source, 0, 0, $size, $size)
  $g.Dispose()

  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $raw = New-Object byte[] ($data.Stride * $size)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $raw, 0, $raw.Length)
  $bmp.UnlockBits($data)
  $bmp.Dispose()

  $xor = New-Object byte[] ($size * $size * 4)
  for ($y = 0; $y -lt $size; $y++) {
    [Array]::Copy($raw, ($size - 1 - $y) * $data.Stride, $xor, $y * $size * 4, $size * 4)
  }

  $andStride = [Math]::Ceiling($size / 32.0) * 4
  $and = New-Object byte[] ($andStride * $size)
  $header = New-Object byte[] 40
  [BitConverter]::GetBytes([int32]40).CopyTo($header, 0)
  [BitConverter]::GetBytes([int32]$size).CopyTo($header, 4)
  [BitConverter]::GetBytes([int32]($size * 2)).CopyTo($header, 8)
  [BitConverter]::GetBytes([int16]1).CopyTo($header, 12)
  [BitConverter]::GetBytes([int16]32).CopyTo($header, 14)
  [BitConverter]::GetBytes([int32]($xor.Length + $and.Length)).CopyTo($header, 20)

  $blob = New-Object byte[] ($header.Length + $xor.Length + $and.Length)
  [Array]::Copy($header, 0, $blob, 0, $header.Length)
  [Array]::Copy($xor, 0, $blob, $header.Length, $xor.Length)
  [Array]::Copy($and, 0, $blob, $header.Length + $xor.Length, $and.Length)
  return $blob
}

$white = [System.Drawing.Color]::White
$source = New-Object System.Drawing.Bitmap $srcPath
$icon1024 = New-PaddedSquare $source 1024 0.08 $white
$adaptive = New-PaddedSquare $source 1024 0.18 $white
$splash = New-PaddedSquare $source 1024 0.12 $white
$fav512 = New-PaddedSquare $source 512 0.08 $white

$bg = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bg)
$bgG.Clear($white)
$bgG.Dispose()

Save-Png $icon1024 (Join-Path $dash 'build\icon.png')
Save-Png $icon1024 (Join-Path $dash 'public\favicon.png')
Save-Png $icon1024 (Join-Path $dash 'public\apple-touch-icon.png')
Save-Png $icon1024 (Join-Path $mobile 'icon.png')
Save-Png $fav512 (Join-Path $mobile 'favicon.png')
Save-Png $splash (Join-Path $mobile 'splash-icon.png')
Save-Png $adaptive (Join-Path $mobile 'android-icon-foreground.png')
Save-Png $bg (Join-Path $mobile 'android-icon-background.png')
Save-Png $adaptive (Join-Path $mobile 'android-icon-monochrome.png')

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = New-Object System.Collections.Generic.List[byte[]]
foreach ($size in $sizes) {
  $images.Add((Get-DibImage $icon1024 $size))
}

$count = $images.Count
$offset = 6 + (16 * $count)
$header = New-Object byte[] 6
[BitConverter]::GetBytes([uint16]0).CopyTo($header, 0)
[BitConverter]::GetBytes([uint16]1).CopyTo($header, 2)
[BitConverter]::GetBytes([uint16]$count).CopyTo($header, 4)
$entries = New-Object System.Collections.Generic.List[byte]
$blobs = New-Object System.Collections.Generic.List[byte]
for ($i = 0; $i -lt $count; $i++) {
  $blob = $images[$i]
  $size = $sizes[$i]
  $entry = New-Object byte[] 16
  $entry[0] = if ($size -ge 256) { 0 } else { [byte]$size }
  $entry[1] = if ($size -ge 256) { 0 } else { [byte]$size }
  [BitConverter]::GetBytes([uint16]1).CopyTo($entry, 4)
  [BitConverter]::GetBytes([uint16]32).CopyTo($entry, 6)
  [BitConverter]::GetBytes([uint32]$blob.Length).CopyTo($entry, 8)
  [BitConverter]::GetBytes([uint32]$offset).CopyTo($entry, 12)
  $entries.AddRange($entry)
  $blobs.AddRange($blob)
  $offset += $blob.Length
}

$icoOut = Join-Path $dash 'build\icon.ico'
$all = New-Object byte[] ($header.Length + $entries.Count + $blobs.Count)
[Array]::Copy($header, 0, $all, 0, $header.Length)
[Array]::Copy($entries.ToArray(), 0, $all, $header.Length, $entries.Count)
[Array]::Copy($blobs.ToArray(), 0, $all, $header.Length + $entries.Count, $blobs.Count)
[System.IO.File]::WriteAllBytes($icoOut, $all)

$icon1024.Dispose()
$adaptive.Dispose()
$splash.Dispose()
$fav512.Dispose()
$bg.Dispose()
$source.Dispose()
Write-Output "Wrote saas.png icons and $icoOut ($($all.Length) bytes)"
