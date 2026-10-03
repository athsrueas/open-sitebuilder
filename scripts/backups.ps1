function Remove-StudioOldBackups([string]$ApplicationRoot) {
    $BackupDirectory = Join-Path $ApplicationRoot 'data/update-backups'
    $Settings = Join-Path $ApplicationRoot 'data/backup-settings.json'
    $Keep = 1
    if (Test-Path -LiteralPath $Settings) {
        try { $Choice = (Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json).keep; if (($Choice -is [int] -or $Choice -is [long]) -and $Choice -in @(0,1,3,-1)) { $Keep = [int]$Choice } } catch { }
    }
    if ($Keep -eq -1 -or !(Test-Path -LiteralPath $BackupDirectory)) { return }
    $Expected = [IO.Path]::GetFullPath($BackupDirectory)
    if ((Resolve-Path -LiteralPath $BackupDirectory).Path -ne $Expected -or ((Get-Item -LiteralPath $BackupDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid backup directory.' }
    $Backups = @(Get-ChildItem -LiteralPath $BackupDirectory -Directory | Where-Object { $_.Name -match '^\d{8}-\d{6}(-[a-f0-9]{8})?$' -and !($_.Attributes -band [IO.FileAttributes]::ReparsePoint) } | Sort-Object Name -Descending)
    Add-Type -AssemblyName Microsoft.VisualBasic
    foreach ($Backup in ($Backups | Select-Object -Skip $Keep)) {
        $Resolved = (Resolve-Path -LiteralPath $Backup.FullName).Path
        if ((Split-Path $Resolved -Parent) -ne $Expected) { throw 'Invalid backup boundary.' }
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Resolved, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)
    }
}
