const { ApiError } = require("./errors");

const ROLE_HR_ADMIN = "HR_ADMIN";
const ROLE_SUPER_ADMIN = "SUPER_ADMIN";
const ROLE_HR_OFFICER = "HR_OFFICER";
const ROLE_DEPARTMENT_HEAD = "DEPARTMENT_HEAD";
const ROLE_EMPLOYEE = "EMPLOYEE";

function isHrAdmin(role) {
  return role === ROLE_HR_ADMIN || role === ROLE_SUPER_ADMIN;
}

function isHrOfficer(role) {
  return isHrAdmin(role) || role === ROLE_HR_OFFICER;
}

function assertEmployeeReadAccess(user, employee) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  if (!employee) {
    throw new ApiError("Employee not found.", 404, "NOT_FOUND");
  }

  if (isHrOfficer(user.role) || isHrAdmin(user.role)) {
    return;
  }

  if (user.role === ROLE_DEPARTMENT_HEAD) {
    if (!user.department_uuid) {
      throw new ApiError("Department context is missing.", 403, "FORBIDDEN");
    }
    if (employee.department_uuid !== user.department_uuid) {
      throw new ApiError("Forbidden.", 403, "FORBIDDEN");
    }
    return;
  }

  if (user.role === ROLE_EMPLOYEE) {
    if (user.employee_uuid !== employee.uuid) {
      throw new ApiError("Forbidden.", 403, "FORBIDDEN");
    }
    return;
  }

  throw new ApiError("Forbidden.", 403, "FORBIDDEN");
}

function assertEmployeeListAccess(user) {
  if (!user) {
    throw new ApiError("Not authenticated.", 401, "UNAUTHORIZED");
  }

  // HR Admins and Officers have full access
  if (isHrOfficer(user.role) || isHrAdmin(user.role)) {
    return { scope: "all" };
  }

  // Department Heads have department-scoped access
  if (user.role === ROLE_DEPARTMENT_HEAD) {
    if (!user.department_uuid) {
      throw new ApiError("Department context is missing.", 403, "FORBIDDEN");
    }
    return { scope: "department", departmentUuid: user.department_uuid };
  }

  // Employees with occupation-based access (handled by occupation middleware)
  // The occupation middleware already verified access, so allow them through
  if (user.role === ROLE_EMPLOYEE) {
    return { scope: "all" }; // Occupation middleware already restricted access
  }

  throw new ApiError("Forbidden.", 403, "FORBIDDEN");
}

module.exports = {
  isHrAdmin,
  isHrOfficer,
  assertEmployeeReadAccess,
  assertEmployeeListAccess,
};
