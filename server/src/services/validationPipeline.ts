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

function hasAllowedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return config.allowedExtensions.includes(ext);
}

function isAllowedFormat(mimeType: string, filename: string): boolean {
  return config.allowedMimeTypes.includes(mimeType) || hasAllowedExtension(filename);
}

function rejection(
  reason: string,
  extra: Partial<ValidationResult> = {}
): ValidationResult {
  return { accepted: false, reason, ...extra };
}

function withPreview(
  preview: SavedPreview | null,
  extra: Partial<ValidationResult> = {}
): Partial<ValidationResult> {
  if (!preview) return extra;
  return {
    ...extra,
    previewUrl: preview.previewUrl,
    s3Key: preview.previewKey,
  };
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
  let preview: SavedPreview | null = null;
  let processedBuffer: Buffer | null = null;
  let processedMime = "";
  let extension = "";
  let width = 0;
  let height = 0;

  // Generate preview as early as possible so rejected images still show in the UI
  if (isAllowedFormat(mimeType, originalName)) {
    try {
      const normalized = await normalizeImage(inputBuffer, mimeType);
      processedBuffer = normalized.buffer;
      processedMime = normalized.mimeType;
      extension = normalized.extension;
      preview = await savePreview(processedBuffer, originalName);
      const metadata = await getImageMetadata(processedBuffer);
      width = metadata.width;
      height = metadata.height;
    } catch {
      processedBuffer = null;
      preview = null;
    }
  }

  if (inputBuffer.length < config.validation.minFileSizeBytes) {
    return rejection(
      `Image file is too small (minimum ${config.validation.minFileSizeBytes} bytes)`,
      withPreview(preview, { width: width || undefined, height: height || undefined })
    );
  }

  if (!isAllowedFormat(mimeType, originalName)) {
    return rejection(
      "Invalid format. Only JPG, PNG, and HEIC are allowed",
      withPreview(preview)
    );
  }

  if (!processedBuffer || !preview) {
    return rejection("Unable to process image file");
  }

  if (width < config.validation.minWidth || height < config.validation.minHeight) {
    return rejection(
      `Resolution too low (minimum ${config.validation.minWidth}x${config.validation.minHeight})`,
      withPreview(preview, { width, height })
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
        withPreview(preview, { width, height, perceptualHash })
      );
    }
  }

  const blurScore = await calculateBlurScore(processedBuffer);
  if (blurScore < config.validation.minBlurVariance) {
    return rejection(
      "Image is too blurry",
      withPreview(preview, { width, height, blurScore, perceptualHash })
    );
  }

  let faceCount = 0;
  let faceAreaRatio = 0;
  try {
    const faceAnalysis = await analyzeFaces(processedBuffer);
    faceCount = faceAnalysis.faceCount;
    faceAreaRatio = faceAnalysis.largestFaceAreaRatio;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze faces in image";
    console.error("Face analysis failed:", message);
    return rejection(
      `Unable to analyze faces in image (${message})`,
      withPreview(preview, { width, height, blurScore, perceptualHash })
    );
  }

  if (faceCount === 0) {
    return rejection(
      "No face detected in image",
      withPreview(preview, {
        width,
        height,
        blurScore,
        faceCount,
        faceAreaRatio,
        perceptualHash,
      })
    );
  }

  if (faceCount > config.validation.maxFaceCount) {
    return rejection(
      `Multiple faces detected (${faceCount} faces)`,
      withPreview(preview, {
        width,
        height,
        blurScore,
        faceCount,
        faceAreaRatio,
        perceptualHash,
      })
    );
  }

  if (faceAreaRatio < config.validation.minFaceAreaRatio) {
    return rejection(
      "Detected face is too small in the frame",
      withPreview(preview, {
        width,
        height,
        blurScore,
        faceCount,
        faceAreaRatio,
        perceptualHash,
      })
    );
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
