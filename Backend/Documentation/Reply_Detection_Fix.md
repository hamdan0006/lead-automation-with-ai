# Reply Detection Troubleshooting Guide

## Issue
The reply detection worker is not running on the server. No logs appear for:
- "📡 Reply Polling Worker starting..."
- "🔍 Checking for new replies..."

## Root Cause Analysis
The IMAP connection is likely failing silently during container startup, preventing the reply worker from initializing.

## Solution Steps

### 1. Verify Environment Variables in Container
```bash
# SSH into your EC2 instance
ssh ec2-user@your-server-ip

# Check if environment variables are passed to container
docker exec leads_backend env | grep -E "SMTP_EMAIL|App_Pass"
```

Expected output:
```
SMTP_EMAIL=developer.hamdanahmad@gmail.com
App_Pass=ttxgahkpnssnpfzy
```

### 2. Test IMAP Connection from Container
```bash
# Run IMAP test inside the container
docker exec leads_backend node Testfiles/test_imap.js
```

If this fails, check:
- ✅ Gmail App Password is correct
- ✅ Port 993 is not blocked by firewall
- ✅ Container has internet access

### 3. Check Container Network Access
```bash
# Test if container can reach Gmail IMAP server
docker exec leads_backend nc -zv imap.gmail.com 993
```

Expected: `Connection to imap.gmail.com 993 port [tcp/imaps] succeeded!`

### 4. View Real-time Logs
```bash
# Watch for reply worker logs
docker-compose logs -f backend | grep -E "Reply|IMAP|📡|🔍"
```

After fix, you should see:
```
📡 Reply Polling Worker starting...
🔍 Checking for new replies...
📨 Found X unread messages
✅ Reply worker initialized successfully
```

### 5. Redeploy with Fixes
```bash
# On your local machine, commit changes
git add .
git commit -m "Fix: Add error handling to reply worker"
git push origin main

# On EC2 server, pull and rebuild
cd /home/ec2-user/LeadGenAutomation
git pull origin main
docker-compose down
docker-compose up -d --build

# Watch logs
docker-compose logs -f backend
```

## Common Issues & Fixes

### Issue 1: "Invalid credentials" error
**Cause:** App Password is incorrect or expired
**Fix:** 
1. Go to https://myaccount.google.com/apppasswords
2. Generate new App Password
3. Update `.env` file on server
4. Restart container: `docker-compose restart backend`

### Issue 2: "Connection timeout" error
**Cause:** Port 993 blocked by firewall or security group
**Fix:**
1. Check AWS Security Group allows outbound HTTPS (port 443) and IMAPS (port 993)
2. Check EC2 firewall: `sudo iptables -L -n`

### Issue 3: No logs at all
**Cause:** Worker crashed during initialization
**Fix:** Already implemented in the updated code with try-catch blocks

### Issue 4: "IMAP not enabled" error
**Cause:** IMAP is disabled in Gmail settings
**Fix:**
1. Go to Gmail Settings → Forwarding and POP/IMAP
2. Enable IMAP
3. Save changes

## Verification Checklist
- [ ] Environment variables are set in container
- [ ] IMAP test script runs successfully in container
- [ ] Container can reach imap.gmail.com:993
- [ ] Reply worker startup logs appear
- [ ] Reply checks run every 5 minutes
- [ ] Test reply is detected and notification sent

## Testing Reply Detection
1. Send a test email from your Gmail to one of the leads
2. Have that lead reply to your email
3. Wait up to 5 minutes for next poll
4. Check logs for: "🔥 Real Reply Found"
5. Verify notification email received

## Monitoring
```bash
# Check reply worker is running
docker-compose logs backend | grep "Reply Polling Worker started"

# Monitor reply checks
docker-compose logs -f backend | grep "🔍 Checking"

# Check for detected replies
docker-compose logs backend | grep "🔥 Real Reply Found"
```
