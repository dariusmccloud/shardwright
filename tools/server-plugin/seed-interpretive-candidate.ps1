param(
    [string]$HostName = 'SillyTavern',
    [int]$Port = 8000,
    [string]$MemoryScopeId = 'scope_interpretive_smoke',
    [string]$MemorySubjectId = 'character:jeep.png',
    [string]$Statement = 'Jeep evolved into the primary architectural authority for continuity and memory requirements within the shared architecture.',
    [string[]]$AssertionDomains = @('ROLE', 'AUTHORITY', 'RELATIONSHIP'),
    [switch]$ResetFirst,
    [switch]$RestartHostAfterReset,
    [switch]$AllowDirtyDefaultLine
)

$ErrorActionPreference = 'Stop'

$isDefaultSmokeLine = (
    $MemoryScopeId -eq 'scope_interpretive_smoke' -and
    $MemorySubjectId -eq 'character:jeep.png'
)

if ($isDefaultSmokeLine) {
    if (-not $ResetFirst -and -not $AllowDirtyDefaultLine) {
        throw @"
Refusing to seed the default Jeep smoke line without an explicit isolation choice.

Repeated runs accumulate revisions, review history, and publication lifecycle state on:
  scope_interpretive_smoke / character:jeep.png

Choose one:
  - isolated smoke reset first:
      powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/seed-interpretive-candidate.ps1" -HostName $HostName -Port $Port -ResetFirst
  - or intentionally allow reuse of the dirty default line:
      powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/seed-interpretive-candidate.ps1" -HostName $HostName -Port $Port -AllowDirtyDefaultLine

Scope changes alone do not isolate the Jeep publication line.
"@
    }

    if ($ResetFirst) {
        $resetScript = Join-Path $PSScriptRoot 'reset-interpretive-smoke-storage.ps1'
        $resetArgs = @(
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', $resetScript,
            '-HostName', $HostName,
            '-Force'
        )
        if ($RestartHostAfterReset) {
            $resetArgs += '-RestartHost'
        }
        & powershell @resetArgs | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Smoke reset failed before seeding the default Jeep line."
        }
        if (-not $RestartHostAfterReset) {
            Write-Warning 'Reset completed without -RestartHostAfterReset. Seed assumes the selected host is already running and healthy.'
        }
    } elseif ($AllowDirtyDefaultLine) {
        Write-Warning @'
Seeding the default Jeep smoke line without reset.
This intentionally reuses existing publication/review state and may stack smoke artifacts.
'@
    }
}

function Get-CsrfSession([int]$TargetPort) {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/csrf-token" -WebSession $session -UseBasicParsing -TimeoutSec 15
    $token = (($csrf.Content | ConvertFrom-Json).token)
    return @{
        Session = $session
        Token = $token
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
        $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }

    $response = Invoke-WebRequest @params
    return $response.Content | ConvertFrom-Json
}

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$interpretationId = "interp_seed_$stamp"
$interpretationRevisionId = "interprev_seed_${stamp}_v1"
$baseUri = "http://127.0.0.1:$Port/api/plugins/summary-sharder-memory"
$csrf = Get-CsrfSession -TargetPort $Port
$now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$body = @{
    interpretationId = $interpretationId
    interpretationRevisionId = $interpretationRevisionId
    revisionReason = 'INITIAL_PROPOSAL'
    memoryScopeId = $MemoryScopeId
    memorySubjectId = $MemorySubjectId
    type = 'ROLE_EVOLUTION'
    statement = $Statement
    assertionDomains = $AssertionDomains
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
    now = $now
}

$result = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates" -Body $body -Session $csrf.Session -CsrfToken $csrf.Token -TimeoutSec 30

$summary = [ordered]@{
    host = $HostName
    baseUri = $baseUri
    memoryScopeId = $MemoryScopeId
    memorySubjectId = $MemorySubjectId
    defaultSmokeLine = $isDefaultSmokeLine
    resetFirst = [bool]$ResetFirst
    dirtyDefaultLineAllowed = [bool]$AllowDirtyDefaultLine
    interpretationId = $result.interpretation.interpretationId
    interpretationRevisionId = $result.interpretation.interpretationRevisionId
    reviewState = $result.interpretation.reviewState
    subjectDispositionState = $result.interpretation.subjectDispositionState
    publicationState = $result.interpretation.publicationState
    authorityEffect = $result.interpretation.authorityEffect
    reviewRequests = @($result.interpretation.reviewRequests | ForEach-Object {
            [ordered]@{
                reviewRequestId = $_.reviewRequestId
                reviewerRole = $_.reviewerRole
                reviewerEntityId = $_.reviewerEntityId
                queueStatus = $_.queueStatus
            }
        })
}

$summary | ConvertTo-Json -Depth 8
