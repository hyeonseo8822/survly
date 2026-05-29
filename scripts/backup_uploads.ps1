param(
    [string]$SourcePath = (Join-Path $PSScriptRoot '..\backend\uploads'),
    [string]$LocalBackupRoot = (Join-Path $PSScriptRoot '..\backups\uploads'),
    [string]$RemoteTarget = '',
    [switch]$NoLocalCopy,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Text) {
    Write-Host ''
    Write-Host '=== ' $Text ' ==='
}

$source = (Resolve-Path $SourcePath -ErrorAction SilentlyContinue).Path
if (-not $source) {
    throw "SourcePath not found: $SourcePath"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$snapshotRoot = Join-Path $LocalBackupRoot $timestamp

Write-Section "Backup source"
Write-Host "Source: $source"
Write-Host "Snapshot: $snapshotRoot"

if (-not $NoLocalCopy) {
    Write-Section 'Creating local snapshot'
    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $snapshotRoot | Out-Null
        Copy-Item -Path (Join-Path $source '*') -Destination $snapshotRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host 'Local snapshot prepared.'
}

if ($RemoteTarget) {
    Write-Section 'Remote sync'
    $rclone = Get-Command rclone -ErrorAction SilentlyContinue
    if (-not $rclone) {
        throw 'rclone is not installed or not available in PATH. Install rclone to use -RemoteTarget.'
    }

    $remoteSource = if ($NoLocalCopy) { $source } else { $snapshotRoot }
    $args = @(
        'sync',
        $remoteSource,
        $RemoteTarget,
        '--create-empty-src-dirs'
    )

    if ($DryRun) {
        $args += '--dry-run'
    }

    Write-Host 'Running: rclone ' ($args -join ' ')
    & $rclone.Source @args
}

Write-Section 'Done'
Write-Host 'Backup completed successfully.'
