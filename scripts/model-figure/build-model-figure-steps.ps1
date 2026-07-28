<#
.SYNOPSIS
  Splits a "build-up" model figure (exported from Lucidchart as a single SVG containing
  several side-by-side panels, each panel a superset of the previous one) into a series
  of standalone step SVG files plus a manifest, for use in the dashboard's "About the
  Model" step-through modal.

.DESCRIPTION
  The source SVG is expected to contain N panels laid out left-to-right, where the
  LEFTMOST panel is the most complete (final) version of the diagram and each panel
  to its right is a strict subset (an earlier stage of the build-up). This matches how
  the figure is authored: duplicate the previous panel, add new elements, don't move
  existing ones.

  This script:
    1. Parses the source SVG's element tree.
    2. Clusters top-level elements into panels by detecting horizontal gaps.
    3. For each panel, computes its content bounding box (from each element's own
       position), used as a stable alignment anchor across panels.
    4. Emits one self-contained SVG per step (numbered 1 = simplest/rightmost panel,
       N = most complete/leftmost panel), each using the SAME output viewBox (sized to
       the final/most-complete panel, with generous padding) and each panel's content
       shifted so its bounding-box top-left anchors at the same point. This means when
       the app crossfades between steps, elements that exist in both steps do not
       visibly move.
    5. Writes a manifest.json listing the generated step files.

.PARAMETER SourceSvg
  Path to the source SVG exported from the diagramming tool (e.g. Lucidchart).

.PARAMETER OutDir
  Directory to write the per-step SVG files and manifest.json into. Cleared and
  regenerated on each run.

.EXAMPLE
  pwsh scripts/model-figure/build-model-figure-steps.ps1 -SourceSvg "C:\Users\MJ\Downloads\CBHI.svg" -OutDir "packages/app/src/assets/model-figure"
#>
param(
  [Parameter(Mandatory = $true)][string]$SourceSvg,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [double]$GapThreshold = 150,
  [double]$Padding = 150,
  # Step numbers to drop entirely (1-indexed, based on the detected step order before
  # exclusion). Remaining steps are renumbered consecutively. Useful when a detected
  # panel is redundant or not worth showing as its own step.
  [int[]]$ExcludeSteps = @()
)

$ErrorActionPreference = 'Stop'

function Get-Descendants($node) {
  # Manual recursive walk (avoids XML namespace pitfalls with XPath SelectNodes on
  # documents that declare a default xmlns, like SVG).
  $result = New-Object System.Collections.Generic.List[System.Object]
  foreach ($child in $node.ChildNodes) {
    if ($child.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    $result.Add($child)
    foreach ($sub in (Get-Descendants $child)) { $result.Add($sub) }
  }
  return $result
}

function Get-NodeTx($node) {
  # Try the node's own transform, or the first descendant transform, or (for <path>)
  # the first coordinate pair in its "d" attribute.
  $t = $node.GetAttribute('transform')
  if ([string]::IsNullOrEmpty($t)) {
    $desc = Get-Descendants $node | Where-Object { $_.GetAttribute('transform') } | Select-Object -First 1
    if ($desc) { $t = $desc.GetAttribute('transform') }
  }
  $num = '(-?\d+\.\d+|-?\.\d+|-?\d+)'
  if ($t -match "matrix\(1,0,0,1,$num,$num\)") {
    return [PSCustomObject]@{ Tx = [double]$matches[1]; Ty = [double]$matches[2] }
  } elseif ($t -match "translate\($num[ ,]$num\)") {
    return [PSCustomObject]@{ Tx = [double]$matches[1]; Ty = [double]$matches[2] }
  }
  if ($node.Name -eq 'path') {
    $d = $node.GetAttribute('d')
    if ($d -match "[Mm] ?$num[, ]$num") {
      return [PSCustomObject]@{ Tx = [double]$matches[1]; Ty = [double]$matches[2] }
    }
  }
  return $null
}

Write-Output "Reading $SourceSvg ..."
$xml = New-Object System.Xml.XmlDocument
$xml.Load($SourceSvg)
$svgEl = $xml.DocumentElement
$outerG = $svgEl.ChildNodes | Where-Object { $_.Name -eq 'g' } | Select-Object -First 1
if (-not $outerG) { throw "Could not find the outer <g> element in the source SVG." }

$outerTransform = $outerG.GetAttribute('transform')
$outerTx = 0; $outerTy = 0
if ($outerTransform -match 'translate\((-?\d+\.\d+|-?\.\d+|-?\d+)[ ,](-?\d+\.\d+|-?\.\d+|-?\d+)\)') {
  $outerTx = [double]$matches[1]; $outerTy = [double]$matches[2]
}

$defsNode = $outerG.ChildNodes | Where-Object { $_.Name -eq 'defs' } | Select-Object -First 1
if (-not $defsNode) { throw "Could not find <defs> (glyph/shared definitions) inside the outer <g>." }
$defsXml = $defsNode.OuterXml

# Collect direct children (excluding defs) with their position
$children = @()
foreach ($child in $outerG.ChildNodes) {
  if ($child.Name -eq 'defs') { continue }
  $pos = Get-NodeTx $child
  if ($pos) {
    $children += [PSCustomObject]@{ Node = $child; Tx = $pos.Tx; Ty = $pos.Ty }
  }
}
Write-Output "Found $($children.Count) positioned elements (excluding defs)."

# Cluster into panels by gaps along X
$sorted = $children | Sort-Object Tx
$clusters = New-Object System.Collections.Generic.List[System.Object]
$current = New-Object System.Collections.Generic.List[System.Object]
$current.Add($sorted[0])
for ($i = 1; $i -lt $sorted.Count; $i++) {
  if (($sorted[$i].Tx - $sorted[$i - 1].Tx) -gt $GapThreshold) {
    $clusters.Add($current)
    $current = New-Object System.Collections.Generic.List[System.Object]
  }
  $current.Add($sorted[$i])
}
$clusters.Add($current)

Write-Output "Detected $($clusters.Count) panels (clusters)."

# Order panels left-to-right (by min Tx), then reverse: rightmost (simplest) = step 1
$panels = @()
foreach ($c in $clusters) {
  $xs = $c | ForEach-Object { $_.Tx }
  $panels += [PSCustomObject]@{ Elements = $c; MinTx = ($xs | Measure-Object -Minimum).Minimum }
}
$panels = $panels | Sort-Object MinTx
[array]::Reverse($panels)
# $panels is now ordered: step 1 (rightmost/simplest) .. step N (leftmost/most complete)

if ($ExcludeSteps.Count -gt 0) {
  $kept = @()
  for ($i = 0; $i -lt $panels.Count; $i++) {
    if ($ExcludeSteps -contains ($i + 1)) {
      Write-Output "Excluding detected step $($i + 1) ($($panels[$i].Elements.Count) elements) per -ExcludeSteps"
      continue
    }
    $kept += $panels[$i]
  }
  $panels = $kept
}

# For each panel, compute its content bounding box (from element anchor positions),
# used as the stable alignment anchor across steps.
function Get-ContentBBox($elements) {
  $xs = $elements | ForEach-Object { $_.Tx }
  $ys = $elements | ForEach-Object { $_.Ty }
  return [PSCustomObject]@{
    MinX = ($xs | Measure-Object -Minimum).Minimum
    MaxX = ($xs | Measure-Object -Maximum).Maximum
    MinY = ($ys | Measure-Object -Minimum).Minimum
    MaxY = ($ys | Measure-Object -Maximum).Maximum
  }
}

$panelBBoxes = @()
foreach ($p in $panels) {
  $panelBBoxes += (Get-ContentBBox $p.Elements)
}

# The final (most complete) panel is the LAST one in $panels (step N); use its bounding
# box top-left as the canonical alignment anchor, and its full extent (padded) as the
# shared output canvas size for every step.
$finalIndex = $panels.Count - 1
$finalBBox = $panelBBoxes[$finalIndex]

$frameW = ($finalBBox.MaxX - $finalBBox.MinX)
$frameH = ($finalBBox.MaxY - $finalBBox.MinY)
$outW = $frameW + 2 * $Padding
$outH = $frameH + 2 * $Padding

if (Test-Path $OutDir) { Remove-Item -Path $OutDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$manifest = @()
for ($i = 0; $i -lt $panels.Count; $i++) {
  $stepNum = $i + 1
  $panel = $panels[$i]
  $bbox = $panelBBoxes[$i]

  # Shift so this panel's bounding-box top-left lands on the final panel's top-left,
  # then apply the outer translate + padding to get final render coordinates.
  $shiftX = $finalBBox.MinX - $bbox.MinX
  $shiftY = $finalBBox.MinY - $bbox.MinY

  $originX = $finalBBox.MinX + $outerTx - $Padding
  $originY = $finalBBox.MinY + $outerTy - $Padding

  $innerXml = ($panel.Elements | ForEach-Object { $_.Node.OuterXml }) -join "`n"

  # The <defs> (glyph outlines) block is identical across every step, so it is written
  # once to defs.svg (below) instead of being duplicated in each step file. The <use>
  # elements here reference glyph ids by #fragment, which resolves against any <defs>
  # present elsewhere in the same HTML document, so this works as long as the app loads
  # defs.svg's contents into the page once alongside the step SVGs.
  $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 $outW $outH">
<g transform="translate($($outerTx + $shiftX - $originX) $($outerTy + $shiftY - $originY))">
$innerXml
</g>
</svg>
"@

  $outPath = Join-Path $OutDir "step-$stepNum.svg"
  [System.IO.File]::WriteAllText($outPath, $svg, (New-Object System.Text.UTF8Encoding($false)))
  $manifest += [PSCustomObject]@{ step = $stepNum; file = "step-$stepNum.svg"; elementCount = $panel.Elements.Count }
  Write-Output "Wrote step $stepNum ($($panel.Elements.Count) elements) -> $outPath"
}

$defsSvg = "<svg xmlns=`"http://www.w3.org/2000/svg`">$defsXml</svg>"
$defsPath = Join-Path $OutDir "defs.svg"
[System.IO.File]::WriteAllText($defsPath, $defsSvg, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Wrote shared defs -> $defsPath"

$manifestPath = Join-Path $OutDir "manifest.json"
$manifestObj = [PSCustomObject]@{
  viewBoxWidth  = $outW
  viewBoxHeight = $outH
  defsFile      = "defs.svg"
  steps         = $manifest
}
$manifestJson = $manifestObj | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Wrote manifest -> $manifestPath"
