/*
  S3 sync script - uploads all files from backend/uploads to the configured S3 bucket.
  Usage:
    Set AWS env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) and S3_BUCKET.
    Then run: node scripts/s3_sync.js
*/

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';

if (!bucket) {
  console.error('S3_BUCKET env var is required');
  process.exit(1);
}

AWS.config.update({ region });
const s3 = new AWS.S3();

const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');

async function uploadFile(filePath, key) {
  const body = fs.createReadStream(filePath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ACL: 'public-read'
  };
  return s3.upload(params).promise();
}

async function main() {
  try {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      const full = path.join(uploadsDir, f);
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      const key = f; // keep same filename
      console.log('Uploading', f, '->', `${bucket}/${key}`);
      const res = await uploadFile(full, key);
      console.log('OK:', res.Location);
    }
    console.log('All done.');
  } catch (err) {
    console.error('Error uploading files:', err);
    process.exit(1);
  }
}

main();
