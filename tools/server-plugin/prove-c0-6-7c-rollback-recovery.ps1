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

function Get-ReviewerActorId([string]$ReviewerRole, [string]$ReviewerEntityId) {
    switch ($ReviewerRole) {
        'MEMORY_SUBJECT' { return 'character:jeep.png' }
        'RELATIONAL_PARTICIPANT' { return 'user:Chris' }
        default {
            if ($ReviewerEntityId) {
                return $ReviewerEntityId
            }
            throw "No actor mapping exists for reviewer role '$ReviewerRole'."
        }
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

function New-InterpretiveCandidate {
    param(
        [string]$BaseUri,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$CsrfToken,
        [string]$Statement,
        [int64]$Now
    )

    $stamp = Get-Date -Format 'yyyyMMddHHmmssfff'
    $body = @{
        interpretationId = "interp_rollback_$stamp"
        interpretationRevisionId = "interprev_rollback_${stamp}_v1"
        revisionReason = 'INITIAL_PROPOSAL'
        memoryScopeId = 'scope_interpretive_smoke'
        memorySubjectId = 'character:jeep.png'
        type = 'ROLE_EVOLUTION'
        statement = $Statement
        assertionDomains = @('ROLE', 'AUTHORITY', 'RELATIONSHIP')
        sharedRelationshipAsserted = $true
        personalMeaningAsserted = $true
        materialParticipantEntityIds = @('character:jeep.png', 'user:Chris')
        groundingLinks = @(
            @{
                basisType = 'STRUCTURAL_RECORD'
                basisRecordId = 'decision:architectural-sharder-fork'
                basisRecordVersion = 1
                basisRecordHash = 'sha256:decision-fork'
                speakerEntityId = 'character:jeep.png'
                groundingRole = 'PRIMARY'
                groundingAssessment = 'SUPPORTS'
            },
            @{
                basisType = 'SOURCE_OCCURRENCE'
                chatInstanceId = 'chat_alpha'
                messageId = 'msg_alpha0000000000000000000000000'
                messageRevisionHash = 'sha256:msg-alpha'
                speakerEntityId = 'user:Chris'
                groundingRole = 'SUPPORTING'
                groundingAssessment = 'SUPPORTS'
            }
        )
        now = $Now
    }

    return Invoke-JsonRequest -Method 'POST' -Uri "$BaseUri/interpretive/candidates" -Body $body -Session $Session -CsrfToken $CsrfToken -TimeoutSec 30
}

function Publish-GrantedCandidate {
    param(
        [string]$BaseUri,
        [object]$Candidate,
        [string]$PublicationPolicyId,
        [string]$ContinuityTargetId,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$CsrfToken,
        [int64]$NowBase,
        [string]$CommentaryPrefix
    )

    $revisionId = $Candidate.interpretation.interpretationRevisionId
    $reviewEnvelopeHash = $Candidate.interpretation.reviewEnvelopeHash

    foreach ($reviewRequest in @($Candidate.interpretation.reviewRequests)) {
        $actorEntityId = Get-ReviewerActorId -ReviewerRole $reviewRequest.reviewerRole -ReviewerEntityId $reviewRequest.reviewerEntityId
        $reviewNow = switch ($reviewRequest.reviewerRole) {
            'MEMORY_SUBJECT' { $NowBase + 1000 }
            'RELATIONAL_PARTICIPANT' { $NowBase + 2000 }
            default { $NowBase + 2500 }
        }
        $disposition = Invoke-JsonRequest -Method 'POST' -Uri "$BaseUri/interpretive/reviews/$($reviewRequest.reviewRequestId)/dispositions" -Body @{
            actorEntityId = $actorEntityId
            disposition = 'APPROVE'
            reviewEnvelopeHash = $reviewEnvelopeHash
            commentary = "$CommentaryPrefix review approval for $($reviewRequest.reviewerRole)."
            now = $reviewNow
        } -Session $Session -CsrfToken $CsrfToken -TimeoutSec 30
        Assert-True ([bool]$disposition.ok) "$CommentaryPrefix review disposition failed for $($reviewRequest.reviewerRole)."
    }

    $granted = Invoke-JsonRequest -Method 'POST' -Uri "$BaseUri/interpretive/candidates/$revisionId/subject-disposition" -Body @{
        actorEntityId = 'character:jeep.png'
        state = 'GRANTED'
        commentary = "$CommentaryPrefix granted subject disposition."
        reviewEnvelopeHash = $reviewEnvelopeHash
        now = $NowBase + 3000
    } -Session $Session -CsrfToken $CsrfToken -TimeoutSec 30
    Assert-Equal $granted.subjectDisposition.state 'GRANTED' "$CommentaryPrefix subject disposition should be granted."

    $qualification = Invoke-JsonRequest -Method 'POST' -Uri "$BaseUri/interpretive/candidates/$revisionId/publication-qualifications" -Body @{
        publicationPolicyId = $PublicationPolicyId
        continuityTargetId = $ContinuityTargetId
        proposalContentHash = $granted.interpretation.proposalContentHash
        reviewEnvelopeHash = $granted.interpretation.reviewEnvelopeHash
        subjectDispositionRecordId = $granted.subjectDisposition.subjectDispositionId
        now = $NowBase + 4000
    } -Session $Session -CsrfToken $CsrfToken -TimeoutSec 30
    Assert-Equal $qualification.qualification.eligibilityVerdict 'ELIGIBLE' "$CommentaryPrefix qualification should become eligible."

    $published = Invoke-JsonRequest -Method 'POST' -Uri "$BaseUri/interpretive/candidates/$revisionId/publication-publish" -Body @{
        publicationPolicyId = $PublicationPolicyId
        continuityTargetId = $ContinuityTargetId
        authorizedBy = 'user:Chris'
        now = $NowBase + 5000
    } -Session $Session -CsrfToken $CsrfToken -TimeoutSec 60
    Assert-Equal $published.interpretation.publicationState 'PUBLISHED' "$CommentaryPrefix candidate should move to published."

    return [ordered]@{
        candidate = $Candidate
        granted = $granted
        qualification = $qualification
        published = $published
    }
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
                    supersededByDnmRecordId = $_.supersededByDnmRecordId
                    supersedesDnmRecordId = $_.supersedesDnmRecordId
                    publishedAt = $_.publishedAt
                }
            } |
            Sort-Object dnmRecordId
    )

    $currentRecord = $current.currentActiveRecord
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
        current = if ($currentRecord) {
            [ordered]@{
                dnmRecordId = $currentRecord.dnmRecordId
                sourceInterpretationRevisionId = $currentRecord.sourceInterpretationRevisionId
                lifecycleState = $currentRecord.lifecycleState
                publicationState = $currentRecord.publicationState
                publishedAt = $currentRecord.publishedAt
            }
        } else {
            $null
        }
    }
}

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

$hostSpec = $hosts[$HostName]
if (-not $hostSpec) {
    throw "Unknown host '$HostName'."
}
$hostSpec = @{} + $hostSpec
$hostSpec.Port = $Port

$proofPath = Join-Path $PSScriptRoot 'prove-c0-6-4-5a.ps1'
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

$proofOutput = Invoke-CommandChecked -FilePath 'powershell' -ArgumentList $proofArgs -FailureMessage 'C0.6.7C rollback/recovery prerequisite publish proof failed.'
$proofResult = ($proofOutput -join '') | ConvertFrom-Json

$baseUri = "http://127.0.0.1:$Port/api/plugins/summary-sharder-memory"
$csrf = Get-CsrfSession -TargetPort $Port
$continuityTargetId = $proofResult.seed.memorySubjectId
$policyId = $proofResult.bootstrap.publicationPolicyId
$firstRevisionId = $proofResult.seed.interpretationRevisionId
$firstDnmRecordId = $proofResult.publish.dnmRecordId
$nowBase = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$secondCandidate = New-InterpretiveCandidate -BaseUri $baseUri -Session $csrf.Session -CsrfToken $csrf.Token -Statement 'Jeep became the primary continuity authority within a shared architecture with Chris.' -Now ($nowBase + 100)
$secondPublished = Publish-GrantedCandidate -BaseUri $baseUri -Candidate $secondCandidate -PublicationPolicyId $policyId -ContinuityTargetId $continuityTargetId -Session $csrf.Session -CsrfToken $csrf.Token -NowBase ($nowBase + 10000) -CommentaryPrefix 'C0.6.7C rollback proof'
$secondRevisionId = $secondPublished.candidate.interpretation.interpretationRevisionId
$secondDnmRecordId = $secondPublished.published.publishedRecord.dnmRecordId

$recordsAfterSecondPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
$secondRecordAfterPublish = @($recordsAfterSecondPublish.records) | Where-Object { $_.dnmRecordId -eq $secondDnmRecordId } | Select-Object -First 1
$currentAfterSecondPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/targets/$([uri]::EscapeDataString($continuityTargetId))/current" -Session $csrf.Session -TimeoutSec 15

Assert-Equal @($recordsAfterSecondPublish.records).Count 2 'Second publication should produce exactly two DNM records on the continuity line.'
Assert-Equal $secondPublished.published.publishedRecord.lifecycleState 'DELTA_PENDING' 'Second publication should remain delta-pending until superseded.'
Assert-Equal $secondRecordAfterPublish.lifecycleState 'DELTA_PENDING' 'Reloaded second DNM record should stay delta-pending before supersession.'
Assert-Equal $currentAfterSecondPublish.currentActiveRecord.dnmRecordId $firstDnmRecordId 'First publication should remain current active before supersession.'

$superseded = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/supersede" -Body @{
    actorEntityId = 'character:jeep.png'
    priorDnmRecordId = $firstDnmRecordId
    replacementDnmRecordId = $secondDnmRecordId
    reasonCodes = @('SCOPE_TOO_BROAD')
    commentary = 'The later DNM record narrows the published continuity claim.'
    now = $nowBase + 20000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $superseded.priorRecord.lifecycleState 'SUPERSEDED' 'First DNM record should become superseded.'
Assert-Equal $superseded.replacementRecord.lifecycleState 'ACTIVE' 'Replacement DNM record should become active after supersession.'

$deltaReview = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/delta-reviews" -Body @{
    actorEntityId = 'character:jeep.png'
    continuityTargetId = $continuityTargetId
    deltaState = 'PENDING'
    reasonCodes = @('CONTRARY_EVIDENCE_PRESENT')
    commentary = 'Record a follow-up delta review without mutating current active continuity.'
    now = $nowBase + 25000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $deltaReview.record.deltaReviewState 'PENDING' 'Delta review should remain recorded as pending.'
Assert-Equal $deltaReview.currentActiveRecord.dnmRecordId $secondDnmRecordId 'Replacement DNM record should remain current active after delta review.'

$withdrawn = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/withdraw" -Body @{
    actorEntityId = 'character:jeep.png'
    dnmRecordId = $secondDnmRecordId
    reasonCodes = @('CONTRARY_EVIDENCE_PRESENT')
    commentary = 'Withdraw the currently active DNM record pending reevaluation.'
    now = $nowBase + 30000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $withdrawn.record.lifecycleState 'WITHDRAWN' 'Replacement DNM record should become withdrawn.'
Assert-True ($null -eq $withdrawn.currentActiveRecord) 'No current active DNM record should remain after withdrawal.'

$firstBeforeRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $firstRevisionId -ContinuityTargetId $continuityTargetId -Session $csrf.Session
$secondBeforeRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $secondRevisionId -ContinuityTargetId $continuityTargetId -Session $csrf.Session
$beforeStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal @($firstBeforeRestart.records).Count 2 'Rollback proof should preserve both publication records before restart.'
Assert-True ($null -eq $firstBeforeRestart.current) 'No current active record should remain before restart after withdrawal.'

$firstBeforeRecord = @($firstBeforeRestart.records) | Where-Object { $_.dnmRecordId -eq $firstDnmRecordId } | Select-Object -First 1
$secondBeforeRecord = @($firstBeforeRestart.records) | Where-Object { $_.dnmRecordId -eq $secondDnmRecordId } | Select-Object -First 1
Assert-Equal $firstBeforeRecord.lifecycleState 'SUPERSEDED' 'First record should remain superseded before restart.'
Assert-Equal $secondBeforeRecord.lifecycleState 'WITHDRAWN' 'Second record should remain withdrawn before restart.'
Assert-Equal $secondBeforeRecord.deltaReviewState 'PENDING' 'Second record should preserve pending delta review before restart.'
Assert-Equal $secondBeforeRecord.supersedesDnmRecordId $firstDnmRecordId 'Second record should remember the superseded predecessor before restart.'
Assert-Equal $firstBeforeRecord.supersededByDnmRecordId $secondDnmRecordId 'First record should remember the replacement before restart.'

$restart = Restart-Host -HostSpec $hostSpec
$csrfAfterRestart = Get-CsrfSession -TargetPort $Port
$firstAfterRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $firstRevisionId -ContinuityTargetId $continuityTargetId -Session $csrfAfterRestart.Session
$secondAfterRestart = Get-RevisionProjection -BaseUri $baseUri -RevisionId $secondRevisionId -ContinuityTargetId $continuityTargetId -Session $csrfAfterRestart.Session
$afterStorage = Get-StorageFingerprintSet -HostSpec $hostSpec

Assert-Equal ($firstBeforeRestart | ConvertTo-Json -Depth 12 -Compress) ($firstAfterRestart | ConvertTo-Json -Depth 12 -Compress) 'Restart must preserve the live superseded-record projection exactly.'
Assert-Equal ($secondBeforeRestart | ConvertTo-Json -Depth 12 -Compress) ($secondAfterRestart | ConvertTo-Json -Depth 12 -Compress) 'Restart must preserve the live withdrawn-record projection exactly.'
Assert-True ($null -eq $firstAfterRestart.current) 'Restart should preserve the absence of a current active DNM record after withdrawal.'

Assert-True ($null -ne $beforeStorage.db) 'Rollback baseline DB fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.interpretiveLedger) 'Rollback baseline interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $beforeStorage.dnmLedger) 'Rollback baseline publication ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.db) 'Rollback restart DB fingerprint is missing.'
Assert-True ($null -ne $afterStorage.interpretiveLedger) 'Rollback restart interpretive ledger fingerprint is missing.'
Assert-True ($null -ne $afterStorage.dnmLedger) 'Rollback restart publication ledger fingerprint is missing.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.7C'
    host = $HostName
    port = $Port
    proof = 'rollback-recovery-operator-parity'
    prerequisite = [ordered]@{
        closeoutA = $proofResult
    }
    target = [ordered]@{
        continuityTargetId = $continuityTargetId
        firstRevisionId = $firstRevisionId
        secondRevisionId = $secondRevisionId
        firstDnmRecordId = $firstDnmRecordId
        secondDnmRecordId = $secondDnmRecordId
    }
    restart = $restart
    assertions = [ordered]@{
        secondPublishLifecycleState = $secondPublished.published.publishedRecord.lifecycleState
        firstRecordBeforeRestart = $firstBeforeRecord.lifecycleState
        secondRecordBeforeRestart = $secondBeforeRecord.lifecycleState
        secondDeltaReviewStateBeforeRestart = $secondBeforeRecord.deltaReviewState
        currentActiveRecordBeforeRestart = $firstBeforeRestart.current
        currentActiveRecordAfterRestart = $firstAfterRestart.current
    }
    projection = [ordered]@{
        firstBeforeRestart = $firstBeforeRestart
        firstAfterRestart = $firstAfterRestart
        secondBeforeRestart = $secondBeforeRestart
        secondAfterRestart = $secondAfterRestart
    }
    storage = [ordered]@{
        beforeRestart = $beforeStorage
        afterRestart = $afterStorage
    }
}

$result | ConvertTo-Json -Depth 12
