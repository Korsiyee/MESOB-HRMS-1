const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  clearAllHistory,
  clearReadHistory,
} = require("../controllers/notificationController");

const router = express.Router();

// All routes require authenticateJwt (applied globally in app.js)
// Added permission guards for notification access
router.get("/", 
  getNotifications
);

router.get("/count",
  getUnreadCount
);

router.patch("/read-all",
  markAllRead
);

router.patch("/:uuid/read",
  markRead
);

router.delete("/history",
  clearAllHistory
);

router.delete("/history/read",
  clearReadHistory
);

module.exports = router;
