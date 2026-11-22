# Prépare une nouvelle version de l'app : met le numéro à jour partout et ajoute une entrée au journal.
# Usage : .\Nouvelle-Version.ps1 -Version 1.1.0 -Notes "Ajout de ...", "Correction de ..."
param([Parameter(Mandatory = $true)][string]$Version, [string[]]$Notes = @())
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Format attendu : 1.2.3" }
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$utf8 = New-Object Text.UTF8Encoding($false)
function Set-InFile([string]$rel, [string]$pattern, [string]$replacement) {
  $f = Join-Path $root $rel; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
  $n = [regex]::Replace($t, $pattern, $replacement)
  if ($n -eq $t) { Write-Warning "Aucun changement dans $rel" } else { [IO.File]::WriteAllText($f, $n, $utf8); Write-Host "OK $rel" }
}
Set-InFile "docs\app.js" 'var APP_VERSION = "[^"]+"' ('var APP_VERSION = "' + $Version + '"')
Set-InFile "docs\sw.js" 'const VERSION = "[^"]+"' ('const VERSION = "' + $Version + '"')
[IO.File]::WriteAllText((Join-Path $root "VERSION"), $Version + "`n", $utf8); Write-Host "OK VERSION"
$log = Join-Path $root "CHANGELOG.md"; $t = [IO.File]::ReadAllText($log, [Text.Encoding]::UTF8)
$entry = "## $Version — $(Get-Date -Format 'yyyy-MM-dd')`n`n" + (($Notes | ForEach-Object { "- $_" }) -join "`n") + "`n`n"
$t = $t -replace '(?s)(# Journal des versions\s*\n\s*\n)', ('$1' + $entry)
[IO.File]::WriteAllText($log, $t, $utf8); Write-Host "OK CHANGELOG.md"
Write-Host "Version $Version prête. Publiez le contenu du dossier docs/ (voir README, « Mettre à jour »)."
