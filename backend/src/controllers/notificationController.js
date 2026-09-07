const {
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllForUser,
  deleteReadForUser,
} = require("../services/notificationService");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });

    const limit  = Math.min(Math.max(1, parseInt(req.query.limit,  10) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(userUuid, { limit, offset }),
      getUnreadCount(userUuid),
    ]);

    return sendSuccess(res, {
      status: 200,
      data: { notifications, unreadCount, limit, offset },
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    return sendError(res, { status: 500, message: "Failed to load notifications." });
  }
};

/**
 * GET /api/notifications/count
 * Returns only the unread count (lightweight poll endpoint).
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });
    const count = await getUnreadCount(userUuid);
    return sendSuccess(res, { status: 200, data: { unreadCount: count } });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return sendError(res, { status: 500, message: "Failed to load notification count." });
  }
};

/**
 * PATCH /api/notifications/:uuid/read
 * Marks a single notification as read.
 */
exports.markRead = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    const { uuid } = req.params;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });
    await markAsRead(uuid, userUuid);
    return sendSuccess(res, { status: 200, message: "Notification marked as read." });
  } catch (err) {
    console.error("markRead error:", err);
    return sendError(res, { status: 500, message: "Failed to mark notification as read." });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the user as read.
 */
exports.markAllRead = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });
    await markAllAsRead(userUuid);
    return sendSuccess(res, { status: 200, message: "All notifications marked as read." });
  } catch (err) {
    console.error("markAllRead error:", err);
    return sendError(res, { status: 500, message: "Failed to mark all notifications as read." });
  }
};

/**
 * DELETE /api/notifications/history
 * Permanently deletes ALL notifications for the authenticated user.
 */
exports.clearAllHistory = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });
    await deleteAllForUser(userUuid);
    return sendSuccess(res, { status: 200, message: "Notification history cleared." });
  } catch (err) {
    console.error("clearAllHistory error:", err);
    return sendError(res, { status: 500, message: "Failed to clear notification history." });
  }
};

/**
 * DELETE /api/notifications/history/read
 * Permanently deletes only READ notifications for the authenticated user.
 */
exports.clearReadHistory = async (req, res) => {
  try {
    const userUuid = req.user?.uuid;
    if (!userUuid) return sendError(res, { status: 401, message: "Unauthorized." });
    await deleteReadForUser(userUuid);
    return sendSuccess(res, { status: 200, message: "Read notifications cleared." });
  } catch (err) {
    console.error("clearReadHistory error:", err);
    return sendError(res, { status: 500, message: "Failed to clear read notifications." });
  }
};
