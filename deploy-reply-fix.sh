#!/bin/bash

# Reply Detection Fix - Deployment Script
# Run this on your EC2 server after pushing code changes

echo "🚀 Deploying Reply Detection Fix..."

# Navigate to project directory
cd /home/ec2-user/LeadGenAutomation || exit 1

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Rebuild backend with new code
echo "🔨 Rebuilding backend container..."
docker-compose build backend

# Start all services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Test IMAP connection
echo "🔍 Testing IMAP connection..."
docker exec leads_backend node Testfiles/test_imap.js

# Show recent logs
echo ""
echo "📋 Recent logs (last 50 lines):"
docker-compose logs --tail=50 backend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Monitor reply worker with:"
echo "   docker-compose logs -f backend | grep -E 'Reply|🔍|🔥'"
echo ""
echo "🧪 Test reply detection by:"
echo "   1. Having a lead reply to your email"
echo "   2. Wait up to 5 minutes"
echo "   3. Check for '🔥 Real Reply Found' in logs"
