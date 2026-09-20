import multer from 'multer';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

export default multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => allowed.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Verification documents must be PDF, JPEG, PNG, or WebP')),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});
