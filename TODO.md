# Fix Admin Product Image Not Displaying

## Steps
- [x] 1. Investigate root cause (env var mismatch + broken upload middleware)
- [x] 2. Fix `backend/middleware/upload.js` (use disk storage so files land in uploads + correct Cloudinary env vars)
- [x] 3. Harden `frontend/src/components/admin-page/Product.jsx` image fallback logic
- [x] 4. Restart backend and verify image upload/display

## Root Cause
`backend/middleware/upload.js` (used for product image uploads) configured Cloudinary with the **wrong env var names** (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`), but the actual `.env` uses `CLOUDINARY_NAME` / `CLOUDINARY_KEY` / `CLOUDINARY_SECRET`. So product image uploads went to a Cloudinary client with `undefined` credentials → the file never saved reliably and only a broken reference was stored.

Also, the admin UI (`Product.jsx`) blindly preferred `local_path` (a possibly-broken Cloudinary URL) over `image_url` (the local `/uploads/...` path), causing blank images even when the local file existed.

## Changes Made
1. **`backend/middleware/upload.js`** — Rewrote to use reliable **local disk storage** (saves to `backend/uploads`, served at `/uploads/...`). Added a 10 MB limit and image MIME validation. The Cloudinary upload (if it succeeds) is still stored separately by `productController` as `local_path`.
2. **`frontend/src/components/admin-page/Product.jsx`** — Added `handleImageError` + `resolvePath` helpers and wired them to both the table thumbnails and the edit-drawer preview. If the preferred image fails to load, it now falls back to `image_url`, then to a placeholder.

