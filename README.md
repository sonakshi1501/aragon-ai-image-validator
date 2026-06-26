# Aragon.ai Image Upload Challenge

Full-stack image upload app with client-side format checks, async server validation, PostgreSQL metadata storage, and S3/MinIO file storage.

## Architecture

```
Client (React + Vite)
  └─ useImageUpload hook (local previews + upload state)
       └─ POST /api/images (multipart)

Server (Express + TypeScript)
  └─ Multer (memory, secure limits)
       └─ Validation pipeline (async)
            ├─ HEIC → JPEG conversion (heic-convert)
            ├─ Resolution / file size checks
            ├─ Perceptual hash duplicate detection
            ├─ Blur detection (Laplacian variance via sharp)
            ├─ Face detection (TensorFlow BlazeFace)
            └─ S3/MinIO upload + Prisma DB record

PostgreSQL ── image metadata, status, hashes
MinIO/S3   ── processed image + preview files
```

## Quick start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Create the MinIO bucket once (optional if using local `./uploads` fallback):

1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Create bucket `aragon-images` and set public read if you want direct preview URLs

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/images` | List all images |
| GET | `/api/images/:id` | Get one image |
| POST | `/api/images` | Upload images (`images` field, multipart) |
| DELETE | `/api/images/:id` | Delete image record |

## Validation rules

| Rule | Where | Implementation |
|------|-------|----------------|
| Format (JPG/PNG/HEIC) | Frontend + Backend | MIME + extension check |
| File too small | Backend | Min 50KB (configurable) |
| Resolution too low | Backend | Min 400x400 |
| Too similar | Backend | dHash + Hamming distance |
| Blurry | Backend | Laplacian variance threshold |
| Face too small | Backend | face-api bounding box ratio |
| Multiple faces | Backend | face count > 1 |

Tune thresholds in `server/.env`.

## Loom demo checklist (15+ min)

1. **Architecture** — explain React hook state, Express REST API, Prisma ORM, async validation pipeline, S3 vs local fallback.
2. **Frontend QA**
   - Upload valid PNG/JPEG → Accepted
   - Upload `.gif` or `.webp` → rejected on client before upload
   - Drag-and-drop + click upload
   - Real-time status on each card
3. **Backend QA**
   - Tiny image → rejected (resolution/file size)
   - Blurry photo → rejected
   - Two people in photo → rejected
   - Same photo twice → second rejected as duplicate
   - HEIC from iPhone → converted and processed
   - Small face (person far away) → rejected
4. **Tradeoffs**
   - BlazeFace is lightweight but adds TensorFlow startup cost on first request
   - Perceptual hash is fast but not perfect for cropped variants
   - Sync processing per request is fine for interview scale; production would use a job queue (BullMQ/SQS)

## Submission

- Push to GitHub or zip + Google Drive
- Email: akhil@aragon.ai, chris.s@aragon.ai
- Include 15+ min Loom covering architecture, tradeoffs, and live QA

## Production improvements (mention in interview)

- Background job queue for heavy image processing
- Redis cache for image list pagination
- Signed S3 URLs instead of public buckets
- Rate limiting + virus scanning
- Pagination on `GET /api/images`
- WebSocket/SSE for real-time processing updates
