# Build Chunk Optimization Task

## Steps
- [x] 1. Update `frontend/vite.config.js` — add `manualChunks` + `chunkSizeWarningLimit`
- [x] 2. Update `frontend/src/App.jsx` — route-level code splitting with `React.lazy()` + `Suspense`
- [x] 3. Update `frontend/src/components/admin-page/AdminDashboard.jsx` — lazy-load admin sub-panels
- [x] 4. Run `npm run build` in `/frontend` to verify no >500 kB chunks

