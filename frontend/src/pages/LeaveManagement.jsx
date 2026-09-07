import { useEffect, useMemo, useRef, useState } from "react";
import { LeaveApi } from "../api/leaveApi";
import Tabs from "../components/Tabs";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import PrettyDatePicker from "../components/PrettyDatePicker";
import HolidayForm, { emptyHolidayForm } from "../components/HolidayForm";
import LoadingBlock from "../components/LoadingBlock";
import LeaveRequestDetailCard from "../components/LeaveRequestDetailCard";
import { formatDisplayDate } from "../utils/dateFormat";
import { useDialog } from "../context/DialogContext";

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(13,61,49,0.09)] md:p-5";
const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-800 focus:ring-2 focus:ring-brand-100";
const btnPrimaryClass =
  "rounded-lg bg-[#0b5d4a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f6f58] disabled:cursor-not-allowed disabled:opacity-70";
const btnMutedClass =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70";
const btnDangerClass =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70";
const btnApproveGhostClass =
  "rounded-full border border-[#0b5d4a] bg-white px-3.5 py-2 text-xs font-semibold text-[#0b5d4a] shadow-[0_1px_2px_rgba(15,23,42,0.10)] transition hover:bg-[#0b5d4a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const btnRejectGhostClass =
  "rounded-full border border-[#a12f3c] bg-white px-3.5 py-2 text-xs font-semibold text-[#a12f3c] shadow-[0_1px_2px_rgba(15,23,42,0.10)] transition hover:bg-[#a12f3c] hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
const btnNeutralGhostClass =
  "rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-slate-100";

const currentYear = new Date().getFullYear();
const RETURN_DAY_FULL = "FULL";
const RETURN_DAY_HALF = "HALF";
const ACTIVE_REQUEST_STATUSES = ["PENDING", "PENDING_DEPARTMENT", "PENDING_HR"];
const LEAVE_DAY_FULL = "FULL";
const LEAVE_DAY_HALF = "HALF";
const DAY_PATTERN_FULL = "FULL_DAY";
const DAY_PATTERN_HALF = "HALF_DAY";
const DAY_PATTERN_MIXED = "MIXED";

const LEAVE_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const isActiveRequestStatus = (status) =>
  ACTIVE_REQUEST_STATUSES.includes(String(status || "").toUpperCase());

const isHalfStepPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed * 2);
};

const buildDaysFromWholeAndReturnType = (wholeDays, returnDayType) => {
  const parsedWholeDays = Number(wholeDays);
  if (!Number.isInteger(parsedWholeDays) || parsedWholeDays <= 0) {
    return Number.NaN;
  }

  return returnDayType === RETURN_DAY_HALF
    ? Math.max(0.5, parsedWholeDays - 0.5)
    : parsedWholeDays;
};

const splitDaysForForm = (days) => {
  const parsedDays = Number(days);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return { wholeDays: 1, returnDayType: RETURN_DAY_FULL };
  }

  const isHalf = Math.abs((parsedDays % 1) - 0.5) < 1e-9;
  if (isHalf) {
    return {
      wholeDays: Math.ceil(parsedDays),
      returnDayType: RETURN_DAY_HALF,
    };
  }

  return {
    wholeDays: Math.round(parsedDays),
    returnDayType: RETURN_DAY_FULL,
  };
};

const formatDayValue = (days) => {
  const parsedDays = Number(days);
  if (!Number.isFinite(parsedDays)) {
    return "--";
  }
  return parsedDays.toFixed(1);
};

const getDayPatternLabel = (row) => {
  const pattern = String(row?.dayPattern || "").toUpperCase();
  if (pattern === DAY_PATTERN_FULL) {
    return "Full Day";
  }

  if (pattern === DAY_PATTERN_HALF) {
    return "Half Day";
  }

  if (pattern === DAY_PATTERN_MIXED) {
    return "Mixed";
  }

  const parsedDays = Number(row?.total_days);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return "--";
  }

  return Number.isInteger(parsedDays) ? "Full Day" : "Half Day";
};

const formatLeavePlanDate = (isoDate) => {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate || "--";
  }

  return LEAVE_DAY_LABEL_FORMATTER.format(parsed);
};

const addUtcDaysToIsoDate = (isoDate, daysToAdd) => {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setUTCDate(parsed.getUTCDate() + Number(daysToAdd || 0));
  return parsed.toISOString().slice(0, 10);
};

const buildWorkingDatesFallback = (
  startDate,
  numberOfWorkingDays,
  holidayDates = new Set(),
) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return [];
  }

  const dates = [];
  const cursor = new Date(start);

  while (dates.length < numberOfWorkingDays) {
    const day = cursor.getUTCDay();
    const cursorIso = cursor.toISOString().slice(0, 10);
    const isHoliday = holidayDates.has(cursorIso);

    if (day !== 0 && day !== 6 && !isHoliday) {
      dates.push(cursorIso);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);

    if (dates.length > 400) {
      break;
    }
  }

  return dates;
};

const resolveBudgetYearValue = (row) => {
  const explicit = String(row?.budgetYear || "").trim();
  if (explicit) {
    return explicit;
  }

  const dateText = String(row?.startDate || "").trim();
  const dateOnlyMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const gregYear = Number(dateOnlyMatch[1]);
    const gregMonth = Number(dateOnlyMatch[2]);
    const gregDay = Number(dateOnlyMatch[3]);

    let ethYear = gregYear - 8;
    if (gregMonth > 9 || (gregMonth === 9 && gregDay >= 11)) {
      ethYear += 1;
    }

    return String(ethYear);
  }

  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) {
    const gregYear = parsed.getFullYear();
    const gregMonth = parsed.getMonth() + 1;
    const gregDay = parsed.getDate();

    let ethYear = gregYear - 8;
    if (gregMonth > 9 || (gregMonth === 9 && gregDay >= 11)) {
      ethYear += 1;
    }

    return String(ethYear);
  }

  return "";
};

const ModalShell = ({ open, title, subtitle, onClose, children }) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            {subtitle ? (
              <p className="text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button className={btnMutedClass} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

const LeaveManagement = ({ onNavigateBack }) => {
  const dialog = useDialog();
  const [role, setRole] = useState("employee");
  const [employeeTab, setEmployeeTab] = useState("request");
  const [adminTab, setAdminTab] = useState("manage");
  const [personInfoUuid, setPersonInfoUuid] = useState("emp-1001");

  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [policies, setPolicies] = useState([]);

  const [notice, setNotice] = useState({ type: "", message: "" });
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [decisionLoadingUuid, setDecisionLoadingUuid] = useState("");
  const [policySaving, setPolicySaving] = useState(false);
  const [holidaySaving, setHolidaySaving] = useState(false);

  const [requestForm, setRequestForm] = useState({
    leaveType: "Annual",
    startDate: "",
    numberOfDays: 1,
    reason: "",
    supportingDocuments: [],
  });
  const [leaveDayPlan, setLeaveDayPlan] = useState([]);
  const [documentInputMode, setDocumentInputMode] = useState("file");
  const [requestDocumentPreviewUrls, setRequestDocumentPreviewUrls] = useState(
    [],
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const browseInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const [policyForm, setPolicyForm] = useState({
    leaveType: "Annual",
    baseDays: 20,
    incrementPerYear: 1,
    maxDays: 30,
    eligibilityMonths: 11,
    useBudgetYear: true,
  });

  const [holidayForm, setHolidayForm] = useState(emptyHolidayForm());

  const [manageFilters, setManageFilters] = useState({
    requestWindow: "ACTIVE",
    budgetYear: "ALL",
    status: "ALL",
    leaveType: "ALL",
    employee: "",
  });

  const [holidayFilters, setHolidayFilters] = useState({
    status: "ALL",
    type: "ALL",
    year: String(currentYear),
    startDate: "",
    endDate: "",
    keyword: "",
  });

  const [viewRequest, setViewRequest] = useState(null);
  const [viewSnapshotLoading, setViewSnapshotLoading] = useState(false);
  const [viewSnapshot, setViewSnapshot] = useState({
    balance: null,
    history: [],
  });

  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  const [employeeViewRequest, setEmployeeViewRequest] = useState(null);
  const [pendingDocumentFiles, setPendingDocumentFiles] = useState([]);
  const [documentActionLoading, setDocumentActionLoading] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [editRequestSaving, setEditRequestSaving] = useState(false);
  const [editRequestPlanning, setEditRequestPlanning] = useState(false);
  const [editRequestForm, setEditRequestForm] = useState({
    leaveType: "Annual",
    startDate: "",
    workingDays: 1,
    reason: "",
  });
  const [editLeaveDayPlan, setEditLeaveDayPlan] = useState([]);
  const [shortenRequest, setShortenRequest] = useState(null);
  const [shortenWholeDays, setShortenWholeDays] = useState(1);
  const [shortenReturnDayType, setShortenReturnDayType] =
    useState(RETURN_DAY_FULL);
  const [shortenSaving, setShortenSaving] = useState(false);

  const [policyView, setPolicyView] = useState(null);
  const [policyViewLoading, setPolicyViewLoading] = useState(false);
  const [policyEdit, setPolicyEdit] = useState(null);
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const selectedLeaveNeedsDocument = useMemo(
    () => requestForm.leaveType === "Sick",
    [requestForm.leaveType],
  );

  const resetHolidayForm = () => setHolidayForm(emptyHolidayForm());

  const showError = (error) =>
    setNotice({ type: "error", message: error?.message || "Request failed" });

  const loadEmployeeData = async () => {
    setEmployeeLoading(true);
    try {
      const [balancePayload, historyPayload] = await Promise.all([
        LeaveApi.getBalance(personInfoUuid).catch(() => null),
        LeaveApi.getEmployeeRequests(personInfoUuid).catch(() => ({
          data: [],
        })),
      ]);
      setBalance(balancePayload || null);
      setHistory(historyPayload?.data || []);
    } catch (error) {
      showError(error);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const refreshAdminRequests = async (showFallbackNotice = true) => {
    try {
      const payload = await LeaveApi.getAdminRequests();
      const rows = payload?.data || [];
      setPending(
        rows.map((row) => ({
          ...row,
          budgetYear: resolveBudgetYearValue(row),
        })),
      );
      return rows;
    } catch {
      const fallbackPayload = await LeaveApi.getPendingRequests().catch(() => ({
        data: [],
      }));
      const rows = fallbackPayload?.data || [];

      if (showFallbackNotice) {
        setNotice({
          type: "error",
          message:
            "Full request history is unavailable on this API server right now. Showing active requests only.",
        });
      }

      setPending(
        rows.map((row) => ({
          ...row,
          budgetYear: resolveBudgetYearValue(row),
        })),
      );
      return rows;
    }
  };

  const loadAdminData = async (year) => {
    setPendingLoading(true);
    setHolidayLoading(true);
    setPolicyLoading(true);

    try {
      const [, holidaysPayload, policiesPayload] = await Promise.all([
        refreshAdminRequests(true),
        LeaveApi.getHolidaysByYear(year || currentYear).catch(() => ({
          data: [],
        })),
        LeaveApi.getPolicies().catch(() => ({ data: [] })),
      ]);

      setHolidays(holidaysPayload?.data || []);
      setPolicies(policiesPayload?.data || []);
    } catch (error) {
      showError(error);
    } finally {
      setPendingLoading(false);
      setHolidayLoading(false);
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    if (role === "employee") {
      loadEmployeeData();
    } else {
      loadAdminData(Number(holidayFilters.year) || currentYear);
    }
  }, [role, personInfoUuid, holidayFilters.year]);

  useEffect(() => {
    if (!notice.message) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setNotice({ type: "", message: "" });
    }, 3600);

    return () => clearTimeout(timer);
  }, [notice]);

  const filteredPending = useMemo(() => {
    return pending.filter((row) => {
      if (manageFilters.requestWindow === "ACTIVE") {
        if (!isActiveRequestStatus(row.status)) {
          return false;
        }
      } else if (manageFilters.requestWindow === "PAST") {
        if (isActiveRequestStatus(row.status)) {
          return false;
        }
      }

      if (
        manageFilters.budgetYear !== "ALL" &&
        String(row.budgetYear || "") !== String(manageFilters.budgetYear)
      ) {
        return false;
      }

      if (
        manageFilters.status !== "ALL" &&
        row.status !== manageFilters.status
      ) {
        return false;
      }
      if (
        manageFilters.leaveType !== "ALL" &&
        row.leaveType !== manageFilters.leaveType
      ) {
        return false;
      }
      if (
        manageFilters.employee &&
        !`${row.full_name || ""} ${row.personInfoUuid || ""}`
          .toLowerCase()
          .includes(manageFilters.employee.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [pending, manageFilters]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((row) => {
      if (holidayFilters.status !== "ALL") {
        const isActive = row.is_active !== false;
        if (holidayFilters.status === "ACTIVE" && !isActive) {
          return false;
        }
        if (holidayFilters.status === "INACTIVE" && isActive) {
          return false;
        }
      }

      if (holidayFilters.type !== "ALL" && row.type !== holidayFilters.type) {
        return false;
      }

      if (
        holidayFilters.startDate &&
        row.gregorianDate < holidayFilters.startDate
      ) {
        return false;
      }
      if (
        holidayFilters.endDate &&
        row.gregorianDate > holidayFilters.endDate
      ) {
        return false;
      }

      if (holidayFilters.keyword) {
        const key = holidayFilters.keyword.toLowerCase();
        const blob =
          `${row.name || ""} ${row.type || ""} ${row.gregorianDate || ""}`.toLowerCase();
        if (!blob.includes(key)) {
          return false;
        }
      }

      return true;
    });
  }, [holidays, holidayFilters]);

  const manageLeaveTypes = useMemo(() => {
    return Array.from(
      new Set(pending.map((item) => item.leaveType).filter(Boolean)),
    );
  }, [pending]);

  const manageBudgetYears = useMemo(() => {
    return Array.from(
      new Set(
        pending
          .map((item) => String(item.budgetYear || "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => Number(b) - Number(a));
  }, [pending]);

  const requestedDaysFromForm = useMemo(
    () =>
      leaveDayPlan.reduce(
        (sum, item) => sum + (item.portion === LEAVE_DAY_HALF ? 0.5 : 1),
        0,
      ),
    [leaveDayPlan],
  );

  const leavePlanSummary = useMemo(() => {
    const fullDays = leaveDayPlan.filter(
      (item) => item.portion === LEAVE_DAY_FULL,
    ).length;
    const halfDays = leaveDayPlan.filter(
      (item) => item.portion === LEAVE_DAY_HALF,
    ).length;

    return {
      fullDays,
      halfDays,
    };
  }, [leaveDayPlan]);

  const requestedDaysFromInput = useMemo(() => {
    const parsed = Number(requestForm.numberOfDays);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [requestForm.numberOfDays]);

  const requestedDaysForSubmission =
    leaveDayPlan.length > 0 ? requestedDaysFromForm : requestedDaysFromInput;

  const editRequestedDaysFromPlan = useMemo(
    () =>
      editLeaveDayPlan.reduce(
        (sum, item) => sum + (item.portion === LEAVE_DAY_HALF ? 0.5 : 1),
        0,
      ),
    [editLeaveDayPlan],
  );

  const updateLeaveDayPortion = (date, portion) => {
    setLeaveDayPlan((previousPlan) =>
      previousPlan.map((item) =>
        item.date === date ? { ...item, portion } : item,
      ),
    );
  };

  const setAllLeaveDayPortions = (portion) => {
    setLeaveDayPlan((previousPlan) =>
      previousPlan.map((item) => ({ ...item, portion })),
    );
  };

  const updateEditLeaveDayPortion = (date, portion) => {
    setEditLeaveDayPlan((previousPlan) =>
      previousPlan.map((item) =>
        item.date === date ? { ...item, portion } : item,
      ),
    );
  };

  const setAllEditLeaveDayPortions = (portion) => {
    setEditLeaveDayPlan((previousPlan) =>
      previousPlan.map((item) => ({ ...item, portion })),
    );
  };

  const onPlanDays = async () => {
    const plannedWorkingDaysCount = Number.parseInt(
      String(requestForm.numberOfDays),
      10,
    );

    if (!requestForm.startDate) {
      setNotice({
        type: "error",
        message: "Choose a start date before preview.",
      });
      return;
    }

    if (
      !Number.isInteger(plannedWorkingDaysCount) ||
      plannedWorkingDaysCount <= 0
    ) {
      setNotice({
        type: "error",
        message: "Working days must be a positive whole number before preview.",
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const payload = await LeaveApi.previewDates({
        ...requestForm,
        personInfoUuid,
        numberOfDays: plannedWorkingDaysCount,
      });
      const previewPayload = payload?.data || payload;
      let workingDates = Array.isArray(previewPayload?.workingDates)
        ? previewPayload.workingDates
        : [];

      if (workingDates.length === 0) {
        const fallbackEndDate = addUtcDaysToIsoDate(requestForm.startDate, 370);
        const holidayPayload = await LeaveApi.getHolidaysInRange({
          startDate: requestForm.startDate,
          endDate: fallbackEndDate,
        }).catch(() => ({ data: [] }));

        const holidayDates = new Set(
          (holidayPayload?.data || [])
            .filter(
              (item) => item.is_active !== false && item.isActive !== false,
            )
            .map(
              (item) =>
                item.gregorianDate || item.holidayDate || item.date || "",
            )
            .filter(Boolean),
        );

        workingDates = buildWorkingDatesFallback(
          requestForm.startDate,
          plannedWorkingDaysCount,
          holidayDates,
        );
      }

      const previousByDate = new Map(
        leaveDayPlan.map((item) => [item.date, item.portion]),
      );

      const normalizedPlan = workingDates.map((date) => ({
        date,
        portion: previousByDate.get(date) || LEAVE_DAY_FULL,
      }));

      setLeaveDayPlan(normalizedPlan);
      setPreview(null);
      setNotice({
        type: "ok",
        message:
          "Days planned. Review full/half selection, then click Preview to confirm submission.",
      });
    } catch (error) {
      showError(error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onPreview = async () => {
    if (!requestForm.startDate) {
      setNotice({
        type: "error",
        message: "Choose a start date before preview.",
      });
      return;
    }

    if (!isHalfStepPositiveNumber(requestedDaysForSubmission)) {
      setNotice({
        type: "error",
        message: "Enter valid working days (positive, in 0.5 increments).",
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const payload = await LeaveApi.previewDates({
        ...requestForm,
        personInfoUuid,
        numberOfDays: requestedDaysForSubmission,
      });

      const previewPayload = payload?.data || payload;
      setPreview({
        ...previewPayload,
        confirmation: {
          leaveType: requestForm.leaveType,
          startDate: requestForm.startDate,
          plannedDates: leaveDayPlan.length,
          fullDays: leavePlanSummary.fullDays,
          halfDays: leavePlanSummary.halfDays,
          totalSubmittedDays: requestedDaysForSubmission,
          reason: requestForm.reason,
        },
      });

      setNotice({
        type: "ok",
        message: "Preview ready. Please review and submit.",
      });
    } catch (error) {
      showError(error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onSubmitRequest = async () => {
    if (!requestForm.startDate) {
      setNotice({
        type: "error",
        message: "Choose a start date before submitting a request.",
      });
      return;
    }

    if (
      selectedLeaveNeedsDocument &&
      requestForm.supportingDocuments.length === 0
    ) {
      setNotice({
        type: "error",
        message: "Sick leave requires at least one supporting document.",
      });
      return;
    }

    if (!isHalfStepPositiveNumber(requestedDaysForSubmission)) {
      setNotice({
        type: "error",
        message: "Please enter valid working days before submitting.",
      });
      return;
    }

    setSubmitLoading(true);
    try {
      await LeaveApi.submitRequest({
        personInfoUuid,
        leaveType: requestForm.leaveType,
        startDate: requestForm.startDate,
        numberOfDays: requestedDaysForSubmission,
        dailyPlan: leaveDayPlan.length > 0 ? leaveDayPlan : undefined,
        reason: requestForm.reason,
        documents: requestForm.supportingDocuments,
      });
      setNotice({ type: "ok", message: "Leave request submitted." });
      setPreview(null);
      setRequestForm({
        leaveType: "Annual",
        startDate: "",
        numberOfDays: 1,
        reason: "",
        supportingDocuments: [],
      });
      setLeaveDayPlan([]);
      setDocumentInputMode("file");
      loadEmployeeData();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const onDecision = async (uuid, decision, rejectionReason) => {
    setDecisionLoadingUuid(uuid);
    try {
      await LeaveApi.decideRequest({
        uuid,
        decision,
        department_head_id: personInfoUuid, // use current actor's uuid; server will also fall back to req.user.uuid
        rejectionReason,
      });
      setNotice({ type: "ok", message: `Request ${decision.toLowerCase()}d.` });
      await refreshAdminRequests(false);
    } catch (error) {
      showError(error);
    } finally {
      setDecisionLoadingUuid("");
    }
  };

  const onOpenView = async (row) => {
    setViewRequest(row);
    setViewSnapshot({ balance: null, history: [] });
    setViewSnapshotLoading(true);
    try {
      const [balancePayload, historyPayload] = await Promise.all([
        LeaveApi.getBalance(row.personInfoUuid).catch(() => null),
        LeaveApi.getEmployeeRequests(row.personInfoUuid).catch(() => ({
          data: [],
        })),
      ]);
      setViewSnapshot({
        balance: balancePayload || null,
        history: historyPayload?.data || [],
      });
    } catch (error) {
      showError(error);
    } finally {
      setViewSnapshotLoading(false);
    }
  };

  const onOpenReject = (row) => {
    setRejectRequest(row);
    setRejectReason("");
  };

  const onConfirmReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setNotice({
        type: "error",
        message: "Rejection reason is required before rejecting a request.",
      });
      return;
    }

    if (!rejectRequest?.uuid) {
      return;
    }

    setRejectSaving(true);
    try {
      await onDecision(rejectRequest.uuid, "REJECT", reason);
      setRejectRequest(null);
      setRejectReason("");
    } finally {
      setRejectSaving(false);
    }
  };

  const onOpenEmployeeView = async (row) => {
    setEmployeeViewRequest(row);
    setPendingDocumentFiles([]);

    try {
      const payload = await LeaveApi.getRequestDocuments(row.uuid);
      setEmployeeViewRequest((prev) =>
        prev && prev.uuid === row.uuid
          ? { ...prev, documents: payload?.data || [] }
          : prev,
      );
    } catch {
      // Keep modal usable even if document fetch fails.
    }
  };

  const onOpenEdit = async (row) => {
    const normalizedWorkingDays = Math.max(
      1,
      Number.parseInt(String(Math.ceil(Number(row.total_days || 1))), 10),
    );
    const existingDailyPlan = Array.isArray(row.dailyPlan) ? row.dailyPlan : [];
    const normalizedExistingPlan = existingDailyPlan
      .map((item) => ({
        date: item?.date,
        portion:
          item?.portion === LEAVE_DAY_HALF ? LEAVE_DAY_HALF : LEAVE_DAY_FULL,
      }))
      .filter((item) => typeof item.date === "string" && item.date);

    setEditRequest(row);
    setEditRequestForm({
      leaveType: row.leaveType || "Annual",
      startDate: row.startDate || "",
      workingDays: normalizedWorkingDays,
      reason: row.reason || "",
    });

    if (normalizedExistingPlan.length > 0) {
      setEditLeaveDayPlan(normalizedExistingPlan);
      return;
    }

    if (!row.startDate) {
      setEditLeaveDayPlan([]);
      return;
    }

    setEditRequestPlanning(true);
    try {
      const payload = await LeaveApi.previewDates({
        startDate: row.startDate,
        numberOfDays: normalizedWorkingDays,
        leaveType: row.leaveType || "Annual",
        personInfoUuid: row.personInfoUuid || "",
      });
      const previewPayload = payload?.data || payload;
      let workingDates = Array.isArray(previewPayload?.workingDates)
        ? previewPayload.workingDates
        : [];

      if (workingDates.length === 0) {
        const fallbackEndDate = addUtcDaysToIsoDate(row.startDate, 370);
        const holidayPayload = await LeaveApi.getHolidaysInRange({
          startDate: row.startDate,
          endDate: fallbackEndDate,
        }).catch(() => ({ data: [] }));

        const holidayDates = new Set(
          (holidayPayload?.data || [])
            .filter(
              (item) => item.is_active !== false && item.isActive !== false,
            )
            .map(
              (item) =>
                item.gregorianDate || item.holidayDate || item.date || "",
            )
            .filter(Boolean),
        );

        workingDates = buildWorkingDatesFallback(
          row.startDate,
          normalizedWorkingDays,
          holidayDates,
        );
      }

      const generatedPlan = workingDates.map((date, index) => ({
        date,
        portion:
          index === workingDates.length - 1 &&
          !Number.isInteger(Number(row.total_days || 0))
            ? LEAVE_DAY_HALF
            : LEAVE_DAY_FULL,
      }));

      setEditLeaveDayPlan(generatedPlan);
    } catch {
      setEditLeaveDayPlan([]);
    } finally {
      setEditRequestPlanning(false);
    }
  };

  const onPlanEditDays = async () => {
    if (!editRequestForm.startDate) {
      setNotice({
        type: "error",
        message: "Choose a start date before planning edit days.",
      });
      return;
    }

    const plannedWorkingDaysCount = Number.parseInt(
      String(editRequestForm.workingDays),
      10,
    );

    if (
      !Number.isInteger(plannedWorkingDaysCount) ||
      plannedWorkingDaysCount <= 0
    ) {
      setNotice({
        type: "error",
        message: "Working days must be a positive whole number.",
      });
      return;
    }

    setEditRequestPlanning(true);
    try {
      const payload = await LeaveApi.previewDates({
        startDate: editRequestForm.startDate,
        numberOfDays: plannedWorkingDaysCount,
        leaveType: editRequestForm.leaveType,
        personInfoUuid: editRequest?.personInfoUuid || "",
      });
      const previewPayload = payload?.data || payload;
      let workingDates = Array.isArray(previewPayload?.workingDates)
        ? previewPayload.workingDates
        : [];

      if (workingDates.length === 0) {
        const fallbackEndDate = addUtcDaysToIsoDate(
          editRequestForm.startDate,
          370,
        );
        const holidayPayload = await LeaveApi.getHolidaysInRange({
          startDate: editRequestForm.startDate,
          endDate: fallbackEndDate,
        }).catch(() => ({ data: [] }));

        const holidayDates = new Set(
          (holidayPayload?.data || [])
            .filter(
              (item) => item.is_active !== false && item.isActive !== false,
            )
            .map(
              (item) =>
                item.gregorianDate || item.holidayDate || item.date || "",
            )
            .filter(Boolean),
        );

        workingDates = buildWorkingDatesFallback(
          editRequestForm.startDate,
          plannedWorkingDaysCount,
          holidayDates,
        );
      }

      const previousByDate = new Map(
        editLeaveDayPlan.map((item) => [item.date, item.portion]),
      );

      const normalizedPlan = workingDates.map((date) => ({
        date,
        portion: previousByDate.get(date) || LEAVE_DAY_FULL,
      }));

      setEditLeaveDayPlan(normalizedPlan);
      setNotice({
        type: "ok",
        message: "Edit days planned. Review full/half selection and save.",
      });
    } catch (error) {
      showError(error);
    } finally {
      setEditRequestPlanning(false);
    }
  };

  const onSaveEditRequest = async () => {
    if (!editRequest?.uuid) {
      return;
    }

    if (!editRequestForm.startDate) {
      setNotice({ type: "error", message: "Start date is required." });
      return;
    }

    if (editLeaveDayPlan.length === 0) {
      setNotice({
        type: "error",
        message: "Plan days first, then adjust full/half per day.",
      });
      return;
    }

    const plannedWorkingDaysCount = Number.parseInt(
      String(editRequestForm.workingDays),
      10,
    );

    if (
      !Number.isInteger(plannedWorkingDaysCount) ||
      plannedWorkingDaysCount <= 0
    ) {
      setNotice({
        type: "error",
        message: "Working days must be a positive whole number.",
      });
      return;
    }

    if (!isHalfStepPositiveNumber(editRequestedDaysFromPlan)) {
      setNotice({
        type: "error",
        message: "Selected edit plan is invalid. Check full/half choices.",
      });
      return;
    }

    setEditRequestSaving(true);
    try {
      await LeaveApi.updateRequest(editRequest.uuid, {
        leaveType: editRequestForm.leaveType,
        startDate: editRequestForm.startDate,
        numberOfDays: editRequestedDaysFromPlan,
        dailyPlan: editLeaveDayPlan,
      });

      await refreshAdminRequests(false);
      setEditRequest(null);
      setEditLeaveDayPlan([]);
      setNotice({ type: "ok", message: "Request updated successfully." });
    } catch (error) {
      showError(error);
    } finally {
      setEditRequestSaving(false);
    }
  };

  const isDocumentEditableStatus = (status) =>
    status === "PENDING" || status === "PENDING_DEPARTMENT";

  const refreshViewedRequestDocuments = async () => {
    if (!employeeViewRequest?.uuid) {
      return;
    }

    const payload = await LeaveApi.getRequestDocuments(
      employeeViewRequest.uuid,
    );
    const documents = payload?.data || [];

    setEmployeeViewRequest((prev) =>
      prev && prev.uuid === employeeViewRequest.uuid
        ? { ...prev, documents }
        : prev,
    );

    setHistory((prev) =>
      prev.map((row) =>
        row.uuid === employeeViewRequest.uuid ? { ...row, documents } : row,
      ),
    );
  };

  const onAddDocumentsToViewedRequest = async () => {
    if (!employeeViewRequest?.uuid || pendingDocumentFiles.length === 0) {
      return;
    }

    setDocumentActionLoading(true);
    try {
      await LeaveApi.addRequestDocuments(
        employeeViewRequest.uuid,
        pendingDocumentFiles,
      );
      setPendingDocumentFiles([]);
      await refreshViewedRequestDocuments();
      setNotice({ type: "ok", message: "Documents uploaded successfully." });
    } catch (error) {
      showError(error);
    } finally {
      setDocumentActionLoading(false);
    }
  };

  const onDeleteDocumentFromViewedRequest = async (documentUuid) => {
    if (!employeeViewRequest?.uuid || !documentUuid) {
      return;
    }

    setDocumentActionLoading(true);
    try {
      await LeaveApi.deleteRequestDocument(
        employeeViewRequest.uuid,
        documentUuid,
      );
      await refreshViewedRequestDocuments();
      setNotice({ type: "ok", message: "Document deleted successfully." });
    } catch (error) {
      showError(error);
    } finally {
      setDocumentActionLoading(false);
    }
  };

  const onReplaceDocumentInViewedRequest = async (documentUuid, file) => {
    if (!employeeViewRequest?.uuid || !documentUuid || !file) {
      return;
    }

    setDocumentActionLoading(true);
    try {
      await LeaveApi.replaceRequestDocument(
        employeeViewRequest.uuid,
        documentUuid,
        file,
      );
      await refreshViewedRequestDocuments();
      setNotice({ type: "ok", message: "Document replaced successfully." });
    } catch (error) {
      showError(error);
    } finally {
      setDocumentActionLoading(false);
    }
  };

  const onOpenShorten = (row) => {
    const initial = Math.max(0.5, Number(row.total_days || 1) - 0.5);
    const split = splitDaysForForm(initial);
    setShortenRequest(row);
    setShortenWholeDays(split.wholeDays);
    setShortenReturnDayType(split.returnDayType);
  };

  const onSaveShorten = async () => {
    if (!shortenRequest?.uuid) {
      return;
    }

    const nextDays = buildDaysFromWholeAndReturnType(
      shortenWholeDays,
      shortenReturnDayType,
    );
    const oldDays = Number(shortenRequest.total_days || 0);

    if (!isHalfStepPositiveNumber(nextDays)) {
      setNotice({
        type: "error",
        message: "Updated days must be positive and in 0.5 increments.",
      });
      return;
    }

    if (nextDays >= oldDays) {
      setNotice({
        type: "error",
        message: "Updated days should be shorter than currently approved days.",
      });
      return;
    }

    setShortenSaving(true);
    try {
      const payload = await LeaveApi.shortenApprovedRequest({
        uuid: shortenRequest.uuid,
        personInfoUuid,
        newTotalDays: nextDays,
      });
      const shortened = payload?.data || {};
      const refundedDays = formatDayValue(shortened.refundedDays);
      const updatedDays = formatDayValue(shortened.updatedApprovedDays);
      const remainingDays = formatDayValue(shortened?.balance?.remainingDays);

      setNotice({
        type: "ok",
        message: `Approved leave shortened to ${updatedDays} day(s). Refunded: ${refundedDays}. Remaining balance: ${remainingDays}.`,
      });
      setShortenRequest(null);
      loadEmployeeData();
    } catch (error) {
      showError(error);
    } finally {
      setShortenSaving(false);
    }
  };

  const onOpenPolicyView = async (policy) => {
    setPolicyViewLoading(true);
    try {
      const payload = await LeaveApi.getPolicy(policy.leaveType);
      setPolicyView(payload?.data || policy);
    } catch (error) {
      showError(error);
    } finally {
      setPolicyViewLoading(false);
    }
  };

  const onOpenPolicyEdit = (policy) => {
    setPolicyEdit(policy);
    setPolicyForm({
      leaveType: policy.leaveType,
      baseDays: policy.baseDays,
      incrementPerYear: policy.incrementPerYear,
      maxDays: policy.maxDays,
      eligibilityMonths: policy.eligibilityMonths,
      useBudgetYear:
        policy.useBudgetYear !== false && policy.useBudgetYear !== 0,
    });
  };

  const onPolicySave = async () => {
    setPolicySaving(true);
    try {
      await LeaveApi.updatePolicy({
        ...policyForm,
        baseDays: Number(policyForm.baseDays),
        incrementPerYear: Number(policyForm.incrementPerYear),
        maxDays: Number(policyForm.maxDays),
        eligibilityMonths: Number(policyForm.eligibilityMonths),
        useBudgetYear: Boolean(policyForm.useBudgetYear),
      });
      setNotice({ type: "ok", message: "Policy updated." });
      setPolicyEdit(null);
      loadAdminData(Number(holidayFilters.year) || currentYear);
    } catch (error) {
      showError(error);
    } finally {
      setPolicySaving(false);
    }
  };

  const onHolidaySave = async () => {
    setHolidaySaving(true);
    try {
      const payload = {
        date: holidayForm.date,
        name: holidayForm.name,
        type: holidayForm.type,
        calendarYear: holidayForm.calendarYear || undefined,
        isActive: holidayForm.isActive,
        description: holidayForm.description,
      };

      if (holidayForm.uuid) {
        await LeaveApi.updateHoliday(holidayForm.uuid, payload);
      } else {
        await LeaveApi.createHoliday(payload);
      }

      setNotice({
        type: "ok",
        message: holidayForm.uuid ? "Holiday updated." : "Holiday created.",
      });
      resetHolidayForm();
      setShowHolidayForm(false);
      loadAdminData(Number(holidayFilters.year) || currentYear);
    } catch (error) {
      showError(error);
    } finally {
      setHolidaySaving(false);
    }
  };

  const onHolidayEdit = (holiday) => {
    setHolidayForm({
      uuid: holiday.uuid || "",
      date: holiday.gregorianDate || "",
      name: holiday.name || "",
      type: holiday.type || "PUBLIC",
      calendarYear: holiday.calendarYear || "",
      isActive: holiday.is_active !== false,
      description: holiday.description || "",
    });
    setShowHolidayForm(true);
  };

  const onHolidayDelete = async (holiday) => {
    try {
      if (!holiday.uuid) {
        setNotice({
          type: "error",
          message: "This holiday cannot be deleted because uuid is missing.",
        });
        return;
      }

      dialog.showDeleteConfirm(
        `Delete ${holiday.name} on ${formatDisplayDate(holiday.gregorianDate)}? This is permanent.`,
        async () => {
          try {
            await LeaveApi.deleteHoliday(holiday.uuid);
            setNotice({ type: "ok", message: "Holiday deleted." });
            if (holidayForm.uuid === holiday.uuid) {
              resetHolidayForm();
            }
            loadAdminData(Number(holidayFilters.year) || currentYear);
          } catch (error) {
            showError(error);
          }
        },
        {
          title: "Delete Holiday",
          confirmText: "Delete",
        }
      );
    } catch (error) {
      showError(error);
    }
  };

  const employeeHistoryColumns = [
    { key: "leaveType", label: "Type" },
    {
      key: "startDate",
      label: "Start",
      render: (row) => formatDisplayDate(row.startDate),
    },
    {
      key: "endDate",
      label: "End",
      render: (row) => formatDisplayDate(row.endDate),
    },
    {
      key: "total_days",
      label: "Days",
      render: (row) => formatDayValue(row.total_days),
    },
    {
      key: "dayPattern",
      label: "Day Type",
      render: (row) => getDayPatternLabel(row),
    },
    {
      key: "documents",
      label: "Docs",
      render: (row) => row.documents?.length || 0,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            className={btnNeutralGhostClass}
            onClick={() => onOpenEmployeeView(row)}
          >
            View
          </button>
          {row.status === "APPROVED" ? (
            <button
              className={btnApproveGhostClass}
              onClick={() => onOpenShorten(row)}
            >
              Shorten Days
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const pendingColumns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) =>
        row.full_name || row.personInfoUuid || "Unknown Employee",
    },
    {
      key: "budgetYear",
      label: "Budget Year",
      render: (row) => row.budgetYear || "--",
    },
    { key: "leaveType", label: "Type" },
    {
      key: "total_days",
      label: "Days",
      render: (row) => formatDayValue(row.total_days),
    },
    {
      key: "dayPattern",
      label: "Day Type",
      render: (row) => getDayPatternLabel(row),
    },
    {
      key: "range",
      label: "Range",
      render: (row) =>
        `${formatDisplayDate(row.startDate)} - ${formatDisplayDate(row.endDate)}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            className={btnNeutralGhostClass}
            onClick={() => onOpenView(row)}
          >
            View
          </button>
          {isActiveRequestStatus(row.status) ? (
            <>
              <button
                className={btnNeutralGhostClass}
                onClick={() => onOpenEdit(row)}
                disabled={decisionLoadingUuid === row.uuid}
              >
                Edit
              </button>
              <button
                className={btnApproveGhostClass}
                onClick={() => onDecision(row.uuid, "APPROVE")}
                disabled={decisionLoadingUuid === row.uuid}
              >
                {decisionLoadingUuid === row.uuid ? "Working..." : "Approve"}
              </button>
              <button
                className={btnRejectGhostClass}
                onClick={() => onOpenReject(row)}
                disabled={decisionLoadingUuid === row.uuid}
              >
                Reject
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const policyColumns = [
    { key: "leaveType", label: "Leave Category" },
    { key: "baseDays", label: "Starting Days" },
    { key: "incrementPerYear", label: "Annual Increase" },
    { key: "maxDays", label: "Maximum Days" },
    { key: "eligibilityMonths", label: "Eligibility (Months)" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            className={btnNeutralGhostClass}
            onClick={() => onOpenPolicyView(row)}
          >
            View
          </button>
          <button
            className={btnApproveGhostClass}
            onClick={() => onOpenPolicyEdit(row)}
          >
            Update
          </button>
        </div>
      ),
    },
  ];

  const holidayColumns = [
    {
      key: "gregorianDate",
      label: "Date",
      render: (row) => formatDisplayDate(row.gregorianDate),
    },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.is_active !== false
              ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
              : "border border-slate-300 bg-slate-100 text-slate-700"
          }`}
        >
          {row.is_active !== false ? "ACTIVE" : "INACTIVE"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            className={btnNeutralGhostClass}
            onClick={() => onHolidayEdit(row)}
          >
            Edit
          </button>
          <button
            className={btnRejectGhostClass}
            onClick={() => onHolidayDelete(row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const appendRequestDocuments = (incomingFiles) => {
    const nextFiles = Array.from(incomingFiles || []);
    if (nextFiles.length === 0) {
      return;
    }

    setRequestForm((state) => ({
      ...state,
      supportingDocuments: [...state.supportingDocuments, ...nextFiles],
    }));
  };

  const stopCameraStream = () => {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  };

  const openCamera = () => {
    setCameraError("");
    setCameraOpen(true);
  };

  const closeCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraError("");
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is not ready yet. Please wait and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture image from camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Camera capture failed. Please try again.");
          return;
        }

        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        appendRequestDocuments([file]);
        closeCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  useEffect(() => {
    if (!cameraOpen) {
      return undefined;
    }

    let disposed = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This browser does not support direct camera capture. Use file upload instead.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (disposed) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setCameraError(
          "Unable to access camera. Check browser permission and use HTTPS/localhost.",
        );
      }
    };

    start();

    return () => {
      disposed = true;
      stopCameraStream();
    };
  }, [cameraOpen]);

  useEffect(() => {
    const urls = requestForm.supportingDocuments.map((file) =>
      file?.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    );
    setRequestDocumentPreviewUrls(urls);

    return () => {
      for (const url of urls) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [requestForm.supportingDocuments]);

  const adminHistoryColumns = [
    { key: "leaveType", label: "Type" },
    {
      key: "startDate",
      label: "Start",
      render: (row) => formatDisplayDate(row.startDate),
    },
    {
      key: "endDate",
      label: "End",
      render: (row) => formatDisplayDate(row.endDate),
    },
    {
      key: "total_days",
      label: "Days",
      render: (row) => formatDayValue(row.total_days),
    },
    {
      key: "dayPattern",
      label: "Day Type",
      render: (row) => getDayPatternLabel(row),
    },
    {
      key: "documents",
      label: "Docs",
      render: (row) => row.documents?.length || 0,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="leave-bg min-h-screen w-full px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-[1200px] space-y-4">
        {/* Navigation Bar */}
        {onNavigateBack && (
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateBack}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0b5d4a] shadow-md transition hover:bg-[#e6f3ee] flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Dashboard
            </button>
          </div>
        )}

        <section className="rounded-2xl bg-[linear-gradient(120deg,#0b5d4a,#0d4a3d)] p-6 text-white shadow-[0_16px_35px_rgba(8,45,36,0.38)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Leave Management
              </h1>
              <p className="mt-1 text-emerald-100">
                View your leave history and request new leave
              </p>
            </div>
            <div className="rounded-lg bg-white/15 p-1">
              <Tabs
                tabs={[
                  { value: "employee", label: "Employee" },
                  { value: "admin", label: "Admin" },
                ]}
                active={role}
                onChange={setRole}
              />
            </div>
          </div>
        </section>

        <section className={panelClass}>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="text-sm font-semibold text-slate-600">
              Employee UUID
              <input
                className={`${fieldClass} mt-1`}
                value={personInfoUuid}
                onChange={(e) => setPersonInfoUuid(e.target.value)}
                placeholder="emp-2001"
              />
            </label>
            <button
              className={`${btnMutedClass} md:mt-6`}
              onClick={() => {
                if (role === "employee") {
                  loadEmployeeData();
                } else {
                  loadAdminData(Number(holidayFilters.year) || currentYear);
                }
              }}
            >
              Refresh
            </button>
          </div>
        </section>

        {role === "employee" ? (
          <>
            {employeeLoading ? (
              <LoadingBlock text="Loading employee section..." />
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <article className={panelClass}>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Entitled
                </p>
                <p className="text-3xl font-black text-brand-900">
                  {formatDayValue(balance?.entitledDays)}
                </p>
              </article>
              <article className={panelClass}>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Carried Forward
                </p>
                <p className="text-3xl font-black text-brand-900">
                  {formatDayValue(balance?.carriedForward)}
                </p>
              </article>
              <article className={panelClass}>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Remaining
                </p>
                <p className="text-3xl font-black text-brand-900">
                  {formatDayValue(balance?.remainingDays)}
                </p>
              </article>
            </div>

            <div className={`${panelClass} flex gap-2`}>
              <Tabs
                tabs={[
                  { value: "request", label: "REQUEST LEAVE" },
                  { value: "history", label: "LEAVE HISTORY" },
                ]}
                active={employeeTab}
                onChange={setEmployeeTab}
              />
            </div>

            {employeeTab === "request" ? (
              <section className="leave-request-shell rounded-[8px] border border-slate-200 bg-white p-4 shadow-[0_0_28px_rgba(15,23,42,0.08)] md:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex min-h-[540px] flex-col gap-3 border-r border-slate-200 pr-0 md:pr-5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Leave Type
                      <select
                        className={`${fieldClass} mt-1 bg-[#fbfcfb]`}
                        value={requestForm.leaveType}
                        onChange={(e) =>
                          setRequestForm((s) => ({
                            ...s,
                            leaveType: e.target.value,
                          }))
                        }
                      >
                        <option>Annual</option>
                        <option>Sick</option>
                        <option>Paternity</option>
                        <option>Maternity</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start Date
                      <div className="mt-1">
                        <PrettyDatePicker
                          value={requestForm.startDate}
                          onChange={(value) =>
                            setRequestForm((s) => {
                              setLeaveDayPlan([]);
                              setPreview(null);
                              return {
                                ...s,
                                startDate: value,
                              };
                            })
                          }
                          placeholder="Choose start date"
                        />
                      </div>
                    </label>

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Working Days
                      <input
                        className={`${fieldClass} mt-1 bg-[#fbfcfb]`}
                        type="number"
                        min="1"
                        step="1"
                        value={requestForm.numberOfDays}
                        onChange={(e) =>
                          setRequestForm((s) => {
                            setLeaveDayPlan([]);
                            setPreview(null);
                            return {
                              ...s,
                              numberOfDays: e.target.value,
                            };
                          })
                        }
                      />
                    </label>

                    <div className="-mt-1">
                      <button
                        className={btnMutedClass}
                        onClick={onPlanDays}
                        disabled={previewLoading}
                      >
                        {previewLoading ? "Planning..." : "Plan Days"}
                      </button>
                    </div>

                    {leaveDayPlan.length > 0 ? (
                      <section className="rounded-[8px] border border-slate-300 bg-[#fbfcfb] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Day-by-Day Plan
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                              onClick={() =>
                                setAllLeaveDayPortions(LEAVE_DAY_FULL)
                              }
                              disabled={leaveDayPlan.length === 0}
                            >
                              Select All Full
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                              onClick={() =>
                                setAllLeaveDayPortions(LEAVE_DAY_HALF)
                              }
                              disabled={leaveDayPlan.length === 0}
                            >
                              Select All Half
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                          {leaveDayPlan.map((item, index) => (
                            <div
                              key={item.date}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">
                                  Day {index + 1}
                                </p>
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {formatLeavePlanDate(item.date)}
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <label className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                                  <input
                                    type="radio"
                                    name={`leave-day-${item.date}`}
                                    checked={item.portion === LEAVE_DAY_FULL}
                                    onChange={() =>
                                      updateLeaveDayPortion(
                                        item.date,
                                        LEAVE_DAY_FULL,
                                      )
                                    }
                                  />
                                  Full
                                </label>
                                <label className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                                  <input
                                    type="radio"
                                    name={`leave-day-${item.date}`}
                                    checked={item.portion === LEAVE_DAY_HALF}
                                    onChange={() =>
                                      updateLeaveDayPortion(
                                        item.date,
                                        LEAVE_DAY_HALF,
                                      )
                                    }
                                  />
                                  Half
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[#0b5d4a]">
                          Requested Leave Days:{" "}
                          {formatDayValue(requestedDaysFromForm)}
                        </p>
                      </section>
                    ) : null}

                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reason
                      <textarea
                        className={`${fieldClass} mt-1 min-h-28 bg-[#fbfcfb]`}
                        value={requestForm.reason}
                        onChange={(e) =>
                          setRequestForm((s) => ({
                            ...s,
                            reason: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="mt-auto hidden flex-wrap gap-2 md:flex">
                      <button
                        className={btnMutedClass}
                        onClick={onPreview}
                        disabled={previewLoading || leaveDayPlan.length === 0}
                      >
                        {previewLoading ? "Previewing..." : "Preview"}
                      </button>
                      <button
                        className={btnPrimaryClass}
                        onClick={onSubmitRequest}
                        disabled={submitLoading}
                      >
                        {submitLoading ? "Submitting..." : "Submit"}
                      </button>
                    </div>

                    {leaveDayPlan.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Click Plan Days to calculate holiday-adjusted working
                        days, then choose Full/Half per day.
                      </p>
                    ) : null}

                    {preview ? (
                      <div className="hidden rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:block">
                        <p className="mb-1 font-semibold text-emerald-900">
                          Confirmation Preview
                        </p>
                        Calculated End Date:{" "}
                        <strong>
                          {formatDisplayDate(
                            preview.calculatedEndDate || preview.endDate || "",
                          )}
                        </strong>{" "}
                        | Working Days:{" "}
                        <strong>
                          {formatDayValue(
                            preview.confirmedWorkingDays ||
                              preview.actualWorkingDays ||
                              requestedDaysFromForm,
                          )}
                        </strong>
                        {preview.confirmation ? (
                          <div className="mt-2 border-t border-emerald-200 pt-2 text-xs text-emerald-900">
                            <p>
                              Full Days:{" "}
                              <strong>{preview.confirmation.fullDays}</strong>
                              {" | "}
                              Half Days:{" "}
                              <strong>{preview.confirmation.halfDays}</strong>
                              {" | "}
                              Submitted Total:{" "}
                              <strong>
                                {formatDayValue(
                                  preview.confirmation.totalSubmittedDays,
                                )}
                              </strong>
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative flex min-h-[540px] flex-col gap-4 pl-0 md:pl-5">
                    <span className="pointer-events-none absolute right-3 top-4 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Sick Leave
                    </span>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[120px] font-black text-emerald-100/60">
                      +
                    </div>

                    <div
                      className="relative z-10 flex flex-1 flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-slate-300 bg-white/80 p-6 text-center"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        appendRequestDocuments(event.dataTransfer?.files || []);
                      }}
                    >
                      <svg
                        width="66"
                        height="66"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="mb-3 text-slate-400"
                      >
                        <path
                          d="M7 18C4.79086 18 3 16.2091 3 14C3 12.1362 4.27477 10.5702 6 10.126C6.56329 7.22635 9.0493 5 12.1111 5C15.5944 5 18.4181 7.82373 18.4181 11.307C20.5176 11.5822 22 13.3594 22 15.4794C22 17.8091 20.1119 19.6971 17.7822 19.6971H8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12 20V12M12 12L9 15M12 12L15 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-sm font-semibold text-slate-700">
                        Drag and drop supporting documents here
                      </p>
                      <p className="mt-1 text-xs italic text-slate-500">
                        Supported: PDF, PNG, JPG (Max 10MB)
                      </p>

                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          onClick={() => {
                            setDocumentInputMode("camera");
                            openCamera();
                          }}
                        >
                          Capture Camera
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          onClick={() => {
                            setDocumentInputMode("file");
                            browseInputRef.current?.click();
                          }}
                        >
                          Browse Files
                        </button>
                      </div>

                      <input
                        ref={browseInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => appendRequestDocuments(e.target.files)}
                      />
                    </div>

                    {requestForm.supportingDocuments.length > 0 ? (
                      <div className="relative z-10 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-600">
                          {requestForm.supportingDocuments.length} file(s)
                          selected
                        </p>
                        <div className="mt-2 space-y-3">
                          {requestForm.supportingDocuments.map(
                            (file, index) => (
                              <div
                                key={`${file.name}-${index}`}
                                className="rounded border border-slate-200 bg-white"
                              >
                                {requestDocumentPreviewUrls[index] ? (
                                  <div className="w-full p-3 bg-slate-50">
                                    <img
                                      src={requestDocumentPreviewUrls[index]}
                                      alt={file.name}
                                      style={{
                                        width: '100%',
                                        height: 'auto',
                                        maxHeight: '500px',
                                        objectFit: 'contain',
                                        display: 'block'
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-28 items-center justify-center bg-slate-100 px-3 text-center text-xs text-slate-600">
                                    {file.name}
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-white border-t border-slate-200">
                                  <span className="text-slate-700 font-medium">
                                    {file.name}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-red-600 hover:text-red-700 font-semibold px-2 py-1"
                                    onClick={() =>
                                      setRequestForm((state) => ({
                                        ...state,
                                        supportingDocuments:
                                          state.supportingDocuments.filter(
                                            (_, itemIndex) =>
                                              itemIndex !== index,
                                          ),
                                      }))
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                      <button
                        className={btnMutedClass}
                        onClick={onPreview}
                        disabled={previewLoading || leaveDayPlan.length === 0}
                      >
                        {previewLoading ? "Previewing..." : "Preview"}
                      </button>
                      <button
                        className={btnPrimaryClass}
                        onClick={onSubmitRequest}
                        disabled={submitLoading}
                      >
                        {submitLoading ? "Submitting..." : "Submit"}
                      </button>
                    </div>

                    {preview ? (
                      <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:hidden">
                        Calculated End Date:{" "}
                        <strong>
                          {formatDisplayDate(
                            preview.calculatedEndDate || preview.endDate || "",
                          )}
                        </strong>{" "}
                        | Working Days:{" "}
                        <strong>
                          {formatDayValue(
                            preview.confirmedWorkingDays ||
                              preview.actualWorkingDays ||
                              requestedDaysFromForm,
                          )}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <section className={panelClass}>
                <DataTable
                  columns={employeeHistoryColumns}
                  rows={history}
                  rowKey={(row) => row.uuid}
                  loading={employeeLoading}
                  emptyText="No leave history found."
                />
              </section>
            )}
          </>
        ) : (
          <>
            <div className={`${panelClass} flex gap-2`}>
              <Tabs
                tabs={[
                  { value: "manage", label: "MANAGE LEAVE" },
                  { value: "policy", label: "LEAVE POLICY" },
                  { value: "holiday", label: "HOLIDAYS" },
                ]}
                active={adminTab}
                onChange={setAdminTab}
              />
            </div>

            {adminTab === "manage" ? (
              <section className={`${panelClass} space-y-3`}>
                <div className="grid gap-3 md:grid-cols-5">
                  <label className="text-sm font-semibold text-slate-600">
                    Request Set
                    <select
                      className={`${fieldClass} mt-1`}
                      value={manageFilters.requestWindow}
                      onChange={(e) =>
                        setManageFilters((s) => ({
                          ...s,
                          requestWindow: e.target.value,
                        }))
                      }
                    >
                      <option value="ACTIVE">Active Requests</option>
                      <option value="PAST">Past Requests</option>
                      <option value="ALL">All Requests</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Budget Year
                    <select
                      className={`${fieldClass} mt-1`}
                      value={manageFilters.budgetYear}
                      onChange={(e) =>
                        setManageFilters((s) => ({
                          ...s,
                          budgetYear: e.target.value,
                        }))
                      }
                    >
                      <option value="ALL">All</option>
                      {manageBudgetYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Status
                    <select
                      className={`${fieldClass} mt-1`}
                      value={manageFilters.status}
                      onChange={(e) =>
                        setManageFilters((s) => ({
                          ...s,
                          status: e.target.value,
                        }))
                      }
                    >
                      <option value="ALL">All</option>
                      <option value="PENDING">PENDING</option>
                      <option value="PENDING_DEPARTMENT">
                        PENDING_DEPARTMENT
                      </option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Leave Type
                    <select
                      className={`${fieldClass} mt-1`}
                      value={manageFilters.leaveType}
                      onChange={(e) =>
                        setManageFilters((s) => ({
                          ...s,
                          leaveType: e.target.value,
                        }))
                      }
                    >
                      <option value="ALL">All</option>
                      {manageLeaveTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Employee
                    <input
                      className={`${fieldClass} mt-1`}
                      value={manageFilters.employee}
                      onChange={(e) =>
                        setManageFilters((s) => ({
                          ...s,
                          employee: e.target.value,
                        }))
                      }
                      placeholder="Filter by employee name or UUID"
                    />
                  </label>
                </div>

                {pendingLoading ? (
                  <LoadingBlock text="Loading pending requests..." />
                ) : null}

                <DataTable
                  columns={pendingColumns}
                  rows={filteredPending}
                  rowKey={(row) => row.uuid}
                  loading={pendingLoading}
                  emptyText="No requests found for selected filters."
                />
              </section>
            ) : null}

            {adminTab === "policy" ? (
              <section className={panelClass}>
                {policyLoading ? (
                  <LoadingBlock text="Loading policy records..." />
                ) : null}
                <DataTable
                  columns={policyColumns}
                  rows={policies}
                  rowKey={(row) => row.uuid || row.leaveType}
                  loading={policyLoading}
                  emptyText="No leave policies found."
                />
              </section>
            ) : null}

            {adminTab === "holiday" ? (
              <section
                className={`grid gap-4 ${
                  showHolidayForm
                    ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]"
                    : "md:grid-cols-1"
                }`}
              >
                <div className={`${panelClass} space-y-3 lg:min-w-0`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">
                        Holiday List
                      </h3>
                      <p className="text-xs text-slate-500">
                        {filteredHolidays.length} record(s) shown
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {showHolidayForm ? (
                        <button
                          className={btnMutedClass}
                          onClick={() => {
                            resetHolidayForm();
                            setShowHolidayForm(false);
                          }}
                        >
                          Close Form
                        </button>
                      ) : null}
                      <button
                        className={btnPrimaryClass}
                        onClick={() => {
                          setShowHolidayForm((open) => {
                            const next = !open;
                            if (next && !holidayForm.uuid) {
                              resetHolidayForm();
                            }
                            return next;
                          });
                        }}
                      >
                        {showHolidayForm ? "New Holiday" : "Add Holiday"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-600">
                      Year
                      <input
                        className={`${fieldClass} mt-1`}
                        value={holidayFilters.year}
                        onChange={(e) =>
                          setHolidayFilters((s) => ({
                            ...s,
                            year: e.target.value,
                          }))
                        }
                        placeholder="Gregorian year"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-600">
                      Type
                      <select
                        className={`${fieldClass} mt-1`}
                        value={holidayFilters.type}
                        onChange={(e) =>
                          setHolidayFilters((s) => ({
                            ...s,
                            type: e.target.value,
                          }))
                        }
                      >
                        <option value="ALL">All</option>
                        <option value="PUBLIC">PUBLIC</option>
                        <option value="RELIGIOUS">RELIGIOUS</option>
                        <option value="SPECIAL">SPECIAL</option>
                        <option value="ETHIOPIAN">ETHIOPIAN</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-600">
                      Status
                      <select
                        className={`${fieldClass} mt-1`}
                        value={holidayFilters.status}
                        onChange={(e) =>
                          setHolidayFilters((s) => ({
                            ...s,
                            status: e.target.value,
                          }))
                        }
                      >
                        <option value="ALL">All</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-600">
                      Search
                      <input
                        className={`${fieldClass} mt-1`}
                        value={holidayFilters.keyword}
                        onChange={(e) =>
                          setHolidayFilters((s) => ({
                            ...s,
                            keyword: e.target.value,
                          }))
                        }
                        placeholder="Name or date"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-600">
                      Start Date
                      <div className="mt-1">
                        <PrettyDatePicker
                          value={holidayFilters.startDate}
                          onChange={(value) =>
                            setHolidayFilters((s) => ({
                              ...s,
                              startDate: value,
                            }))
                          }
                          placeholder="Start filter date"
                        />
                      </div>
                    </label>
                    <label className="text-sm font-semibold text-slate-600">
                      End Date
                      <div className="mt-1">
                        <PrettyDatePicker
                          value={holidayFilters.endDate}
                          onChange={(value) =>
                            setHolidayFilters((s) => ({
                              ...s,
                              endDate: value,
                            }))
                          }
                          placeholder="End filter date"
                        />
                      </div>
                    </label>
                  </div>

                  {holidayLoading ? (
                    <LoadingBlock text="Loading holidays..." />
                  ) : null}

                  <DataTable
                    columns={holidayColumns}
                    rows={filteredHolidays}
                    rowKey={(row) =>
                      row.uuid || `${row.gregorianDate}-${row.name}`
                    }
                    loading={holidayLoading}
                    emptyText="No holidays found for selected filters."
                  />
                </div>

                {showHolidayForm ? (
                  <div className={`${panelClass} h-fit lg:sticky lg:top-5`}>
                    <div className="mb-3 border-b border-slate-200 pb-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {holidayForm.uuid ? "Edit Holiday" : "Create Holiday"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fill in the fields and save. This panel stays docked
                        while browsing the list.
                      </p>
                    </div>
                    <HolidayForm
                      value={holidayForm}
                      onChange={setHolidayForm}
                      onSave={onHolidaySave}
                      onCancelEdit={() => {
                        resetHolidayForm();
                        setShowHolidayForm(false);
                      }}
                      loading={holidaySaving}
                    />
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>

      <ModalShell
        open={Boolean(viewRequest)}
        title="Leave Request Details"
        subtitle={
          viewRequest
            ? `${viewRequest.full_name || viewRequest.personInfoUuid} | ${viewRequest.leaveType}`
            : ""
        }
        onClose={() => setViewRequest(null)}
      >
        {viewSnapshotLoading ? (
          <LoadingBlock text="Loading employee balance and history..." />
        ) : (
          <div className="space-y-4">
            {viewRequest && <LeaveRequestDetailCard request={viewRequest} showEmployeeInfo={true} />}

            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Entitled
                </p>
                <p className="text-2xl font-black text-brand-900">
                  {formatDayValue(viewSnapshot.balance?.entitledDays)}
                </p>
              </article>
              <article className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Used
                </p>
                <p className="text-2xl font-black text-brand-900">
                  {formatDayValue(viewSnapshot.balance?.usedDays)}
                </p>
              </article>
              <article className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Remaining
                </p>
                <p className="text-2xl font-black text-brand-900">
                  {formatDayValue(viewSnapshot.balance?.remainingDays)}
                </p>
              </article>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                Leave History
              </h4>
              <DataTable
                columns={adminHistoryColumns}
                rows={viewSnapshot.history}
                rowKey={(row) => row.uuid}
                loading={false}
                emptyText="No leave history found for this employee."
              />
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={Boolean(editRequest)}
        title="Edit Leave Request"
        subtitle={
          editRequest
            ? `${editRequest.full_name || editRequest.personInfoUuid} | ${editRequest.leaveType}`
            : ""
        }
        onClose={() => {
          if (editRequestSaving) {
            return;
          }
          setEditRequest(null);
          setEditLeaveDayPlan([]);
        }}
      >
        {editRequest ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Request UUID
                </p>
                <p className="font-semibold text-slate-900 break-all">
                  {editRequest.uuid}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Current Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={editRequest.status} />
                </div>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Reason (Read Only)
                </p>
                <p className="mt-1 text-slate-800">
                  {editRequestForm.reason || "No reason provided."}
                </p>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Leave Type
                <select
                  className={`${fieldClass} mt-1`}
                  value={editRequestForm.leaveType}
                  onChange={(e) =>
                    setEditRequestForm((prev) => ({
                      ...prev,
                      leaveType: e.target.value,
                    }))
                  }
                  disabled={editRequestSaving}
                >
                  <option>Annual</option>
                  <option>Sick</option>
                  <option>Paternity</option>
                  <option>Maternity</option>
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start Date
                <div className="mt-1">
                  <PrettyDatePicker
                    value={editRequestForm.startDate}
                    onChange={(value) => {
                      setEditLeaveDayPlan([]);
                      setEditRequestForm((prev) => ({
                        ...prev,
                        startDate: value,
                      }));
                    }}
                  />
                </div>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Working Days
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min="1"
                  step="1"
                  value={editRequestForm.workingDays}
                  onChange={(e) => {
                    setEditLeaveDayPlan([]);
                    setEditRequestForm((prev) => ({
                      ...prev,
                      workingDays: e.target.value,
                    }));
                  }}
                  disabled={editRequestSaving}
                />
              </label>
            </div>

            <div>
              <button
                className={btnMutedClass}
                onClick={onPlanEditDays}
                disabled={editRequestPlanning || editRequestSaving}
              >
                {editRequestPlanning ? "Planning..." : "Plan Days"}
              </button>
            </div>

            {editLeaveDayPlan.length > 0 ? (
              <section className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Day-by-Day Plan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => setAllEditLeaveDayPortions(LEAVE_DAY_FULL)}
                      disabled={editRequestSaving}
                    >
                      Select All Full
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      onClick={() => setAllEditLeaveDayPortions(LEAVE_DAY_HALF)}
                      disabled={editRequestSaving}
                    >
                      Select All Half
                    </button>
                  </div>
                </div>

                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {editLeaveDayPlan.map((item, index) => (
                    <div
                      key={`${item.date}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          Day {index + 1}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {formatLeavePlanDate(item.date)}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <label className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                          <input
                            type="radio"
                            name={`edit-day-${item.date}`}
                            checked={item.portion === LEAVE_DAY_FULL}
                            onChange={() =>
                              updateEditLeaveDayPortion(
                                item.date,
                                LEAVE_DAY_FULL,
                              )
                            }
                            disabled={editRequestSaving}
                          />
                          Full
                        </label>
                        <label className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                          <input
                            type="radio"
                            name={`edit-day-${item.date}`}
                            checked={item.portion === LEAVE_DAY_HALF}
                            onChange={() =>
                              updateEditLeaveDayPortion(
                                item.date,
                                LEAVE_DAY_HALF,
                              )
                            }
                            disabled={editRequestSaving}
                          />
                          Half
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-sm font-semibold text-[#0b5d4a]">
                  Updated Requested Days:{" "}
                  {formatDayValue(editRequestedDaysFromPlan)}
                </p>
              </section>
            ) : (
              <p className="text-sm text-slate-500">
                Click Plan Days to generate holiday-adjusted working dates.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                className={btnMutedClass}
                onClick={() => {
                  if (editRequestSaving) {
                    return;
                  }
                  setEditRequest(null);
                  setEditLeaveDayPlan([]);
                }}
                disabled={editRequestSaving}
              >
                Cancel
              </button>
              <button
                className={btnPrimaryClass}
                onClick={onSaveEditRequest}
                disabled={editRequestSaving || editRequestPlanning}
              >
                {editRequestSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={Boolean(rejectRequest)}
        title="Reject Leave Request"
        subtitle={
          rejectRequest ? `Employee: ${rejectRequest.personInfoUuid}` : ""
        }
        onClose={() => {
          setRejectRequest(null);
          setRejectReason("");
        }}
      >
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Rejection reason is compulsory.
          </p>
          <label className="text-sm font-semibold text-slate-600">
            Rejection Reason
            <textarea
              className={`${fieldClass} mt-1 min-h-28`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Write the reason for rejection"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className={btnMutedClass}
              onClick={() => {
                setRejectRequest(null);
                setRejectReason("");
              }}
            >
              Cancel
            </button>
            <button
              className={btnDangerClass}
              onClick={onConfirmReject}
              disabled={rejectSaving}
            >
              {rejectSaving ? "Rejecting..." : "Reject Request"}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(employeeViewRequest)}
        title="Request Details"
        subtitle={
          employeeViewRequest ? `Request: ${employeeViewRequest.uuid}` : ""
        }
        onClose={() => setEmployeeViewRequest(null)}
      >
        {employeeViewRequest ? (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Leave Type
                </p>
                <p className="font-semibold">{employeeViewRequest.leaveType}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={employeeViewRequest.status} />
                </div>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Date Range
                </p>
                <p className="font-semibold">
                  {formatDisplayDate(employeeViewRequest.startDate)} -{" "}
                  {formatDisplayDate(employeeViewRequest.endDate)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Approved Days
                </p>
                <p className="font-semibold">
                  {formatDayValue(employeeViewRequest.total_days)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Day Type
                </p>
                <p className="font-semibold">
                  {getDayPatternLabel(employeeViewRequest)}
                </p>
              </article>
            </div>

            {employeeViewRequest.status === "REJECTED" ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Reason for Rejection
                </p>
                <p className="mt-1">
                  {employeeViewRequest.rejectionReason ||
                    "No reason was recorded by the reviewer."}
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supporting Documents
              </p>
              {Array.isArray(employeeViewRequest.documents) &&
              employeeViewRequest.documents.length > 0 ? (
                <ul className="mt-2 space-y-1 text-slate-700">
                  {employeeViewRequest.documents.map((doc) => (
                    <li
                      key={doc.uuid}
                      className="rounded border border-slate-200 bg-white p-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {doc.originalName} (
                          {Math.ceil((doc.sizeBytes || 0) / 1024)} KB)
                        </span>
                        {isDocumentEditableStatus(
                          employeeViewRequest.status,
                        ) ? (
                          <div className="flex flex-wrap gap-2">
                            <label
                              className={`${btnMutedClass} cursor-pointer`}
                            >
                              Replace
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,image/png,image/jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onReplaceDocumentInViewedRequest(
                                      doc.uuid,
                                      file,
                                    );
                                  }
                                  e.target.value = "";
                                }}
                                disabled={documentActionLoading}
                              />
                            </label>
                            <button
                              className={btnRejectGhostClass}
                              onClick={() =>
                                onDeleteDocumentFromViewedRequest(doc.uuid)
                              }
                              disabled={documentActionLoading}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-500">No documents attached.</p>
              )}

              {isDocumentEditableStatus(employeeViewRequest.status) ? (
                <div className="mt-3 rounded border border-dashed border-slate-300 p-3">
                  <label className="text-sm font-semibold text-slate-600">
                    Add Documents
                    <input
                      className={`${fieldClass} mt-1`}
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg"
                      onChange={(e) =>
                        setPendingDocumentFiles(
                          Array.from(e.target.files || []),
                        )
                      }
                      disabled={documentActionLoading}
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      className={btnPrimaryClass}
                      onClick={onAddDocumentsToViewedRequest}
                      disabled={
                        documentActionLoading ||
                        pendingDocumentFiles.length === 0
                      }
                    >
                      {documentActionLoading ? "Working..." : "Upload"}
                    </button>
                    {pendingDocumentFiles.length > 0 ? (
                      <span className="text-xs text-slate-600">
                        {pendingDocumentFiles.length} file(s) selected
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={Boolean(shortenRequest)}
        title="Shorten Approved Leave"
        subtitle={
          shortenRequest
            ? `${formatDisplayDate(shortenRequest.startDate)} to ${formatDisplayDate(shortenRequest.endDate)}`
            : ""
        }
        onClose={() => setShortenRequest(null)}
      >
        {shortenRequest ? (
          <div className="space-y-5 px-1 py-1">
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Current approved days:{" "}
              <strong>{shortenRequest.total_days}</strong>. Enter a smaller
              number to shorten your leave period.
            </p>
            <label className="text-sm font-semibold text-slate-600">
              Updated Planned Days
              <input
                className={`${fieldClass} mt-1`}
                type="number"
                min="1"
                step="1"
                value={shortenWholeDays}
                onChange={(e) => setShortenWholeDays(e.target.value)}
              />
            </label>
            <fieldset className="text-sm font-semibold text-slate-600">
              <legend className="mb-2">
                What is the last day of the return?
              </legend>
              <div className="flex gap-4 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="shorten-return-day"
                    checked={shortenReturnDayType === RETURN_DAY_FULL}
                    onChange={() => setShortenReturnDayType(RETURN_DAY_FULL)}
                  />
                  Full Day
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="shorten-return-day"
                    checked={shortenReturnDayType === RETURN_DAY_HALF}
                    onChange={() => setShortenReturnDayType(RETURN_DAY_HALF)}
                  />
                  Half Day
                </label>
              </div>
            </fieldset>
            <p className="text-xs text-slate-500">
              Updated approved days will be calculated as{" "}
              <strong>
                {isHalfStepPositiveNumber(
                  buildDaysFromWholeAndReturnType(
                    shortenWholeDays,
                    shortenReturnDayType,
                  ),
                )
                  ? buildDaysFromWholeAndReturnType(
                      shortenWholeDays,
                      shortenReturnDayType,
                    )
                  : "--"}
              </strong>
              .
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <button
                className={btnMutedClass}
                onClick={() => setShortenRequest(null)}
              >
                Cancel
              </button>
              <button
                className={btnPrimaryClass}
                onClick={onSaveShorten}
                disabled={shortenSaving}
              >
                {shortenSaving ? "Updating..." : "Apply Change"}
              </button>
            </div>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={cameraOpen}
        title="Capture Document"
        subtitle="Take a photo and attach it to this leave request"
        onClose={closeCamera}
      >
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-70 w-full object-cover md:h-420px"
            />
          </div>
          {cameraError ? (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {cameraError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button className={btnMutedClass} onClick={closeCamera}>
              Cancel
            </button>
            <button className={btnPrimaryClass} onClick={captureFromCamera}>
              Capture and Attach
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(policyView) || policyViewLoading}
        title="Policy Overview"
        subtitle={policyView?.leaveType || ""}
        onClose={() => setPolicyView(null)}
      >
        {policyViewLoading ? (
          <LoadingBlock text="Loading policy details..." />
        ) : policyView ? (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Starting Annual Leave Entitlement
                </p>
                <p className="font-semibold">{policyView.baseDays} days</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Yearly Increase After Service Milestones
                </p>
                <p className="font-semibold">
                  {policyView.incrementPerYear} days
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Maximum Annual Entitlement
                </p>
                <p className="font-semibold">{policyView.maxDays} days</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Minimum Service Period Before Eligibility
                </p>
                <p className="font-semibold">
                  {policyView.eligibilityMonths} months
                </p>
              </article>
            </div>
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              This policy applies within the organization’s annual planning
              cycle: {policyView.useBudgetYear ? "Yes" : "No"}.
            </p>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        open={Boolean(policyEdit)}
        title="Update Policy"
        subtitle={policyEdit?.leaveType || ""}
        onClose={() => setPolicyEdit(null)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Leave Category
              <input
                className={`${fieldClass} mt-1`}
                value={policyForm.leaveType}
                disabled
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Starting Days
              <input
                className={`${fieldClass} mt-1`}
                type="number"
                value={policyForm.baseDays}
                onChange={(e) =>
                  setPolicyForm((s) => ({ ...s, baseDays: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Annual Increase
              <input
                className={`${fieldClass} mt-1`}
                type="number"
                value={policyForm.incrementPerYear}
                onChange={(e) =>
                  setPolicyForm((s) => ({
                    ...s,
                    incrementPerYear: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Maximum Days
              <input
                className={`${fieldClass} mt-1`}
                type="number"
                value={policyForm.maxDays}
                onChange={(e) =>
                  setPolicyForm((s) => ({ ...s, maxDays: e.target.value }))
                }
              />
            </label>
            <label className="text-sm font-semibold text-slate-600 md:col-span-2">
              Minimum Eligibility Months
              <input
                className={`${fieldClass} mt-1`}
                type="number"
                value={policyForm.eligibilityMonths}
                onChange={(e) =>
                  setPolicyForm((s) => ({
                    ...s,
                    eligibilityMonths: e.target.value,
                  }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(policyForm.useBudgetYear)}
                onChange={(e) =>
                  setPolicyForm((s) => ({
                    ...s,
                    useBudgetYear: e.target.checked,
                  }))
                }
              />
              Apply this policy in the annual planning cycle
            </label>
          </div>

          <div className="flex gap-2">
            <button
              className={btnMutedClass}
              onClick={() => setPolicyEdit(null)}
            >
              Cancel
            </button>
            <button
              className={btnPrimaryClass}
              onClick={onPolicySave}
              disabled={policySaving}
            >
              {policySaving ? "Saving..." : "Update Policy"}
            </button>
          </div>
        </div>
      </ModalShell>

      {notice.message ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center md:inset-x-auto md:right-6 md:bottom-6">
          <div
            className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-[0_18px_35px_rgba(15,23,42,0.18)] backdrop-blur md:max-w-md ${
              notice.type === "error"
                ? "border-rose-300 bg-rose-50/95 text-rose-900"
                : "border-emerald-300 bg-emerald-50/95 text-emerald-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">{notice.message}</p>
              <button
                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white/60"
                onClick={() => setNotice({ type: "", message: "" })}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LeaveManagement;
