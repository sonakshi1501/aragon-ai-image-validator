import { Router } from "express";
import path from "path";
import { prisma } from "../db.js";
import { uploadMiddleware } from "../middleware/upload.js";
import { normalizeImage } from "../services/imageProcessor.js";
import { savePreview, validateAndStoreImage } from "../services/validationPipeline.js";

export const imagesRouter = Router();

imagesRouter.get("/", async (_req, res) => {
  const images = await prisma.image.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(images);
});

imagesRouter.delete("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  if (!status) {
    res.status(400).json({ error: "Pass ?status=REJECTED or ?status=ACCEPTED" });
    return;
  }

  await prisma.image.deleteMany({
    where: { status: status as "ACCEPTED" | "REJECTED" | "PENDING" | "PROCESSING" },
  });
  res.status(204).send();
});

imagesRouter.get("/:id", async (req, res) => {
  const image = await prisma.image.findUnique({ where: { id: req.params.id } });
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.json(image);
});

imagesRouter.post("/", uploadMiddleware.array("images", 10), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ error: "No files uploaded" });
    return;
  }

  const results = [];

  for (const file of files) {
    const record = await prisma.image.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: "PROCESSING",
      },
    });

    try {
      const validation = await validateAndStoreImage(
        file.originalname,
        file.buffer,
        file.mimetype
      );

      const updated = await prisma.image.update({
        where: { id: record.id },
        data: {
          status: validation.accepted ? "ACCEPTED" : "REJECTED",
          rejectionReason: validation.reason ?? null,
          width: validation.width,
          height: validation.height,
          blurScore: validation.blurScore,
          faceCount: validation.faceCount,
          faceAreaRatio: validation.faceAreaRatio,
          perceptualHash: validation.perceptualHash,
          s3Key: validation.s3Key,
          previewUrl: validation.previewUrl,
        },
      });

      results.push(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed";
      let previewUrl: string | null = null;
      let s3Key: string | null = null;

      try {
        const normalized = await normalizeImage(file.buffer, file.mimetype);
        const preview = await savePreview(normalized.buffer, file.originalname);
        previewUrl = preview.previewUrl;
        s3Key = preview.previewKey;
      } catch {
        // Keep rejection without preview if image cannot be processed at all
      }

      const updated = await prisma.image.update({
        where: { id: record.id },
        data: {
          status: "REJECTED",
          rejectionReason: message,
          previewUrl,
          s3Key,
        },
      });
      results.push(updated);
    }
  }

  res.status(201).json(results);
});

imagesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.image.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  await prisma.image.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
