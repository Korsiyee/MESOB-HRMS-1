const express = require("express");
const {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const { requirePermission } = require("../middleware/requirePermission");

const router = express.Router();

// Authorization helpers using new RBAC middleware
const canManageDepartments = requirePermission({ 
  occupations: 'Departments - Manage' 
});

const canViewDepartments = requirePermission({ 
  occupations: [
    'Departments - Overview',
    'Departments - Manage',
    'Employees - Registration',
    'Employees - Overview',
    'Attendance - Overview',
    'Attendance - Manage'
  ],
  logic: 'OR'
});

router.get("/", canViewDepartments, listDepartments);
router.post("/", canManageDepartments, createDepartment);
router.get("/:uuid", canViewDepartments, getDepartment);
router.patch("/:uuid", canManageDepartments, updateDepartment);
router.delete("/:uuid", canManageDepartments, deleteDepartment);

module.exports = router;
