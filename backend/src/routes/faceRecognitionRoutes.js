const express = require("express");
const {
  registerFaceImages,
  verifyFace,
  logAttendanceByFace,
  getFaceRegistrationStatus,
  deleteFaceImages,
} = require("../controllers/faceRecognitionController");
const { requirePermission } = require("../middleware/requirePermission");
const { uploadFaceImages } = require("../middleware/faceImageUploadMiddleware");
const { authenticateJwt } = require("../middleware/authMiddleware");

const router = express.Router();

// Attendance - Manage allows registering and deleting face images
const canManageFaceRecognition = requirePermission({ 
  occupations: 'Attendance - Manage' 
});

// Register face images (requires Attendance - Manage)
router.post(
  "/register",
  canManageFaceRecognition,
  uploadFaceImages,
  registerFaceImages
);

// Verify face and get employee match (SELF-SERVICE - no occupation required)
// This is used for self-punch attendance, so all authenticated employees should have access
router.post(
  "/verify",
  authenticateJwt,
  verifyFace
);

// Log attendance via face recognition (SELF-SERVICE - no occupation required)
// This is used for self-punch attendance, so all authenticated employees should have access
router.post(
  "/attendance",
  authenticateJwt,
  logAttendanceByFace
);

// Check registration status (SELF-SERVICE - no occupation required)
// Employees should be able to check if they have face recognition set up
router.get(
  "/status/:employee_uuid",
  authenticateJwt,
  getFaceRegistrationStatus
);

// Delete face images (requires Attendance - Manage)
router.delete(
  "/:employee_uuid",
  canManageFaceRecognition,
  deleteFaceImages
);

module.exports = router;
