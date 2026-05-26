const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { protect } = require('../middleware/authMiddleware');
const { uploadRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

const configuredMaxUploadMb = Number(process.env.UPLOAD_MAX_FILE_MB || 8);
const MAX_UPLOAD_MB = Number.isFinite(configuredMaxUploadMb) ? Math.max(configuredMaxUploadMb, 1) : 8;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const mimeType = file?.mimetype || '';
    if (allowedMimeTypes.has(mimeType)) {
      cb(null, true);
      return;
    }
    const error = new Error('Only JPG, PNG, WEBP, HEIC, and PDF files are supported.');
    error.statusCode = 415;
    cb(error);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `File is too large. Max upload size is ${MAX_UPLOAD_MB} MB.` });
    }

    return res.status(error.statusCode || 400).json({ message: error.message || 'Could not upload this file.' });
  });
};

router.post('/', protect, uploadRateLimiter, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.status(200).json({
      imageUrl: result.secure_url,
      fileUrl: result.secure_url,
      resourceType: result.resource_type,
      originalName: req.file.originalname,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error uploading file' });
  }
});

module.exports = router;
