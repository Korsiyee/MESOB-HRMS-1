const express = require("express");
const {
  registerFaceImages,
  verifyFace,
  logAttendanceByFace,
  getFaceRegistrationStatus,
  deleteFaceImages,
} = require("../controllers/faceRecognitionController");
const { authorize } = require("../middleware/authorize");
const { uploadFaceImages } = require("../middleware/faceImageUploadMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Register face images (requires Attendance.Create permission)
router.post("/register", authorize("Attendance.Create"), uploadFaceImages, registerFaceImages);

// Verify face and get employee match (SELF-SERVICE - all authenticated users)
router.post("/verify", authenticateJwt, verifyFace);

// Log attendance via face recognition (SELF-SERVICE - all authenticated users)
router.post("/attendance", authenticateJwt, logAttendanceByFace);

// Check registration status (SELF-SERVICE - all authenticated users)
router.get("/status/:employee_uuid", authenticateJwt, getFaceRegistrationStatus);

// Delete face images (requires Attendance.Delete permission)
router.delete("/:employee_uuid", authorize("Attendance.Delete"), deleteFaceImages);

module.exports = router;
