param(
    [ValidateSet('SillyTavern', 'SillyBunny')]
    [string]$HostName = 'SillyTavern',
    [int]$Port = 8000,
    [switch]$InstallPayload
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

function Get-ListeningProcessInfo([int]$TargetPort) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $TargetPort -State Listen | Select-Object -First 1
        if (-not $connection) {
            return $null
        }
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
        return @{
            id = [int]$process.Id
            processName = $process.ProcessName
            startTime = $process.StartTime
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

function Restart-Host([hashtable]$HostSpec) {
    $before = Get-ListeningProcessInfo -TargetPort $HostSpec.Port
    if ($before) {
        Stop-Process -Id $before.id -Force -ErrorAction Stop
    }
    Start-Process -FilePath $HostSpec.ProcessPath -ArgumentList $HostSpec.ProcessArgs -WorkingDirectory $HostSpec.Root -WindowStyle Hidden
    Wait-ForHealth -HostSpec $HostSpec
    $after = Get-ListeningProcessInfo -TargetPort $HostSpec.Port
    if (-not $after) {
        throw "Restart of $($HostSpec.Name) did not produce a listening process."
    }
    return @{
        before = $before
        after = $after
        replacedProcess = ($before -and $after.id -ne $before.id)
    }
}

function Get-StoragePaths([hashtable]$HostSpec) {
    $userRoot = Join-Path $HostSpec.Root 'data\default-user'
    $storageRoot = Join-Path $userRoot 'summary-sharder'
    return @{
        userRoot = $userRoot
        storageRoot = $storageRoot
        dbPath = Join-Path $storageRoot 'architectural-memory.db'
        statePath = Join-Path $storageRoot 'architectural-memory.state.json'
        interpretiveLedgerPath = Join-Path $storageRoot 'interpretive-governance-ledger.jsonl'
        dnmLedgerPath = Join-Path $storageRoot 'dnm-publication-ledger.jsonl'
    }
}

function Get-FileFingerprint([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    $item = Get-Item -LiteralPath $Path
    return @{
        path = $Path
        bytes = [int64]$item.Length
        sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}

function Get-StorageFingerprintSet([hashtable]$HostSpec) {
    $paths = Get-StoragePaths -HostSpec $HostSpec
    return [ordered]@{
        db = Get-FileFingerprint -Path $paths.dbPath
        state = Get-FileFingerprint -Path $paths.statePath
        interpretiveLedger = Get-FileFingerprint -Path $paths.interpretiveLedgerPath
        dnmLedger = Get-FileFingerprint -Path $paths.dnmLedgerPath
    }
}

function Get-CsrfSession([int]$TargetPort) {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/csrf-token" -WebSession $session -UseBasicParsing -TimeoutSec 15
    return @{
        Session = $session
        Token = (($csrf.Content | ConvertFrom-Json).token)
    }
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
        [string]$CsrfToken = $null,
        [int]$TimeoutSec = 30
    )

    $headers = @{}
    if ($CsrfToken) {
        $headers['x-csrf-token'] = $CsrfToken
    }

    $params = @{
        Uri = $Uri
        Method = $Method
        UseBasicParsing = $true
        TimeoutSec = $TimeoutSec
    }
    if ($Session) {
        $params.WebSession = $Session
    }
    if ($headers.Count -gt 0) {
        $params.Headers = $headers
    }
    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 30 -Compress)
    }

    $response = Invoke-WebRequest @params
    return $response.Content | ConvertFrom-Json
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) {
        throw "$Message Expected '$Expected' but got '$Actual'."
    }
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw $Message
    }
}

function Normalize-AvailableActions($OperatorState) {
    $actions = @($OperatorState.availableActions)
    if (-not $actions) {
        return @()
    }
    return @(
        $actions |
            ForEach-Object {
                [ordered]@{
                    action = $_.action
                    label = $_.label
                }
            } |
            Sort-Object action
    )
}

function Get-CurrentProjection {
    param(
        [string]$BaseUri,
        [string]$RevisionId,
        [string]$ContinuityTargetId,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session
    )

    $candidate = Invoke-JsonRequest -Method 'GET' -Uri "$BaseUri/interpretive/candidates/$RevisionId" -Session $Session -TimeoutSec 15
    $operator = Invoke-JsonRequest -Method 'GET' -Uri "$BaseUri/interpretive/candidates/$RevisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($ContinuityTargetId))" -Session $Session -TimeoutSec 15
    $records = Invoke-JsonRequest -Method 'GET' -Uri "$BaseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($ContinuityTargetId))" -Session $Session -TimeoutSec 15
    $current = Invoke-JsonRequest -Method 'GET' -Uri "$BaseUri/interpretive/publication/targets/$([uri]::EscapeDataString($ContinuityTargetId))/current" -Session $Session -TimeoutSec 15

    $normalizedRecords = @(
        @($records.records) |
            ForEach-Object {
                [ordered]@{
                    dnmRecordId = $_.dnmRecordId
                    sourceInterpretationRevisionId = $_.sourceInterpretationRevisionId
                    lifecycleState = $_.lifecycleState
                    publicationState = $_.publicationState
                    deltaReviewState = $_.deltaReviewState
                    withdrawalState = $_.withdrawalState
                    publishedAt = $_.publishedAt
                }
            } |
            Sort-Object dnmRecordId
    )

    return [ordered]@{
        candidate = [ordered]@{
            interpretationRevisionId = $candidate.interpretation.interpretationRevisionId
            reviewState = $candidate.interpretation.reviewState
            subjectDispositionState = $candidate.interpretation.subjectDispositionState
            publicationState = $candidate.interpretation.publicationState
            authorityEffect = $candidate.interpretation.authorityEffect
            proposalContentHash = $candidate.interpretation.proposalContentHash
            reviewEnvelopeHash = $candidate.interpretation.reviewEnvelopeHash
        }
        operator = [ordered]@{
            guidedStatus = $operator.operatorState.guidedFlow.status
            nextAction = if ($operator.operatorState.guidedFlow.nextAction) {
                [ordered]@{
                    action = $operator.operatorState.guidedFlow.nextAction.action
                    interpretationRevisionId = $operator.operatorState.guidedFlow.nextAction.interpretationRevisionId
                    continuityTargetId = $operator.operatorState.guidedFlow.nextAction.continuityTargetId
                }
            } else {
                $null
            }
            availableActions = Normalize-AvailableActions -OperatorState $operator.operatorState
        }
        records = $normalizedRecords
        current = [ordered]@{
            dnmRecordId = $current.currentActiveRecord.dnmRecordId
            sourceInterpretationRevisionId = $current.currentActiveRecord.sourceInterpretationRevisionId
            lifecycleState = $current.currentActiveRecord.lifecycleState
            publicationState = $current.currentActiveRecord.publicationState
            publishedAt = $current.currentActiveRecord.publishedAt
        }
    }
}

$hostSpec = $hosts[$HostName]
if (-not $hostSpec) {
    throw "Unknown host '$HostName'."
}
$hostSpec = @{} + $hostSpec
$hostSpec.Port = $Port

$proveAPath = Join-Path $PSScriptRoot 'prove-c0-6-4-5a.ps1'
$proveAArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $proveAPath,
    '-HostName', $HostName,
    '-Port', $Port
)
if ($InstallPayload) {
    $proveAArgs += '-InstallPayload'
}

$proveAOutput = @(& powershell @proveAArgs)
if ($LASTEXITCODE -ne 0) {
    throw 'Closeout C prerequisite publish proof failed while running Closeout A.'
}
$proveAResult = ($proveAOutput -join '') | ConvertFrom-Json

$baseUri = "http://127.0.0.1:$Port/api/plugins/summary-sharder-memory"
$csrf = Get-CsrfSession -TargetPort $Port
$revisionId = $proveAResult.seed.interpretationRevisionId
$continuityTargetId = $proveAResult.seed.memorySubjectId

$beforeProjection = Get-CurrentProjection -BaseUri $baseUri -RevisionId $revisionId -ContinuityTargetId $continuityTargetId -Session $csrf.Session
$beforeStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal $beforeProjection.candidate.publicationState 'PUBLISHED' 'Closeout C baseline candidate should already be published.'
Assert-Equal $beforeProjection.operator.guidedStatus 'ALREADY_PUBLISHED' 'Closeout C baseline operator should already be in the published terminal state.'
Assert-Equal @($beforeProjection.records).Count 1 'Closeout C baseline should have exactly one published record.'

$restart = Restart-Host -HostSpec $hostSpec
$csrfAfterRestart = Get-CsrfSession -TargetPort $Port
$afterProjection = Get-CurrentProjection -BaseUri $baseUri -RevisionId $revisionId -ContinuityTargetId $continuityTargetId -Session $csrfAfterRestart.Session
$afterStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal ($beforeProjection | ConvertTo-Json -Depth 12 -Compress) ($afterProjection | ConvertTo-Json -Depth 12 -Compress) 'Restart must preserve the live publication projection exactly for the clean published root revision.'
Assert-Equal $afterProjection.current.dnmRecordId $beforeProjection.current.dnmRecordId 'Restart should preserve the current active published record id.'
Assert-Equal $afterProjection.operator.guidedStatus 'ALREADY_PUBLISHED' 'Restarted operator should remain in the published terminal state.'

Assert-True ($null -ne $beforeStorage.db) 'Closeout C baseline DB fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.interpretiveLedger) 'Closeout C baseline interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.dnmLedger) 'Closeout C baseline publication ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.db) 'Closeout C restart DB fingerprint is missing.'
Assert-True ($null -ne $afterStorage.interpretiveLedger) 'Closeout C restart interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.dnmLedger) 'Closeout C restart publication ledger fingerprint is missing.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.4-5C'
    host = $HostName
    port = $Port
    proof = 'restart-replay-live-publication-parity'
    prerequisite = [ordered]@{
        closeoutA = $proveAResult
    }
    target = [ordered]@{
        interpretationRevisionId = $revisionId
        continuityTargetId = $continuityTargetId
    }
    restart = $restart
    assertions = [ordered]@{
        projectionStableAcrossRestart = $true
        guidedStatusBefore = $beforeProjection.operator.guidedStatus
        guidedStatusAfter = $afterProjection.operator.guidedStatus
        currentActiveRecordId = $afterProjection.current.dnmRecordId
        publicationRecordCount = @($afterProjection.records).Count
    }
    projection = [ordered]@{
        beforeRestart = $beforeProjection
        afterRestart = $afterProjection
    }
    storage = [ordered]@{
        beforeRestart = $beforeStorage
        afterRestart = $afterStorage
    }
}

$result | ConvertTo-Json -Depth 12
