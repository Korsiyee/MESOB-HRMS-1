const express = require("express");
const {
  registerFaceImages,
  verifyFace,
  logAttendanceByFace,
  getFaceRegistrationStatus,
  deleteFaceImages,
} = require("../controllers/faceRecognitionController");
const { uploadFaceImages } = require("../middleware/faceImageUploadMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// Register face images (requires ATTENDANCE_RECORDS module)
router.post("/register", authenticateJwt, requireModule('ATTENDANCE_RECORDS'), uploadFaceImages, registerFaceImages);

// Verify face and get employee match (SELF-SERVICE - all authenticated users)
router.post("/verify", authenticateJwt, verifyFace);

// Log attendance via face recognition (SELF-SERVICE - all authenticated users)
router.post("/attendance", authenticateJwt, logAttendanceByFace);

// Check registration status (SELF-SERVICE - all authenticated users)
router.get("/status/:employee_uuid", authenticateJwt, getFaceRegistrationStatus);

// Delete face images (requires ATTENDANCE_RECORDS module)
router.delete("/:employee_uuid", authenticateJwt, requireModule('ATTENDANCE_RECORDS'), deleteFaceImages);

module.exports = router;
