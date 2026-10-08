# AgriVision — Vercel deployment

This version is prepared for a single Vercel deployment:
- Static frontend at `/`
- Python/TensorFlow prediction API at `/api/predict`

## Deploy
1. Upload this folder to GitHub.
2. Import the repository into Vercel.
3. Leave **Root Directory** as the repository root.
4. Framework Preset: **Other**.
5. Build Command: leave blank.
6. Deploy.
7. If Vercel asks to enable **Large Functions**, enable it. If needed, add the project environment variable:
   `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`
   then redeploy.
8. Test by uploading a leaf image.

The `.keras` model is included. The frontend already calls `/api/predict`, so no Render backend is needed.
