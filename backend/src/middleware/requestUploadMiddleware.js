const multer = require("multer");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Allowed types are PDF, JPG, and PNG."),
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter,
});

const uploadRequestDocuments = (req, res, next) => {
  upload.array("documents", MAX_FILES_PER_REQUEST)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 10MB limit.",
          error: "FILE_TOO_LARGE",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message: `Too many files. Maximum allowed is ${MAX_FILES_PER_REQUEST}.`,
          error: "TOO_MANY_FILES",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
        error: "UPLOAD_ERROR",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid upload payload.",
      error: "INVALID_FILE",
    });
  });
};

const uploadSingleRequestDocument = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 10MB limit.",
          error: "FILE_TOO_LARGE",
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
        error: "UPLOAD_ERROR",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid upload payload.",
      error: "INVALID_FILE",
    });
  });
};

module.exports = {
  uploadRequestDocuments,
  uploadSingleRequestDocument,
};
