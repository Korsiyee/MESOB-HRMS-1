const multer = require("multer");
const { sendError } = require("../utils/response");

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

function uploadEmployeePhoto(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      return handleUploadError(res, error);
    }
    return next();
  });
}

function uploadEmployeeDocuments(req, res, next) {
  upload.array("documents", MAX_FILES_PER_REQUEST)(req, res, (error) => {
    if (error) {
      return handleUploadError(res, error);
    }
    return next();
  });
}

function handleUploadError(res, error) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return sendError(res, {
        status: 400,
        message: "File size exceeds 10MB limit.",
        error: "FILE_TOO_LARGE",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return sendError(res, {
        status: 400,
        message: "Too many files.",
        error: "TOO_MANY_FILES",
      });
    }
    return sendError(res, {
      status: 400,
      message: error.message,
      error: "UPLOAD_ERROR",
    });
  }

  return sendError(res, {
    status: 400,
    message: error.message || "Invalid file upload.",
    error: "INVALID_FILE",
  });
}

module.exports = {
  uploadEmployeePhoto,
  uploadEmployeeDocuments,
};
