param(
    [ValidateSet('SillyTavern', 'SillyBunny')]
    [string]$HostName = 'SillyTavern',
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

$hosts = @{
    SillyTavern = @{
        Name = 'SillyTavern'
        Root = 'D:\AI\Projects\SillyTavern'
        ProcessPath = 'C:\Program Files\nodejs\node.exe'
        ProcessArgs = @('server.js')
    }
    SillyBunny = @{
        Name = 'SillyBunny'
        Root = 'D:\AI\Projects\SillyBunny'
        ProcessPath = 'C:\Users\chris\.bun\bin\bun.exe'
        ProcessArgs = @('server.js')
    }
}

function Get-CsrfSession([int]$TargetPort) {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-RestMethod -Uri "http://127.0.0.1:$TargetPort/csrf-token" -WebSession $session -TimeoutSec 15
    return @{
        Session = $session
        Token = $csrf.token
    }
}

function Invoke-JsonRequest([string]$Method, [string]$Uri, $Session, [string]$Token, $Body = $null) {
    $parameters = @{
        Method = $Method
        Uri = $Uri
        WebSession = $Session
        Headers = @{ 'X-CSRF-Token' = $Token }
        ContentType = 'application/json'
        TimeoutSec = 30
    }
    if ($null -ne $Body) {
        $parameters.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
    }
    return Invoke-RestMethod @parameters
}

function Get-ListeningProcess([int]$TargetPort) {
    $connection = Get-NetTCPConnection -LocalPort $TargetPort -State Listen | Select-Object -First 1
    if (-not $connection) { return $null }
    return Get-Process -Id $connection.OwningProcess -ErrorAction Stop
}

function Restart-Host([hashtable]$HostSpec, [int]$TargetPort) {
    $before = Get-ListeningProcess -TargetPort $TargetPort
    if ($before) {
        Stop-Process -Id $before.Id -Force -ErrorAction Stop
    }
    Start-Process -FilePath $HostSpec.ProcessPath -ArgumentList $HostSpec.ProcessArgs -WorkingDirectory $HostSpec.Root -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Seconds 1
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$TargetPort/api/plugins/shardwright-memory/health" -TimeoutSec 2
            if ($health.ok) { break }
        } catch {}
    }
    $after = Get-ListeningProcess -TargetPort $TargetPort
    if (-not $after) {
        throw 'Restart did not produce a listening host process.'
    }
    if ($before -and $before.Id -eq $after.Id) {
        throw 'Restart did not replace the host process.'
    }
    return @{ beforeProcessId = $before.Id; afterProcessId = $after.Id }
}

function Get-EvidenceFingerprint($Interpretation) {
    return [ordered]@{
        interpretationRevisionId = $Interpretation.interpretationRevisionId
        evidenceFindingState = $Interpretation.evidenceFindingState
        evidenceFindings = @($Interpretation.evidenceFindings)
        groundingLinks = @($Interpretation.groundingLinks)
        proposalContentHash = $Interpretation.proposalContentHash
        reviewEnvelopeHash = $Interpretation.reviewEnvelopeHash
    }
}

$hostSpec = $hosts[$HostName]
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$interpretationId = "interp_c080d_restart_$stamp"
$revisionId = "interprev_c080d_restart_${stamp}_v1"
$scopeId = "scope_c080d_restart_$stamp"
$baseUri = "http://127.0.0.1:$Port/api/plugins/shardwright-memory"
$csrf = Get-CsrfSession -TargetPort $Port

$payload = @{
    interpretationId = $interpretationId
    interpretationRevisionId = $revisionId
    revisionReason = 'INITIAL_PROPOSAL'
    memoryScopeId = $scopeId
    memorySubjectId = 'character:jeep.png'
    type = 'ROLE_EVOLUTION'
    statement = 'Restart proof preserves persisted readable evidence and exact bindings.'
    assertionDomains = @('ROLE', 'AUTHORITY')
    sharedRelationshipAsserted = $false
    personalMeaningAsserted = $true
    materialParticipantEntityIds = @('character:jeep.png')
    groundingLinks = @(
        @{
            basisType = 'STRUCTURAL_RECORD'
            basisRecordId = 'decision:c0-8-0d-restart-proof'
            basisRecordVersion = 1
            basisRecordHash = "sha256:c080d-$stamp"
            speakerEntityId = 'character:jeep.png'
            groundingRole = 'PRIMARY'
            groundingAssessment = 'SUPPORTS'
        },
        @{
            basisType = 'SOURCE_OCCURRENCE'
            chatInstanceId = "chat_c080d_$stamp"
            messageId = "msg_c080d_$stamp"
            messageRevisionHash = "sha256:msg-c080d-$stamp"
            speakerEntityId = 'user:Chris'
            groundingRole = 'SUPPORTING'
            groundingAssessment = 'SUPPORTS'
        }
    )
    evidenceFindings = @(
        @{
            findingId = "evfind_c080d_$stamp"
            role = 'PRIMARY'
            summary = 'The governed candidate preserves readable evidence across host restart.'
            basisRefs = @('decision:c0-8-0d-restart-proof', "msg_c080d_$stamp")
            sourceLabel = 'C0.8.0D isolated restart proof'
            domains = @('AUTHORITY', 'ROLE')
            supportLevel = 'SUPPORTED'
        }
    )
    now = $stamp
}

$created = Invoke-JsonRequest -Method 'POST' -Uri "$baseUri/interpretive/candidates" -Session $csrf.Session -Token $csrf.Token -Body $payload
if (-not $created.ok -or $created.interpretation.evidenceFindingState -ne 'AVAILABLE') {
    throw 'Host did not persist an AVAILABLE readable finding candidate.'
}
$before = Get-EvidenceFingerprint -Interpretation $created.interpretation
$restart = Restart-Host -HostSpec $hostSpec -TargetPort $Port
$csrfAfter = Get-CsrfSession -TargetPort $Port
$loaded = Invoke-JsonRequest -Method 'GET' -Uri "$baseUri/interpretive/candidates/$revisionId" -Session $csrfAfter.Session -Token $csrfAfter.Token
$after = Get-EvidenceFingerprint -Interpretation $loaded.interpretation

$beforeJson = $before | ConvertTo-Json -Depth 20 -Compress
$afterJson = $after | ConvertTo-Json -Depth 20 -Compress
if ($beforeJson -ne $afterJson) {
    throw 'Readable findings or exact bindings changed across host restart.'
}

[ordered]@{
    proof = 'c0-8-0d-readable-findings-restart-parity'
    host = $HostName
    port = $Port
    restart = $restart
    interpretationRevisionId = $revisionId
    evidenceFindingState = $after.evidenceFindingState
    evidenceFindingCount = @($after.evidenceFindings).Count
    groundingLinkCount = @($after.groundingLinks).Count
    fingerprintStable = $true
    before = $before
    after = $after
} | ConvertTo-Json -Depth 20
