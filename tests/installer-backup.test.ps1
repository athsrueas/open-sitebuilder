$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Fixture = Join-Path $RepoRoot ('data/installer-backup-test-' + [Guid]::NewGuid().ToString('N'))
try {
    foreach ($Case in @('success','setup-failure','backup-failure')) {
        $Source = Join-Path $Fixture "$Case/source"
        $Installed = Join-Path $Fixture "$Case/installed"
        New-Item -ItemType Directory -Path (Join-Path $Source 'scripts'),(Join-Path $Installed 'data') -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $RepoRoot 'Install.ps1') -Destination $Source
        Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts/backups.ps1') -Destination (Join-Path $Source 'scripts')
        $Helper = (Join-Path $RepoRoot 'scripts/lifecycle.ps1').Replace("'", "''")
        Set-Content -LiteralPath (Join-Path $Source 'scripts/lifecycle.ps1') -Value ". '$Helper'`nfunction Stop-StudioInstance { param(`$ApplicationRoot) }"
        Set-Content -LiteralPath (Join-Path $Installed 'package.json') -Value '{"version":"0.1.0"}'
        Set-Content -LiteralPath (Join-Path $Source 'package.json') -Value '{"version":"0.2.4"}'
        Set-Content -LiteralPath (Join-Path $Installed 'data/project.json') -Value 'preserve artwork'
        $Setup = @'
param([switch]$NoLaunch,[switch]$NoShortcut)
$Snapshots = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'portfolio-backups') -Directory | Where-Object { $_.Name -notlike '*.incomplete' })
if ($Snapshots.Count -ne 1) { throw 'No portfolio backup before setup.' }
$Manifest = Get-Content -LiteralPath (Join-Path $Snapshots[0].FullName 'manifest.json') -Raw | ConvertFrom-Json
if ($Manifest.version -ne '0.1.0') { throw 'Snapshot was taken after code replacement.' }
if ((Get-Content -LiteralPath (Join-Path $Snapshots[0].FullName 'data/project.json')).Trim() -ne 'preserve artwork') { throw 'Snapshot lost portfolio.' }
'@
        if ($Case -eq 'setup-failure') { $Setup += "`nthrow 'Simulated setup failure'" }
        Set-Content -LiteralPath (Join-Path $Source 'setup.ps1') -Value $Setup
        $Handle = $null
        if ($Case -eq 'backup-failure') { $Handle = [IO.File]::Open((Join-Path $Installed 'data/project.json'),[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None) }
        $Failed = $false
        try { & (Join-Path $Source 'Install.ps1') -InstallDirectory $Installed -NoLaunch -NoShortcut } catch { $Failed = $true } finally { if ($Handle) { $Handle.Dispose() } }
        if ($Failed -ne ($Case -ne 'success')) { throw 'Unexpected installer result.' }
        if ((Get-Content -LiteralPath (Join-Path $Installed 'data/project.json')).Trim() -ne 'preserve artwork') { throw 'Installer changed live portfolio.' }
        if ($Case -eq 'backup-failure' -and (Get-Content -LiteralPath (Join-Path $Installed 'package.json') -Raw | ConvertFrom-Json).version -ne '0.1.0') { throw 'Installer overwrote code after backup failure.' }
        if ($Case -eq 'setup-failure' -and @(Get-ChildItem -LiteralPath (Join-Path $Installed 'portfolio-backups') -Directory).Count -ne 1) { throw 'Failed installation discarded snapshot.' }
    }
    Write-Host 'Installer snapshots precede code replacement, survive setup failure and prevent changes when backup fails.'
} finally {
    if (Test-Path -LiteralPath $Fixture) {
        $Resolved = (Resolve-Path -LiteralPath $Fixture).Path
        if ((Split-Path $Resolved -Parent) -ne (Join-Path $RepoRoot 'data')) { throw 'Invalid fixture cleanup boundary.' }
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}
