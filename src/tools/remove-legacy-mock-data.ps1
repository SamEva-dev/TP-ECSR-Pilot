$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\app")
$mockPath = Join-Path $root "core\mock-data"

$remaining = Get-ChildItem -Path $root -Recurse -Filter *.ts |
    Select-String -Pattern 'mock-data/' -SimpleMatch

if ($remaining) {
    Write-Error "mock-data imports still exist. Delete aborted."
}

if (Test-Path $mockPath) {
    Remove-Item $mockPath -Recurse -Force
    Write-Host "Deleted: $mockPath"
}

Write-Host "Legacy mock-data cleanup complete."
