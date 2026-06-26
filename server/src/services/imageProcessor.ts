import convert from "heic-convert";
import sharp from "sharp";

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

export async function normalizeImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  if (HEIC_MIME_TYPES.has(mimeType)) {
    const converted = await convert({
      buffer,
      format: "JPEG",
      quality: 0.92,
    });
    const jpegBuffer = Buffer.from(converted);
    return {
      buffer: jpegBuffer,
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  const metadata = await sharp(buffer).metadata();
  const format = metadata.format === "png" ? "png" : "jpeg";
  const normalized = await sharp(buffer)[format === "png" ? "png" : "jpeg"]({
    quality: 92,
  }).toBuffer();

  return {
    buffer: normalized,
    mimeType: format === "png" ? "image/png" : "image/jpeg",
    extension: format,
  };
}

export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

/** Laplacian variance — lower values indicate blurrier images. */
export async function calculateBlurScore(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .grayscale()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .convolve({
      width: 3,
      height: 3,
      kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSq = 0;
  const pixelCount = data.length;

  for (let i = 0; i < pixelCount; i++) {
    const value = data[i];
    sum += value;
    sumSq += value * value;
  }

  const mean = sum / pixelCount;
  const variance = sumSq / pixelCount - mean * mean;
  return variance;
}

/** Difference hash for perceptual similarity. */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  const size = 9;
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(size, size, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = "";
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const left = data[row * size + col];
      const right = data[row * size + col + 1];
      hash += left < right ? "1" : "0";
    }
  }
  return hash;
}

export function hammingDistance(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let distance = 0;
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance + Math.abs(a.length - b.length);
}

export async function createPreviewBuffer(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
