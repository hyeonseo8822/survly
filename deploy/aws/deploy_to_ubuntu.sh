#!/usr/bin/env bash
set -euo pipefail

# Usage: ./deploy_to_ubuntu.sh [user@host] [branch]
# Example: ./deploy_to_ubuntu.sh ubuntu@43.203.119.138 main
#
# If no <user@host> is provided, the script defaults to
# `ubuntu@43.203.119.138` (your provided IP). You can still
# override `VITE_API_BASE` by exporting it in your shell before running.

REMOTE=${1:-ubuntu@43.203.119.138}
BRANCH=${2:-main}

REPO_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
DEPLOY_DIR="/var/www/survly/current"

echo "Pushing repo to ${REMOTE} (branch=${BRANCH})..."

# Ensure local build exists (frontend)
echo "Building frontend for root domain..."
pushd "$REPO_ROOT/survly" >/dev/null
# Allow overriding VITE_API_BASE externally; default to http://<host>
VITE_APP_BASE='/' VITE_API_BASE="${VITE_API_BASE:-http://${REMOTE#*@}}" npm run build
popd >/dev/null

# Rsync project to remote path (into a temporary dir)
TMP_REMOTE_DIR="/tmp/survly_deploy_$(date +%s)"
echo "Copying files to ${REMOTE}:${TMP_REMOTE_DIR} (this will exclude node_modules and .git)"
rsync -az --delete --exclude node_modules --exclude .git --exclude .venv --exclude dist --exclude 'survly/dist' --exclude 'survly/node_modules' "$REPO_ROOT/" "${REMOTE}:${TMP_REMOTE_DIR}/"

echo "Running remote install and deploy steps..."
ssh "$REMOTE" bash -s <<EOF
set -euo pipefail
sudo useradd -m -s /bin/bash survly >/dev/null 2>&1 || true
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $(whoami):$(whoami) /var/www/survly || true
rm -rf /var/www/survly/current_tmp || true
mv "$TMP_REMOTE_DIR" /var/www/survly/current_tmp
mv /var/www/survly/current_tmp /var/www/survly/current
cd /var/www/survly/current

# Install backend deps and build if needed
if [ -d backend ]; then
  cd backend
  npm install --production
  cd ..
fi

# Place nginx conf and systemd unit if present in repo
if [ -f deploy/aws/nginx/survly.mirim-it-show.site.conf ]; then
  sudo cp deploy/aws/nginx/survly.mirim-it-show.site.conf /etc/nginx/sites-available/survly.mirim-it-show.site.conf
  sudo ln -sf /etc/nginx/sites-available/survly.mirim-it-show.site.conf /etc/nginx/sites-enabled/survly.mirim-it-show.site.conf
fi

if [ -f deploy/aws/systemd/survly-backend.service ]; then
  sudo cp deploy/aws/systemd/survly-backend.service /etc/systemd/system/survly-backend.service
fi

# Ensure /etc/survly backend env exists
sudo mkdir -p /etc/survly
if [ -f deploy/aws/systemd/backend.env.example ]; then
  sudo cp deploy/aws/systemd/backend.env.example /etc/survly/backend.env
  echo "-- Please edit /etc/survly/backend.env with real secrets --"
fi

# Set permissions
sudo chown -R survly:survly /var/www/survly

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable --now survly-backend.service || sudo systemctl restart survly-backend.service || true

# Test and reload nginx
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx
fi

EOF

echo "Deployment to ${REMOTE} finished."
echo "Remember to edit /etc/survly/backend.env on the server and run 'sudo systemctl restart survly-backend' if you changed secrets."
