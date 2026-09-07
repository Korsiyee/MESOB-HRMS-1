const {
  createMinioBucket,
  getMinioClient,
  getMinioConfig,
} = require("../config/minio");

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

class LetterTemplateStorageService {
  static async uploadTemplate({ objectKey, buffer, mimeType }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("Template buffer is required for upload.");
    }

    const { bucket, autoCreateBucket } = getMinioConfig();
    const client = getMinioClient();

    const putObject = async () =>
      client.putObject(bucket, objectKey, buffer, {
        "Content-Type": mimeType || "application/pdf",
      });

    try {
      await putObject();
    } catch (error) {
      if (isAuthError(error)) {
        throw wrapAuthError("upload a template", bucket);
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

  static async deleteTemplate(objectKey) {
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
        throw wrapAuthError("delete a template", bucket);
      }
      throw error;
    }
  }

  static async getTemplateStream(objectKey) {
    const normalizedKey = typeof objectKey === "string" ? objectKey.trim() : "";
    if (!normalizedKey) {
      throw new Error("Template object key is required.");
    }

    const { bucket } = getMinioConfig();
    const client = getMinioClient();

    try {
      return await client.getObject(bucket, normalizedKey);
    } catch (error) {
      if (isAuthError(error)) {
        throw wrapAuthError("read a template", bucket);
      }
      throw error;
    }
  }

  static async getTemplateUrl(objectKey, expirySeconds = 3600) {
    const normalizedKey = typeof objectKey === "string" ? objectKey.trim() : "";
    if (!normalizedKey) {
      throw new Error("Template object key is required.");
    }

    const { bucket } = getMinioConfig();
    const client = getMinioClient();

    try {
      return await client.presignedGetObject(bucket, normalizedKey, expirySeconds);
    } catch (error) {
      if (isAuthError(error)) {
        throw wrapAuthError("generate URL for a template", bucket);
      }
      throw error;
    }
  }
}

module.exports = LetterTemplateStorageService;
