import multer from "multer";
import { config } from "../config.js";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const storage = multer.memoryStorage();

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const mimeOk = config.allowedMimeTypes.includes(file.mimetype);
  const extOk = config.allowedExtensions.includes(ext);

  if (mimeOk || extOk) {
    cb(null, true);
    return;
  }

  cb(new Error("Only HEIC, PNG, and JPEG files are allowed"));
}

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter,
});
