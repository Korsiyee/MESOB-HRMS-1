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

class RequestDocumentStorageService {
  static async uploadDocument({ objectKey, buffer, mimeType }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error("Document buffer is required for upload.");
    }

    const { bucket, autoCreateBucket } = getMinioConfig();
    const client = getMinioClient();

    const putObject = async () =>
      client.putObject(bucket, objectKey, buffer, {
        "Content-Type": mimeType || "application/octet-stream",
      });

    try {
      await putObject();
    } catch (error) {
      if (isAuthError(error)) {
        throw wrapAuthError("upload a document", bucket);
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

  static async deleteDocument(objectKey) {
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
        throw wrapAuthError("delete a document", bucket);
      }
      throw error;
    }
  }

  static async getDocumentStream(objectKey) {
    const normalizedKey = typeof objectKey === "string" ? objectKey.trim() : "";
    if (!normalizedKey) {
      throw new Error("Document object key is required.");
    }

    const { bucket } = getMinioConfig();
    const client = getMinioClient();

    try {
      return await client.getObject(bucket, normalizedKey);
    } catch (error) {
      if (isAuthError(error)) {
        throw wrapAuthError("read a document", bucket);
      }
      throw error;
    }
  }
}

module.exports = RequestDocumentStorageService;
