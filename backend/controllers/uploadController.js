const AWS = require('aws-sdk');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

function safeFileName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function presignUpload(req, res) {
  try {
    const { fileName, contentType } = req.body || {};
    if (!fileName || !contentType) {
      return res.status(400).json({ success: false, message: 'fileName 및 contentType 필요' });
    }

    const prefix = process.env.S3_UPLOAD_PREFIX || 'uploads';
    const key = `${prefix}/${Date.now()}-${safeFileName(fileName)}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private'
    };

    const expires = parseInt(process.env.S3_PRESIGN_EXPIRES || '300', 10);
    const signedUrl = s3.getSignedUrl('putObject', { ...params, Expires: expires });

    // Public URL (object url) - actual access controlled by bucket policy; use presigned GET when needed
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucket = process.env.S3_BUCKET;
    const s3Host = region === 'us-east-1' ? `${bucket}.s3.amazonaws.com` : `${bucket}.s3.${region}.amazonaws.com`;
    const publicUrl = `https://${s3Host}/${encodeURIComponent(key)}`;

    return res.json({ success: true, url: signedUrl, key, publicUrl, expires });
  } catch (err) {
    console.error('presignUpload error', err);
    return res.status(500).json({ success: false, message: '프리사인 URL 생성 실패' });
  }
}

module.exports = {
  presignUpload
};
