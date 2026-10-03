param(
    [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'FolioStudio'),
    [switch]$NoLaunch,
    [switch]$NoShortcut
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/lifecycle.ps1')
$SourceRoot = $PSScriptRoot
$DestinationRoot = [IO.Path]::GetFullPath($InstallDirectory)
if ($DestinationRoot -eq [IO.Path]::GetPathRoot($DestinationRoot)) { throw 'Choose an application folder, not a drive root.' }
New-Item -ItemType Directory -Path $DestinationRoot -Force | Out-Null
$InstallMutex = Enter-StudioOperation
try {
Stop-StudioInstance $DestinationRoot
Write-Host "Installing Folio Studio in $DestinationRoot"
function Copy-StudioFolder($Source, $Destination) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    foreach ($Item in Get-ChildItem -LiteralPath $Source -Force) {
        if ($Item.Name -in @('node_modules','.git','.runtime','.venv','data','media','dist','.astro','__pycache__','project.json')) { continue }
        if ($Item.Name -like '.env*' -and $Item.Name -ne '.env.example') { continue }
        if ($Item.PSIsContainer) { Copy-StudioFolder $Item.FullName (Join-Path $Destination $Item.Name) }
        else { Copy-Item -LiteralPath $Item.FullName -Destination (Join-Path $Destination $Item.Name) -Force }
    }
}
if ($SourceRoot -ne $DestinationRoot) {
    foreach ($Folder in @('scripts','shared','ui','site','examples','docs','tests')) {
        if (Test-Path -LiteralPath (Join-Path $SourceRoot $Folder)) { Copy-StudioFolder (Join-Path $SourceRoot $Folder) (Join-Path $DestinationRoot $Folder) }
    }
    foreach ($File in Get-ChildItem -LiteralPath $SourceRoot -File -Force) {
        if ($File.Name -like '.env*' -and $File.Name -ne '.env.example') { continue }
        if ($File.Extension -in @('.ps1','.cmd','.py','.json','.yaml','.md','.txt') -or $File.Name -in @('.gitignore','.env.example')) {
            Copy-Item -LiteralPath $File.FullName -Destination (Join-Path $DestinationRoot $File.Name) -Force
        }
    }
}
& (Join-Path $DestinationRoot 'setup.ps1') -NoLaunch:$NoLaunch -NoShortcut:$NoShortcut
} finally { $InstallMutex.ReleaseMutex(); $InstallMutex.Dispose() }
