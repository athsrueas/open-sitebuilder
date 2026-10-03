. "$PSScriptRoot\scripts\runtime.ps1"
Set-Location -LiteralPath $StudioRoot
$PythonExe = Find-StudioPython
& $PythonExe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($NpmCommand) {
    & $NpmCommand.Source install
} else {
    $PnpmExe = Join-Path $BundledRoot 'bin\fallback\pnpm.cmd'
    if (!(Test-Path -LiteralPath $PnpmExe)) { throw 'Install Node.js 22.12 or newer with npm, then run setup.ps1 again.' }
    & $PnpmExe install
}
if ($LASTEXITCODE -ne 0) { throw 'Node dependency installation failed.' }
& node "$StudioRoot\scripts\sync-about.mjs"
if ($LASTEXITCODE -ne 0) { throw 'About documentation synchronization failed.' }
$ShellObject = New-Object -ComObject WScript.Shell
$ShortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Folio Studio.lnk'
$Shortcut = $ShellObject.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = (Get-Command powershell.exe).Source
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StudioRoot\launch.ps1`""
$Shortcut.WorkingDirectory = $StudioRoot
$Shortcut.Description = 'Open your local art portfolio studio'
$Shortcut.Save()
Write-Host 'Folio Studio is ready. Open the Folio Studio shortcut on your desktop.'
