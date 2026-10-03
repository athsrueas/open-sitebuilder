$ErrorActionPreference = 'Stop'
function Get-StudioIdentity([string]$ApplicationRoot) {
    $Canonical = [IO.Path]::GetFullPath($ApplicationRoot).TrimEnd('\').ToLowerInvariant()
    $Hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($Hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($Canonical)))).Replace('-','').ToLowerInvariant() }
    finally { $Hasher.Dispose() }
}
function Enter-StudioOperation([int]$Port = 4873) {
    $Mutex = New-Object Threading.Mutex($false, "Local\FolioStudio-Port-$Port")
    try {
        try { $Acquired = $Mutex.WaitOne(1000) } catch [Threading.AbandonedMutexException] { $Acquired = $true }
        if (!$Acquired) { throw 'Folio Studio is already starting, installing or updating. Wait for it to finish.' }
        return $Mutex
    } catch { $Mutex.Dispose(); throw }
}
function Get-StudioInstance([string]$ApplicationRoot, [int]$Port = 4873) {
    $Url = "http://127.0.0.1:$Port"
    $Expected = Get-StudioIdentity $ApplicationRoot
    try { $Instance = Invoke-RestMethod -Uri "$Url/api/instance" -TimeoutSec 2 -ErrorAction Stop } catch { $Instance = $null }
    if ($Instance -and $Instance.appId) {
        if ($Instance.appId -ne $Expected) { throw "Port $Port belongs to another Folio Studio installation. Close that copy first." }
        return $Instance
    }
    # Older installed servers have no identity endpoint. Verify the listener's
    # executable belongs to this exact installation before requesting shutdown.
    $Listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if (!$Listeners.Count) { return $null }
    $Owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($Listeners[0].OwningProcess)"
    $PrivatePython = [IO.Path]::GetFullPath((Join-Path $ApplicationRoot '.runtime/python/python.exe'))
    if (!$Owner -or $Owner.ExecutablePath -ne $PrivatePython) { throw "Port $Port is already in use by another application or unverified older server. Close it before continuing." }
    $Config = Invoke-RestMethod -Uri "$Url/api/config" -TimeoutSec 2
    if ($null -eq $Config.hasToken) { throw 'Could not verify the older Folio Studio server.' }
    return @{ appId=$Expected; pid=$Owner.ProcessId; legacy=$true }
}
function Stop-StudioInstance([string]$ApplicationRoot, [int]$Port = 4873) {
    $Instance = Get-StudioInstance $ApplicationRoot $Port
    if (!$Instance) { return }
    $Url = "http://127.0.0.1:$Port"
    $Job = Invoke-RestMethod -Uri "$Url/api/job" -TimeoutSec 2
    if ($Job.state -eq 'running') { throw 'Wait for the current build or publish to finish before installing or updating.' }
    Start-Sleep -Milliseconds 1000
    $Html = (Invoke-WebRequest -Uri "$Url/" -UseBasicParsing -TimeoutSec 2).Content
    $Match = [regex]::Match($Html, 'name="folio-token" content="([^"]+)"')
    if (!$Match.Success) { throw 'Could not verify the editor session for shutdown.' }
    Invoke-RestMethod -Uri "$Url/api/shutdown" -Method Post -ContentType 'application/json' -Body '{}' -Headers @{'X-Folio-Token'=$Match.Groups[1].Value} -TimeoutSec 5 | Out-Null
    for ($Attempt=0; $Attempt -lt 60; $Attempt++) {
        if (!(Get-Process -Id $Instance.pid -ErrorAction SilentlyContinue)) { Write-Host 'Previous Folio Studio server stopped.'; return }
        Start-Sleep -Milliseconds 250
    }
    throw 'The previous server did not exit. Installation was stopped; no replacement server was started.'
}
