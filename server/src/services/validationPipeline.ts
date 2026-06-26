import { config } from "../config.js";
import { prisma } from "../db.js";
import { analyzeFaces } from "./faceDetection.js";
import {
  calculateBlurScore,
  computePerceptualHash,
  createPreviewBuffer,
  getImageMetadata,
  hammingDistance,
  normalizeImage,
} from "./imageProcessor.js";
import { getPublicUrl, uploadFile } from "./storage.js";

export interface SavedPreview {
  previewUrl: string;
  previewKey: string;
}

export async function savePreview(
  processedBuffer: Buffer,
  originalName: string
): Promise<SavedPreview> {
  const previewBuffer = await createPreviewBuffer(processedBuffer);
  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const baseKey = `images/${timestamp}-${safeName}`;
  const previewKey = `${baseKey}-preview.jpg`;
  const previewUrl = await uploadFile(previewKey, previewBuffer, "image/jpeg");

  return {
    previewUrl: previewUrl || getPublicUrl(previewKey),
    previewKey,
  };
}

function rejection(
  reason: string,
  extra: Partial<ValidationResult> = {}
): ValidationResult {
  return { accepted: false, reason, ...extra };
}

export interface ValidationResult {
  accepted: boolean;
  reason?: string;
  width?: number;
  height?: number;
  blurScore?: number;
  faceCount?: number;
  faceAreaRatio?: number;
  perceptualHash?: string;
  previewUrl?: string;
  s3Key?: string;
}

export async function validateAndStoreImage(
  originalName: string,
  inputBuffer: Buffer,
  mimeType: string
): Promise<ValidationResult> {
  if (inputBuffer.length < config.validation.minFileSizeBytes) {
    return {
      accepted: false,
      reason: `Image file is too small (minimum ${config.validation.minFileSizeBytes} bytes)`,
    };
  }

  if (!config.allowedMimeTypes.includes(mimeType)) {
    return {
      accepted: false,
      reason: "Invalid format. Only JPG, PNG, and HEIC are allowed",
    };
  }

  let processedBuffer: Buffer;
  let processedMime: string;
  let extension: string;

  try {
    const normalized = await normalizeImage(inputBuffer, mimeType);
    processedBuffer = normalized.buffer;
    processedMime = normalized.mimeType;
    extension = normalized.extension;
  } catch {
    return {
      accepted: false,
      reason: "Unable to process image file",
    };
  }

  const { width, height } = await getImageMetadata(processedBuffer);
  const preview = await savePreview(processedBuffer, originalName);

  if (width < config.validation.minWidth || height < config.validation.minHeight) {
    return rejection(
      `Resolution too low (minimum ${config.validation.minWidth}x${config.validation.minHeight})`,
      { width, height, previewUrl: preview.previewUrl, s3Key: preview.previewKey }
    );
  }

  const perceptualHash = await computePerceptualHash(processedBuffer);
  const acceptedImages = await prisma.image.findMany({
    where: { status: "ACCEPTED", perceptualHash: { not: null } },
    select: { perceptualHash: true, originalName: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  for (const existing of acceptedImages) {
    if (!existing.perceptualHash) continue;
    const distance = hammingDistance(perceptualHash, existing.perceptualHash);
    if (distance <= config.validation.maxSimilarHammingDistance) {
      return rejection(
        `Image is too similar to an existing upload (${existing.originalName})`,
        {
          width,
          height,
          perceptualHash,
          previewUrl: preview.previewUrl,
          s3Key: preview.previewKey,
        }
      );
    }
  }

  const blurScore = await calculateBlurScore(processedBuffer);
  if (blurScore < config.validation.minBlurVariance) {
    return rejection("Image is too blurry", {
      width,
      height,
      blurScore,
      perceptualHash,
      previewUrl: preview.previewUrl,
      s3Key: preview.previewKey,
    });
  }

  let faceCount = 0;
  let faceAreaRatio = 0;
  try {
    const faceAnalysis = await analyzeFaces(processedBuffer);
    faceCount = faceAnalysis.faceCount;
    faceAreaRatio = faceAnalysis.largestFaceAreaRatio;
  } catch {
    return rejection("Unable to analyze faces in image", {
      width,
      height,
      blurScore,
      perceptualHash,
      previewUrl: preview.previewUrl,
      s3Key: preview.previewKey,
    });
  }

  if (faceCount === 0) {
    return rejection("No face detected in image", {
      width,
      height,
      blurScore,
      faceCount,
      faceAreaRatio,
      perceptualHash,
      previewUrl: preview.previewUrl,
      s3Key: preview.previewKey,
    });
  }

  if (faceCount > config.validation.maxFaceCount) {
    return rejection(`Multiple faces detected (${faceCount} faces)`, {
      width,
      height,
      blurScore,
      faceCount,
      faceAreaRatio,
      perceptualHash,
      previewUrl: preview.previewUrl,
      s3Key: preview.previewKey,
    });
  }

  if (faceAreaRatio < config.validation.minFaceAreaRatio) {
    return rejection("Detected face is too small in the frame", {
      width,
      height,
      blurScore,
      faceCount,
      faceAreaRatio,
      perceptualHash,
      previewUrl: preview.previewUrl,
      s3Key: preview.previewKey,
    });
  }

  const timestamp = Date.now();
  const baseKey = `images/${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const imageKey = `${baseKey}.${extension}`;

  await uploadFile(imageKey, processedBuffer, processedMime);

  return {
    accepted: true,
    width,
    height,
    blurScore,
    faceCount,
    faceAreaRatio,
    perceptualHash,
    previewUrl: preview.previewUrl,
    s3Key: imageKey,
  };
}
