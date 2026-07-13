param(
    [ValidateSet('SillyTavern', 'SillyBunny')]
    [string]$HostName = 'SillyTavern',
    [switch]$RestartHost,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$hosts = @{
    SillyTavern = @{
        Name = 'SillyTavern'
        Port = 8000
        Root = 'D:\AI\Projects\SillyTavern'
        ProcessPath = 'C:\Program Files\nodejs\node.exe'
        ProcessArgs = @('server.js')
    }
    SillyBunny = @{
        Name = 'SillyBunny'
        Port = 4444
        Root = 'D:\AI\Projects\SillyBunny'
        ProcessPath = 'C:\Users\chris\.bun\bin\bun.exe'
        ProcessArgs = @('server.js')
    }
}

function Get-ListeningProcessInfo([int]$Port) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1
        if (-not $connection) {
            return $null
        }
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
        return @{
            Id = [int]$process.Id
            ProcessName = $process.ProcessName
            StartTime = $process.StartTime
        }
    } catch {
        return $null
    }
}

function Wait-ForHealth([hashtable]$HostSpec, [int]$Attempts = 60) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$($HostSpec.Port)/api/plugins/summary-sharder-memory/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
            return
        } catch {}
    }
    throw "Host $($HostSpec.Name) did not become healthy on port $($HostSpec.Port)."
}

function Stop-Host([hashtable]$HostSpec) {
    $before = Get-ListeningProcessInfo -Port $HostSpec.Port
    if ($before) {
        Stop-Process -Id $before.Id -Force -ErrorAction Stop
    }
    return $before
}

function Start-Host([hashtable]$HostSpec, $before = $null) {
    Start-Process -FilePath $HostSpec.ProcessPath -ArgumentList $HostSpec.ProcessArgs -WorkingDirectory $HostSpec.Root -WindowStyle Hidden
    Wait-ForHealth -HostSpec $HostSpec
    $after = Get-ListeningProcessInfo -Port $HostSpec.Port
    if (-not $after) {
        throw "Start of $($HostSpec.Name) did not produce a listening process."
    }
    return @{
        before = $before
        after = $after
        replacedProcess = ($before -and $after.Id -ne $before.Id)
    }
}

function Get-StoragePaths([hashtable]$HostSpec) {
    $userRoot = Join-Path $HostSpec.Root 'data\default-user'
    $storageRoot = Join-Path $userRoot 'summary-sharder'
    return @{
        userRoot = $userRoot
        storageRoot = $storageRoot
        dbPath = Join-Path $storageRoot 'architectural-memory.db'
        snapshotPath = Join-Path $storageRoot 'architectural-memory.snapshot.db'
        statePath = Join-Path $storageRoot 'architectural-memory.state.json'
        interpretiveLedgerPath = Join-Path $storageRoot 'interpretive-governance-ledger.jsonl'
        dnmLedgerPath = Join-Path $storageRoot 'dnm-publication-ledger.jsonl'
    }
}

$hostSpec = $hosts[$HostName]
if (-not $hostSpec) {
    throw "Unknown host '$HostName'."
}

$paths = Get-StoragePaths -HostSpec $hostSpec

if (-not $Force) {
    throw @"
Refusing to wipe test storage without -Force.

Target host: $($hostSpec.Name)
Target root: $($hostSpec.Root)
Target storage: $($paths.storageRoot)

This helper deletes the entire summary-sharder storage root for the selected host.
Use it only for smoke-test reset work.
"@
}

$summary = [ordered]@{
    host = $hostSpec.Name
    root = $hostSpec.Root
    storageRoot = $paths.storageRoot
    removed = $false
    restarted = $false
}

$stoppedProcess = $null

if ($RestartHost) {
    $stoppedProcess = Stop-Host -HostSpec $hostSpec
}

if (Test-Path -LiteralPath $paths.storageRoot) {
    Remove-Item -LiteralPath $paths.storageRoot -Recurse -Force
    $summary.removed = $true
}

if ($RestartHost) {
    $restart = Start-Host -HostSpec $hostSpec -before $stoppedProcess
    $summary.restarted = $true
    $summary.restart = $restart
}

$summary | ConvertTo-Json -Depth 8
