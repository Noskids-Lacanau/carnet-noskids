# Publie une nouvelle version de l'app en une commande : numéro de version, journal, commit, étiquette, envoi sur GitHub.
# À lancer depuis un terminal (le premier envoi peut ouvrir la fenêtre de connexion GitHub) :
#   .\outils\Publier.ps1 -Version 1.7.0 -Notes "Import Tricount", "Saison 2026 détaillée"
# Ajouter -SansEnvoi pour tout préparer sans pousser (on poussera plus tard avec : git push origin main vX.Y.Z).
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string[]]$Notes = @(),
  [switch]$SansEnvoi
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) { $git = "C:\Program Files\Git\cmd\git.exe" }
Set-Location $root

# 1. Garde-fous : jamais de données de la famille dans le dépôt public
$suspects = & $git status --porcelain | Where-Object { $_ -match '(^|\s|/)(import/|.*\.ods$|.*\.xlsx$|docs/test-)' }
if ($suspects) { throw "Fichiers privés détectés, publication arrêtée :`n$($suspects -join "`n")" }
if ((& $git tag --list "v$Version")) { throw "La version $Version existe déjà (étiquette v$Version)." }

# 2. Numéro de version partout + entrée dans le journal
& (Join-Path $PSScriptRoot "Nouvelle-Version.ps1") -Version $Version -Notes $Notes

# 3. Commit et étiquette (uniquement les dossiers publics de l'app)
& $git add docs CHANGELOG.md VERSION README.md outils serveur .github
$titre = "Version $Version" + $(if ($Notes.Count) { " : " + ($Notes[0] -replace '\.$', '') } else { "" })
& $git commit -q -m $titre -m ($Notes -join "`n")
& $git tag -a "v$Version" -m "Version $Version"
Write-Host "Commit et étiquette v$Version créés." -ForegroundColor Green

# 4. Envoi : GitHub Actions publie ensuite le site en une minute environ
if ($SansEnvoi) { Write-Host "Envoi non fait. Plus tard : git push origin main v$Version"; return }
& $git push origin main "v$Version"
Write-Host "Envoyé. Le site https://noskids-lacanau.github.io/carnet-noskids/ passe en $Version d'ici une à deux minutes ;" -ForegroundColor Green
Write-Host "les téléphones affichent alors le bandeau « Mettre à jour »."
