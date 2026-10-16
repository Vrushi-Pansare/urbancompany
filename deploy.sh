#!/usr/bin/env bash
# Usage: ./deploy.sh; override PEM location with DEPLOY_KEY=/path/key.pem.
set -euo pipefail
test "$#" -eq 0 || { echo 'Usage: ./deploy.sh (EC2 production only)'; exit 1; }
cd "$(dirname "$0")"
KEY="${DEPLOY_KEY:-/Users/sandip/Desktop/pem/netrax-staging-ec2-key.pem}"
HOST=ubuntu@13.205.130.159
for tool in git npm ssh tar curl; do
  command -v "$tool" >/dev/null || { echo "Missing command: $tool"; exit 1; }
done
test -f "$KEY" || { echo 'Set DEPLOY_KEY to your SSH PEM file.'; exit 1; }
test "$(git branch --show-current)" = master || { echo 'Switch to master first.'; exit 1; }
# Allow this script's local update, but require committed application code.
test -z "$(git status --porcelain --untracked-files=all -- . ':(exclude)deploy.sh')" || {
  echo 'Commit or stash application changes first.'; exit 1;
}
SSH=(ssh -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 -i "$KEY")
"${SSH[@]}" "$HOST" 'test -L /var/www/mygenie.in && test -w /var/www/mygenie-releases && sudo -n true'
git pull --ff-only origin master
COMMIT="$(git rev-parse HEAD)"
# Fast-forward pull preserves reviewed local commits awaiting a separate push.
npm ci
# Current AI code embeds the key in public JavaScript; exclude it.
GEMINI_API_KEY='' npm run build -- --configuration production
BUILD=dist/urbancompany/browser
test -f "$BUILD/index.html"
RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-${COMMIT:0:12}-$$"
"${SSH[@]}" "$HOST" "mkdir '/var/www/mygenie-releases/$RELEASE'"
tar -C "$BUILD" -cf - . | "${SSH[@]}" "$HOST" "tar -xf - -C '/var/www/mygenie-releases/$RELEASE'"
"${SSH[@]}" "$HOST" bash -s -- "$RELEASE" <<'REMOTE'
set -euo pipefail
release="$1"
site=/var/www/mygenie.in
target="/var/www/mygenie-releases/$release"
previous="$(readlink "$site")"
test -f "$target/index.html"
link="/var/www/mygenie-releases/activate-$release"
rollback() {
  ln -s "$previous" "$link-rollback"
  sudo -n mv -Tf "$link-rollback" "$site"
  echo 'Check failed; previous release restored.' >&2
}
ln -s "$target" "$link"
sudo -n mv -Tf "$link" "$site"
trap 'rollback' ERR
curl -fsS --max-time 30 --resolve mygenie.in:443:127.0.0.1 https://mygenie.in/ | cmp -s - "$target/index.html"
curl -fsS --max-time 30 --resolve mygenie.in:443:127.0.0.1 https://mygenie.in/bookings | cmp -s - "$target/index.html"
for asset in "$target"/*.js "$target"/*.css; do
  test -f "$asset" || continue
  curl -fsS --max-time 30 --resolve mygenie.in:443:127.0.0.1 "https://mygenie.in/$(basename "$asset")" | cmp -s - "$asset"
done
trap - ERR
printf '%s MyGenie deployed %s; rollback target %s\n' "$(date -u +%FT%TZ)" "$release" "$previous" >> /opt/netraax/ops/deployment-history.md
REMOTE
echo "Deployed $COMMIT; HTTPS homepage, deep link and assets verified."
echo 'https://mygenie.in — AI disabled; backend workflows require separate testing.'
