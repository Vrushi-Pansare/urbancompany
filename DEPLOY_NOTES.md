# Deploy / Ops Notes

Operational notes that live outside the app build. `deploy.sh` ships only the
frontend bundle to EC2 and does **not** manage nginx, so server-side config
changes are recorded here.

## Production host

- EC2: `ubuntu@13.205.130.159` (also the resolution of `mygenie.netraax.com`)
- Site: https://mygenie.in — frontend symlinked at `/var/www/mygenie.in`
- Deploy key: `deploy.sh` defaults to `/Users/mihir/Desktop/netrax-staging-ec2-key.pem`
  (override with `DEPLOY_KEY=/path/key.pem`).

## nginx `/api` upstream for mygenie.in (2026-11-04)

**Symptom:** OTP (and all `/api`) worked when hitting `mygenie.netraax.com`
directly (e.g. Postman) but failed on the live site `mygenie.in`. OTP returned
`HTTP 422 OTP_SENDER_NOT_CONFIGURED` ("No WhatsApp sender is configured for this
company.").

**Cause:** The frontend uses relative `/api/...` paths (no hardcoded base URL —
see `src/app/constants/urls.ts`), so the live backend is whatever nginx proxies
to. The `mygenie.in` server block on EC2 still pointed `/api` at the **staging**
backend `mygenie.staging.netraax.com` (→ 15.252.84.239), which has no WhatsApp
OTP sender. Production backend `mygenie.netraax.com` (→ 13.205.130.159, the EC2
box itself) does. The dev proxy (`src/proxy.conf.json`) already used production;
only the server's nginx was stale.

**Fix:** In `/etc/nginx/sites-available/mygenie.in`, the `location /api/` block
was pointed at production:

```nginx
location /api/ {
    proxy_pass        https://mygenie.netraax.com;   # was mygenie.staging.netraax.com
    proxy_ssl_server_name on;
    proxy_ssl_name    mygenie.netraax.com;           # was mygenie.staging.netraax.com
    proxy_set_header  Host              mygenie.netraax.com;
    proxy_set_header  X-Forwarded-Host  mygenie.netraax.com;
    ...
}
```

Applied with:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Verified: `POST https://mygenie.in/api/v1/public/otp/create` → `HTTP 201
OTP sent successfully`.

**Notes:**
- The backend resolves the tenant/company from the `Host` / `X-Forwarded-Host`
  it receives, so both must name `mygenie.netraax.com`.
- A backup of the previous config is on the server:
  `/etc/nginx/sites-available/mygenie.in.bak-20261104T120016Z`.
- This change is server-only; `deploy.sh` will not revert it, but it also is not
  applied by any script in this repo. Re-apply manually if the box is rebuilt.
