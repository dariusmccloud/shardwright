<#
.SYNOPSIS
    Links this repository into local SillyTavern / SillyBunny installs for development.

.DESCRIPTION
    For each host folder, creates (or repairs) three symbolic links that point back into
    this repository, so every host runs the working copy directly:

        <host>\plugins\shardwright-memory                        -> tools\server-plugin\shardwright-memory
        <host>\plugins\charmemory-continuity-bridge              -> tools\charmemory-continuity-bridge
        <host>\public\scripts\extensions\third-party\Shardwright -> (repository root)

    A link that already points to the right place is left alone. A link that points
    somewhere else is replaced. A real folder or file in the way is skipped with a
    warning unless -ReplaceRealFolders is given, because replacing it deletes its contents.
    The new link is always created first under a temporary name; nothing already at the
    destination is removed unless that succeeds.

    Restart each host afterwards so it loads the linked plugin and extension.
    This is the development alternative to tools\server-plugin\install-shardwright-memory.ps1,
    which copies the plugin instead of linking it.

.PARAMETER Instances
    Host root folders to link into. Defaults to Chris's local installs.

.PARAMETER ReplaceRealFolders
    Delete a real (non-link) folder or file found at a destination and link in its place.

.PARAMETER LinkType
    SymbolicLink (default) or Junction. Junctions work for these folder links without
    Developer Mode or an elevated PowerShell.

.EXAMPLE
    .\tools\dev\link-local-hosts.ps1 -WhatIf
    Shows what would be linked or replaced, without changing anything.

.EXAMPLE
    .\tools\dev\link-local-hosts.ps1 -Instances 'E:\SillyTavern'
    Links a different host.

.EXAMPLE
    .\tools\dev\link-local-hosts.ps1 -LinkType Junction
    Uses junctions, which need no elevation.

.NOTES
    Creating symbolic links on Windows needs Developer Mode or an elevated PowerShell;
    junctions do not.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string[]]$Instances = @(
        'D:\AI\Projects\SillyTavern'
        'D:\AI\Projects\SillyBunny'
        'D:\SillyBunny'
    ),
    [switch]$ReplaceRealFolders,
    [ValidateSet('SymbolicLink', 'Junction')]
    [string]$LinkType = 'SymbolicLink'
)

$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path

# Source = authoritative project content; Destination = where the link appears in a host.
$Links = @(
    @{ Source = Join-Path $ProjectRoot 'tools\server-plugin\shardwright-memory'; Destination = 'plugins\shardwright-memory' }
    @{ Source = Join-Path $ProjectRoot 'tools\charmemory-continuity-bridge';     Destination = 'plugins\charmemory-continuity-bridge' }
    @{ Source = $ProjectRoot;                                                    Destination = 'public\scripts\extensions\third-party\Shardwright' }
)

function Get-NormalizedPath([string]$Path, [string]$RelativeTo) {
    if (-not [IO.Path]::IsPathRooted($Path)) { $Path = Join-Path $RelativeTo $Path }
    [IO.Path]::GetFullPath($Path).TrimEnd('\')
}

foreach ($Instance in $Instances) {
    if (-not (Test-Path -LiteralPath $Instance -PathType Container)) {
        Write-Warning "Host folder not found, skipped: $Instance"
        continue
    }

    foreach ($Link in $Links) {
        $Source      = $Link.Source
        $Destination = Join-Path $Instance $Link.Destination

        if (-not (Test-Path -LiteralPath $Source)) {
            Write-Error "Source does not exist: $Source"
            continue
        }

        $Existing = Get-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue
        $Action = "Link to $Source"
        if ($Existing) {
            if ($Existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                $ExistingTarget = @($Existing.Target)[0]
                $LinkParent     = Split-Path -Parent $Destination
                if ((Get-NormalizedPath $ExistingTarget $LinkParent) -ieq (Get-NormalizedPath $Source $LinkParent)) {
                    Write-Host "OK:      $Destination"
                    Write-Host "         -> $Source"
                    continue
                }
                Write-Warning "Existing link points somewhere else: $Destination"
                Write-Warning "  Current: $ExistingTarget"
                Write-Warning "  Correct: $Source"
                $Action = "Replace link with link to $Source"
            }
            elseif (-not $ReplaceRealFolders) {
                Write-Warning "Real folder/file in the way, skipped (use -ReplaceRealFolders to delete it and link): $Destination"
                continue
            }
            else {
                $Action = "Delete real folder/file and replace with link to $Source"
            }
        }
        if (-not $PSCmdlet.ShouldProcess($Destination, $Action)) { continue }

        $DestinationParent = Split-Path -Parent $Destination
        if (-not (Test-Path -LiteralPath $DestinationParent)) {
            New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null
        }

        # Create the new link beside the destination first; touch nothing existing unless that works.
        $Pending = "$Destination.link-pending"
        if (Test-Path -LiteralPath $Pending) { Remove-Item -LiteralPath $Pending -Force }
        try {
            New-Item -ItemType $LinkType -Path $Pending -Target $Source -ErrorAction Stop | Out-Null
        }
        catch {
            Write-Error "Could not create $LinkType at ${Destination}: $($_.Exception.Message) Nothing was changed there."
            continue
        }

        if ($Existing) {
            # Removing a link removes only the link, never the folder it points to.
            if ($Existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                Remove-Item -LiteralPath $Destination -Force
            }
            else {
                Remove-Item -LiteralPath $Destination -Force -Recurse
            }
        }
        Rename-Item -LiteralPath $Pending -NewName (Split-Path -Leaf $Destination)
        Write-Host "LINKED:  $Destination"
        Write-Host "         -> $Source"
    }
}
