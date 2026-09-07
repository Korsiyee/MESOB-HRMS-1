const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");

async function logEvent({
  actorUuid,
  action,
  entityType,
  entityUuid,
  diff,
  ipAddress,
}) {
  const uuid = randomUUID();
  const diffJson = diff ? JSON.stringify(diff) : null;

  await executeQuery(
    `
      INSERT INTO AuditLogs (
        uuid,
        actor_uuid,
        action,
        entity_type,
        entity_uuid,
        diff_json,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuid,
      actorUuid || null,
      action || null,
      entityType || null,
      entityUuid || null,
      diffJson,
      ipAddress || null,
    ],
  );

  return uuid;
}

async function safeLogEvent(payload) {
  try {
    return await logEvent(payload);
  } catch (error) {
    console.error("Audit log write failed:", error);
    return null;
  }
}

module.exports = {
  logEvent,
  safeLogEvent,
};
