const express = require("express");
const {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
// NEW: Use Permit middleware instead of old RBAC
const { authorize, requireAny } = require("../middleware/permitMiddleware");

const router = express.Router();

// View: Anyone who can view departments, employees, or attendance
router.get("/", 
  requireAny([
    { action: "view", resource: "departments" },
    { action: "view", resource: "employees" },
    { action: "view", resource: "attendance" }
  ]), 
  listDepartments
);
router.get("/:uuid", 
  requireAny([
    { action: "view", resource: "departments" },
    { action: "view", resource: "employees" },
    { action: "view", resource: "attendance" }
  ]), 
  getDepartment
);

// Manage: Requires department management permission
router.post("/", authorize("create", "departments"), createDepartment);
router.patch("/:uuid", authorize("update", "departments"), updateDepartment);
router.delete("/:uuid", authorize("delete", "departments"), deleteDepartment);

module.exports = router;
