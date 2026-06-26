#!/usr/bin/env bash
# CV-piloten - engangs-bootstrap for en farsk Hostinger-VPS (Ubuntu/Debian).
# Kor som en anvandare med sudo: bash deploy/bootstrap.sh
# Installerar Node, pnpm, PM2, MariaDB och Caddy, samt forbereder appen.
set -euo pipefail

echo "==> Uppdaterar systemet"
sudo apt update && sudo apt upgrade -y

echo "==> Installerar Node 22, git, MariaDB"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git mariadb-server

echo "==> Installerar pnpm och pm2"
sudo npm install -g pnpm pm2

echo "==> Installerar Caddy (HTTPS)"
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt update && sudo apt install -y caddy

echo ""
echo "==> Grundinstallation klar."
echo "Nasta steg (gors en gang):"
echo "  1. Skapa databasen (se deploy/GUIDE_HOSTINGER.md steg 4)."
echo "  2. Skapa .env enligt deploy/ENV.sample.md."
echo "  3. Kor: pnpm install && pnpm build && pnpm drizzle-kit migrate"
echo "  4. Starta: pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup"
echo "  5. HTTPS: sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy"
echo "Darefter sker alla framtida uppdateringar automatiskt via GitHub Actions."
