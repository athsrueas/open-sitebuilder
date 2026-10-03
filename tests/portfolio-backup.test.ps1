$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
. (Join-Path $RepoRoot 'scripts/backups.ps1')
$Fixture = Join-Path $RepoRoot ('data/portfolio-backup-test-' + [Guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path (Join-Path $Fixture 'data/originals'),(Join-Path $Fixture 'data/update-backups'),(Join-Path $Fixture 'data/trash') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $Fixture 'package.json') -Value '{"version":"0.1.0"}'
    Set-Content -LiteralPath (Join-Path $Fixture 'data/project.json') -Value '{"artist":"Test artist"}'
    [IO.File]::WriteAllBytes((Join-Path $Fixture 'data/originals/image.png'),[byte[]](0,1,2,255))
    [IO.File]::WriteAllBytes((Join-Path $Fixture 'data/credentials.dat'),[byte[]](9,8,7,6))
    Set-Content -LiteralPath (Join-Path $Fixture 'data/update-backups/ignored.txt') -Value 'do not nest code backups'
    Set-Content -LiteralPath (Join-Path $Fixture 'data/trash/ignored.txt') -Value 'do not copy deleted images'
    Set-Content -LiteralPath (Join-Path $Fixture '.env') -Value 'TEST_ONLY=legacy settings'
    $First = New-StudioPortfolioBackup $Fixture
    foreach ($Relative in @('data/project.json','data/originals/image.png','data/credentials.dat','.env')) {
        if ((Get-FileHash -LiteralPath (Join-Path $Fixture $Relative)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $First $Relative)).Hash) { throw "Backup mismatch: $Relative" }
    }
    if ((Test-Path -LiteralPath (Join-Path $First 'data/update-backups')) -or (Test-Path -LiteralPath (Join-Path $First 'data/trash'))) { throw 'Recursive/recovery backups copied.' }
    if (@((Get-Content -LiteralPath (Join-Path $First 'manifest.json') -Raw | ConvertFrom-Json).files).Count -ne 4) { throw 'Invalid verified-file manifest.' }
    $Second = New-StudioPortfolioBackup $Fixture
    Remove-StudioOldPortfolioBackups $Fixture
    if (@(Get-ChildItem -LiteralPath (Join-Path $Fixture 'portfolio-backups') -Directory).Count -ne 1) { throw 'Default retention failed.' }
    if (!(Test-Path -LiteralPath $Second)) { throw 'Retention did not keep the most recent snapshot.' }
    Set-Content -LiteralPath (Join-Path $Fixture 'data/backup-settings.json') -Value '{"portfolioKeep":-1,"keep":0}'
    $Third = New-StudioPortfolioBackup $Fixture
    Remove-StudioOldPortfolioBackups $Fixture
    if (@(Get-ChildItem -LiteralPath (Join-Path $Fixture 'portfolio-backups') -Directory).Count -ne 2) { throw 'Portfolio retention was mixed with code retention.' }
    $Handle = [IO.File]::Open((Join-Path $Fixture 'data/project.json'),[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    $Rejected = $false
    try { New-StudioPortfolioBackup $Fixture | Out-Null } catch { $Rejected = $true } finally { $Handle.Dispose() }
    if (!$Rejected) { throw 'Unreadable portfolio did not block backup.' }
    Write-Host 'Verified originals, project, encrypted credentials, legacy settings, exclusions, retention and backup failure checks passed.'
} finally {
    if (Test-Path -LiteralPath $Fixture) {
        $Resolved = (Resolve-Path -LiteralPath $Fixture).Path
        if ((Split-Path $Resolved -Parent) -ne (Join-Path $RepoRoot 'data')) { throw 'Invalid fixture cleanup boundary.' }
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}
