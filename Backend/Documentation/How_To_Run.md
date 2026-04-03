# How to Run Lead Generation Automation System

This guide will walk you through setting up and running the Lead Generation Automation system from scratch.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Redis** (v6 or higher) - [Download](https://redis.io/download/)
- **Git** - [Download](https://git-scm.com/downloads)

### Optional but Recommended
- **pgAdmin** - PostgreSQL GUI tool
- **Redis Insight** - Redis GUI tool
- **Postman** - API testing tool

### Check Installations
```bash
# Check Node.js version
node --version
# Should output: v18.x.x or higher

# Check npm version
npm --version
# Should output: 9.x.x or higher

# Check PostgreSQL
psql --version
# Should output: psql (PostgreSQL) 14.x or higher

# Check Redis
redis-cli --version
# Should output: redis-cli 6.x.x or higher
```

---

## Installation Steps

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd LeadGenAutomation
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

**Expected packages:**
- express
- prisma
- @prisma/client
- bullmq
- ioredis
- puppeteer
- jsonwebtoken
- bcryptjs
- nodemailer
- winston
- dotenv
- cors

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

**Expected packages:**
- react
- react-router-dom
- zustand
- axios
- react-hot-toast
- lucide-react
- tailwindcss

---

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env  # On Windows: type nul > .env
```

Add the following configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/leadgen_db"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (Generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Hunter.io API (Email Enrichment)
HUNTER_API_KEY=your-hunter-api-key-here

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Gmail API (For Reply Monitoring)
GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-google-oauth-refresh-token

# Notification Email (Where to send alerts)
NOTIFICATION_EMAIL=admin@yourdomain.com
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cd ../frontend
touch .env  # On Windows: type nul > .env
```

Add the following configuration:

```env
VITE_API_URL=http://localhost:3000
```

---

## Detailed Configuration Guide

### 1. PostgreSQL Database Setup

#### Create Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE leadgen_db;

# Create user (optional)
CREATE USER leadgen_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE leadgen_db TO leadgen_user;

# Exit
\q
```

#### Update DATABASE_URL
```env
# If using default postgres user
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/leadgen_db"

# If using custom user
DATABASE_URL="postgresql://leadgen_user:your_password@localhost:5432/leadgen_db"
```

### 2. Redis Setup

#### Start Redis Server

**On Windows:**
```bash
# If installed via MSI installer
redis-server

# Or if using WSL
wsl redis-server
```

**On macOS:**
```bash
# If installed via Homebrew
brew services start redis

# Or run directly
redis-server
```

**On Linux:**
```bash
sudo systemctl start redis
# Or
redis-server
```

#### Verify Redis is Running
```bash
redis-cli ping
# Should output: PONG
```

### 3. Hunter.io API Key

1. Go to [Hunter.io](https://hunter.io/)
2. Sign up for a free account
3. Navigate to API section
4. Copy your API key
5. Paste in `.env` file: `HUNTER_API_KEY=your_key_here`

**Free Tier Limits:**
- 25 requests/month
- Upgrade for more requests

### 4. Gmail SMTP Configuration

#### Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification

#### Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Name it "Lead Gen Automation"
4. Copy the 16-character password
5. Paste in `.env` file: `EMAIL_PASS=your_app_password`

### 5. Gmail API Setup (Optional - For Reply Monitoring)

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Lead Gen Automation"
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Download credentials JSON

#### Get Refresh Token
```bash
# Use the OAuth playground or run a script
# Add the refresh token to .env
GMAIL_REFRESH_TOKEN=your_refresh_token
```

---

## Database Setup

### Step 1: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### Step 2: Run Database Migrations
```bash
npx prisma migrate dev --name init
```

**This will:**
- Create all database tables
- Set up relationships
- Create indexes

### Step 3: Verify Database Schema
```bash
npx prisma studio
```
- Opens Prisma Studio at `http://localhost:5555`
- You can view and edit database records

---

## Running the Application

### Option 1: Development Mode (Recommended for Testing)

#### Terminal 1: Start Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
[INFO] 🔴 Successfully connected to Redis
[INFO] 🗄️ Successfully connected to PostgreSQL Database via Prisma
[INFO] 📧 Email Extraction Worker started and ready for jobs.
[INFO] 📮 Mail Sending Worker started and ready for jobs.
[INFO] 🗺️ Maps Scraper Worker started and ready for jobs.
[INFO] 📬 Quiet Reply Polling Worker started
[INFO] 🚀 Server is running on http://localhost:3000
```

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Option 2: Production Mode

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Start Backend with PM2
```bash
cd backend
npm install -g pm2
pm2 start server.js --name "leadgen-backend"
pm2 startup
pm2 save
```

#### Serve Frontend with Nginx or Apache
```bash
# Copy build files to web server
cp -r frontend/dist/* /var/www/html/
```

---

## Verification

### 1. Check Backend Health
```bash
curl http://localhost:3000/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Check Redis Connection
```bash
redis-cli
> PING
PONG
> KEYS *
(empty array or existing keys)
```

### 3. Check Database Connection
```bash
cd backend
npx prisma studio
```
- Should open without errors
- You should see empty tables

### 4. Access Frontend
Open browser and navigate to:
```
http://localhost:5173
```

**You should see:**
- Login page
- Clean UI with dark mode support
- No console errors

---

## First Time Setup

### 1. Create Admin Account
1. Open frontend: `http://localhost:5173`
2. Click "Sign Up"
3. Enter details:
   - Name: Admin
   - Email: admin@example.com
   - Password: (strong password)
4. Click "Create Account"

### 2. Login
1. Use credentials from step 1
2. You should be redirected to dashboard

### 3. Test Scraping
1. Navigate to "Lead Batches"
2. Click "New Batch"
3. Enter query: "coffee shops in New York"
4. Click "Start Scraping"
5. Wait for results (2-5 minutes)

### 4. Test Enrichment
1. Navigate to "Enrichment Batches"
2. Select the batch you just created
3. Click "Start Enriching"
4. Wait for emails to be extracted

### 5. Test Email Automation
1. Navigate to "Email Automation"
2. Select the enriched batch
3. Click "Start Email Automation"
4. Emails will be sent to extracted addresses

---

## Troubleshooting

### Issue: Backend won't start

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`
**Solution:** PostgreSQL is not running
```bash
# Windows
net start postgresql-x64-14

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

---

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`
**Solution:** Redis is not running
```bash
# Start Redis
redis-server
```

---

**Error:** `Prisma Client could not be generated`
**Solution:** Run Prisma generate
```bash
cd backend
npx prisma generate
```

---

### Issue: Frontend won't start

**Error:** `Module not found`
**Solution:** Install dependencies
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

**Error:** `VITE_API_URL is not defined`
**Solution:** Create `.env` file in frontend directory
```env
VITE_API_URL=http://localhost:3000
```

---

### Issue: Scraping not working

**Error:** `Browser launch failed`
**Solution:** Install Chromium dependencies
```bash
# Linux
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxrandr2 libgbm1 libasound2

# macOS
# Puppeteer should work out of the box

# Windows
# Puppeteer should work out of the box
```

---

**Error:** `Foreign key constraint violated`
**Solution:** This is fixed in the latest code. Restart backend.
```bash
# Stop backend (Ctrl+C)
# Start again
npm run dev
```

---

### Issue: Email enrichment not working

**Error:** `Hunter.io API error: 401 Unauthorized`
**Solution:** Check API key
1. Verify `HUNTER_API_KEY` in `.env`
2. Check if key is valid on Hunter.io dashboard
3. Check if you have remaining credits

---

**Error:** `Hunter.io API error: 429 Too Many Requests`
**Solution:** Rate limit exceeded
- Wait for monthly reset
- Upgrade Hunter.io plan
- Or use alternative email finder

---

### Issue: Emails not sending

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`
**Solution:** Gmail App Password issue
1. Verify 2FA is enabled on Google account
2. Generate new App Password
3. Update `EMAIL_PASS` in `.env`
4. Restart backend

---

**Error:** `ECONNREFUSED` when sending emails
**Solution:** SMTP port blocked
- Try port 465 instead of 587
- Check firewall settings
- Try different email provider

---

### Issue: Database migration errors

**Error:** `Migration failed`
**Solution:** Reset database
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev --name init
```

**Warning:** This will delete all data!

---

### Issue: Port already in use

**Error:** `Port 3000 is already in use`
**Solution:** Kill process using port
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

---

## Development Tips

### Hot Reload
- Frontend: Auto-reloads on file changes
- Backend: Use `nodemon` for auto-restart
```bash
npm install -g nodemon
nodemon server.js
```

### Debug Mode
```bash
# Backend with debug logs
DEBUG=* npm run dev

# Frontend with verbose output
npm run dev -- --debug
```

### Database Reset
```bash
# Reset and reseed database
cd backend
npx prisma migrate reset
npx prisma db seed  # If seed file exists
```

### Clear Redis Queue
```bash
redis-cli
> FLUSHALL
> exit
```

### View Logs
```bash
# Backend logs (if using PM2)
pm2 logs leadgen-backend

# Or check log files
tail -f backend/logs/app.log
```

---

## Production Deployment Checklist

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Update `DATABASE_URL` to production database
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure Redis persistence
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure rate limiting
- [ ] Set up CDN for frontend
- [ ] Enable CORS for production domain
- [ ] Set up log rotation
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Test disaster recovery plan

---

## Useful Commands

### Backend
```bash
# Start development server
npm run dev

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Format code
npm run format

# Lint code
npm run lint
```

### Frontend
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Database
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Redis
```bash
# Start Redis
redis-server

# Connect to Redis CLI
redis-cli

# Check all keys
redis-cli KEYS "*"

# Clear all data
redis-cli FLUSHALL
```

---

## Support & Resources

### Documentation
- [SystemWorking.md](./SystemWorking.md) - Detailed system architecture
- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Docs](https://docs.bullmq.io/)
- [React Docs](https://react.dev/)

### API Testing
- Use Postman collection (if provided)
- Or test endpoints manually:
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Next Steps

After successful setup:

1. **Customize Email Templates**
   - Edit templates in `backend/templates/`
   - Add personalization variables

2. **Configure Scraping Rules**
   - Adjust delays in `backend/config/scraper.rules.js`
   - Modify target lead counts

3. **Set Up Monitoring**
   - Integrate error tracking (Sentry)
   - Set up uptime monitoring
   - Configure alerts

4. **Scale the System**
   - Add more worker instances
   - Set up load balancer
   - Use managed Redis/PostgreSQL

5. **Enhance Features**
   - Add more data sources
   - Implement A/B testing for emails
   - Build analytics dashboard

---

## Common Workflows

### Daily Operations
1. Check worker status
2. Monitor queue lengths
3. Review error logs
4. Check email delivery rates

### Weekly Maintenance
1. Review database size
2. Clean up old jobs
3. Update dependencies
4. Backup database

### Monthly Tasks
1. Review API usage (Hunter.io)
2. Analyze lead quality
3. Optimize scraping rules
4. Update email templates

---

## Conclusion

You should now have a fully functional Lead Generation Automation system running locally. If you encounter any issues not covered in this guide, check the logs for detailed error messages and refer to the SystemWorking.md for architectural details.


