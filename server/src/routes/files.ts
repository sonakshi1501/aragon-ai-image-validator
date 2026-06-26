import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { isS3Configured } from "../config.js";
import { getS3Client, getLocalPathForKey } from "../services/storage.js";

export const filesRouter = Router();

filesRouter.get(/.*/, async (req, res) => {
  const key = decodeURIComponent(req.path.replace(/^\//, ""));
  if (!key) {
    res.status(400).json({ error: "Missing file key" });
    return;
  }

  try {
    if (isS3Configured()) {
      const response = await getS3Client().send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET ?? "aragon-images",
          Key: key,
        })
      );

      const body = response.Body;
      if (!body) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      res.setHeader("Content-Type", response.ContentType ?? "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");

      const chunks: Uint8Array[] = [];
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      res.send(Buffer.concat(chunks));
      return;
    }

    const filePath = getLocalPathForKey(key);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});
