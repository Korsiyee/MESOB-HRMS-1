const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-800 focus:ring-2 focus:ring-brand-100";
const btnPrimaryClass =
  "rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800";

const PolicyForm = ({ value, onChange, onSave, loading }) => {
  const update = (key, next) => onChange({ ...value, [key]: next });

  return (
    <section className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-600">
          Leave Type
          <input
            className={`${fieldClass} mt-1`}
            value={value.leaveType}
            onChange={(e) => update("leaveType", e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Base Days
          <input
            className={`${fieldClass} mt-1`}
            type="number"
            value={value.baseDays}
            onChange={(e) => update("baseDays", e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Increment / Year
          <input
            className={`${fieldClass} mt-1`}
            type="number"
            value={value.incrementPerYear}
            onChange={(e) => update("incrementPerYear", e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Max Days
          <input
            className={`${fieldClass} mt-1`}
            type="number"
            value={value.maxDays}
            onChange={(e) => update("maxDays", e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-600 md:col-span-2">
          Eligibility Months
          <input
            className={`${fieldClass} mt-1`}
            type="number"
            value={value.eligibilityMonths}
            onChange={(e) => update("eligibilityMonths", e.target.value)}
          />
        </label>
      </div>
      <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
        EntitledDays = min(baseDays + (yearsOfService - 1) * incrementPerYear,
        maxDays)
      </p>
      <button className={btnPrimaryClass} onClick={onSave} disabled={loading}>
        {loading ? "Saving..." : "Save Policy"}
      </button>
    </section>
  );
};

export default PolicyForm;
