. "$PSScriptRoot\scripts\runtime.ps1"
$StudioUrl = 'http://127.0.0.1:4873'
try {
    $Response = Invoke-WebRequest -Uri "$StudioUrl/api/config" -UseBasicParsing -TimeoutSec 2
    if ($Response.StatusCode -eq 200) { Start-Process $StudioUrl; return }
} catch { }
$PythonExe = Find-StudioPython
$StudioData = Join-Path $StudioRoot 'data'
New-Item -ItemType Directory -Path $StudioData -Force | Out-Null
Start-Process -FilePath $PythonExe -ArgumentList @('server.py') -WorkingDirectory $StudioRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $StudioData 'app.log') -RedirectStandardError (Join-Path $StudioData 'error.log')
