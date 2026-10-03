param([int]$WaitForProcessId = 0, [switch]$NoLaunch, [switch]$NonInteractive)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/lifecycle.ps1')
. (Join-Path $PSScriptRoot 'scripts/backups.ps1')
$UpdateMutex = Enter-StudioOperation
$AppRoot = $PSScriptRoot
$UpdateStage = Join-Path $AppRoot '.runtime/update-stage'
$BackupRoot = Join-Path $AppRoot ('data/update-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
$CodeFolders = @('scripts','shared','ui','site','examples','docs','tests')
$BackupReady = $false
function Copy-UpdateCode($From, $To) {
    New-Item -ItemType Directory -Path $To -Force | Out-Null
    foreach ($Item in Get-ChildItem -LiteralPath $From -Force) {
        if ($Item.Name -in @('node_modules','.git','.runtime','.venv','data','media','dist','.astro','__pycache__','project.json') -or $Item.Name -like '.env*') { continue }
        if ($Item.PSIsContainer) { Copy-UpdateCode $Item.FullName (Join-Path $To $Item.Name) }
        else { Copy-Item -LiteralPath $Item.FullName -Destination (Join-Path $To $Item.Name) -Force }
    }
}
function Copy-ApplicationCode($From, $To) {
    foreach ($Folder in $CodeFolders) { if (Test-Path -LiteralPath (Join-Path $From $Folder)) { Copy-UpdateCode (Join-Path $From $Folder) (Join-Path $To $Folder) } }
    foreach ($File in Get-ChildItem -LiteralPath $From -File -Force) {
        if ($File.Name -notlike '.env*' -and ($File.Extension -in @('.ps1','.cmd','.py','.json','.yaml','.md','.txt') -or $File.Name -eq '.gitignore')) {
            Copy-Item -LiteralPath $File.FullName -Destination (Join-Path $To $File.Name) -Force
        }
    }
}
try {
    if (Test-Path -LiteralPath (Join-Path $AppRoot '.git')) { throw 'This is a development checkout. Update it with Git; the installed-app updater will not overwrite a checkout.' }
    New-Item -ItemType Directory -Path (Join-Path $AppRoot 'data') -Force | Out-Null
    Start-Transcript -Path (Join-Path $AppRoot 'data/update.log') -Force | Out-Null
    if ($WaitForProcessId) { Wait-Process -Id $WaitForProcessId -Timeout 30 -ErrorAction SilentlyContinue }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $Headers = @{ 'User-Agent' = 'FolioStudio-updater' }
    $Commit = (Invoke-RestMethod -Uri 'https://api.github.com/repos/athsrueas/open-sitebuilder/commits/main' -Headers $Headers).sha
    if ($Commit -notmatch '^[a-f0-9]{40}$') { throw 'Invalid update commit.' }
    $Latest = Invoke-RestMethod -Uri "https://raw.githubusercontent.com/athsrueas/open-sitebuilder/$Commit/package.json" -Headers $Headers
    $Current = Get-Content -LiteralPath (Join-Path $AppRoot 'package.json') -Raw | ConvertFrom-Json
    if ($Latest.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid update version.' }
    if ([Version]$Latest.version -le [Version]$Current.version) { Write-Host 'Folio Studio is already up to date.'; if (!$NoLaunch) { & (Join-Path $AppRoot 'launch.ps1') }; return }
    New-Item -ItemType Directory -Path $UpdateStage -Force | Out-Null
    $Archive = Join-Path $UpdateStage "$Commit.zip"
    Invoke-WebRequest -Uri "https://codeload.github.com/athsrueas/open-sitebuilder/zip/$Commit" -OutFile $Archive -UseBasicParsing
    $Extracted = Join-Path $UpdateStage $Commit
    Expand-Archive -LiteralPath $Archive -DestinationPath $Extracted -Force
    $Source = Join-Path $Extracted "open-sitebuilder-$Commit"
    $Downloaded = Get-Content -LiteralPath (Join-Path $Source 'package.json') -Raw | ConvertFrom-Json
    if ($Downloaded.version -ne $Latest.version -or !(Test-Path -LiteralPath (Join-Path $Source 'Install.ps1'))) { throw 'Downloaded update did not pass validation.' }
    Stop-StudioInstance $AppRoot
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    Copy-ApplicationCode $AppRoot $BackupRoot
    $BackupReady = $true
    & (Join-Path $Source 'Install.ps1') -InstallDirectory $AppRoot -NoLaunch -NoShortcut
    if (!$?) { throw 'Update installation failed.' }
    Write-Host "Updated to $($Latest.version). Code backup: $BackupRoot"
    if (!$NoLaunch) { & (Join-Path $AppRoot 'launch.ps1') }
    try { Remove-StudioOldBackups $AppRoot } catch { Write-Warning "Update succeeded, but old backups could not be recycled: $($_.Exception.Message)" }
} catch {
    if ($BackupReady) {
        Copy-ApplicationCode $BackupRoot $AppRoot
        Write-Warning 'Previous application files restored. Run setup.ps1 if dependencies need repair.'
    }
    $FailureMessage = "Folio Studio update failed: $($_.Exception.Message) See data/update.log. Your project, artwork and credentials have been preserved."
    Write-Warning $FailureMessage
    if (!$NonInteractive) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($FailureMessage, 'Folio Studio update') | Out-Null
    }
    throw $FailureMessage
} finally {
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
    # Recycle only the fixed staging folder after verifying its workspace boundary.
    try { if (Test-Path -LiteralPath $UpdateStage) {
        $ResolvedStage = (Resolve-Path -LiteralPath $UpdateStage).Path
        if ($ResolvedStage -eq [IO.Path]::GetFullPath((Join-Path $AppRoot '.runtime/update-stage'))) {
            Add-Type -AssemblyName Microsoft.VisualBasic
            [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($ResolvedStage, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
        }
    } } finally { $UpdateMutex.ReleaseMutex(); $UpdateMutex.Dispose() }
}
