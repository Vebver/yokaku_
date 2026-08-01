# TODO - Install Helmet in Backend

## Steps

- [x] 1. Investigate the helmet install error (root cause: missing `helmet` dep + `ERESOLVE` peer conflict between `multer-storage-cloudinary@4.0.0` and `cloudinary@2.10.0`)
- [x] 2. Install `helmet` in backend with `--legacy-peer-deps` to bypass the unrelated peer dependency conflict
- [x] 3. Verify `helmet` is added to `backend/package.json` dependencies (`helmet: ^8.3.0`)
- [x] 4. Verify `node_modules/helmet` exists and run a syntax check on `backend/index.js`
- [x] 5. Confirm helmet middleware loads correctly with `helmetConfig` from `config/security.js`

