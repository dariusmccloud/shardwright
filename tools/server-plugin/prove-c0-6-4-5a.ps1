param(
    [ValidateSet('SillyTavern', 'SillyBunny')]
    [string]$HostName = 'SillyTavern',
    [int]$Port = 8000,
    [switch]$InstallPayload
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

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

function Invoke-JsonRequestAllowError {
    param(
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
        [string]$CsrfToken = $null,
        [int]$TimeoutSec = 30
    )

    try {
        return @{
            status = 200
            body = Invoke-JsonRequest -Method $Method -Uri $Uri -Body $Body -Session $Session -CsrfToken $CsrfToken -TimeoutSec $TimeoutSec
        }
    } catch {
        $status = 500
        try {
            $status = [int]$_.Exception.Response.StatusCode.value__
        } catch {}
        $raw = $_.ErrorDetails.Message
        $parsed = $null
        if ($raw) {
            try {
                $parsed = $raw | ConvertFrom-Json
            } catch {}
        }
        return @{
            status = $status
            body = $parsed
            raw = $raw
        }
    }
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

if ($InstallPayload) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install-summary-sharder-memory.ps1') | Out-Null
}

$seedScript = Join-Path $PSScriptRoot 'seed-interpretive-candidate.ps1'
$seedOutput = @(
    & powershell -NoProfile -ExecutionPolicy Bypass -File $seedScript -HostName $HostName -Port $Port -ResetFirst -RestartHostAfterReset
)
if ($LASTEXITCODE -ne 0) {
    throw 'Seed helper failed during Closeout A proof.'
}
$seed = ($seedOutput -join '') | ConvertFrom-Json

Assert-True ([bool]$seed.defaultSmokeLine) 'Closeout A proof must run on the default Jeep smoke line.'
Assert-Equal $seed.memoryScopeId 'scope_interpretive_smoke' 'Unexpected smoke scope.'
Assert-Equal $seed.memorySubjectId 'character:jeep.png' 'Unexpected smoke subject.'
Assert-Equal $seed.reviewState 'PENDING' 'Seeded candidate should begin with pending reviews.'
Assert-Equal $seed.subjectDispositionState 'PENDING' 'Seeded candidate should begin with pending subject disposition.'
Assert-Equal $seed.publicationState 'NOT_PUBLISHED' 'Seeded candidate should not start published.'

$baseUri = $seed.baseUri
$csrf = Get-CsrfSession -TargetPort $Port
$continuityTargetId = $seed.memorySubjectId
$revisionId = $seed.interpretationRevisionId
$nowBase = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$health = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/health" -TimeoutSec 15
Assert-True ([bool]$health.ok) 'Health check failed before Closeout A proof.'

$initialOperator = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal $initialOperator.operatorState.guidedFlow.status 'SETUP_REQUIRED' 'Fresh seeded candidate should require publication setup first.'

$bootstrap = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/policies/bootstrap-standard" -Body @{
    now = $nowBase + 100
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $bootstrap.publicationPolicy.publicationPolicyId 'standard-governed-publication' 'Bootstrap returned the wrong policy id.'

$bootstrapReplay = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/policies/bootstrap-standard" -Body @{
    now = $nowBase + 200
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-True ([bool]$bootstrapReplay.reused) 'Second standard bootstrap should reuse the equivalent policy.'

$candidateAfterBootstrap = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId" -Session $csrf.Session -TimeoutSec 15
$reviewEnvelopeHash = $candidateAfterBootstrap.interpretation.reviewEnvelopeHash

foreach ($reviewRequest in @($candidateAfterBootstrap.interpretation.reviewRequests)) {
    $actorEntityId = Get-ReviewerActorId -ReviewerRole $reviewRequest.reviewerRole -ReviewerEntityId $reviewRequest.reviewerEntityId
    $reviewNow = switch ($reviewRequest.reviewerRole) {
        'MEMORY_SUBJECT' { $nowBase + 1000 }
        'RELATIONAL_PARTICIPANT' { $nowBase + 2000 }
        default { $nowBase + 2500 }
    }
    $disposition = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/reviews/$($reviewRequest.reviewRequestId)/dispositions" -Body @{
        actorEntityId = $actorEntityId
        disposition = 'APPROVE'
        reviewEnvelopeHash = $reviewEnvelopeHash
        commentary = "Closeout A proof approval for $($reviewRequest.reviewerRole)."
        now = $reviewNow
    } -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
    Assert-True ([bool]$disposition.ok) "Review disposition failed for $($reviewRequest.reviewerRole)."
}

$granted = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$revisionId/subject-disposition" -Body @{
    actorEntityId = 'character:jeep.png'
    state = 'GRANTED'
    commentary = 'Granted for Closeout A clean-root publication proof.'
    reviewEnvelopeHash = $reviewEnvelopeHash
    now = $nowBase + 3000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $granted.subjectDisposition.state 'GRANTED' 'Subject disposition should be granted before qualification.'

$operatorReadyToCheck = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal $operatorReadyToCheck.operatorState.guidedFlow.status 'READY_TO_CHECK' 'Granted candidate should become ready to check eligibility.'

$qualification = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-qualifications" -Body @{
    publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
    continuityTargetId = $continuityTargetId
    proposalContentHash = $granted.interpretation.proposalContentHash
    reviewEnvelopeHash = $granted.interpretation.reviewEnvelopeHash
    subjectDispositionRecordId = $granted.subjectDisposition.subjectDispositionId
    now = $nowBase + 4000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $qualification.qualification.eligibilityVerdict 'ELIGIBLE' 'Clean seeded root revision should qualify for publication.'

$operatorReadyToPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal $operatorReadyToPublish.operatorState.guidedFlow.status 'READY_TO_PUBLISH' 'Eligible candidate should expose publish as the next lawful action.'

$recordsBeforePublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal @($recordsBeforePublish.records).Count 0 'Fresh reset should leave no pre-existing publication records on the default smoke line.'

$currentBeforePublish = Invoke-JsonRequestAllowError -Method 'GET' -Uri "$baseUri/interpretive/publication/targets/$([uri]::EscapeDataString($continuityTargetId))/current" -Session $csrf.Session -TimeoutSec 15
Assert-True (($currentBeforePublish.status -eq 404) -or (-not $currentBeforePublish.body.currentActiveRecord)) 'Fresh reset should leave no current active published record.'

$published = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-publish" -Body @{
    publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
    continuityTargetId = $continuityTargetId
    authorizedBy = 'user:Chris'
    now = $nowBase + 5000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 60
Assert-Equal $published.publishedRecord.lifecycleState 'ACTIVE' 'Published record should be active on a clean line.'
Assert-Equal $published.interpretation.publicationState 'PUBLISHED' 'Candidate should move to published after publish.'

$candidateAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId" -Session $csrf.Session -TimeoutSec 15
$operatorAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
$recordsAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
$currentAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/targets/$([uri]::EscapeDataString($continuityTargetId))/current" -Session $csrf.Session -TimeoutSec 15

Assert-Equal $candidateAfterPublish.interpretation.publicationState 'PUBLISHED' 'Reloaded candidate should remain published.'
Assert-Equal $operatorAfterPublish.operatorState.guidedFlow.status 'ALREADY_PUBLISHED' 'Published candidate should no longer expose bootstrap, eligibility, or publish actions.'
Assert-True ($null -eq $operatorAfterPublish.operatorState.guidedFlow.nextAction) 'Published candidate should not expose a further next action.'
Assert-Equal @($recordsAfterPublish.records).Count 1 'Clean seeded candidate should produce exactly one publication record.'
Assert-Equal $currentAfterPublish.currentActiveRecord.dnmRecordId $published.publishedRecord.dnmRecordId 'Current active record should resolve to the single published record.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.4-5A'
    host = $HostName
    port = $Port
    proof = 'publication-data-hygiene'
    seed = [ordered]@{
        memoryScopeId = $seed.memoryScopeId
        memorySubjectId = $seed.memorySubjectId
        interpretationId = $seed.interpretationId
        interpretationRevisionId = $seed.interpretationRevisionId
    }
    bootstrap = [ordered]@{
        publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
        created = [bool]$bootstrap.created
        replayReused = [bool]$bootstrapReplay.reused
    }
    qualification = [ordered]@{
        qualificationId = $qualification.qualification.qualificationId
        verdict = $qualification.qualification.eligibilityVerdict
    }
    publish = [ordered]@{
        dnmRecordId = $published.publishedRecord.dnmRecordId
        lifecycleState = $published.publishedRecord.lifecycleState
        publicationState = $published.interpretation.publicationState
    }
    assertions = [ordered]@{
        initialGuidedFlow = $initialOperator.operatorState.guidedFlow.status
        preQualificationGuidedFlow = $operatorReadyToCheck.operatorState.guidedFlow.status
        prePublishGuidedFlow = $operatorReadyToPublish.operatorState.guidedFlow.status
        postPublishGuidedFlow = $operatorAfterPublish.operatorState.guidedFlow.status
        publicationRecordCount = @($recordsAfterPublish.records).Count
        currentActiveRecordId = $currentAfterPublish.currentActiveRecord.dnmRecordId
    }
}

$result | ConvertTo-Json -Depth 8
