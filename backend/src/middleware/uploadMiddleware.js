const multer = require('multer');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;
const MAX_BACKUP_SIZE = parseInt(process.env.MAX_BACKUP_SIZE, 10) || 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp')
  .split(',')
  .map((type) => type.trim())
  .filter(Boolean);

const imageFileFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('نوع الملف غير مسموح. يسمح فقط بصور JPEG و PNG و GIF و WebP.'));
};

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: imageFileFilter
});

const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BACKUP_SIZE, files: 1 }
});

module.exports = {
  imageUpload,
  backupUpload,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES
};
