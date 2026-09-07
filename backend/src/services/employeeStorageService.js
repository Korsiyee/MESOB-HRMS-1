const { randomUUID } = require("crypto");
const { formatDate } = require("./calendarService");
const {
  getMinioClient,
  getMinioConfig,
  createMinioBucket,
} = require("../config/minio");
const { getIntEnv } = require("../config/env");
const { sanitizeFileName, getFileExtension } = require("../utils/file");

const PRESIGNED_EXPIRES = getIntEnv("MINIO_PRESIGNED_EXPIRES", 3600);

const getErrorCode = (error) => String(error?.code || "");

const isAuthError = (error) => {
  const code = getErrorCode(error);
  return (
    code === "AccessDenied" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch"
  );
};

const wrapAuthError = (action, bucket) =>
  new Error(
    `MinIO authorization failed while trying to ${action} in bucket '${bucket}'. Check MINIO_ACCESS_KEY, MINIO_SECRET_KEY, and bucket policy permissions.`,
  );

function buildObjectKey({ prefix, employeeId, originalName }) {
  const safeName = sanitizeFileName(originalName);
  const extension = getFileExtension(safeName);
  const timestamp = Date.now();
  return `${prefix}/${employeeId}/${timestamp}-${randomUUID()}${extension}`;
}

async function uploadEmployeeFile({ prefix, employeeId, file }) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error("File buffer is required for upload.");
  }

  const { bucket, autoCreateBucket } = getMinioConfig();
  const client = getMinioClient();
  const objectKey = buildObjectKey({
    prefix,
    employeeId,
    originalName: file.originalname,
  });

  const putObject = async () =>
    client.putObject(bucket, objectKey, file.buffer, {
      "Content-Type": file.mimetype || "application/octet-stream",
    });

  try {
    await putObject();
  } catch (error) {
    if (isAuthError(error)) {
      throw wrapAuthError("upload a file", bucket);
    }

    if (getErrorCode(error) === "NoSuchBucket" && autoCreateBucket) {
      await createMinioBucket();
      await putObject();
    } else {
      throw error;
    }
  }

  return {
    bucket,
    objectKey,
  };
}

async function deleteObject(objectKey) {
  const normalizedKey = typeof objectKey === "string" ? objectKey.trim() : "";
  if (!normalizedKey) {
    return;
  }

  const { bucket } = getMinioConfig();
  const client = getMinioClient();

  try {
    await client.removeObject(bucket, normalizedKey);
  } catch (error) {
    if (isAuthError(error)) {
      throw wrapAuthError("delete a file", bucket);
    }
    throw error;
  }
}

async function getSignedUrl(objectKey) {
  const normalizedKey = typeof objectKey === "string" ? objectKey.trim() : "";
  if (!normalizedKey) {
    return null;
  }

  const { bucket } = getMinioConfig();
  const client = getMinioClient();

  try {
    return await client.presignedGetObject(
      bucket,
      normalizedKey,
      PRESIGNED_EXPIRES,
    );
  } catch (error) {
    if (isAuthError(error)) {
      throw wrapAuthError("read a file", bucket);
    }
    throw error;
  }
}

module.exports = {
  uploadEmployeeFile,
  deleteObject,
  getSignedUrl,
};
