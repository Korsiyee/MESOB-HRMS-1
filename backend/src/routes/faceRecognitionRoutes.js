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

const router = express.Router();

// Register face images (requires Attendance.Create permission)

// Verify face and get employee match (SELF-SERVICE - all authenticated users)
router.post("/verify", authenticateJwt, verifyFace);

// Log attendance via face recognition (SELF-SERVICE - all authenticated users)
router.post("/attendance", authenticateJwt, logAttendanceByFace);

// Check registration status (SELF-SERVICE - all authenticated users)
router.get("/status/:employee_uuid", authenticateJwt, getFaceRegistrationStatus);

// Delete face images (requires Attendance.Delete permission)

module.exports = router;
