const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  clearAllHistory,
  clearReadHistory,
} = require("../controllers/notificationController");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

// All routes require authenticateJwt (applied globally in app.js)
// Added permission guards for notification access
router.get("/", 
  authorize({ permissions: 'notifications.view_own' }),
  getNotifications
);

router.get("/count",
  authorize({ permissions: 'notifications.view_own' }),
  getUnreadCount
);

router.patch("/read-all",
  authorize({ permissions: 'notifications.manage_own' }),
  markAllRead
);

router.patch("/:uuid/read",
  authorize({ permissions: 'notifications.manage_own' }),
  markRead
);

router.delete("/history",
  authorize({ permissions: 'notifications.manage_own' }),
  clearAllHistory
);

router.delete("/history/read",
  authorize({ permissions: 'notifications.manage_own' }),
  clearReadHistory
);

module.exports = router;
