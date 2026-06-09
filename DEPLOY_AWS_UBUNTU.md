# Deploying Survly to AWS Ubuntu

This setup serves the app directly from `survly.mirim-it-show.site` on an Ubuntu server, with Nginx in front of the React build and the Express API.

## Recommended layout

- Frontend: built from `survly/` and served by Nginx from `/`
- Backend: Node/Express on `127.0.0.1:5000`
- API proxy: `/api/` -> backend
- Uploads: `/uploads/` -> backend uploads directory or S3-backed storage

## 1. DNS and server

1. Point `survly.mirim-it-show.site` to the EC2 public IP with an A record.
2. Install Node.js 20+, Nginx, and PM2 on the Ubuntu server.

## 2. Clone and install

```bash
git clone <your-repo-url> survly
cd survly
npm install
npm --prefix survly install
npm --prefix backend install
```

## 3. Backend environment

Create `backend/.env` with at least:

```env
PORT=5000
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=survly
JWT_SECRET=your_secret
ALLOWED_ORIGINS=https://survly.mirim-it-show.site
```

If you store uploads somewhere else, set `PUBLIC_UPLOADS_BASE` to that mirror URL. If uploads live only on the server, keep them in `backend/uploads` and do not set a mirror.

## 4. Frontend build

Build the frontend for the root domain, not for GitHub Pages:

```bash
cd survly
$env:VITE_APP_BASE='/'
$env:VITE_API_BASE='https://survly.mirim-it-show.site'
npm run build
```

If you prefer using the same-origin proxy, `VITE_API_BASE` can still be the public domain because Nginx will route `/api/` to the backend.

## 5. Run the backend

Use PM2 or systemd. With PM2:

```bash
cd backend
pm2 start app.js --name survly-backend
pm2 save
pm2 startup
```

## 6. Nginx config

Use the production template in [deploy/aws/nginx/survly.mirim-it-show.site.conf](deploy/aws/nginx/survly.mirim-it-show.site.conf).
It is the same layout as the example below, with the app served from `/`, API requests proxied to the local backend, and uploads served from the server disk.

```nginx
server {
    listen 80;
    server_name survly.mirim-it-show.site;

    root /var/www/survly/survly/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/survly/backend/uploads/;
        add_header Cross-Origin-Resource-Policy cross-origin;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

If you enable HTTPS, add a Certbot certificate after the HTTP site works.

## 7. Optional deployment script

Use the production systemd unit in [deploy/aws/systemd/survly-backend.service](deploy/aws/systemd/survly-backend.service) and the example env file in [deploy/aws/systemd/backend.env.example](deploy/aws/systemd/backend.env.example).

For repeatable deploys, run:

```bash
git pull
npm --prefix backend install
npm --prefix survly install
cd survly
$env:VITE_APP_BASE='/'
$env:VITE_API_BASE='https://survly.mirim-it-show.site'
npm run build
pm2 restart survly-backend
```

## 8. Notes

- Keep `ALLOWED_ORIGINS` limited to the public domain you actually serve.
- If uploads 404, confirm the files exist under `backend/uploads` or move them to S3.
- The GH Pages path `/survly/` is still supported through the existing deploy script, but it should not be used for the AWS root-domain deployment.