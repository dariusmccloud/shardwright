param(
    [ValidateSet('SillyTavern', 'SillyBunny')]
    [string]$HostName = 'SillyTavern',
    [int]$Port = 8000,
    [switch]$InstallPayload
)

$ErrorActionPreference = 'Stop'

function Invoke-CommandChecked {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$FailureMessage
    )

    $output = @(& $FilePath @ArgumentList 2>&1)
    if ($LASTEXITCODE -ne 0) {
        $joined = ($output -join [Environment]::NewLine)
        if ($joined) {
            throw "$FailureMessage`n$joined"
        }
        throw $FailureMessage
    }
    return $output
}

function Invoke-PowerShellJsonProof {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments,
        [string]$FailureMessage
    )

    $argumentList = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $ScriptPath
    ) + $Arguments

    $output = Invoke-CommandChecked -FilePath 'powershell' -ArgumentList $argumentList -FailureMessage $FailureMessage

    return ($output -join '') | ConvertFrom-Json
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

function Wait-ForHealth([int]$TargetPort, [int]$Attempts = 60) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/api/plugins/summary-sharder-memory/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
            return
        } catch {}
    }
    throw "Host did not become healthy on port $TargetPort."
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

function Get-StoragePaths([string]$HostRoot) {
    $userRoot = Join-Path $HostRoot 'data\default-user'
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

function Get-StorageFingerprintSet([string]$HostRoot) {
    $paths = Get-StoragePaths -HostRoot $HostRoot
    return [ordered]@{
        db = Get-FileFingerprint -Path $paths.dbPath
        state = Get-FileFingerprint -Path $paths.statePath
        interpretiveLedger = Get-FileFingerprint -Path $paths.interpretiveLedgerPath
        dnmLedger = Get-FileFingerprint -Path $paths.dnmLedgerPath
    }
}

function Get-StatePayload([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
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

$hostSpec = $hosts[$HostName]
if (-not $hostSpec) {
    throw "Unknown host '$HostName'."
}
$hostSpec = @{} + $hostSpec
$hostSpec.Port = $Port

if ($InstallPayload) {
    Invoke-CommandChecked -FilePath 'powershell' -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', (Join-Path $PSScriptRoot 'install-summary-sharder-memory.ps1')
    ) -FailureMessage 'Payload install failed before fresh-install proof.'
}

$resetResult = Invoke-PowerShellJsonProof `
    -ScriptPath (Join-Path $PSScriptRoot 'reset-interpretive-smoke-storage.ps1') `
    -Arguments @(
        '-HostName', $HostName,
        '-RestartHost',
        '-Force'
    ) `
    -FailureMessage 'Fresh-install proof reset failed.'

$storageAfterReset = Get-StorageFingerprintSet -HostRoot $hostSpec.Root
Assert-True ($null -eq $storageAfterReset.interpretiveLedger) 'Fresh-install proof should start with no interpretive ledger after reset.'
Assert-True ($null -eq $storageAfterReset.dnmLedger) 'Fresh-install proof should start with no publication ledger after reset.'
$stateAfterReset = Get-StatePayload -Path (Get-StoragePaths -HostRoot $hostSpec.Root).statePath
Assert-True ($null -ne $storageAfterReset.db) 'Fresh-install proof should allow the host to bootstrap an empty governed DB after reset.'
Assert-True ($null -ne $storageAfterReset.state) 'Fresh-install proof should allow the host to bootstrap minimal runtime state after reset.'
Assert-True ($null -ne $stateAfterReset) 'Fresh-install proof must be able to read the minimal runtime state after reset.'

$statePropertyNames = @($stateAfterReset.PSObject.Properties.Name)
$allowedStateProperties = @('schemaVersion', 'serviceVersion', 'runtimeAdapter', 'journalMode', 'adoptedAt')
$unexpectedStateProperties = @($statePropertyNames | Where-Object { $_ -notin $allowedStateProperties })
Assert-Equal @($unexpectedStateProperties).Count 0 'Fresh-install proof state payload should contain only adoption metadata after reset.'

Wait-ForHealth -TargetPort $Port
$csrfBeforePublish = Get-CsrfSession -TargetPort $Port
$baseUri = "http://127.0.0.1:$Port/api/plugins/summary-sharder-memory"
$healthAfterReset = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/health" -Session $csrfBeforePublish.Session -TimeoutSec 15
Assert-True ([bool]$healthAfterReset.ok) 'Fresh-install proof health check failed after reset/restart.'

$closeoutAResult = Invoke-PowerShellJsonProof `
    -ScriptPath (Join-Path $PSScriptRoot 'prove-c0-6-4-5a.ps1') `
    -Arguments @(
        '-HostName', $HostName,
        '-Port', $Port
    ) `
    -FailureMessage 'Fresh-install proof publication flow failed.'

$storageAfterPublish = Get-StorageFingerprintSet -HostRoot $hostSpec.Root
Assert-True ($null -ne $storageAfterPublish.db) 'Fresh-install proof should create a governed DB after publication.'
Assert-True ($null -ne $storageAfterPublish.interpretiveLedger) 'Fresh-install proof should create the interpretive ledger after publication.'
Assert-True ($null -ne $storageAfterPublish.dnmLedger) 'Fresh-install proof should create the publication ledger after publication.'

$preRestartProjection = Get-CurrentProjection `
    -BaseUri $baseUri `
    -RevisionId $closeoutAResult.seed.interpretationRevisionId `
    -ContinuityTargetId $closeoutAResult.seed.memorySubjectId `
    -Session $csrfBeforePublish.Session

Assert-Equal $preRestartProjection.operator.guidedStatus 'ALREADY_PUBLISHED' 'Fresh-install proof should end the first publication path in the published terminal state before restart.'
Assert-Equal @($preRestartProjection.records).Count 1 'Fresh-install proof should leave exactly one publication record before restart.'

$listeningBefore = Get-ListeningProcessInfo -TargetPort $Port
Assert-True ($null -ne $listeningBefore) 'Fresh-install proof could not identify the host process before restart.'
Stop-Process -Id $listeningBefore.id -Force -ErrorAction Stop
Start-Process -FilePath $hostSpec.ProcessPath -ArgumentList $hostSpec.ProcessArgs -WorkingDirectory $hostSpec.Root -WindowStyle Hidden
Wait-ForHealth -TargetPort $Port

$listeningAfter = Get-ListeningProcessInfo -TargetPort $Port
Assert-True ($null -ne $listeningAfter) 'Fresh-install proof restart did not produce a listening process.'
Assert-True ($listeningAfter.id -ne $listeningBefore.id) 'Fresh-install proof restart did not replace the listening process.'

$csrfAfterRestart = Get-CsrfSession -TargetPort $Port
$postRestartProjection = Get-CurrentProjection `
    -BaseUri $baseUri `
    -RevisionId $closeoutAResult.seed.interpretationRevisionId `
    -ContinuityTargetId $closeoutAResult.seed.memorySubjectId `
    -Session $csrfAfterRestart.Session

$storageAfterRestart = Get-StorageFingerprintSet -HostRoot $hostSpec.Root

Assert-Equal ($preRestartProjection | ConvertTo-Json -Depth 12 -Compress) ($postRestartProjection | ConvertTo-Json -Depth 12 -Compress) 'Fresh-install proof restart must preserve the published projection.'
Assert-True ($null -ne $storageAfterRestart.db) 'Fresh-install proof DB is missing after restart.'
Assert-True ($null -ne $storageAfterRestart.interpretiveLedger) 'Fresh-install proof interpretive ledger is missing after restart.'
Assert-True ($null -ne $storageAfterRestart.dnmLedger) 'Fresh-install proof publication ledger is missing after restart.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.7C'
    slice = 'fresh-install-matrix-v1'
    host = $HostName
    port = $Port
    proof = 'empty-host-bootstrap-review-publish-restart'
    reset = $resetResult
    startup = [ordered]@{
        healthOk = [bool]$healthAfterReset.ok
        listeningProcessBeforePublish = $listeningBefore
        listeningProcessAfterRestart = $listeningAfter
    }
    storage = [ordered]@{
        afterReset = $storageAfterReset
        afterPublish = $storageAfterPublish
        afterRestart = $storageAfterRestart
    }
    publicationFlow = $closeoutAResult
    assertions = [ordered]@{
        bootstrappedEmptyDbAfterReset = ($null -ne $storageAfterReset.db)
        bootstrappedMinimalStateAfterReset = ($null -ne $storageAfterReset.state)
        emptyInterpretiveLedgerAfterReset = ($null -eq $storageAfterReset.interpretiveLedger)
        emptyPublicationLedgerAfterReset = ($null -eq $storageAfterReset.dnmLedger)
        resetStateProperties = $statePropertyNames
        bootstrapStatus = $closeoutAResult.assertions.initialGuidedFlow
        preQualificationStatus = $closeoutAResult.assertions.preQualificationGuidedFlow
        prePublishStatus = $closeoutAResult.assertions.prePublishGuidedFlow
        postPublishStatus = $closeoutAResult.assertions.postPublishGuidedFlow
        projectionStableAcrossRestart = $true
        currentActiveRecordId = $postRestartProjection.current.dnmRecordId
        publicationRecordCount = @($postRestartProjection.records).Count
    }
}

$result | ConvertTo-Json -Depth 12
