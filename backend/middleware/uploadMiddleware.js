import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';

// Ensure isolated uploads directory exists
const uploadDir = '.tmp-uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|mp4|mov|avi/i;
  // Fallback initial check, real check happens in validateFileContent
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only Images and Videos are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: fileFilter
});

export const validateFileContent = async (req, res, next) => {
  if (!req.files && !req.file) return next();

  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

  for (const file of files) {
    try {
      const type = await fileTypeFromFile(file.path);
      if (!type || (!type.mime.startsWith('image/') && !type.mime.startsWith('video/'))) {
        // Validation failed, delete all uploaded files to be safe
        for (const f of files) {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
        return res.status(400).json({ message: 'Invalid file content. File failed magic bytes validation.' });
      }
    } catch (err) {
      console.error('[Upload Middleware] Content validation error:', err);
      for (const f of files) {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      }
      return res.status(500).json({ message: 'Error validating file content' });
    }
  }
  next();
};
