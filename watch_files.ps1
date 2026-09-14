# Google Form AI - Knowledge Files Real-Time Watcher
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$filesDir = Join-Path $scriptDir "files"
$syncScript = Join-Path $scriptDir "sync_files.ps1"

Write-Host "========================================================" -ForegroundColor Blue
Write-Host "  Google Form AI - Real-time Knowledge Watcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Blue
Write-Host "Watching: $filesDir" -ForegroundColor White
Write-Host "Any file added, removed, or changed will be auto-synced." -ForegroundColor Yellow
Write-Host "You can minimize this window while using Google Forms." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Blue

& $syncScript

$fsw = New-Object IO.FileSystemWatcher $filesDir
$fsw.IncludeSubdirectories = $false
$fsw.EnableRaisingEvents = $true

$onChange = {
    Start-Sleep -Milliseconds 500
    & $syncScript
}

Register-ObjectEvent $fsw 'Created' -Action $onChange | Out-Null
Register-ObjectEvent $fsw 'Deleted' -Action $onChange | Out-Null
Register-ObjectEvent $fsw 'Renamed' -Action $onChange | Out-Null

while ($true) {
    Start-Sleep -Seconds 2
}
