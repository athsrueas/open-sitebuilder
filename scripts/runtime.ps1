$ErrorActionPreference = 'Stop'
$StudioRoot = Split-Path $PSScriptRoot -Parent
$BundledRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
function Find-StudioPython {
    $BundledPython = Join-Path $BundledRoot 'python\python.exe'
    foreach ($Candidate in @((Join-Path $StudioRoot '.venv\Scripts\python.exe'), $BundledPython)) {
        if (Test-Path -LiteralPath $Candidate) { return $Candidate }
    }
    $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($PythonCommand -and $PythonCommand.Source -notlike '*WindowsApps*') { return $PythonCommand.Source }
    $PyCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($PyCommand) {
        $PythonPath = & $PyCommand.Source -3 -c 'import sys; print(sys.executable)'
        if ($LASTEXITCODE -eq 0) { return $PythonPath.Trim() }
    }
    throw 'Install Python 3.11 or newer from python.org, then run setup.ps1 again.'
}
$BundledNode = Join-Path $BundledRoot 'node\bin'
if (Test-Path -LiteralPath $BundledNode) { $env:PATH = "$BundledNode;$env:PATH" }
