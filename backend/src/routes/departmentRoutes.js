const express = require("express");
const {
  listDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
// Use module-level authorization
const { requireModule, withScope } = require("../middleware/moduleAuth");

const router = express.Router();

// All department operations require ORGANIZATION module
router.get("/", requireModule('ORGANIZATION'), withScope(), listDepartments);
router.get("/:uuid", requireModule('ORGANIZATION'), getDepartment);
router.post("/", requireModule('ORGANIZATION'), createDepartment);
router.patch("/:uuid", requireModule('ORGANIZATION'), updateDepartment);
router.delete("/:uuid", requireModule('ORGANIZATION'), deleteDepartment);

module.exports = router;
