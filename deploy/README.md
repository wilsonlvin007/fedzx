# Deploy Guide (Single Alibaba Cloud Server)

This guide deploys:

- Static site at `fedzx.com` (served by nginx from disk)
- CMS at `cms.fedzx.com` (Next.js app behind nginx reverse-proxy)
- DB: SQLite (single-server, single-instance)

## Prereqs

- DNS A record:
  - `fedzx.com` -> server public IP
  - `cms.fedzx.com` -> server public IP
- Server has nginx + HTTPS certs for both domains (certbot or any other method)
- Node.js 22+ installed (or any supported version matching your local dev)

## Files To Use

- Nginx configs:
  - `deploy/nginx/fedzx-site.conf`
  - `deploy/nginx/fedzx-cms.conf`
- Systemd service:
  - `deploy/systemd/fedzx-cms.service`

## High-Level Steps

1) Upload this repo to the server (git clone or rsync).
2) Build and run CMS with systemd.
3) Copy `apps/site` to `/var/www/fedzx` and let nginx serve it.
4) Verify:
   - `https://cms.fedzx.com/admin/login`
   - `https://fedzx.com` loads and fetches modules from CMS.

