const express = require("express");
const {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// View: Anyone who can view departments, employees, or attendance
router.get("/", 
  authorize([
    "Departments.View",
    "Employees.View", 
    "Attendance.View"
  ]), 
  listDepartments
);
router.get("/:uuid", 
  authorize([
    "Departments.View",
    "Employees.View",
    "Attendance.View"
  ]), 
  getDepartment
);

// Manage: Requires department management permission
router.post("/", authorize("Departments.Create"), createDepartment);
router.patch("/:uuid", authorize("Departments.Update"), updateDepartment);
router.delete("/:uuid", authorize("Departments.Delete"), deleteDepartment);

module.exports = router;
