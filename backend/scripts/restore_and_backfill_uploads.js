#!/usr/bin/env node
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { resolveUploadDataUrl } = require('../utils/uploadResolver');

async function copyBackupFiles(backupDir, uploadsDir) {
  console.log(`Copying files from backup: ${backupDir} -> ${uploadsDir}`);
  await fs.mkdir(uploadsDir, { recursive: true });
  const items = await fs.readdir(backupDir, { withFileTypes: true });
  let copied = 0;
  for (const it of items) {
    if (!it.isFile()) continue;
    const src = path.join(backupDir, it.name);
    const dest = path.join(uploadsDir, it.name);
    try {
      await fs.copyFile(src, dest);
      copied++;
    } catch (err) {
      console.warn(`Failed to copy ${src} -> ${dest}: ${err.message}`);
    }
  }
  console.log(`Copied ${copied} files.`);
  return copied;
}

async function backfill(mongoUri, dryRun = false) {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  const User = require('../models/User');
  const Survey = require('../models/Survey');

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fssync.existsSync(uploadsDir)) {
    console.warn(`Uploads directory does not exist: ${uploadsDir}`);
  }

  // Backfill users
  console.log('Scanning users for avatar backfill...');
  const users = await User.find({}).select('_id userId avatarUrl').lean();
  let userUpdated = 0;
  for (const u of users) {
    const raw = u.avatarUrl || '';
    if (!raw) continue;
    try {
      const resolved = await resolveUploadDataUrl(raw);
      if (resolved && resolved !== raw) {
        if (!dryRun) {
          await User.updateOne({ _id: u._id }, { $set: { avatarUrl: resolved } });
        }
        userUpdated++;
        console.log(`Backfilled avatar for user ${u.userId}`);
      }
    } catch (err) {
      console.warn(`Error resolving avatar for ${u.userId}: ${err.message}`);
    }
  }

  // Backfill surveys
  console.log('Scanning surveys for image backfill...');
  const surveys = await Survey.find({}).select('_id userId title img link').lean();
  let surveyUpdated = 0;
  for (const s of surveys) {
    const raw = s.img || '';
    if (!raw || raw === 'default_img') continue;
    try {
      const resolved = await resolveUploadDataUrl(raw);
      if (resolved && resolved !== raw) {
        if (!dryRun) {
          await Survey.updateOne({ _id: s._id }, { $set: { img: resolved } });
        }
        surveyUpdated++;
        console.log(`Backfilled survey image for ${s._id} (${s.title || 'no-title'})`);
      }
    } catch (err) {
      console.warn(`Error resolving survey image for ${s._id}: ${err.message}`);
    }
  }

  console.log(`Backfill complete. Users updated: ${userUpdated}, Surveys updated: ${surveyUpdated}`);
  await mongoose.disconnect();
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.log('Usage: node restore_and_backfill_uploads.js <mongoUri> <backupDir> [--dry-run]');
    process.exit(1);
  }

  const mongoUri = argv[0];
  const backupDir = path.resolve(argv[1]);
  const dryRun = argv.includes('--dry-run');

  const uploadsDir = path.join(__dirname, '..', 'uploads');

  if (!fssync.existsSync(backupDir)) {
    console.error(`Backup directory does not exist: ${backupDir}`);
    process.exit(2);
  }

  try {
    const copied = await copyBackupFiles(backupDir, uploadsDir);
    if (copied === 0) {
      console.warn('No files copied from backup. Backfill will only resolve remote or already-present files.');
    }

    await backfill(mongoUri, dryRun);
    console.log('Restore and backfill finished.');
  } catch (err) {
    console.error('Error during restore/backfill:', err && err.stack ? err.stack : err);
    process.exit(3);
  }
}

if (require.main === module) main();
