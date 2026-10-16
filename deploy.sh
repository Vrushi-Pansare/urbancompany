#!/usr/bin/env bash
#
# Local publish script for Netlify (not tracked in git).
# Builds the Angular app with the Angular CLI, then uploads the prebuilt
# folder to Netlify with --no-build so the Netlify Angular plugin's Node
# version check is skipped.
#
# Usage:
#   ./deploy.sh            # build + deploy to production
#   ./deploy.sh --draft    # build + deploy a preview (draft) URL, not production
#
set -euo pipefail

cd "$(dirname "$0")"

PUBLISH_DIR="dist/urbancompany/browser"
DEPLOY_FLAG="--prod"

if [[ "${1:-}" == "--draft" ]]; then
  DEPLOY_FLAG=""
  echo "==> Draft deploy (preview URL only)"
fi

echo "==> Building production bundle..."
npm run build

if [[ ! -f "$PUBLISH_DIR/index.html" ]]; then
  echo "!! Build output not found at $PUBLISH_DIR" >&2
  exit 1
fi

echo "==> Deploying $PUBLISH_DIR to Netlify..."
# shellcheck disable=SC2086
netlify deploy $DEPLOY_FLAG --dir="$PUBLISH_DIR" --no-build

echo "==> Done."
