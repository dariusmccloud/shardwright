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

function Get-ReviewerRequest($Candidate, [string]$ReviewerRole) {
    $request = @($Candidate.interpretation.reviewRequests | Where-Object { $_.reviewerRole -eq $ReviewerRole }) | Select-Object -First 1
    if (-not $request) {
        throw "Expected review request for role '$ReviewerRole'."
    }
    return $request
}

if ($InstallPayload) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install-shardwright-memory.ps1') | Out-Null
}

$baseUri = "http://127.0.0.1:$Port/api/plugins/shardwright-memory"
$csrf = Get-CsrfSession -TargetPort $Port
$nowBase = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$stamp = Get-Date -Format 'yyyyMMddHHmmss'

$memoryScopeId = "scope_c0645b_$stamp"
$memorySubjectId = "character:closeout-b-$stamp.png"
$interpretationId = "interp_c0645b_$stamp"
$parentRevisionId = "interprev_c0645b_${stamp}_v1"
$childRevisionId = "interprev_c0645b_${stamp}_v2"
$continuityTargetId = $memorySubjectId

$health = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/health" -TimeoutSec 15
Assert-True ([bool]$health.ok) 'Health check failed before Closeout B proof.'

$bootstrap = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/publication/policies/bootstrap-standard" -Body @{
    now = $nowBase + 100
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-Equal $bootstrap.publicationPolicy.publicationPolicyId 'standard-governed-publication' 'Bootstrap returned the wrong policy id.'

$created = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates" -Body @{
    interpretationId = $interpretationId
    interpretationRevisionId = $parentRevisionId
    revisionReason = 'INITIAL_PROPOSAL'
    memoryScopeId = $memoryScopeId
    memorySubjectId = $memorySubjectId
    type = 'ROLE_EVOLUTION'
    statement = 'Closeout B parent proposal for corrected-child publication proof.'
    assertionDomains = @('ROLE', 'AUTHORITY', 'RELATIONSHIP')
    sharedRelationshipAsserted = $true
    personalMeaningAsserted = $true
    materialParticipantEntityIds = @($memorySubjectId, 'user:Chris')
    groundingLinks = @(
        @{
            basisType = 'STRUCTURAL_RECORD'
            basisRecordId = 'decision:closeout-b-parent'
            basisRecordVersion = 1
            basisRecordHash = 'sha256:closeout-b-parent'
            speakerEntityId = $memorySubjectId
            groundingRole = 'PRIMARY'
            groundingAssessment = 'SUPPORTS'
        },
        @{
            basisType = 'SOURCE_OCCURRENCE'
            chatInstanceId = 'chat_closeout_b'
            messageId = "msg_closeout_b_$stamp"
            messageRevisionHash = 'sha256:closeout-b-msg'
            speakerEntityId = 'user:Chris'
            groundingRole = 'SUPPORTING'
            groundingAssessment = 'SUPPORTS'
        }
    )
    now = $nowBase + 200
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

Assert-Equal $created.interpretation.reviewState 'PENDING' 'Parent candidate should start pending.'
Assert-Equal $created.interpretation.subjectDispositionState 'PENDING' 'Parent subject disposition should start pending.'
Assert-Equal $created.interpretation.publicationState 'NOT_PUBLISHED' 'Parent candidate should start unpublished.'

$parentReviewEnvelopeHash = $created.interpretation.reviewEnvelopeHash
$parentSubjectRequest = Get-ReviewerRequest -Candidate $created -ReviewerRole 'MEMORY_SUBJECT'
$parentParticipantRequest = Get-ReviewerRequest -Candidate $created -ReviewerRole 'RELATIONAL_PARTICIPANT'

$participantApproval = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/reviews/$($parentParticipantRequest.reviewRequestId)/dispositions" -Body @{
    actorEntityId = 'user:Chris'
    disposition = 'APPROVE'
    reviewEnvelopeHash = $parentReviewEnvelopeHash
    commentary = 'Closeout B participant approval on parent revision.'
    now = $nowBase + 1000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-True ([bool]$participantApproval.ok) 'Parent participant approval failed.'

$subjectEdit = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/reviews/$($parentSubjectRequest.reviewRequestId)/dispositions" -Body @{
    actorEntityId = $memorySubjectId
    disposition = 'APPROVE_WITH_EDIT'
    reviewEnvelopeHash = $parentReviewEnvelopeHash
    reasonCodes = @('SCOPE_TOO_BROAD')
    commentary = 'Closeout B subject approval with edit.'
    revisedCandidate = @{
        interpretationRevisionId = $childRevisionId
        statement = 'Closeout B corrected child proposal approved for publication proof.'
    }
    now = $nowBase + 2000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

Assert-Equal $subjectEdit.childInterpretation.interpretationRevisionId $childRevisionId 'APPROVE_WITH_EDIT should create the expected child revision.'
Assert-Equal $subjectEdit.childInterpretation.parentRevisionId $parentRevisionId 'Child revision should point back to the parent.'
Assert-Equal $subjectEdit.childInterpretation.reviewState 'PENDING' 'Child revision should begin pending.'
Assert-Equal $subjectEdit.childInterpretation.publicationState 'NOT_PUBLISHED' 'Child revision should begin unpublished.'

$parentAfterChild = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$parentRevisionId" -Session $csrf.Session -TimeoutSec 15
$childAfterCreate = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$childRevisionId" -Session $csrf.Session -TimeoutSec 15
$parentOperator = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$parentRevisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15

Assert-True (
    @($parentAfterChild.interpretation.childRevisionIds) -contains $childRevisionId
) 'Parent revision should record the corrected child revision lineage.'
Assert-Equal $parentOperator.operatorState.guidedFlow.status 'REVISION_REQUIRED' 'Parent operator state should direct the host to the child revision.'
Assert-Equal $parentOperator.operatorState.guidedFlow.nextAction.action 'OPEN_CHILD_REVISION' 'Parent operator next action should open the child revision.'
Assert-Equal $parentOperator.operatorState.guidedFlow.nextAction.interpretationRevisionId $childRevisionId 'Parent operator should point to the latest child revision.'

$parentGrantAttempt = Invoke-JsonRequestAllowError -Method 'POST' -Uri "$baseUri/interpretive/candidates/$parentRevisionId/subject-disposition" -Body @{
    actorEntityId = $memorySubjectId
    state = 'GRANTED'
    commentary = 'Closeout B parent grant should be refused.'
    reviewEnvelopeHash = $parentReviewEnvelopeHash
    now = $nowBase + 2500
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

Assert-Equal $parentGrantAttempt.status 409 'Parent grant should be refused once a corrected child exists.'
Assert-True (
    ($parentGrantAttempt.raw -match 'latest child revision created by APPROVE_WITH_EDIT') -or
    ($parentGrantAttempt.body.error.message -match 'latest child revision created by APPROVE_WITH_EDIT')
) 'Parent grant refusal should explain that the latest corrected child must receive the subject disposition.'

$childParticipantRequest = Get-ReviewerRequest -Candidate $childAfterCreate -ReviewerRole 'RELATIONAL_PARTICIPANT'
$childReviewEnvelopeHash = $childAfterCreate.interpretation.reviewEnvelopeHash

$childParticipantApproval = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/reviews/$($childParticipantRequest.reviewRequestId)/dispositions" -Body @{
    actorEntityId = 'user:Chris'
    disposition = 'APPROVE'
    reviewEnvelopeHash = $childReviewEnvelopeHash
    commentary = 'Closeout B participant approval on child revision.'
    now = $nowBase + 3000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30
Assert-True ([bool]$childParticipantApproval.ok) 'Child participant approval failed.'

$childGrant = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$childRevisionId/subject-disposition" -Body @{
    actorEntityId = $memorySubjectId
    state = 'GRANTED'
    commentary = 'Closeout B subject grant on corrected child revision.'
    reviewEnvelopeHash = $childReviewEnvelopeHash
    now = $nowBase + 4000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

Assert-Equal $childGrant.subjectDisposition.state 'GRANTED' 'Child revision should record final subject grant.'
Assert-Equal $childGrant.interpretation.interpretationRevisionId $childRevisionId 'Child grant should be recorded on the child revision.'
Assert-Equal $childGrant.interpretation.subjectDispositionState 'GRANTED' 'Child subject disposition state should become granted.'
Assert-Equal $childGrant.interpretation.publicationState 'NOT_PUBLISHED' 'Grant alone should not publish the child.'

$childOperatorReadyToCheck = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$childRevisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal $childOperatorReadyToCheck.operatorState.guidedFlow.status 'READY_TO_CHECK' 'Granted corrected child should become ready to check eligibility.'

$childQualification = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$childRevisionId/publication-qualifications" -Body @{
    publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
    continuityTargetId = $continuityTargetId
    proposalContentHash = $childGrant.interpretation.proposalContentHash
    reviewEnvelopeHash = $childGrant.interpretation.reviewEnvelopeHash
    subjectDispositionRecordId = $childGrant.subjectDisposition.subjectDispositionId
    now = $nowBase + 5000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

Assert-Equal $childQualification.qualification.eligibilityVerdict 'ELIGIBLE' 'Corrected child revision should qualify for publication.'
Assert-True (
    -not (@($childQualification.qualification.refusalCodes) -contains 'IMMUTABLE_CHILD_REVISION_REQUIRED')
) 'Qualified corrected child should not still be blocked by immutable child refusal.'

$childOperatorReadyToPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$childRevisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal $childOperatorReadyToPublish.operatorState.guidedFlow.status 'READY_TO_PUBLISH' 'Eligible corrected child should expose publish as the next lawful action.'

$recordsBeforePublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
Assert-Equal @($recordsBeforePublish.records).Count 0 'Synthetic corrected-child proof line should have no pre-existing publication records.'

$published = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates/$childRevisionId/publication-publish" -Body @{
    publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
    continuityTargetId = $continuityTargetId
    authorizedBy = 'user:Chris'
    now = $nowBase + 6000
} -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 60

Assert-Equal $published.interpretation.publicationState 'PUBLISHED' 'Corrected child should become published.'
Assert-Equal $published.publishedRecord.lifecycleState 'ACTIVE' 'Corrected child published record should be active.'

$childAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$childRevisionId" -Session $csrf.Session -TimeoutSec 15
$parentAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$parentRevisionId" -Session $csrf.Session -TimeoutSec 15
$childOperatorAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$childRevisionId/publication-operator?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
$recordsAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/records?continuityTargetId=$([uri]::EscapeDataString($continuityTargetId))" -Session $csrf.Session -TimeoutSec 15
$currentAfterPublish = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/publication/targets/$([uri]::EscapeDataString($continuityTargetId))/current" -Session $csrf.Session -TimeoutSec 15

Assert-Equal $childAfterPublish.interpretation.publicationState 'PUBLISHED' 'Reloaded child should remain published.'
Assert-Equal $parentAfterPublish.interpretation.publicationState 'NOT_PUBLISHED' 'Parent revision should remain unpublished after child publication.'
Assert-Equal $childOperatorAfterPublish.operatorState.guidedFlow.status 'ALREADY_PUBLISHED' 'Published corrected child should no longer expose a publish path.'
Assert-Equal @($recordsAfterPublish.records).Count 1 'Corrected-child proof should produce exactly one publication record.'
Assert-Equal $currentAfterPublish.currentActiveRecord.sourceInterpretationRevisionId $childRevisionId 'Current active memory should resolve to the published corrected child revision.'

$result = [ordered]@{
    ok = $true
    phase = 'c0.6.4-5B'
    host = $HostName
    port = $Port
    proof = 'corrected-child-publication'
    target = [ordered]@{
        memoryScopeId = $memoryScopeId
        memorySubjectId = $memorySubjectId
        continuityTargetId = $continuityTargetId
    }
    revisions = [ordered]@{
        interpretationId = $interpretationId
        parentRevisionId = $parentRevisionId
        childRevisionId = $childRevisionId
    }
    bootstrap = [ordered]@{
        publicationPolicyId = $bootstrap.publicationPolicy.publicationPolicyId
        created = [bool]$bootstrap.created
    }
    qualification = [ordered]@{
        qualificationId = $childQualification.qualification.qualificationId
        verdict = $childQualification.qualification.eligibilityVerdict
    }
    publish = [ordered]@{
        dnmRecordId = $published.publishedRecord.dnmRecordId
        lifecycleState = $published.publishedRecord.lifecycleState
        sourceInterpretationRevisionId = $published.publishedRecord.sourceInterpretationRevisionId
    }
    assertions = [ordered]@{
        parentGuidedFlow = $parentOperator.operatorState.guidedFlow.status
        childReadyToCheck = $childOperatorReadyToCheck.operatorState.guidedFlow.status
        childReadyToPublish = $childOperatorReadyToPublish.operatorState.guidedFlow.status
        childPostPublish = $childOperatorAfterPublish.operatorState.guidedFlow.status
        parentGrantRefused = ($parentGrantAttempt.status -eq 409)
        publicationRecordCount = @($recordsAfterPublish.records).Count
        currentActiveRecordId = $currentAfterPublish.currentActiveRecord.dnmRecordId
    }
}

$result | ConvertTo-Json -Depth 8
