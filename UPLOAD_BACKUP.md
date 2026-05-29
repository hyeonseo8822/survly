# Upload Backup Plan

This project keeps uploads on local disk and backs them up on a schedule.

## Recommended flow

1. Keep `backend/uploads/` as the live upload directory.
2. Run `scripts/backup_uploads.ps1` on a schedule.
3. Use `rclone` to sync the snapshot to a remote such as Google Drive, Dropbox, or Backblaze B2.

## One-time setup

Install `rclone` and create a remote, for example `gdrive:`.

## Manual backup

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup_uploads.ps1 -RemoteTarget 'gdrive:survly-uploads'
```

## Local snapshot only

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backup_uploads.ps1
```

## Schedule a task

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install_upload_backup_task.ps1 -RemoteTarget 'gdrive:survly-uploads'
```

## Restore

Copy the latest snapshot back into `backend/uploads/`, then run the existing restore/backfill script if needed.
