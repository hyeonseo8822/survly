const express = require('express');
const router = express.Router();

// POST /api/uploads/presign
// Body: { fileName: string, contentType: string }
router.post('/uploads/presign', async (req, res) => {
  const { fileName, contentType } = req.body || {};
  if (!fileName || !contentType) return res.status(400).json({ success: false, message: 'fileName and contentType required' });

  if (!process.env.S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.status(500).json({ success: false, message: 'S3 not configured on server' });
  }

  try {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });

    const prefix = (process.env.S3_UPLOAD_PREFIX || 'uploads/').replace(/^\//, '');
    const key = `${prefix}${Date.now()}-${Math.round(Math.random() * 1e9)}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private'
    };

    // Expires in seconds
    const expires = parseInt(process.env.S3_PRESIGN_EXPIRES || '300', 10);
    const presignedUrl = s3.getSignedUrl('putObject', { ...params, Expires: expires });

    // Public URL depends on bucket policy; we keep key for server-side reference.
    const region = process.env.AWS_REGION || 'us-east-1';
    const host = region === 'us-east-1' ? `${process.env.S3_BUCKET}.s3.amazonaws.com` : `${process.env.S3_BUCKET}.s3.${region}.amazonaws.com`;
    const objectUrl = `https://${host}/${encodeURIComponent(key)}`;

    return res.json({ success: true, presignedUrl, key, objectUrl, expires });
  } catch (err) {
    console.error('Error creating presigned url', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: 'Failed to create presigned URL' });
  }
});

module.exports = router;
