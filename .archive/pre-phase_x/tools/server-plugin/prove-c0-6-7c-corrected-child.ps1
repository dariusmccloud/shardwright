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
            Invoke-WebRequest -Uri "http://127.0.0.1:$($HostSpec.Port)/api/plugins/shardwright-memory/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
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

function Get-RevisionProjection {
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
            parentRevisionId = $candidate.interpretation.parentRevisionId
            childRevisionIds = @($candidate.interpretation.childRevisionIds)
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
        current = if ($current.currentActiveRecord) {
            [ordered]@{
                dnmRecordId = $current.currentActiveRecord.dnmRecordId
                sourceInterpretationRevisionId = $current.currentActiveRecord.sourceInterpretationRevisionId
                lifecycleState = $current.currentActiveRecord.lifecycleState
                publicationState = $current.currentActiveRecord.publicationState
                publishedAt = $current.currentActiveRecord.publishedAt
            }
        } else {
            $null
        }
    }
}

$hostSpec = $hosts[$HostName]
if (-not $hostSpec) {
    throw "Unknown host '$HostName'."
}
$hostSpec = @{} + $hostSpec
$hostSpec.Port = $Port

$proofPath = Join-Path $PSScriptRoot 'prove-c0-6-4-5b.ps1'
$proofArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $proofPath,
    '-HostName', $HostName,
    '-Port', $Port
)
if ($InstallPayload) {
    $proofArgs += '-InstallPayload'
}

$proofOutput = @(& powershell @proofArgs)
if ($LASTEXITCODE -ne 0) {
    throw 'C0.6.7C corrected-child prerequisite publish proof failed while running Closeout B.'
}
$proofResult = ($proofOutput -join '') | ConvertFrom-Json

$baseUri = "http://127.0.0.1:$Port/api/plugins/shardwright-memory"
$csrf = Get-CsrfSession -TargetPort $Port
$parentRevisionId = $proofResult.revisions.parentRevisionId
$childRevisionId = $proofResult.revisions.childRevisionId
$continuityTargetId = $proofResult.target.continuityTargetId

$parentBeforeRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $parentRevisionId -ContinuityTargetId $continuityTargetId -Session $csrf.Session
$childBeforeRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $childRevisionId -ContinuityTargetId $continuityTargetId -Session $csrf.Session
$beforeStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal $parentBeforeRestart.candidate.publicationState 'NOT_PUBLISHED' 'Parent corrected-child projection should remain unpublished before restart.'
Assert-Equal $parentBeforeRestart.operator.guidedStatus 'REVISION_REQUIRED' 'Parent corrected-child projection should still route the host to the latest child before restart.'
Assert-Equal $parentBeforeRestart.operator.nextAction.interpretationRevisionId $childRevisionId 'Parent corrected-child projection should point at the published child before restart.'
Assert-Equal $childBeforeRestart.candidate.publicationState 'PUBLISHED' 'Child corrected-child projection should be published before restart.'
Assert-Equal $childBeforeRestart.operator.guidedStatus 'ALREADY_PUBLISHED' 'Child corrected-child projection should already be terminal before restart.'
Assert-Equal $childBeforeRestart.current.sourceInterpretationRevisionId $childRevisionId 'Current active memory should already resolve to the published corrected child before restart.'

$restart = Restart-Host -HostSpec $hostSpec
$csrfAfterRestart = Get-CsrfSession -TargetPort $Port
$parentAfterRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $parentRevisionId -ContinuityTargetId $continuityTargetId -Session $csrfAfterRestart.Session
$childAfterRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $childRevisionId -ContinuityTargetId $continuityTargetId -Session $csrfAfterRestart.Session
$afterStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal ($parentBeforeRestart | ConvertTo-Json -Depth 12 -Compress) ($parentAfterRestart | ConvertTo-Json -Depth 12 -Compress) 'Restart must preserve the live corrected-parent projection exactly.'
Assert-Equal ($childBeforeRestart | ConvertTo-Json -Depth 12 -Compress) ($childAfterRestart | ConvertTo-Json -Depth 12 -Compress) 'Restart must preserve the live corrected-child projection exactly.'
Assert-Equal $parentAfterRestart.operator.guidedStatus 'REVISION_REQUIRED' 'Restarted corrected-parent operator should still route to the latest child revision.'
Assert-Equal $childAfterRestart.operator.guidedStatus 'ALREADY_PUBLISHED' 'Restarted corrected-child operator should remain in the published terminal state.'
Assert-Equal $childAfterRestart.current.sourceInterpretationRevisionId $childRevisionId 'Restarted current active memory should still resolve to the corrected child revision.'

Assert-True ($null -ne $beforeStorage.db) 'Corrected-child baseline DB fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.interpretiveLedger) 'Corrected-child baseline interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.dnmLedger) 'Corrected-child baseline publication ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.db) 'Corrected-child restart DB fingerprint is missing.'
Assert-True ($null -ne $afterStorage.interpretiveLedger) 'Corrected-child restart interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.dnmLedger) 'Corrected-child restart publication ledger fingerprint is missing.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.7C'
    host = $HostName
    port = $Port
    proof = 'corrected-child-restart-replay-parity'
    prerequisite = [ordered]@{
        closeoutB = $proofResult
    }
    target = [ordered]@{
        parentRevisionId = $parentRevisionId
        childRevisionId = $childRevisionId
        continuityTargetId = $continuityTargetId
    }
    restart = $restart
    assertions = [ordered]@{
        parentProjectionStableAcrossRestart = $true
        childProjectionStableAcrossRestart = $true
        parentGuidedStatusBefore = $parentBeforeRestart.operator.guidedStatus
        parentGuidedStatusAfter = $parentAfterRestart.operator.guidedStatus
        childGuidedStatusBefore = $childBeforeRestart.operator.guidedStatus
        childGuidedStatusAfter = $childAfterRestart.operator.guidedStatus
        currentActiveRecordId = $childAfterRestart.current.dnmRecordId
        currentActiveRevisionId = $childAfterRestart.current.sourceInterpretationRevisionId
    }
    projection = [ordered]@{
        parentBeforeRestart = $parentBeforeRestart
        parentAfterRestart = $parentAfterRestart
        childBeforeRestart = $childBeforeRestart
        childAfterRestart = $childAfterRestart
    }
    storage = [ordered]@{
        beforeRestart = $beforeStorage
        afterRestart = $afterStorage
    }
}

$result | ConvertTo-Json -Depth 12
