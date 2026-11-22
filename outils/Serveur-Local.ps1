# Petit serveur web local pour tester l'app : http://localhost:8765/
param([int]$Port = 8765, [string]$Racine = (Join-Path $PSScriptRoot "..\docs"))
$Racine = (Resolve-Path $Racine).Path
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".json" = "application/json"; ".webmanifest" = "application/manifest+json"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml" }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serveur local : http://localhost:$Port/  (racine $Racine)"
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $chemin = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if (-not $chemin) { $chemin = "index.html" }
  $f = Join-Path $Racine $chemin
  if ((Test-Path $f -PathType Leaf) -and ((Resolve-Path $f).Path.StartsWith($Racine))) {
    $b = [IO.File]::ReadAllBytes($f)
    $ext = [IO.Path]::GetExtension($f).ToLower()
    $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
    $ctx.Response.Headers.Add("Cache-Control", "no-store")
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $ctx.Response.StatusCode = 404 }
  $ctx.Response.Close()
}
