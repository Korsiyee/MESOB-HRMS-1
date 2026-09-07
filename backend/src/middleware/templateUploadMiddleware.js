const multer = require("multer");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["application/pdf"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only PDF files are allowed."),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const uploadSingle = upload.single("template");

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        error: "FILE_TOO_LARGE",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Only one PDF template is allowed.",
        error: "TOO_MANY_FILES",
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
      error: "UPLOAD_ERROR",
    });
  }
  
  next();
};

module.exports = {
  uploadSingle,
  handleUploadError,
};
