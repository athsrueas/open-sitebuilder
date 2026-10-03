$ErrorActionPreference = 'Stop'
$StudioRoot = Split-Path $PSScriptRoot -Parent
$BundledRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
function Find-StudioPython {
    $BundledPython = Join-Path $BundledRoot 'python\python.exe'
    foreach ($Candidate in @((Join-Path $StudioRoot '.runtime\python\python.exe'), (Join-Path $StudioRoot '.venv\Scripts\python.exe'), $BundledPython)) {
        if (Test-Path -LiteralPath $Candidate) { return $Candidate }
    }
    $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($PythonCommand -and $PythonCommand.Source -notlike '*WindowsApps*') { return $PythonCommand.Source }
    $PyCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($PyCommand) {
        $PythonPath = & $PyCommand.Source -3 -c 'import sys; print(sys.executable)'
        if ($LASTEXITCODE -eq 0) { return $PythonPath.Trim() }
    }
    throw 'Run Install.cmd, or setup.ps1 in a development checkout, to install the private Python runtime.'
}
$PrivateNode = Get-ChildItem -LiteralPath (Join-Path $StudioRoot '.runtime') -Directory -Filter 'node-v*-win-*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($PrivateNode -and (Test-Path -LiteralPath (Join-Path $PrivateNode.FullName 'node.exe'))) { $env:PATH = "$($PrivateNode.FullName);$env:PATH" }
$env:PYTHONUTF8 = '1'
$BundledNode = Join-Path $BundledRoot 'node\bin'
if (!$PrivateNode -and (Test-Path -LiteralPath $BundledNode)) { $env:PATH = "$BundledNode;$env:PATH" }
