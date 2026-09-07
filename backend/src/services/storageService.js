const path = require("path");
const { randomUUID } = require("crypto");
const { getMinioClient, getMinioConfig } = require("../config/minio");
const { formatDate } = require("./calendarService");

function normalizeFileExt(originalName) {
  const ext = path.extname(originalName || "");
  return ext || "";
}

function createObjectKey(prefix, originalName) {
  const datePath = formatDate(new Date()) || "unknown-date";
  const extension = normalizeFileExt(originalName);
  return `${prefix}/${datePath}/${randomUUID()}${extension}`;
}

async function uploadBufferObject(prefix, originalName, buffer, contentType) {
  const client = getMinioClient();
  const { bucket } = getMinioConfig();
  const objectKey = createObjectKey(prefix, originalName);
  await client.putObject(bucket, objectKey, buffer, {
    "Content-Type": contentType || "application/octet-stream",
  });
  return objectKey;
}

module.exports = {
  uploadBufferObject,
};
