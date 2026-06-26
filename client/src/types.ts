export interface ImageRecord {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  status: "PENDING" | "PROCESSING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  previewUrl: string | null;
  createdAt: string;
}

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface LocalUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  clientError?: string;
  serverRecord?: ImageRecord;
  status: UploadStatus;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif"];

export function validateClientFile(file: File): string | null {
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const typeOk = ALLOWED_TYPES.includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (!typeOk && !extOk) {
    return "Only HEIC, PNG, and JPEG formats are allowed";
  }
  return null;
}
