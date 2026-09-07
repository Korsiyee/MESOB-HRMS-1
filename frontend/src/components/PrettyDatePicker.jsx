import React, { forwardRef, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parseDateInputValue, toDateInputValue } from "../utils/dateFormat";

/* Custom input that matches the project's field style exactly */
const StyledInput = forwardRef(({ value, onClick, onChange, onFocus, onBlur, placeholder, disabled }, ref) => (
  <input
    ref={ref}
    value={value}
    onClick={onClick}
    onChange={onChange}
    onFocus={e => {
      e.target.style.borderColor = "#0F766E";
      if (onFocus) onFocus(e);
    }}
    onBlur={e => {
      e.target.style.borderColor = "rgba(0,80,60,0.12)";
      if (onBlur) onBlur(e);
    }}
    placeholder={placeholder || "Select date"}
    disabled={disabled}
    readOnly
    style={{
      width: "100%",
      background: disabled ? "rgba(0,80,60,0.04)" : "#EEF1F0",
      border: "1px solid rgba(0,80,60,0.12)",
      borderRadius: 8,
      padding: "9px 36px 9px 12px",
      fontSize: "0.82rem",
      color: "#1A2E2B",
      fontFamily: "Poppins, sans-serif",
      outline: "none",
      boxSizing: "border-box",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color 0.2s",
    }}
  />
));
StyledInput.displayName = "StyledInput";

const PrettyDatePicker = forwardRef(
  (
    {
      value,
      onChange,
      placeholder = "Select date",
      minDate,
      maxDate,
      disabled = false,
      className = "",
    },
    ref,
  ) => {
    const pickerRef = useRef(null);

    const selectedDate = useMemo(() => parseDateInputValue(value), [value]);
    const minimumDate = useMemo(() => parseDateInputValue(minDate), [minDate]);
    const maximumDate = useMemo(() => parseDateInputValue(maxDate), [maxDate]);

    return (
      <div style={{ position: "relative", width: "100%" }}>

        <DatePicker
          ref={(r) => {
            pickerRef.current = r;
            if (typeof ref === "function") ref(r);
            else if (ref) ref.current = r;
          }}
          selected={selectedDate}
          onChange={(nextDate) => onChange(toDateInputValue(nextDate))}
          customInput={<StyledInput placeholder={placeholder} disabled={disabled} />}
          wrapperClassName="w-full"
          dateFormat="MMMM d, yyyy"
          placeholderText={placeholder}
          minDate={minimumDate || undefined}
          maxDate={maximumDate || undefined}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          autoComplete="off"
          calendarClassName="leave-calendar"
          popperClassName="leave-calendar-popper"
          popperProps={{ strategy: "fixed" }}
          popperPlacement="bottom-start"
          disabled={disabled}
        />

        {/* Right calendar icon trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (pickerRef.current && !disabled) pickerRef.current.setOpen(true); }}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "none", border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "2px 4px", display: "flex", alignItems: "center",
            color: "#64748b", borderRadius: 4, transition: "color 0.15s",
          }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = "#0F766E"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; }}
          tabIndex={-1}
          aria-label="Open date picker"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>
    );
  },
);

PrettyDatePicker.displayName = "PrettyDatePicker";

export default PrettyDatePicker;
