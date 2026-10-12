const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const positionRoutes = require("./routes/positionRoutes");
const levelRoutes = require("./routes/levelRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const requestRoutes = require("./routes/requestRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const policyRoutes = require("./routes/policyRoutes");
const letterRoutes = require("./routes/letterRoutes");
const letterConfigRoutes = require("./routes/letterConfigRoutes");
const enhancedLetterRoutes = require("./routes/enhancedLetterRoutes");
const accountRoutes = require("./routes/accountRoutes");
const logsRoutes = require("./routes/logsRoutes");
const healthRoutes = require("./routes/healthRoutes");
const syncRoutes = require("./routes/syncRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const faceRecognitionRoutes = require("./routes/faceRecognitionRoutes");
const networkSettingsRoutes = require("./routes/networkSettingsRoutes");
const roleManagementRoutes = require("./routes/roleManagementRoutes");
const { authenticateJwt } = require("./middleware/authMiddleware");
const notFoundHandler = require("./middleware/notFoundHandler");
const errorHandler = require("./middleware/errorHandler");
const { getEnv } = require("./config/env");

const app = express();

// Trust proxy to get real client IP (important for X-Forwarded-For header)
// Set to 1 for single proxy hop (safer than 'true' for rate limiting)
// In production, adjust this to match your proxy configuration
app.set('trust proxy', 1);

const corsOrigin = getEnv("CORS_ORIGIN", "*");
const corsOptions =
  corsOrigin === "*"
    ? { origin: "*" }
    : {
        origin: corsOrigin
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      };

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/sync", syncRoutes);
app.use(authenticateJwt);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/levels", levelRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/admin/policies", policyRoutes);
app.use("/api/letters", letterRoutes);
app.use("/api/letters/config", letterConfigRoutes);
app.use("/api/letters/enhanced", enhancedLetterRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/face-recognition", faceRecognitionRoutes);
app.use("/api/network-settings", networkSettingsRoutes);
app.use("/api/role-management", roleManagementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
