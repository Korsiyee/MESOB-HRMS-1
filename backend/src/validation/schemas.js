const {
  isNonEmptyString,
  isValidIsoDate,
  isValidUuid,
} = require("../utils/validation");

const GENDERS = new Set(["MALE", "FEMALE"]);
const EMPLOYEE_STATUSES = new Set(["ACTIVE", "INACTIVE", "TERMINATED"]);
const ADDRESS_TYPES = new Set(["PERMANENT", "CURRENT"]);
const WEEK_DAYS = new Set([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function validateEmployeeDraft(payload) {
  const missing = [];
  const invalid = [];
  if (payload?.stepCompleted === undefined) {
    missing.push("stepCompleted");
  }
  if (payload?.draftJson === undefined) {
    missing.push("draftJson");
  }
  if (payload?.stepCompleted !== undefined) {
    const step = Number(payload.stepCompleted);
    if (!Number.isInteger(step) || step < 0 || step > 5) {
      invalid.push({
        field: "stepCompleted",
        message: "Step must be between 0 and 5.",
      });
    }
  }
  if (
    payload?.draftJson !== undefined &&
    typeof payload.draftJson !== "object"
  ) {
    invalid.push({
      field: "draftJson",
      message: "Draft JSON must be an object.",
    });
  }
  return { missing, invalid };
}

function validateEmployeeCreate(payload) {
  const missing = [];
  const invalid = [];
  const requiredFields = [
    "first_name",
    "middle_name",
    "last_name",
    "mother_name",
    "gender",
    "date_of_birth",
    "hire_date",
  ];

  requiredFields.forEach((field) => {
    if (!isNonEmptyString(payload?.[field])) {
      missing.push(field);
    }
  });

  if (payload?.gender && !GENDERS.has(String(payload.gender).toUpperCase())) {
    invalid.push({
      field: "gender",
      message: "Gender must be MALE or FEMALE.",
    });
  }

  if (payload?.date_of_birth && !isValidIsoDate(payload.date_of_birth)) {
    invalid.push({
      field: "date_of_birth",
      message: "Invalid date_of_birth format.",
    });
  }

  if (payload?.hire_date && !isValidIsoDate(payload.hire_date)) {
    invalid.push({ field: "hire_date", message: "Invalid hire_date format." });
  }

  if (payload?.department_uuid && !isValidUuid(payload.department_uuid)) {
    invalid.push({
      field: "department_uuid",
      message: "Invalid department UUID.",
    });
  }
  if (payload?.position_uuid && !isValidUuid(payload.position_uuid)) {
    invalid.push({ field: "position_uuid", message: "Invalid position UUID." });
  }

  if (
    payload?.attendance_exempt !== undefined &&
    typeof payload.attendance_exempt !== "boolean"
  ) {
    invalid.push({
      field: "attendance_exempt",
      message: "attendance_exempt must be boolean.",
    });
  }

  if (payload?.prior_gov_service !== undefined) {
    const numeric = Number(payload.prior_gov_service);
    if (!Number.isFinite(numeric) || numeric < 0) {
      invalid.push({
        field: "prior_gov_service",
        message: "prior_gov_service must be a positive number.",
      });
    }
  }

  const bankName = normalizeString(payload?.bank_name);
  const bankAccount = normalizeString(payload?.bank_account_number);
  if ((bankName && !bankAccount) || (!bankName && bankAccount)) {
    invalid.push({
      field: "bank_details",
      message: "Both bank_name and bank_account_number are required together.",
    });
  }

  const addresses = normalizeArray(payload?.addresses);
  addresses.forEach((address, index) => {
    if (
      address?.address_type &&
      !ADDRESS_TYPES.has(String(address.address_type).toUpperCase())
    ) {
      invalid.push({
        field: `addresses[${index}].address_type`,
        message: "Invalid address type.",
      });
    }
  });

  return { missing, invalid };
}

function validateEmployeeUpdate(payload) {
  const invalid = [];
  const today = new Date().toISOString().slice(0, 10);

  const requiredWhenPresent = [
    "first_name",
    "middle_name",
    "last_name",
    "mother_name",
  ];

  requiredWhenPresent.forEach((field) => {
    if (payload?.[field] !== undefined && !isNonEmptyString(payload[field])) {
      invalid.push({ field, message: `${field} cannot be empty.` });
    }
  });

  if (payload?.gender && !GENDERS.has(String(payload.gender).toUpperCase())) {
    invalid.push({
      field: "gender",
      message: "Gender must be MALE or FEMALE.",
    });
  }

  if (payload?.date_of_birth && !isValidIsoDate(payload.date_of_birth)) {
    invalid.push({
      field: "date_of_birth",
      message: "Invalid date_of_birth format.",
    });
  } else if (payload?.date_of_birth && payload.date_of_birth > today) {
    invalid.push({
      field: "date_of_birth",
      message: "date_of_birth cannot be in the future.",
    });
  }

  if (payload?.hire_date && !isValidIsoDate(payload.hire_date)) {
    invalid.push({ field: "hire_date", message: "Invalid hire_date format." });
  } else if (payload?.hire_date && payload.hire_date > today) {
    invalid.push({
      field: "hire_date",
      message: "hire_date cannot be in the future.",
    });
  }

  if (payload?.department_uuid && !isValidUuid(payload.department_uuid)) {
    invalid.push({
      field: "department_uuid",
      message: "Invalid department UUID.",
    });
  }
  if (payload?.position_uuid && !isValidUuid(payload.position_uuid)) {
    invalid.push({ field: "position_uuid", message: "Invalid position UUID." });
  }

  if (
    payload?.attendance_exempt !== undefined &&
    typeof payload.attendance_exempt !== "boolean"
  ) {
    invalid.push({
      field: "attendance_exempt",
      message: "attendance_exempt must be boolean.",
    });
  }

  if (payload?.prior_gov_service !== undefined) {
    const numeric = Number(payload.prior_gov_service);
    if (!Number.isFinite(numeric) || numeric < 0) {
      invalid.push({
        field: "prior_gov_service",
        message: "prior_gov_service must be a positive number.",
      });
    }
  }

  const bankName = normalizeString(payload?.bank_name);
  const bankAccount = normalizeString(payload?.bank_account_number);
  if ((bankName && !bankAccount) || (!bankName && bankAccount)) {
    invalid.push({
      field: "bank_details",
      message: "Both bank_name and bank_account_number are required together.",
    });
  }

  const addresses = normalizeArray(payload?.addresses);
  addresses.forEach((address, index) => {
    if (
      address?.address_type &&
      !ADDRESS_TYPES.has(String(address.address_type).toUpperCase())
    ) {
      invalid.push({
        field: `addresses[${index}].address_type`,
        message: "Invalid address type.",
      });
    }
  });

  return { invalid };
}

function validateEmployeeStatus(payload) {
  const missing = [];
  const invalid = [];
  if (!payload?.status) {
    missing.push("status");
  } else if (!EMPLOYEE_STATUSES.has(String(payload.status).toUpperCase())) {
    invalid.push({ field: "status", message: "Invalid status value." });
  }
  return { missing, invalid };
}

function validateEmployeeDocumentMetadata(payload) {
  const invalid = [];
  if (payload?.issue_date && !isValidIsoDate(payload.issue_date)) {
    invalid.push({
      field: "issue_date",
      message: "Invalid issue_date format.",
    });
  }
  if (payload?.valid_until && !isValidIsoDate(payload.valid_until)) {
    invalid.push({
      field: "valid_until",
      message: "Invalid valid_until format.",
    });
  }
  if (payload?.issue_date && payload?.valid_until) {
    if (payload.valid_until < payload.issue_date) {
      invalid.push({
        field: "valid_until",
        message: "valid_until must be on or after issue_date.",
      });
    }
  }
  return { invalid };
}

function validateDepartmentCreate(payload) {
  const missing = [];
  const invalid = [];
  if (!isNonEmptyString(payload?.name)) {
    missing.push("name");
  }
  if (payload?.parent_uuid && !isValidUuid(payload.parent_uuid)) {
    invalid.push({ field: "parent_uuid", message: "Invalid parent UUID." });
  }
  return { missing, invalid };
}

function validateDepartmentUpdate(payload) {
  const invalid = [];
  if (payload?.name !== undefined && !isNonEmptyString(payload.name)) {
    invalid.push({ field: "name", message: "name cannot be empty." });
  }
  if (payload?.parent_uuid && !isValidUuid(payload.parent_uuid)) {
    invalid.push({ field: "parent_uuid", message: "Invalid parent UUID." });
  }
  if (payload?.head_employee_uuid && !isValidUuid(payload.head_employee_uuid)) {
    invalid.push({ field: "head_employee_uuid", message: "Invalid employee UUID." });
  }
  return { invalid };
}

function validatePositionCreate(payload) {
  const missing = [];
  const invalid = [];
  if (!isNonEmptyString(payload?.title)) {
    missing.push("title");
  }
  if (!isNonEmptyString(payload?.department_uuid)) {
    missing.push("department_uuid");
  } else if (!isValidUuid(payload.department_uuid)) {
    invalid.push({
      field: "department_uuid",
      message: "Invalid department UUID.",
    });
  }
  return { missing, invalid };
}

function validatePositionUpdate(payload) {
  const invalid = [];
  if (payload?.title !== undefined && !isNonEmptyString(payload.title)) {
    invalid.push({ field: "title", message: "title cannot be empty." });
  }
  if (payload?.department_uuid && !isValidUuid(payload.department_uuid)) {
    invalid.push({
      field: "department_uuid",
      message: "Invalid department UUID.",
    });
  }
  return { invalid };
}

function validateOccupationCreate(payload) {
  const missing = [];
  if (!isNonEmptyString(payload?.name)) {
    missing.push("name");
  }
  return { missing, invalid: [] };
}

function validateOccupationUpdate(payload) {
  const invalid = [];
  if (payload?.name !== undefined && !isNonEmptyString(payload.name)) {
    invalid.push({ field: "name", message: "name cannot be empty." });
  }
  return { invalid };
}

function validateShiftCreate(payload) {
  const missing = [];
  const invalid = [];
  if (!isNonEmptyString(payload?.name)) {
    missing.push("name");
  }
  if (!isNonEmptyString(payload?.start_time)) {
    missing.push("start_time");
  }
  if (!isNonEmptyString(payload?.end_time)) {
    missing.push("end_time");
  }
  if (!payload?.working_days_json) {
    missing.push("working_days_json");
  }
  invalid.push(...validateShiftTime(payload));
  invalid.push(...validateShiftDays(payload));
  return { missing, invalid };
}

function validateShiftUpdate(payload) {
  const invalid = [];
  invalid.push(...validateShiftTime(payload));
  invalid.push(...validateShiftDays(payload));
  return { invalid };
}

function validateShiftAssign(payload) {
  const missing = [];
  const invalid = [];
  if (!isNonEmptyString(payload?.employee_uuid)) {
    missing.push("employee_uuid");
  } else if (!isValidUuid(payload.employee_uuid)) {
    invalid.push({ field: "employee_uuid", message: "Invalid employee UUID." });
  }
  if (!isNonEmptyString(payload?.effective_from)) {
    missing.push("effective_from");
  } else if (!isValidIsoDate(payload.effective_from)) {
    invalid.push({
      field: "effective_from",
      message: "Invalid effective_from format.",
    });
  }
  if (payload?.effective_to) {
    if (!isValidIsoDate(payload.effective_to)) {
      invalid.push({
        field: "effective_to",
        message: "Invalid effective_to format.",
      });
    } else if (
      payload.effective_from &&
      payload.effective_to < payload.effective_from
    ) {
      invalid.push({
        field: "effective_to",
        message: "effective_to must be on or after effective_from.",
      });
    }
  }
  return { missing, invalid };
}

function validateShiftTime(payload) {
  const invalid = [];
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (payload?.start_time && !timeRegex.test(payload.start_time)) {
    invalid.push({
      field: "start_time",
      message: "Invalid start_time format.",
    });
  }
  if (payload?.end_time && !timeRegex.test(payload.end_time)) {
    invalid.push({ field: "end_time", message: "Invalid end_time format." });
  }
  return invalid;
}

function validateShiftDays(payload) {
  const invalid = [];
  if (payload?.working_days_json === undefined) {
    return invalid;
  }

  let days = payload.working_days_json;
  if (typeof days === "string") {
    try {
      days = JSON.parse(days);
    } catch {
      invalid.push({
        field: "working_days_json",
        message: "working_days_json must be a JSON array.",
      });
      return invalid;
    }
  }

  if (!Array.isArray(days) || days.length === 0) {
    invalid.push({
      field: "working_days_json",
      message: "working_days_json must be a non-empty array.",
    });
    return invalid;
  }

  days.forEach((day) => {
    if (!WEEK_DAYS.has(String(day).toUpperCase())) {
      invalid.push({
        field: "working_days_json",
        message: "Invalid working day value.",
      });
    }
  });

  return invalid;
}

module.exports = {
  validateEmployeeDraft,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateEmployeeStatus,
  validateEmployeeDocumentMetadata,
  validateDepartmentCreate,
  validateDepartmentUpdate,
  validatePositionCreate,
  validatePositionUpdate,
  validateOccupationCreate,
  validateOccupationUpdate,
  validateShiftCreate,
  validateShiftUpdate,
  validateShiftAssign,
};
