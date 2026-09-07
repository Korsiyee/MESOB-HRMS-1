const statusClass = {
  PENDING_DEPARTMENT:
    "border border-amber-300 bg-amber-100 text-amber-800 shadow-[0_0_14px_rgba(251,191,36,0.35)]",
  PENDING_HR:
    "border border-blue-300 bg-blue-100 text-blue-800 shadow-[0_0_14px_rgba(59,130,246,0.35)]",
  APPROVED: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  REJECTED: "border border-rose-300 bg-rose-100 text-rose-800",
  REJECTED_DEPARTMENT: "border border-rose-300 bg-rose-100 text-rose-800",
  REJECTED_HR: "border border-rose-300 bg-rose-100 text-rose-800",
  PENDING: "border border-amber-300 bg-amber-100 text-amber-800",
  CANCELLED: "border border-slate-400 bg-slate-100 text-slate-600",
};

const StatusBadge = ({ status }) => {
  // Format display text
  const displayText = status?.replace(/_/g, ' ') || 'UNKNOWN';
  
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[status] || "border border-slate-300 bg-slate-100 text-slate-700"}`}
    >
      {displayText}
    </span>
  );
};

export default StatusBadge;
