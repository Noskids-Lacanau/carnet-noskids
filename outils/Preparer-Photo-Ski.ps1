# Prépare la photo de slalom de l'accueil et du bandeau Session à partir de la photo originale, sans retouche
# du skieur : léger recadrage (40 px à gauche, 30 px en bas), tons réchauffés, 1100 px de large.
param(
  [string]$Source = (Join-Path $PSScriptRoot "..\..\bateau\image ski.jpg"),
  [string]$Sortie = (Join-Path $PSScriptRoot "..\docs\img\ski.jpg")
)
Add-Type -AssemblyName System.Drawing
$src = New-Object System.Drawing.Bitmap((Resolve-Path $Source).Path)
$cxr = 40; $cw = $src.Width - 40; $ch = $src.Height - 30; $lw = 1100; $lh = [int]($ch * $lw / $cw)
$out = New-Object System.Drawing.Bitmap($lw, $lh)
$g = [System.Drawing.Graphics]::FromImage($out); $g.InterpolationMode = 'HighQualityBicubic'
$m = New-Object System.Drawing.Imaging.ColorMatrix; $m.Matrix00 = 1.06; $m.Matrix11 = 1.0; $m.Matrix22 = 0.92; $m.Matrix33 = 1; $m.Matrix44 = 1; $m.Matrix40 = 0.015; $m.Matrix41 = 0.005
$ia = New-Object System.Drawing.Imaging.ImageAttributes; $ia.SetColorMatrix($m)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $lw, $lh)), $cxr, 0, $cw, $ch, [System.Drawing.GraphicsUnit]::Pixel, $ia); $g.Dispose(); $src.Dispose()
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1); $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]86)
$out.Save($Sortie, $enc, $ep); $out.Dispose()
"Photo prête : $Sortie"
