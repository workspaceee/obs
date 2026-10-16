#!/usr/bin/env bash
# Rebuild the local (Windows) web bundle: relative /api URLs, no cloud analytics.
set -e
cd /app/frontend
rm -rf /app/windows/web
REACT_APP_BACKEND_URL= BUILD_PATH=/app/windows/web GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=3072 yarn build
python3 /app/windows/postbuild.py /app/windows/web/index.html
