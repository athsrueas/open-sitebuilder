function Remove-StudioOldBackups([string]$ApplicationRoot, [switch]$Portfolio) {
    $BackupDirectory = if ($Portfolio) { Join-Path $ApplicationRoot 'portfolio-backups' } else { Join-Path $ApplicationRoot 'data/update-backups' }
    $Settings = Join-Path $ApplicationRoot 'data/backup-settings.json'
    $Keep = 1
    if (Test-Path -LiteralPath $Settings) {
        try { $Preferences = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json; $Choice = if ($Portfolio) { $Preferences.portfolioKeep } else { $Preferences.keep }; if (($Choice -is [int] -or $Choice -is [long]) -and $Choice -in @(0,1,3,-1)) { $Keep = [int]$Choice } } catch { }
    }
    if ($Keep -eq -1 -or !(Test-Path -LiteralPath $BackupDirectory)) { return }
    $Expected = [IO.Path]::GetFullPath($BackupDirectory)
    if ((Resolve-Path -LiteralPath $BackupDirectory).Path -ne $Expected -or ((Get-Item -LiteralPath $BackupDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid backup directory.' }
    $Backups = @(Get-ChildItem -LiteralPath $BackupDirectory -Directory | Where-Object { $_.Name -match '^\d{8}-\d{6}(-[a-f0-9]{8})?$' -and !($_.Attributes -band [IO.FileAttributes]::ReparsePoint) } | Sort-Object LastWriteTimeUtc,Name -Descending)
    Add-Type -AssemblyName Microsoft.VisualBasic
    foreach ($Backup in ($Backups | Select-Object -Skip $Keep)) {
        $Resolved = (Resolve-Path -LiteralPath $Backup.FullName).Path
        if ((Split-Path $Resolved -Parent) -ne $Expected) { throw 'Invalid backup boundary.' }
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}

function Remove-StudioOldPortfolioBackups([string]$ApplicationRoot) {
    Remove-StudioOldBackups $ApplicationRoot -Portfolio
}

function New-StudioPortfolioBackup([string]$ApplicationRoot) {
    $SourceData = Join-Path $ApplicationRoot 'data'
    if (!(Test-Path -LiteralPath $SourceData)) { return $null }
    $ExpectedData = [IO.Path]::GetFullPath($SourceData)
    if ((Resolve-Path -LiteralPath $SourceData).Path -ne $ExpectedData -or ((Get-Item -LiteralPath $SourceData).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Cannot safely back up the portfolio data directory.' }
    $BackupDirectory = Join-Path $ApplicationRoot 'portfolio-backups'
    New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
    if ((Resolve-Path -LiteralPath $BackupDirectory).Path -ne [IO.Path]::GetFullPath($BackupDirectory) -or ((Get-Item -LiteralPath $BackupDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid portfolio backup directory.' }
    $Name = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
    $Snapshot = Join-Path $BackupDirectory $Name
    $Pending = Join-Path $BackupDirectory ($Name + '.incomplete')
    New-Item -ItemType Directory -Path (Join-Path $Pending 'data') -Force | Out-Null
    $Manifest = New-Object 'System.Collections.Generic.List[object]'
    function Copy-PortfolioData($From, $To, $Relative) {
        foreach ($Item in Get-ChildItem -LiteralPath $From -Force) {
            if (!$Relative -and $Item.Name -in @('update-backups','trash')) { continue }
            if ($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Portfolio contains a linked file or folder. Backup stopped before modifying application files.' }
            $Target = Join-Path $To $Item.Name
            $PathInSnapshot = if ($Relative) { "$Relative/$($Item.Name)" } else { "data/$($Item.Name)" }
            if ($Item.PSIsContainer) {
                New-Item -ItemType Directory -Path $Target -Force | Out-Null
                Copy-PortfolioData $Item.FullName $Target $PathInSnapshot
            } else {
                Copy-Item -LiteralPath $Item.FullName -Destination $Target -Force
                $OriginalHash = (Get-FileHash -LiteralPath $Item.FullName -Algorithm SHA256).Hash
                if ((Get-FileHash -LiteralPath $Target -Algorithm SHA256).Hash -ne $OriginalHash) { throw 'Portfolio backup verification failed. Installation stopped.' }
                $Manifest.Add(@{path=$PathInSnapshot; sha256=$OriginalHash; bytes=$Item.Length})
            }
        }
    }
    Copy-PortfolioData $SourceData (Join-Path $Pending 'data') ''
    $LegacyEnv = Join-Path $ApplicationRoot '.env'
    if (Test-Path -LiteralPath $LegacyEnv) {
        if ((Get-Item -LiteralPath $LegacyEnv).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Cannot safely back up linked legacy settings.' }
        Copy-Item -LiteralPath $LegacyEnv -Destination (Join-Path $Pending '.env')
        $EnvHash = (Get-FileHash -LiteralPath $LegacyEnv -Algorithm SHA256).Hash
        if ((Get-FileHash -LiteralPath (Join-Path $Pending '.env') -Algorithm SHA256).Hash -ne $EnvHash) { throw 'Legacy settings backup verification failed.' }
        $Manifest.Add(@{path='.env'; sha256=$EnvHash; bytes=(Get-Item -LiteralPath $LegacyEnv).Length})
    }
    $Version = 'Unknown'
    try { $Version = (Get-Content -LiteralPath (Join-Path $ApplicationRoot 'package.json') -Raw | ConvertFrom-Json).version } catch { }
    @{version=$Version; created=(Get-Date).ToString('o'); files=@($Manifest.ToArray())} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Pending 'manifest.json') -Encoding UTF8
    if ((Split-Path ([IO.Path]::GetFullPath($Pending)) -Parent) -ne [IO.Path]::GetFullPath($BackupDirectory) -or (Split-Path ([IO.Path]::GetFullPath($Snapshot)) -Parent) -ne [IO.Path]::GetFullPath($BackupDirectory)) { throw 'Invalid snapshot boundary.' }
    Move-Item -LiteralPath $Pending -Destination $Snapshot
    Write-Host "Verified portfolio backup: $Snapshot"
    return $Snapshot
}
