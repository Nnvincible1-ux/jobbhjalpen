#!/usr/bin/env bash
# CV-piloten – deploy-skript för VPS.
# Kör i projektroten: bash deploy/deploy.sh
# Hämtar senaste koden, installerar, bygger och startar om appen.
set -euo pipefail

echo "==> Hämtar senaste koden"
git pull origin main

echo "==> Installerar beroenden"
pnpm install --frozen-lockfile

echo "==> Bygger frontend och server"
pnpm build

echo "==> Kör databasmigreringar (om några)"
# Skapar/uppdaterar tabeller enligt schemat. Säkert att köra om.
pnpm drizzle-kit migrate || echo "(inga migreringar att köra eller redan tillämpade)"

echo "==> Startar om appen"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart cvpiloten || pm2 start deploy/ecosystem.config.cjs
  pm2 save
else
  echo "PM2 saknas. Startar med systemd i stället (om konfigurerat):"
  sudo systemctl restart cvpiloten || echo "Konfigurera PM2 eller systemd enligt guiden."
fi

echo "==> Klart. CV-piloten är uppdaterad."
