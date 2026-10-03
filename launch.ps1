param([int]$Port = 4873, [switch]$NoBrowser)
. "$PSScriptRoot/scripts/runtime.ps1"
. "$PSScriptRoot/scripts/lifecycle.ps1"
$LaunchMutex = $null
try {
    $LaunchMutex = Enter-StudioOperation $Port
    $StudioUrl = "http://127.0.0.1:$Port"
    if (Get-StudioInstance $StudioRoot $Port) { if (!$NoBrowser) { Start-Process $StudioUrl }; return }
    $PythonExe = Find-StudioPython
    $StudioData = Join-Path $StudioRoot 'data'
    New-Item -ItemType Directory -Path $StudioData -Force | Out-Null
    $ServerProcess = Start-Process -FilePath $PythonExe -ArgumentList @('server.py','--no-browser','--port',"$Port") -WorkingDirectory $StudioRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $StudioData 'app.log') -RedirectStandardError (Join-Path $StudioData 'error.log') -PassThru
    for ($Attempt=0; $Attempt -lt 60; $Attempt++) {
        Start-Sleep -Milliseconds 250
        if ($ServerProcess.HasExited) { throw 'Folio Studio could not start. See data/error.log.' }
        if (Get-StudioInstance $StudioRoot $Port) { if (!$NoBrowser) { Start-Process $StudioUrl }; return }
    }
    throw 'Folio Studio did not become ready. See data/error.log before launching again.'
} catch {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Folio Studio') | Out-Null
    throw
} finally {
    if ($LaunchMutex) { $LaunchMutex.ReleaseMutex(); $LaunchMutex.Dispose() }
}
