import React, { useState } from "react";
import MainLayout from "../components/MainLayout";
import LeavePage from "./LeavePage";
import LettersPage from "./LettersPage";
import AccountsPage from "./AccountsPage";
import MyAccountPage from "./MyAccountPage";
import LogsPage from "./LogsPage";
import AttendanceOverviewPage from "./AttendanceOverviewPage";
import AttendancePage from "./AttendancePage";

/* ── placeholder for pages not yet built ── */
const ComingSoon = ({ name }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, color: "#9ca3af", gap: 12 }}>
    <div style={{ fontSize: 48 }}>🚧</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: "#374151", fontFamily: "Outfit, sans-serif" }}>{name}</div>
    <div style={{ fontSize: 14 }}>This module is coming soon.</div>
  </div>
);

const PAGE_MAP = {
  leave: <LeavePage />,
  "leaves-overview": <ComingSoon name="Leaves Overview" />,
  /* Attendance — two sub-pages */
  "attendance-overview": <AttendanceOverviewPage />,
  attendance: <AttendancePage />,
  shift: <ComingSoon name="Shift Management" />,
  payroll: <ComingSoon name="Payroll" />,
  bonus: <ComingSoon name="Bonus" />,
  loans: <ComingSoon name="Loans" />,
  occupations: <ComingSoon name="Occupations" />,
  letters: <LettersPage />,
  accounts: <AccountsPage />,
  "my-account": <MyAccountPage />,
  logs: <LogsPage />,
};

const Dashboard = () => {
  const [activePage, setActivePage] = useState("attendance-overview");

  const content = PAGE_MAP[activePage] || <ComingSoon name={activePage} />;

  return (
    <MainLayout activePage={activePage} onNavigate={setActivePage}>
      {content}
    </MainLayout>
  );
};

export default Dashboard;
