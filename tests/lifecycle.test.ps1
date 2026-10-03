param([switch]$KeepForBrowser)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Fixture = Join-Path $RepoRoot 'data/lifecycle-verification'
if (Test-Path -LiteralPath $Fixture) { throw 'Test fixture already exists; do not overwrite it.' }
New-Item -ItemType Directory -Path $Fixture -Force | Out-Null
Copy-Item -Path (Join-Path $RepoRoot '*.py') -Destination $Fixture
Copy-Item -LiteralPath (Join-Path $RepoRoot 'package.json'),(Join-Path $RepoRoot 'launch.ps1') -Destination $Fixture
foreach ($Folder in @('scripts','shared','ui')) { Copy-Item -LiteralPath (Join-Path $RepoRoot $Folder) -Destination $Fixture -Recurse }
. (Join-Path $RepoRoot 'scripts/lifecycle.ps1')
try {
    & (Join-Path $Fixture 'launch.ps1') -Port 4876 -NoBrowser
    $First = Get-StudioInstance $Fixture 4876
    if (!$First.pid) { throw 'Server identity unavailable.' }
    & (Join-Path $Fixture 'launch.ps1') -Port 4876 -NoBrowser
    if ((Get-StudioInstance $Fixture 4876).pid -ne $First.pid) { throw 'Repeated launch stacked servers.' }
    $Rejected = $false
    try { Stop-StudioInstance $RepoRoot 4876 } catch { $Rejected = $true }
    if (!$Rejected -or !(Get-Process -Id $First.pid -ErrorAction SilentlyContinue)) { throw 'Wrong-installation shutdown was not rejected.' }
    function Invoke-RestMethod { param($Uri, $TimeoutSec, $ErrorAction) if ($Uri -like '*/api/job') { return @{state='running'} }; Microsoft.PowerShell.Utility\Invoke-RestMethod -Uri $Uri -TimeoutSec $TimeoutSec -ErrorAction Stop }
    $BusyRejected = $false
    try { Stop-StudioInstance $Fixture 4876 } catch { $BusyRejected = $_.Exception.Message -like '*build or publish*' } finally { Remove-Item Function:Invoke-RestMethod }
    if (!$BusyRejected -or !(Get-Process -Id $First.pid -ErrorAction SilentlyContinue)) { throw 'Busy server was not protected.' }
    Stop-StudioInstance $Fixture 4876
    & (Join-Path $Fixture 'launch.ps1') -Port 4876 -NoBrowser
    if ((Get-StudioInstance $Fixture 4876).pid -eq $First.pid) { throw 'Server was not replaced.' }
    $Outer = Enter-StudioOperation 4876
    $Inner = Enter-StudioOperation 4876
    $Inner.ReleaseMutex(); $Inner.Dispose()
    try {
        $Helper = (Join-Path $RepoRoot 'scripts/lifecycle.ps1').Replace("'", "''")
        $Probe = "`$ErrorActionPreference='Stop'; . '$Helper'; try { `$m=Enter-StudioOperation 4876; `$m.ReleaseMutex(); `$m.Dispose(); exit 1 } catch { if (`$_.Exception.Message -like '*already starting*') { exit 0 }; exit 2 }"
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -Command $Probe
        if ($LASTEXITCODE -ne 0) { throw 'Concurrent operation was not blocked.' }
    } finally { $Outer.ReleaseMutex(); $Outer.Dispose() }
    foreach ($Name in @('20260101-000000','20260201-000000','20260301-000000','20260401-000000')) {
        $Folder = Join-Path $Fixture "data/update-backups/$Name"
        New-Item -ItemType Directory -Path $Folder -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $Folder 'package.json') -Value '{"version":"0.1.0"}'
    }
    Write-Host 'Repeated launch, graceful replacement, installation isolation and concurrent-operation locks passed.'
} finally {
    if (!$KeepForBrowser) {
        Stop-StudioInstance $Fixture 4876
        $Resolved = (Resolve-Path -LiteralPath $Fixture).Path
        if ((Split-Path $Resolved -Parent) -ne (Join-Path $RepoRoot 'data')) { throw 'Invalid fixture cleanup boundary.' }
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}
