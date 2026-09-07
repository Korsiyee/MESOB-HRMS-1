import PrettyDatePicker from "./PrettyDatePicker";

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-800 focus:ring-2 focus:ring-brand-100";

const btnPrimaryClass =
  "rounded-lg bg-[#0b5d4a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f6f58]";
const btnMutedClass =
  "rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200";

const defaultValue = {
  uuid: "",
  date: "",
  name: "",
  type: "PUBLIC",
  calendarYear: "",
  isActive: true,
  description: "",
};

export const emptyHolidayForm = () => ({ ...defaultValue });

const HolidayForm = ({ value, onChange, onSave, onCancelEdit, loading }) => {
  const update = (key, next) => onChange({ ...value, [key]: next });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-slate-700">
        {value.uuid ? "Edit Holiday" : "Add Holiday"}
      </h3>
      <label className="text-sm font-semibold text-slate-600">
        Date
        <div className="mt-1">
          <PrettyDatePicker
            value={value.date}
            onChange={(nextDate) => update("date", nextDate)}
            placeholder="Choose holiday date"
          />
        </div>
      </label>
      <label className="text-sm font-semibold text-slate-600">
        Name
        <input
          className={`${fieldClass} mt-1`}
          value={value.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </label>
      <label className="text-sm font-semibold text-slate-600">
        Type
        <select
          className={`${fieldClass} mt-1`}
          value={value.type}
          onChange={(e) => update("type", e.target.value)}
        >
          <option>PUBLIC</option>
          <option>RELIGIOUS</option>
          <option>SPECIAL</option>
          <option>ETHIOPIAN</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-600">
        Calendar Year
        <input
          className={`${fieldClass} mt-1`}
          value={value.calendarYear}
          onChange={(e) => update("calendarYear", e.target.value)}
          placeholder="e.g. 2018"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <input
          type="checkbox"
          checked={value.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
        />
        Active
      </label>
      <br />
      <label className="text-sm font-semibold text-slate-600">
        Description
        <textarea
          className={`${fieldClass} mt-1 min-h-20`}
          value={value.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2 ">
        <button className={btnPrimaryClass} onClick={onSave} disabled={loading}>
          {loading
            ? "Saving..."
            : value.uuid
              ? "Update Holiday"
              : "Create Holiday"}
        </button>
        {value.uuid ? (
          <button className={btnMutedClass} onClick={onCancelEdit}>
            Cancel Edit
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default HolidayForm;
