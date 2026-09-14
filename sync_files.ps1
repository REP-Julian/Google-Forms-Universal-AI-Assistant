# Google Form AI - Knowledge Files Synchronizer
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$filesDir = Join-Path $scriptDir "files"
$jsonPath = Join-Path $filesDir "files.json"

if (-not (Test-Path $filesDir)) {
    New-Item -ItemType Directory -Path $filesDir -Force | Out-Null
}

$exts = @('.docx', '.doc', '.pptx', '.ppt', '.pdf', '.txt', '.md')
$items = Get-ChildItem -Path $filesDir -File | Where-Object { 
    $exts -contains $_.Extension.ToLower() -and $_.Name -ne "files.json" -and $_.Name -ne "README.txt"
} | Select-Object -ExpandProperty Name

if ($null -eq $items) {
    $itemsList = @()
} elseif ($items -is [string]) {
    $itemsList = @($items)
} else {
    $itemsList = @($items)
}

$jsonOutput = ConvertTo-Json -InputObject $itemsList
Set-Content -Path $jsonPath -Value $jsonOutput -Encoding UTF8

Write-Host "========================================================" -ForegroundColor Blue
Write-Host "  Google Form AI - Knowledge Files Synchronizer" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Blue
Write-Host ("[SUCCESS] Synced " + $itemsList.Count + " file(s) into files/files.json") -ForegroundColor Green

foreach ($f in $itemsList) {
    Write-Host ("  [+] " + $f) -ForegroundColor White
}

if ($itemsList.Count -eq 0) {
    Write-Host "  (Notice: files/ folder is currently empty. Drop your .docx, .pdf, or .pptx files in files/ and run this again!)" -ForegroundColor Yellow
}
Write-Host "========================================================" -ForegroundColor Blue
