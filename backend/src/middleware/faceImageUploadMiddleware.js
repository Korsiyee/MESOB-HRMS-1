const multer = require("multer");
const { sendError } = require("../utils/response");

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image
const MAX_FILES = 7; // Exactly 7 images required
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only JPEG and PNG images are allowed."),
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES,
  },
  fileFilter,
});

function uploadFaceImages(req, res, next) {
  upload.array("images", MAX_FILES)(req, res, (error) => {
    if (error) {
      return handleUploadError(res, error);
    }

    // Verify exactly 7 images
    if (!req.files || req.files.length !== MAX_FILES) {
      return sendError(res, {
        status: 400,
        message: `Exactly ${MAX_FILES} face images are required.`,
        error: "INVALID_FILE_COUNT",
      });
    }

    return next();
  });
}

function handleUploadError(res, error) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return sendError(res, {
        status: 400,
        message: "One or more files exceed the 5MB size limit.",
        error: "FILE_TOO_LARGE",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return sendError(res, {
        status: 400,
        message: `Maximum ${MAX_FILES} files allowed.`,
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
  uploadFaceImages,
};
