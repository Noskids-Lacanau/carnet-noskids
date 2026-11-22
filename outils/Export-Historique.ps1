# Convertit le fichier « Suvi Bateau Malibu.ods » en un fichier d'import JSON pour l'app Carnet Noskids.
# Usage : .\Export-Historique.ps1 -Ods "..\..\bateau\Suvi Bateau Malibu.ods" -Out "..\import\historique.json"
param([string]$Ods, [string]$Out)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $Ods))
$sr = New-Object System.IO.StreamReader($zip.GetEntry('content.xml').Open(), [System.Text.Encoding]::UTF8)
[xml]$xml = $sr.ReadToEnd(); $sr.Close(); $zip.Dispose()
$T = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'; $O = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'; $X = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
$nsm = New-Object System.Xml.XmlNamespaceManager($xml.NameTable); $nsm.AddNamespace('table', $T); $nsm.AddNamespace('text', $X)

function Read-Sheet([string]$name) {
  $tbl = $xml.SelectNodes('//table:table', $nsm) | Where-Object { $_.GetAttribute('name', $T) -eq $name }
  $rows = New-Object System.Collections.ArrayList
  foreach ($row in $tbl.SelectNodes('.//table:table-row', $nsm)) {
    $rrep = 1; $a = $row.GetAttribute('number-rows-repeated', $T); if ($a) { $rrep = [int]$a }
    $cells = New-Object System.Collections.ArrayList
    foreach ($cell in $row.ChildNodes) {
      if ($cell.LocalName -ne 'table-cell' -and $cell.LocalName -ne 'covered-table-cell') { continue }
      $crep = 1; $a = $cell.GetAttribute('number-columns-repeated', $T); if ($a) { $crep = [int]$a }
      $type = $cell.GetAttribute('value-type', $O)
      $val = $null
      if ($type -eq 'float' -or $type -eq 'currency' -or $type -eq 'percentage') { $val = [double]::Parse($cell.GetAttribute('value', $O), [Globalization.CultureInfo]::InvariantCulture) }
      elseif ($type -eq 'date') { $val = 'D:' + $cell.GetAttribute('date-value', $O) }
      elseif ($type -eq 'time') { $val = 'T:' + $cell.GetAttribute('time-value', $O) }
      else { $txt = (($cell.SelectNodes('.//text:p', $nsm) | ForEach-Object { $_.InnerText }) -join ' '); if ($txt) { $val = $txt } }
      for ($k = 0; $k -lt [math]::Min($crep, 40); $k++) { [void]$cells.Add($val) }
      if ($cells.Count -gt 40) { break }
    }
    for ($k = 0; $k -lt [math]::Min($rrep, 2); $k++) { [void]$rows.Add($cells) }
    if ($rows.Count -gt 400) { break }
  }
  return $rows
}
function Cell($r, [int]$i) { if ($i -lt $r.Count) { return $r[$i] } return $null }
function Num($v) { if ($v -is [double]) { return $v }; if ($v -is [string] -and $v -match '^-?[0-9]+([.,][0-9]+)?$') { return [double]::Parse($v.Replace(',', '.'), [Globalization.CultureInfo]::InvariantCulture) }; return $null }
function IsoDate($v) {
  if ($v -is [string] -and $v.StartsWith('D:')) { return $v.Substring(2, 10) }
  if ($v -is [string] -and $v -match '^(\d{2})/(\d{2})/(\d{4})$') { return "$($Matches[3])-$($Matches[2])-$($Matches[1])" }
  return $null
}
function FrDate([string]$iso) { if (-not $iso) { return '' }; $p = $iso.Split('-'); return "$($p[2])/$($p[1])/$($p[0])" }
function HourOf($v) { if ($v -is [string] -and $v -match '^T:PT(\d+)H(\d+)M') { return ('{0:00}:{1:00}' -f [int]$Matches[1], [int]$Matches[2]) }; return $null }
function Fam([string]$who) { if ($who -match 'Olivier') { return 'OC' } return 'YC' }

$SES = New-Object System.Collections.ArrayList; $MOV = New-Object System.Collections.ArrayList; $DEP = New-Object System.Collections.ArrayList

# ---------- Sessions de ski ----------
$cols = @{ 6 = 'olivier'; 7 = 'thao'; 8 = 'malou'; 9 = 'calie'; 10 = 'fiorella'; 11 = 'yann'; 12 = 'elsa'; 13 = 'baptiste'; 14 = 'eve'; 15 = 'pascale'; 16 = 'invy'; 17 = 'invo' }
$famOf = @{ olivier = 'OC'; thao = 'OC'; malou = 'OC'; calie = 'OC'; fiorella = 'OC'; invo = 'OC'; yann = 'YC'; elsa = 'YC'; baptiste = 'YC'; eve = 'YC'; pascale = 'YC'; invy = 'YC' }
$rows = Read-Sheet '1- Session ski'
for ($i = 1; $i -lt $rows.Count; $i++) {
  $r = $rows[$i]; $iso = IsoDate (Cell $r 1); if (-not $iso) { continue }
  $min = [ordered]@{}; $fam = @{ YC = 0.0; OC = 0.0 }; $tot = 0.0
  foreach ($c in $cols.Keys | Sort-Object) { $v = Num (Cell $r $c); if ($v -and $v -gt 0) { $min[$cols[$c]] = $v; $fam[$famOf[$cols[$c]]] += $v; $tot += $v } }
  $meca = Num (Cell $r 18); if (-not $meca) { $meca = 0 }; $commun = Num (Cell $r 19); if (-not $commun) { $commun = 0 }
  $fam.YC += ($meca + $commun) / 2; $fam.OC += ($meca + $commun) / 2; $tot += $meca + $commun
  $note = $null; $cf = Cell $r 5; if ($cf -is [string] -and -not (Num $cf)) { $note = $cf }
  [void]$SES.Add([ordered]@{ id = "h-s-$($i + 1)"; mode = 'historique'; bateau = 'Response 1993'; date = $iso; d = (FrDate $iso)
    heureDeb = (HourOf (Cell $r 2)); heureFin = (HourOf (Cell $r 4)); compteurDeb = (Num (Cell $r 3)); compteurFin = (Num $cf)
    minutes = $min; commun = $commun; meca = $meca; engineMin = $tot; famMin = [ordered]@{ YC = [math]::Round($fam.YC, 1); OC = [math]::Round($fam.OC, 1) }; note = $note })
}

# ---------- Achats d'essence et mises en bateau ----------
$rows = Read-Sheet '2- Essence achetée'
for ($i = 1; $i -lt $rows.Count; $i++) {
  $r = $rows[$i]; $iso = IsoDate (Cell $r 1); if (-not $iso) { continue }
  $l = Num (Cell $r 3); $p = Num (Cell $r 4); $f = Fam ([string](Cell $r 6)); $b = Num (Cell $r 7)
  [void]$MOV.Add([ordered]@{ id = "h-a-$($i + 1)"; type = 'achat'; date = $iso; d = (FrDate $iso); f = $f; litres = $l; prix = $p; bidons = $b; carburant = (Cell $r 5); lot = (Cell $r 2)
    t = 'Achat (historique)'; v = ('{0} L · {1} €' -f $l, $p); who = [string](Cell $r 6) })
}
$rows = Read-Sheet '3- Bidons mis dans bateau'
for ($i = 1; $i -lt $rows.Count; $i++) {
  $r = $rows[$i]; $iso = IsoDate (Cell $r 1); if (-not $iso -or $iso.StartsWith('00')) { continue }
  $n = Num (Cell $r 3); $l = Num (Cell $r 4)
  [void]$MOV.Add([ordered]@{ id = "h-v-$($i + 1)"; type = 'versement'; date = $iso; d = (FrDate $iso); litres = $l; bidons = $n; lot = ([string](Cell $r 2)).Split(' ')[0]
    t = 'Versement (historique)'; v = ('{0} bidon(s) · {1} L' -f $n, $l); who = '' })
}

# ---------- Dépenses ----------
$catMap = @{ 'Adhésion cotisation' = 'Adhésion'; 'Matériel Bateau / Nautique' = 'Matériel bateau'; 'Matériel Loisir' = 'Matériel loisir'; 'Révision, Hivernage, Entretien Bateau' = 'Entretien'; 'Ventes Tours Ski' = 'Recette invités'; 'Remboursement divers' = 'Remboursement' }
$rows = Read-Sheet '4- Dépenses Bateau'
for ($i = 1; $i -lt $rows.Count; $i++) {
  $r = $rows[$i]; $iso = IsoDate (Cell $r 1); $m = Num (Cell $r 6); if (-not $iso -or $null -eq $m) { continue }
  $cat = [string](Cell $r 3); if ($catMap.ContainsKey($cat)) { $cat = $catMap[$cat] }
  $yc = Num (Cell $r 9); $oc = Num (Cell $r 10); $aff = [string](Cell $r 4)
  $rec = [ordered]@{ id = "h-d-$($i + 1)"; date = $iso; d = (FrDate $iso); lib = $(if (Cell $r 7) { [string](Cell $r 7) } else { $cat }); cat = $cat; m = $m; payeur = (Fam ([string](Cell $r 2))) }
  if ($null -ne $yc -or $null -ne $oc) { $rec.regle = 'parts'; $rec.parts = [ordered]@{ YC = $(if ($yc) { $yc } else { 0 }); OC = $(if ($oc) { $oc } else { 0 }) } }
  elseif ($aff -match 'Olivier' -and $aff -match 'Yann') { $rec.regle = '5050' }
  elseif ($aff -match 'Olivier') { $rec.regle = 'OC' } else { $rec.regle = 'YC' }
  [void]$DEP.Add($rec)
}

$result = [ordered]@{ format = 'carnet-noskids-import'; version = 1; source = 'Suvi Bateau Malibu.ods'; sessions = $SES.ToArray(); mouvements = $MOV.ToArray(); depenses = $DEP.ToArray() }
$json = $result | ConvertTo-Json -Depth 6
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
[IO.File]::WriteAllText($Out, $json, (New-Object Text.UTF8Encoding($false)))
"Sessions : $($SES.Count) · mouvements : $($MOV.Count) · dépenses : $($DEP.Count) → $Out"
