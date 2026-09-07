import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { LetterApi } from "../api/letterApi";
import { useAuth } from "../context/AuthContext";

const C = {
  primary: "#0F766E",
  card: "#EEF1F0",
  border: "rgba(0,80,60,0.12)",
  text: "#1A2E2B",
  muted: "#2A5C54",
  shadow: "0 2px 8px rgba(0,60,45,0.08)",
};

/**
 * LetterBadge - Shows the count of letters for the logged-in employee
 * Can be placed on dashboards to provide quick access to letters
 */
const LetterBadge = () => {
  const { user } = useAuth();
  const [letterCount, setLetterCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLetterCount = async () => {
      try {
        // Get employee_uuid from user context
        const employeeUuid = user?.employee_uuid;
        if (!employeeUuid) {
          setLoading(false);
          return;
        }

        // Use employee UUID - backend will handle it
        const res = await LetterApi.listIssuedLetters(employeeUuid);
        setLetterCount(res?.data?.length || 0);
      } catch (err) {
        console.error("Failed to fetch letter count:", err);
        setLetterCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchLetterCount();
  }, [user]);

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: C.shadow,
        cursor: "pointer",
        transition: "all 0.2s",
        textDecoration: "none",
      }}
      onClick={() => (window.location.href = "/letters")}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,60,45,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = C.shadow;
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${C.primary} 0%, #14B8A6 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText size={22} color="#fff" />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 2,
          }}
        >
          My Letters
        </div>
        {loading ? (
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: C.text,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            —
          </div>
        ) : (
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: C.primary,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {letterCount}
          </div>
        )}
        <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: 1 }}>
          {letterCount === 1 ? "Document issued" : "Documents issued"}
        </div>
      </div>

      {/* Badge */}
      {letterCount > 0 && (
        <div
          style={{
            background: C.primary,
            color: "#fff",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: "0.7rem",
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {letterCount}
        </div>
      )}
    </div>
  );
};

export default LetterBadge;
