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

function Invoke-NodeTestProof {
    param(
        [string]$Name,
        [string]$Pattern,
        [string]$TestFile
    )

    $args = @(
        '--test',
        '--test-name-pattern', $Pattern,
        $TestFile
    )

    $output = Invoke-CommandChecked -FilePath 'node' -ArgumentList $args -FailureMessage "$Name proof failed."
    return [ordered]@{
        name = $Name
        command = "node $($args -join ' ')"
        output = ($output -join [Environment]::NewLine)
    }
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $repoRoot
try {
    $closeoutCPath = Join-Path $PSScriptRoot 'prove-c0-6-4-5c.ps1'
    $freshInstallPath = Join-Path $PSScriptRoot 'prove-c0-6-7c-fresh-install.ps1'
    $correctedChildPath = Join-Path $PSScriptRoot 'prove-c0-6-7c-corrected-child.ps1'
    $rollbackRecoveryPath = Join-Path $PSScriptRoot 'prove-c0-6-7c-rollback-recovery.ps1'

    $closeoutCArgs = @(
        '-HostName', $HostName,
        '-Port', $Port
    )
    if ($InstallPayload) {
        $closeoutCArgs += '-InstallPayload'
    }

    $freshInstall = Invoke-PowerShellJsonProof `
        -ScriptPath $freshInstallPath `
        -Arguments $closeoutCArgs `
        -FailureMessage 'C0.6.7C fresh-install matrix proof failed.'

    $hostRestartParity = Invoke-PowerShellJsonProof `
        -ScriptPath $closeoutCPath `
        -Arguments $closeoutCArgs `
        -FailureMessage 'C0.6.7C host restart/replay parity proof failed.'

    $correctedChildRestartParity = Invoke-PowerShellJsonProof `
        -ScriptPath $correctedChildPath `
        -Arguments $closeoutCArgs `
        -FailureMessage 'C0.6.7C corrected-child restart/replay parity proof failed.'

    $rollbackRecoveryParity = Invoke-PowerShellJsonProof `
        -ScriptPath $rollbackRecoveryPath `
        -Arguments $closeoutCArgs `
        -FailureMessage 'C0.6.7C rollback/recovery operator parity proof failed.'

    $upgradeReplay = Invoke-NodeTestProof `
        -Name 'upgrade-replay-hardening' `
        -Pattern 'upgrade replay route restores governed published state from ledgers without a live projection|upgrade replay route preserves published truth from carried pre-v1 host data|upgrade replay route preserves corrected-child published truth from carried pre-v1 host data|upgrade replay route fails closed when the interpretive ledger contains malformed JSON|upgrade replay route fails closed when the publication ledger contains malformed JSON|upgrade replay route fails closed when publication ledger is restored without the governance ledger|upgrade replay route refuses backup-required hosts before mutating governed state|upgrade replay route refuses unsupported-schema hosts before mutating governed state|upgrade replay route refuses missing live-authority references before mutating governed state' `
        -TestFile 'tools/server-plugin/shardwright-memory/upgrade.test.mjs'

    $packagedParity = Invoke-NodeTestProof `
        -Name 'packaged-publication-parity' `
        -Pattern 'packaged interpretive publication flow succeeds under Node from staged payload only|packaged interpretive publication flow succeeds under Bun from staged payload only' `
        -TestFile 'tools/server-plugin/shardwright-memory/package.test.mjs'

    $result = [ordered]@{
        ok = $true
        phase = 'c0.6.7C'
        slice = 'bundled-release-proof-entrypoint-v2'
        host = $HostName
        port = $Port
        coverage = @(
            'fresh install from empty host',
            'governed pre-v1.0 carried host data',
            'restart after publication',
            'corrected child publication after replay/restart',
            'rollback and recovery operator truth after replay/restart',
            'projection rebuild after replay',
            'packaged host parity',
            'backup-required fail-closed refusal',
            'unsupported-version fail-closed refusal',
            'missing live-authority reference fail-closed refusal',
            'malformed interpretive ledger fail-closed refusal',
            'malformed publication ledger fail-closed refusal',
            'publication-ledger incompleteness fail-closed refusal'
        )
        proofs = [ordered]@{
            freshInstall = $freshInstall
            hostRestartParity = $hostRestartParity
            correctedChildRestartParity = $correctedChildRestartParity
            rollbackRecoveryParity = $rollbackRecoveryParity
            upgradeReplay = $upgradeReplay
            packagedParity = $packagedParity
        }
        remaining = @()
    }

    $result | ConvertTo-Json -Depth 12
} finally {
    Pop-Location
}
