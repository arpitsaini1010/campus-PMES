const multer = require('multer');
const path = require('path');

// Configure multer memory storage
const storage = multer.memoryStorage();

// Allowed file extensions and MIME types (PDF, Word DOC/DOCX, Excel XLS/XLSX, PPT, ZIP, TXT)
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.ppt', '.pptx', '.zip', '.txt'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/octet-stream' // often sent by some browsers for zip/docx/xlsx
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Invalid file type. Allowed formats: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ZIP, TXT.'), false);
  }

  // Also check mime type if available
  if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Some platforms may have non-standard mime types, but extension matches.
    // Allow if extension is explicitly allowed.
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  },
  fileFilter
});

// Middleware wrapper to return standardized { message } format for multer errors
const handleUpload = (fieldName = 'file') => {
  const uploader = upload.single(fieldName);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: 'File size exceeds maximum limit of 5 MB.'
          });
        }
        return res.status(400).json({
          message: err.message || 'File upload error.'
        });
      }
      next();
    });
  };
};

module.exports = handleUpload;
