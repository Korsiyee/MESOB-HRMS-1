const Minio = require("minio");

let minioClient = null;

const toBoolean = (value, fallback = false) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return fallback;
};

const getMinioConfig = () => {
  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  return {
    endPoint,
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: toBoolean(process.env.MINIO_USE_SSL, false),
    accessKey,
    secretKey,
    bucket: process.env.MINIO_BUCKET || "leave-documents",
    region: process.env.MINIO_REGION || "us-east-1",
    autoCreateBucket: toBoolean(process.env.MINIO_BUCKET_AUTO_CREATE, true),
  };
};

const getMinioClient = () => {
  if (minioClient) {
    return minioClient;
  }

  const config = getMinioConfig();
  const missing = [];

  if (!config.endPoint) {
    missing.push("MINIO_ENDPOINT");
  }
  if (!config.accessKey) {
    missing.push("MINIO_ACCESS_KEY");
  }
  if (!config.secretKey) {
    missing.push("MINIO_SECRET_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required MinIO environment variables: ${missing.join(", ")}`,
    );
  }

  minioClient = new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
  });

  return minioClient;
};

const createMinioBucket = async () => {
  const client = getMinioClient();
  const { bucket, region } = getMinioConfig();

  try {
    await client.makeBucket(bucket, region);
  } catch (error) {
    const code = String(error?.code || "");
    if (code !== "BucketAlreadyExists" && code !== "BucketAlreadyOwnedByYou") {
      throw error;
    }
  }

  return bucket;
};

module.exports = {
  getMinioConfig,
  getMinioClient,
  createMinioBucket,
};
