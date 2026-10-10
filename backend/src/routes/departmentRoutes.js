const express = require("express");
const {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
// Use module-level authorization
const { requireModule } = require("../middleware/moduleAuth");

const router = express.Router();

// All department operations require ORGANIZATION module
router.get("/", requireModule('DEPARTMENTS'), listDepartments);
router.get("/:uuid", requireModule('DEPARTMENTS'), getDepartment);
router.post("/", requireModule('DEPARTMENTS'), createDepartment);
router.patch("/:uuid", requireModule('DEPARTMENTS'), updateDepartment);
router.delete("/:uuid", requireModule('DEPARTMENTS'), deleteDepartment);

module.exports = router;
