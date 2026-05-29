param(
    [string]$TaskName = 'Survly Upload Backup',
    [string]$Schedule = 'Daily',
    [string]$At = '02:00',
    [string]$RemoteTarget = ''
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scriptPath = Join-Path $repoRoot 'scripts\backup_uploads.ps1'

$actionArgs = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $scriptPath
)

if ($RemoteTarget) {
    $actionArgs += @('-RemoteTarget', $RemoteTarget)
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ($actionArgs -join ' ')
$trigger = New-ScheduledTaskTrigger -Daily -At $At

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
} catch {
    # Ignore if the task does not exist.
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Description 'Back up Survly uploads to local snapshots and optional remote storage.' | Out-Null

Write-Host "Scheduled task '$TaskName' registered for $Schedule at $At."
if ($RemoteTarget) {
    Write-Host "Remote target: $RemoteTarget"
}
