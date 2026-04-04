#!/bin/bash

# Reply Worker Status Check Script
# Run this on your EC2 server to diagnose reply detection issues

echo "🔍 Reply Worker Status Check"
echo "=============================="
echo ""

# Check if container is running
echo "1️⃣ Container Status:"
if docker ps | grep -q leads_backend; then
    echo "   ✅ Backend container is running"
else
    echo "   ❌ Backend container is NOT running"
    exit 1
fi
echo ""

# Check environment variables
echo "2️⃣ Environment Variables:"
SMTP_EMAIL=$(docker exec leads_backend printenv SMTP_EMAIL 2>/dev/null)
APP_PASS=$(docker exec leads_backend printenv App_Pass 2>/dev/null)

if [ -n "$SMTP_EMAIL" ]; then
    echo "   ✅ SMTP_EMAIL: $SMTP_EMAIL"
else
    echo "   ❌ SMTP_EMAIL: NOT SET"
fi

if [ -n "$APP_PASS" ]; then
    echo "   ✅ App_Pass: ***${APP_PASS: -4}"
else
    echo "   ❌ App_Pass: NOT SET"
fi
echo ""

# Check network connectivity
echo "3️⃣ Network Connectivity:"
if docker exec leads_backend timeout 5 bash -c "echo > /dev/tcp/imap.gmail.com/993" 2>/dev/null; then
    echo "   ✅ Can reach imap.gmail.com:993"
else
    echo "   ❌ Cannot reach imap.gmail.com:993 (firewall/network issue)"
fi
echo ""

# Check for reply worker logs
echo "4️⃣ Reply Worker Logs:"
if docker-compose logs backend 2>/dev/null | grep -q "Reply Polling Worker"; then
    echo "   ✅ Reply worker started"
    docker-compose logs backend | grep "Reply Polling Worker" | tail -3
else
    echo "   ❌ Reply worker NOT started (check logs for errors)"
fi
echo ""

# Check recent reply checks
echo "5️⃣ Recent Reply Checks:"
RECENT_CHECKS=$(docker-compose logs backend 2>/dev/null | grep "Checking for new replies" | tail -3)
if [ -n "$RECENT_CHECKS" ]; then
    echo "   ✅ Reply checks are running:"
    echo "$RECENT_CHECKS" | sed 's/^/      /'
else
    echo "   ⚠️  No recent reply checks found"
fi
echo ""

# Check for detected replies
echo "6️⃣ Detected Replies:"
REPLIES=$(docker-compose logs backend 2>/dev/null | grep "Real Reply Found")
if [ -n "$REPLIES" ]; then
    echo "   🔥 Found replies:"
    echo "$REPLIES" | sed 's/^/      /'
else
    echo "   ℹ️  No replies detected yet"
fi
echo ""

# Summary
echo "=============================="
echo "📊 Summary:"
echo ""

# Run IMAP test
echo "🧪 Running IMAP connection test..."
if docker exec leads_backend node Testfiles/test_imap.js 2>&1 | grep -q "IMAP test completed successfully"; then
    echo "   ✅ IMAP connection works!"
else
    echo "   ❌ IMAP connection failed!"
    echo ""
    echo "   Run this for details:"
    echo "   docker exec leads_backend node Testfiles/test_imap.js"
fi
echo ""

echo "💡 To monitor live:"
echo "   docker-compose logs -f backend | grep -E 'Reply|🔍|🔥'"
