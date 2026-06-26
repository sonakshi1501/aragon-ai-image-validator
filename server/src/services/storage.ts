import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { config, isS3Configured } from "../config.js";

const localUploadDir = path.resolve("uploads");

let s3Client: S3Client | null = null;
let bucketReady = false;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
      ...(config.aws.endpoint
        ? {
            endpoint: config.aws.endpoint,
            forcePathStyle: config.aws.forcePathStyle,
          }
        : {}),
    });
  }
  return s3Client;
}

async function ensureBucket(): Promise<void> {
  if (bucketReady || !isS3Configured()) return;

  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.aws.bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: config.aws.bucket }));
  }
  bucketReady = true;
}

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(localUploadDir, { recursive: true });
}

export function getLocalPathForKey(key: string): string {
  return path.join(localUploadDir, key.replace(/\//g, "_"));
}

export function getFileUrl(key: string): string {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isS3Configured()) {
    await ensureBucket();
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: config.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return getFileUrl(key);
  }

  await ensureLocalDir();
  const filePath = getLocalPathForKey(key);
  await fs.writeFile(filePath, buffer);
  return getFileUrl(key);
}

export function getPublicUrl(key: string): string {
  return getFileUrl(key);
}
