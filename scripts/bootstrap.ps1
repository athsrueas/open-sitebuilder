$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-StudioDownload($Uri, $File, $Sha256) {
    if (Test-Path -LiteralPath $File) {
        if ((Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash -eq $Sha256) { return }
    }
    Write-Host "Downloading $([Uri]$Uri | Select-Object -ExpandProperty Host)..."
    Invoke-WebRequest -Uri $Uri -OutFile $File -UseBasicParsing
    if ((Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash -ne $Sha256) {
        Remove-Item -LiteralPath $File
        throw 'Download checksum verification failed. Run Install.cmd again to retry.'
    }
}

function Install-StudioRuntimes {
    $RuntimeRoot = Join-Path $StudioRoot '.runtime'
    $CacheRoot = Join-Path $RuntimeRoot 'downloads'
    New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
    $Architecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    if ($Architecture -notin @('AMD64', 'ARM64')) { throw 'Folio Studio requires 64-bit Windows 10 or 11.' }
    $Cpu = if ($Architecture -eq 'ARM64') { 'arm64' } else { 'x64' }
    $PythonCpu = if ($Cpu -eq 'arm64') { 'arm64' } else { 'amd64' }
    $PythonHash = if ($Cpu -eq 'arm64') { 'b034042d46e20de57dab22de1813d56bde286899d9d9991255a7c0e1f7efbfa0' } else { '76f238f606250c87c6beac75dccd35ee99070a13490555936abb6cb64ecce3d0' }
    $NodeHash = if ($Cpu -eq 'arm64') { '8779b1bde1d39f8d420e3b57aa657b39891af434d3de44a919044cec06785921' } else { '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541' }
    $PythonFolder = Join-Path $RuntimeRoot 'python'
    $PythonZip = Join-Path $CacheRoot 'python-3.13.12.zip'
    if (!(Test-Path -LiteralPath (Join-Path $PythonFolder 'python.exe'))) {
        Get-StudioDownload "https://www.python.org/ftp/python/3.13.12/python-3.13.12-embed-$PythonCpu.zip" $PythonZip $PythonHash
        Expand-Archive -LiteralPath $PythonZip -DestinationPath $PythonFolder -Force
    }
    # Embedded Python is deliberately isolated, including from system packages.
    $PthLines = @('python313.zip', '.', 'Lib/site-packages', $StudioRoot, 'import site')
    [IO.File]::WriteAllLines((Join-Path $PythonFolder 'python313._pth'), $PthLines, (New-Object Text.UTF8Encoding($false)))
    $PythonExe = Join-Path $PythonFolder 'python.exe'
    & $PythonExe -c 'import sys; assert sys.version_info[:3] == (3,13,12)'
    if ($LASTEXITCODE -ne 0) { throw 'Private Python failed its startup check.' }
    & $PythonExe -c "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('pip') else 1)"
    if ($LASTEXITCODE -ne 0) {
        $PipMetadata = Invoke-RestMethod -Uri 'https://pypi.org/pypi/pip/26.2.1/json'
        $PipWheel = $PipMetadata.urls | Where-Object { $_.filename -eq 'pip-26.2.1-py3-none-any.whl' } | Select-Object -First 1
        if (!$PipWheel -or ([Uri]$PipWheel.url).Host -ne 'files.pythonhosted.org') { throw 'Unexpected pip download source.' }
        $PipZip = Join-Path $CacheRoot 'pip-26.2.1.zip'
        Get-StudioDownload $PipWheel.url $PipZip $PipWheel.digests.sha256
        Expand-Archive -LiteralPath $PipZip -DestinationPath (Join-Path $PythonFolder 'Lib/site-packages') -Force
    }
    $NodeFolder = Join-Path $RuntimeRoot "node-v24.21.0-win-$Cpu"
    if (!(Test-Path -LiteralPath (Join-Path $NodeFolder 'node.exe'))) {
        $NodeZip = Join-Path $CacheRoot "node-v24.21.0-win-$Cpu.zip"
        Get-StudioDownload "https://nodejs.org/download/release/v24.21.0/node-v24.21.0-win-$Cpu.zip" $NodeZip $NodeHash
        Expand-Archive -LiteralPath $NodeZip -DestinationPath $RuntimeRoot -Force
    }
    $env:PATH = "$NodeFolder;$env:PATH"
    $env:PYTHONUTF8 = '1'
    & (Join-Path $NodeFolder 'node.exe') --version | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Private Node.js failed its startup check.' }
    $ToolsRoot = Join-Path $RuntimeRoot 'tools'
    $PnpmScript = Join-Path $ToolsRoot 'node_modules/pnpm/bin/pnpm.cjs'
    if (!(Test-Path -LiteralPath $PnpmScript)) {
        & (Join-Path $NodeFolder 'npm.cmd') install --prefix $ToolsRoot --no-audit --no-fund pnpm@11.25.0 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'Could not install the private pnpm package manager.' }
    }
    return @{ Python = $PythonExe; Node = (Join-Path $NodeFolder 'node.exe'); Pnpm = $PnpmScript }
}
