#!/bin/bash
# One-shot VPS deployment for Lead Automation
# Usage: bash deploy.sh [PORT]   (default: 8080)
set -e

APP_PORT=${1:-8080}
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Lead Automation VPS Deployer ===${NC}"
echo "Project dir : $(pwd)"
echo "App port    : $APP_PORT"
echo ""

# 1. Check .env
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Run: cp .env.template .env && nano .env"
    exit 1
fi

# 2. Check port is free
if ss -tlnp | grep -q ":${APP_PORT} "; then
    echo -e "${RED}ERROR: Port ${APP_PORT} is already in use!${NC}"
    echo "Running processes on that port:"
    ss -tlnp | grep ":${APP_PORT} "
    echo ""
    echo "Pick a different port: bash deploy.sh 8081"
    exit 1
fi
echo -e "${GREEN}Port ${APP_PORT} is free.${NC}"

# 3. Check for container name conflicts
for name in lead_db lead_redis lead_backend lead_frontend; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
        echo -e "${YELLOW}WARNING: Container '${name}' already exists — will be replaced.${NC}"
    fi
done

# 4. Install Docker if missing
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 5. Check Docker Compose plugin
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi

# 6. Patch port in docker-compose if custom port given
if [ "$APP_PORT" != "8080" ]; then
    sed -i "s/\"8080:80\"/\"${APP_PORT}:80\"/" docker-compose.yml
    echo "Updated docker-compose.yml to use port ${APP_PORT}."
fi

# 7. Open firewall port
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow ${APP_PORT}/tcp
    echo "Opened port ${APP_PORT} in ufw."
fi

# 8. Deploy
echo ""
echo "Building and starting services (first build may take 3-5 min)..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d

# 9. Show status
echo ""
docker compose ps
SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "  App: http://${SERVER_IP}:${APP_PORT}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f backend    # backend logs"
echo "  docker compose logs -f frontend   # nginx/frontend logs"
echo "  docker compose ps                 # service status"
echo "  docker compose restart backend    # restart one service"
echo "  docker compose down               # stop everything (won't affect other apps)"
