const multer = require('multer');
const path = require('path');

let storage;

// If S3 env vars are provided, use multer-s3 to store uploads in S3.
// Otherwise fall back to local disk storage (uploads/).
if (process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  const AWS = require('aws-sdk');
  const multerS3 = require('multer-s3');

  AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
  const s3 = new AWS.S3();

  storage = multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename(req, file, cb) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
}

module.exports = multer({ storage });
