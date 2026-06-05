# Deploying the backend to Render (quick guide)

1. Create a Render account at https://render.com and connect your GitHub repository.

2. In Render, create a new **Web Service** and select this repository.

3. Set the following service options:
   - **Name**: `survly-backend` (or any name)
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install` (Render runs it automatically)
   - **Start Command**: `npm start`

4. In Render's dashboard, add Environment Variables (do NOT commit these to git):
   - `MONGODB_URI` — your MongoDB connection string
   - `MONGODB_DB_NAME` — e.g. `survly`
   - `JWT_SECRET` — secure random value
   - `ALLOWED_ORIGINS` — e.g. `https://hyeonseo8822.github.io,https://<your-render-host>`

5. Deploy. After the service is live the backend will provide a public URL like `https://survly.onrender.com`.

6. Update the frontend `VITE_API_BASE` to the Render URL (no trailing slash) and rebuild the `survly` app:

```bash
# Windows PowerShell
$env:VITE_API_BASE='https://survly.onrender.com'
npm --prefix survly run build
npx gh-pages -d survly/dist
```

7. Confirm the frontend at `https://hyeonseo8822.github.io/survly/` calls the Render URL and that CORS succeeds. If you see CORS errors, ensure `ALLOWED_ORIGINS` contains `https://hyeonseo8822.github.io`.

Notes:
- If you prefer Railway or Fly, the steps are similar: connect repo, point root to `backend`, set start command and env vars.
- Vercel can host Node apps but often requires serverless restructuring; Render is simplest for an existing Express app.
