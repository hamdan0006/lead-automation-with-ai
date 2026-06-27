#!/bin/bash
# One-shot VPS deployment for Lead Automation
# Usage: bash deploy.sh
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Lead Automation VPS Deployer ===${NC}"

# 1. Check .env
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Run: cp .env.template .env && nano .env"
    exit 1
fi

# 2. Install Docker if missing
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed."
fi

# 3. Check Docker Compose (plugin style)
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose plugin..."
    apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi

# 4. Open port 80 via ufw if active
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 80/tcp
    echo "Opened port 80 in ufw."
fi

# 5. Deploy
echo "Building and starting all services (this may take a few minutes on first run)..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up --build -d

# 6. Wait for healthy backend
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
    if docker compose logs backend 2>&1 | grep -q "listening\|started\|running"; then
        break
    fi
    sleep 3
done

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "  App:    http://${SERVER_IP}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f backend    # backend logs"
echo "  docker compose logs -f frontend   # frontend logs"
echo "  docker compose ps                 # service status"
echo "  docker compose down               # stop everything"
