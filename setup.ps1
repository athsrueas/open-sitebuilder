param([switch]$NoLaunch, [switch]$NoShortcut)
. "$PSScriptRoot\scripts\runtime.ps1"
. "$PSScriptRoot\scripts\bootstrap.ps1"
. "$PSScriptRoot/scripts/lifecycle.ps1"
$SetupMutex = Enter-StudioOperation
try {
Stop-StudioInstance $StudioRoot
Set-Location -LiteralPath $StudioRoot
Write-Host '[1/4] Preparing private Python and Node.js runtimes...'
$StudioRuntimes = Install-StudioRuntimes
Write-Host '[2/4] Installing Python packages...'
& $StudioRuntimes.Python -m pip install --disable-pip-version-check --only-binary=:all: --no-warn-script-location -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed. Check internet access, then run Install.cmd again.' }
Write-Host '[3/4] Installing site dependencies from the lockfile...'
& $StudioRuntimes.Node $StudioRuntimes.Pnpm install --frozen-lockfile --store-dir "$StudioRoot\.runtime\pnpm-store"
if ($LASTEXITCODE -ne 0) { throw 'Site dependency installation failed. Check internet access, then run Install.cmd again.' }
& $StudioRuntimes.Node "$StudioRoot\scripts\sync-about.mjs"
if ($LASTEXITCODE -ne 0) { throw 'About documentation synchronization failed.' }
Write-Host '[4/4] Verifying the tool and creating the desktop shortcut...'
& $StudioRuntimes.Python -c "import server; server.validate_project(server.default_project()); import PIL, dotenv; print('Python server ready.')"
if ($LASTEXITCODE -ne 0) { throw 'Server verification failed.' }
& $StudioRuntimes.Node --input-type=module -e "await import('astro'); await import('page-flip'); console.log('Site builder ready.');"
if ($LASTEXITCODE -ne 0) { throw 'Site builder verification failed.' }
if (!$NoShortcut) {
    $ShellObject = New-Object -ComObject WScript.Shell
    $Shortcut = $ShellObject.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Folio Studio.lnk'))
    $Shortcut.TargetPath = (Get-Command powershell.exe).Source
    $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StudioRoot\launch.ps1`""
    $Shortcut.WorkingDirectory = $StudioRoot
    $Shortcut.Description = 'Open your local art portfolio studio'
    $Shortcut.Save()
}
Write-Host 'Folio Studio is ready. Use Settings to save encrypted Cloudflare credentials; no .env is required.'
if (!$NoLaunch) { & "$StudioRoot\launch.ps1" }
} finally { $SetupMutex.ReleaseMutex(); $SetupMutex.Dispose() }
