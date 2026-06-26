# Test images for validation

Use these images to QA each validation rule.

## Should PASS (Accepted)

| File | Why |
|------|-----|
| `sample-portrait-pass.jpg` | Single clear face, good resolution, sharp — **verified to pass** |

### How to test

1. **Restart backend** so new validation settings load: `cd server && npm run dev`
2. In the Rejected section, click **Clear all** to remove old failed uploads
3. Upload `test-assets/sample-portrait-pass.jpg`
4. It should appear in **Accepted**

If you upload the same file twice, the second one will be **Rejected** (too similar) — that's expected.

## Manual test cases (find your own photos)

| Test | Expected result |
|------|-----------------|
| Upload `sample-portrait-pass.jpg` | Accepted |
| Upload the same file again | Rejected — too similar |
| Upload a `.gif` or `.webp` | Blocked on frontend |
| Upload a tiny image (< 400×400) | Rejected — resolution |
| Upload a blurry photo | Rejected — blurry |
| Upload 2+ people in frame | Rejected — multiple faces |
| Upload person far away (small face) | Rejected — face too small |

## Free portrait photos online

If you need more test images, download from Unsplash (free):

- **Should pass:** https://unsplash.com/photos/woman-in-white-shirt-smiling-IF9TK5Uy-KI
- **Multiple faces:** any group photo
- **Blurry:** take a photo while moving the camera

Save downloads as JPG/PNG and upload through the app.
