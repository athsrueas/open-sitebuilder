$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$FixtureRoot = Join-Path $RepoRoot ('data/updater-test-' + [Guid]::NewGuid().ToString('N'))
$FakeCommit = 'a' * 40
function Invoke-RestMethod { param($Uri, $Headers) if ($Uri -like '*/commits/main') { return @{sha=$FakeCommit} }; return @{version='0.2.0'} }
function Invoke-WebRequest { param($Uri, $OutFile, [switch]$UseBasicParsing) Compress-Archive -LiteralPath $FakeSource -DestinationPath $OutFile -Force }
try {
    foreach ($Case in @(@{fail=$false;keep=1},@{fail=$false;keep=0},@{fail=$false;keep=3},@{fail=$false;keep=-1},@{fail=$true;keep=0})) {
        $ShouldFail = $Case.fail
        $CaseRoot = Join-Path $FixtureRoot ("$ShouldFail-$($Case.keep)")
        $Installed = Join-Path $CaseRoot 'installed'
        $FakeSource = Join-Path $CaseRoot "open-sitebuilder-$FakeCommit"
        New-Item -ItemType Directory -Path (Join-Path $Installed 'data'),(Join-Path $Installed 'ui'),(Join-Path $Installed 'scripts'),(Join-Path $FakeSource 'ui') -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $RepoRoot 'Update.ps1') -Destination $Installed
        Copy-Item -LiteralPath (Join-Path $RepoRoot 'scripts/backups.ps1') -Destination (Join-Path $Installed 'scripts')
        $LifecyclePath = (Join-Path $RepoRoot 'scripts/lifecycle.ps1').Replace("'", "''")
        Set-Content -LiteralPath (Join-Path $Installed 'scripts/lifecycle.ps1') -Value ". '$LifecyclePath'`nfunction Stop-StudioInstance { param(`$ApplicationRoot) Set-Content -LiteralPath (Join-Path `$ApplicationRoot 'data/stopped.txt') -Value 'stopped' }"
        Set-Content -LiteralPath (Join-Path $Installed 'package.json') -Value '{"version":"0.1.0"}'
        Set-Content -LiteralPath (Join-Path $Installed 'ui/version.txt') -Value 'old'
        Set-Content -LiteralPath (Join-Path $Installed 'data/project.json') -Value 'preserve project'
        Set-Content -LiteralPath (Join-Path $Installed 'data/credentials.dat') -Value 'preserve encrypted bytes'
        Set-Content -LiteralPath (Join-Path $Installed '.env') -Value 'preserve optional import'
        Set-Content -LiteralPath (Join-Path $Installed 'data/backup-settings.json') -Value ('{"keep":'+$Case.keep+'}')
        $OldBackup = Join-Path $Installed 'data/update-backups/20200101-000000'
        New-Item -ItemType Directory -Path $OldBackup -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $OldBackup 'package.json') -Value '{"version":"0.0.1"}'
        Set-Content -LiteralPath (Join-Path $FakeSource 'package.json') -Value '{"version":"0.2.0"}'
        Set-Content -LiteralPath (Join-Path $FakeSource 'ui/version.txt') -Value 'new'
        $Installer = @'
param($InstallDirectory, [switch]$NoLaunch, [switch]$NoShortcut)
if (!(Test-Path -LiteralPath (Join-Path $InstallDirectory 'data/stopped.txt'))) { throw 'Server was not stopped before installation.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'package.json') -Destination $InstallDirectory -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'ui/version.txt') -Destination (Join-Path $InstallDirectory 'ui/version.txt') -Force
'@
        if ($ShouldFail) { $Installer += "`nthrow 'Simulated installer failure'" }
        Set-Content -LiteralPath (Join-Path $FakeSource 'Install.ps1') -Value $Installer
        $Failed = $false
        try { & (Join-Path $Installed 'Update.ps1') -NoLaunch -NonInteractive } catch { $Failed = $true }
        if ($Failed -ne $ShouldFail) { throw 'Unexpected updater result.' }
        $Expected = if ($ShouldFail) { 'old' } else { 'new' }
        if ((Get-Content -LiteralPath (Join-Path $Installed 'ui/version.txt')).Trim() -ne $Expected) { throw 'Application update/restore failed.' }
        foreach ($File in @{'data/project.json'='preserve project';'data/credentials.dat'='preserve encrypted bytes';'.env'='preserve optional import'}.GetEnumerator()) {
            if ((Get-Content -LiteralPath (Join-Path $Installed $File.Key)).Trim() -ne $File.Value) { throw "Data changed: $($File.Key)" }
        }
        if (Test-Path -LiteralPath (Join-Path $Installed '.runtime/update-stage')) { throw 'Update staging files were not cleaned up.' }
        $KeepOld = $ShouldFail -or $Case.keep -in @(3,-1)
        if ((Test-Path -LiteralPath $OldBackup) -ne $KeepOld) { throw 'Retention must follow the selected policy and preserve failed-update backups.' }
        $Count = @(Get-ChildItem -LiteralPath (Join-Path $Installed 'data/update-backups') -Directory).Count
        $ExpectedCount = if ($ShouldFail -or $Case.keep -in @(3,-1)) {2} else {$Case.keep}
        if ($Count -ne $ExpectedCount) { throw 'Unexpected retained backup count.' }
    }
    Write-Host 'Updater success, failure restore, data preservation and staging cleanup passed.'
} finally {
    if (Test-Path -LiteralPath $FixtureRoot) {
        $Resolved = (Resolve-Path -LiteralPath $FixtureRoot).Path
        if ((Split-Path $Resolved -Parent) -ne (Join-Path $RepoRoot 'data')) { throw 'Unexpected test cleanup boundary.' }
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}
