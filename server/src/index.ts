import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { ensureModelsDownloaded } from "./services/faceDetection.js";
import { imagesRouter } from "./routes/images.js";
import { filesRouter } from "./routes/files.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/files", filesRouter);
app.use("/api/images", imagesRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(400).json({ error: err.message });
  }
);

async function bootstrap() {
  try {
    await ensureModelsDownloaded();
    console.log("BlazeFace model loaded");
  } catch (error) {
    console.warn("Face model failed to load", error);
  }

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

bootstrap();
