import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL!,
  aws: {
    region: process.env.AWS_REGION ?? "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET ?? "aragon-images",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    publicUrl: process.env.S3_PUBLIC_URL,
  },
  validation: {
    minWidth: Number(process.env.MIN_WIDTH ?? 400),
    minHeight: Number(process.env.MIN_HEIGHT ?? 400),
    minFileSizeBytes: Number(process.env.MIN_FILE_SIZE_BYTES ?? 50_000),
    maxSimilarHammingDistance: Number(process.env.MAX_SIMILAR_HAMMING_DISTANCE ?? 5),
    minBlurVariance: Number(process.env.MIN_BLUR_VARIANCE ?? 100),
    minFaceAreaRatio: Number(process.env.MIN_FACE_AREA_RATIO ?? 0.05),
    maxFaceCount: Number(process.env.MAX_FACE_COUNT ?? 1),
  },
  allowedMimeTypes: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".heif"],
};

export function isS3Configured(): boolean {
  return Boolean(config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.bucket);
}
