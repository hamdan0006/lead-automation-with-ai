# Lead Generation Automation System - How It Works

## System Overview

This is a comprehensive lead generation automation system that scrapes business leads from Google Maps, enriches them with email addresses, and automates email outreach campaigns. The system uses a queue-based architecture with background workers for scalable, asynchronous processing.

---

## Architecture Components

### 1. **Frontend (React + TypeScript)**
- Built with React 18 and TypeScript
- Uses React Router for navigation
- Zustand for state management
- TailwindCSS for styling
- Hot Toast for notifications

### 2. **Backend (Node.js + Express)**
- RESTful API built with Express.js
- PostgreSQL database with Prisma ORM
- Redis for queue management (BullMQ)
- JWT-based authentication
- Background workers for async processing

### 3. **Database (PostgreSQL)**
- Stores users, scraping jobs, leads, and email campaigns
- Prisma ORM for type-safe database queries
- Foreign key relationships for data integrity

### 4. **Queue System (Redis + BullMQ)**
- Three separate queues:
  - `maps-scraper`: Google Maps scraping jobs
  - `email-extractor`: Email enrichment jobs
  - `mail-sender`: Email sending jobs

---

## Core Workflows

## 1. Lead Scraping Workflow

### Step 1: User Creates Scraping Job
**Frontend**: `Lead.tsx` → User clicks "New Batch" button
- User enters search query (e.g., "Real estate agents in Miami")
- User optionally adds a lead type tag (e.g., "Real Estate")
- Form submits to `/scraper/google-maps` endpoint

**Backend**: `scraper.routes.js` → `scraper.controller.js`
```javascript
POST /scraper/google-maps
{
  "query": "Real estate agents in Miami",
  "leadType": "Real Estate"
}
```

**What Happens:**
1. Creates a new `scrapingJob` record in database with status `PENDING`
2. Adds job to `maps-scraper` queue via BullMQ
3. Returns job ID to frontend immediately (202 Accepted)
4. Frontend shows job in the list with "PENDING" status

### Step 2: Maps Worker Processes Job
**Worker**: `maps.worker.js`
- Runs continuously in background (concurrency: 1)
- Picks up jobs from `maps-scraper` queue
- Anti-detection: Waits random delay (2-4 minutes) between jobs

**What Happens:**
1. Checks if job exists in database (prevents foreign key errors)
2. Updates job status to `PROCESSING`
3. Calls `runMapsScraper()` function

### Step 3: Google Maps Scraping
**Scraper**: `maps.scraper.js`
- Uses Puppeteer with pooled browser instance
- Implements anti-detection measures:
  - Random scroll patterns
  - Random delays between actions
  - Realistic user agent
  - Browser recycling every 4 hours

**Scraping Process:**
1. Navigates to Google Maps search URL
2. Scrolls through results feed (10-15 cycles)
3. Extracts visible listing links
4. Opens each listing in new tab
5. Extracts business details:
   - Name
   - Address (parsed into city, state, country)
   - Website
   - Phone number
6. Creates unique key: `base64(name + address)`
7. Checks if lead already exists (prevents duplicates)
8. If new lead:
   - Creates `lead` record in database
   - Links to `scrapingJobId`
   - Increments job's `results` count
9. Continues until target reached (50-60 new leads)
10. Updates job status to `COMPLETED`

**Database Updates:**
- Real-time: Each lead increments `scrapingJob.results`
- Frontend polling: Shows live progress in UI

### Step 4: Frontend Displays Results
**Frontend**: `Lead.tsx` and `LeadDetail.tsx`
- Shows job status with progress bar
- Displays lead count
- "View List" button navigates to lead details
- Shows keyword and location in cards

---

## 2. Email Enrichment Workflow

### Step 1: User Starts Enrichment
**Frontend**: `Enrichment.tsx` → User clicks "Start Enriching"
- Navigates to enrichment batch list
- Clicks "Start Enriching" for a specific job

**Backend**: `scraper.routes.js` → `scraper.controller.js`
```javascript
POST /scraper/extract-emails
{
  "jobId": 47
}
```

**What Happens:**
1. Fetches all leads for the job where `emailExtracted = false`
2. Adds each lead to `email-extractor` queue
3. Returns success message
4. Frontend shows "Enriching" status with progress bar

### Step 2: Email Worker Processes Leads
**Worker**: `email.worker.js`
- Runs continuously in background (concurrency: 3)
- Processes 3 leads simultaneously
- Uses Hunter.io API for email extraction

**Email Extraction Process:**
1. Gets lead from queue
2. Checks if lead has website
3. If website exists:
   - Calls Hunter.io Domain Search API
   - Extracts emails from website domain
   - Filters for valid business emails
4. Updates lead record:
   - Sets `email` field
   - Sets `emailExtracted = true`
5. If no website or no email found:
   - Sets `emailExtracted = true` (to avoid reprocessing)

**API Integration:**
```javascript
// Hunter.io Domain Search
GET https://api.hunter.io/v2/domain-search
?domain=example.com
&api_key=YOUR_KEY
```

### Step 3: Frontend Shows Progress
**Frontend**: `EnrichmentDetail.tsx`
- Polls every 5 seconds (auto-refresh)
- Shows percentage: `emailsFound / totalLeads * 100`
- Progress bar fills based on actual enrichment
- Displays count: "15 / 50 Enriched"

---

## 3. Email Automation Workflow

### Step 1: User Starts Email Campaign
**Frontend**: `EmailAutomation.tsx` → User clicks "Start Email Automation"
- Shows list of completed scraping jobs
- User clicks "Start" or "Continue" button

**Backend**: `scraper.routes.js` → `scraper.controller.js`
```javascript
POST /scraper/send-emails
{
  "jobId": 47
}
```

**What Happens:**
1. Fetches all leads for job where:
   - `email IS NOT NULL`
   - `contacted = false`
2. Adds each lead to `mail-sender` queue
3. Updates job's `isAutomationComplete` flag
4. Returns count of queued emails

### Step 2: Mail Worker Sends Emails
**Worker**: `mail.worker.js`
- Runs continuously in background (concurrency: 2)
- Sends 2 emails simultaneously
- Uses Nodemailer with Gmail SMTP

**Email Sending Process:**
1. Gets lead from queue
2. Loads email template
3. Personalizes template with lead data:
   - `{{name}}` → Lead's business name
   - `{{city}}` → Lead's city
4. Sends email via SMTP
5. Updates lead record:
   - Sets `contacted = true`
   - Sets `status = 'CONTACTED'`
6. Increments job's `contactedCount`

**Email Configuration:**
```javascript
// Nodemailer SMTP
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}
```

### Step 3: Reply Monitoring
**Worker**: `reply.worker.js`
- Polls Gmail inbox every 5 minutes
- Checks for replies to sent emails
- Uses Gmail API with OAuth2

**Reply Detection:**
1. Fetches recent emails from inbox
2. Checks if sender email matches any contacted lead
3. If match found:
   - Updates lead's `status = 'REPLIED'`
   - Logs reply for follow-up

---

## Progress Bar Implementation

### Lead Scraping Progress
**Location**: `Lead.tsx` (Status column)
- Shows when: `status = 'PROCESSING' OR 'PENDING'`
- Display: "Running..." with animated pulse bar
- Color: Amber (#F59E0B)
- Width: 100% (indeterminate progress)

### Enrichment Progress
**Location**: `EnrichmentDetail.tsx` (Analytics card)
- Shows: Actual percentage based on data
- Calculation: `(emailsFound / totalLeads) * 100`
- Display: "45%" with progress bar at 45% width
- Updates: Every 5 seconds via polling
- Color: Amber (#D97706)

### Email Campaign Progress
**Location**: `EmailAutomationDetail.tsx` (Analytics card)
- Shows: Actual percentage based on data
- Calculation: `(contacted / totalLeads) * 100`
- Display: "60%" with progress bar at 60% width
- Updates: Every 5 seconds via polling
- Color: Blue (#2563EB)

---

## Anti-Detection Measures

### 1. Random Delays
- Between jobs: 2-4 minutes
- Between scrolls: 500-1000ms
- Between page loads: 2-4 seconds
- Between email sends: Configured in worker

### 2. Browser Pooling
- Single browser instance shared across jobs
- Recycled every 4 hours
- Reduces memory footprint
- Mimics human behavior

### 3. Dynamic Targets
- Random lead count: 50-60 per job
- Random scroll depth: 10-15 cycles
- Random scroll step size: 200-400px

### 4. Realistic User Agent
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
AppleWebKit/537.36 (KHTML, like Gecko) 
Chrome/120.0.0.0 Safari/537.36
```

---

## Error Handling

### 1. Foreign Key Constraint Violations
**Problem**: Worker tries to process deleted job
**Solution**: 
- Check job exists before processing
- Gracefully exit if job not found
- Log error without crashing worker

### 2. HTTP Errors During Scraping
**Problem**: Google Maps returns 404/500
**Solution**:
- Check response status before extracting
- Skip invalid pages
- Continue to next listing

### 3. Email API Failures
**Problem**: Hunter.io rate limit or network error
**Solution**:
- Retry with exponential backoff
- Mark lead as processed to avoid infinite loops
- Log error for manual review

### 4. Database Connection Loss
**Problem**: PostgreSQL connection drops
**Solution**:
- Prisma auto-reconnects
- Workers retry failed operations
- Jobs remain in queue until processed

---

## Data Flow Diagram

```
User Input (Frontend)
    ↓
API Request (Backend)
    ↓
Create Job Record (Database)
    ↓
Add to Queue (Redis/BullMQ)
    ↓
Worker Picks Up Job
    ↓
Process Job (Scrape/Enrich/Send)
    ↓
Update Database (Real-time)
    ↓
Frontend Polls API
    ↓
Display Progress (UI)
```

---

## Database Schema

### scrapingJobs
```sql
id: INT (Primary Key)
url: TEXT (Google Maps search URL)
status: ENUM (PENDING, PROCESSING, COMPLETED, FAILED)
results: INT (Lead count)
leadType: VARCHAR (User-defined tag)
city, state, country: VARCHAR (Parsed from query)
isAutomationComplete: BOOLEAN
contactedCount: INT
createdAt: TIMESTAMP
```

### leads
```sql
id: INT (Primary Key)
scrapingJobId: INT (Foreign Key)
name: VARCHAR (Business name)
email: VARCHAR (Extracted email)
phone: VARCHAR (Phone number)
address: TEXT (Full address)
city, state, country: VARCHAR (Parsed)
website: TEXT
keyword: VARCHAR (Search query used)
leadType: VARCHAR (Inherited from job)
status: ENUM (NEW, CONTACTED, REPLIED)
contacted: BOOLEAN
emailExtracted: BOOLEAN
mapsScraped: BOOLEAN
uniqueKey: VARCHAR (Deduplication key)
createdAt: TIMESTAMP
```

---

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/leadgen
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
HUNTER_API_KEY=your-hunter-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
```

---

## API Endpoints

### Authentication
- `POST /auth/register` - Create new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Scraping
- `GET /scraper/jobs` - List all scraping jobs (paginated)
- `GET /scraper/jobs/:id/leads` - Get leads for a job (paginated)
- `POST /scraper/google-maps` - Create new scraping job
- `POST /scraper/extract-emails` - Start email enrichment
- `POST /scraper/send-emails` - Start email campaign

---

## Performance Optimizations

### 1. Pagination
- All list endpoints support pagination
- Default: 10 items per page (jobs)
- Default: 50 items per page (leads)
- Reduces memory usage and load times

### 2. Polling Strategy
- Frontend polls every 5 seconds
- Silent polling (no loading states)
- Only polls when process is active
- Stops polling when complete

### 3. Database Indexing
- Unique index on `leads.uniqueKey`
- Index on `leads.scrapingJobId`
- Index on `leads.email`
- Speeds up duplicate checks and queries

### 4. Queue Concurrency
- Maps scraper: 1 (sequential to avoid detection)
- Email extractor: 3 (parallel processing)
- Mail sender: 2 (controlled sending rate)

---

## Monitoring & Logging

### Winston Logger
- Logs all worker activities
- Logs API requests/responses
- Logs errors with stack traces
- Timestamp format: `[YYYY-MM-DD HH:mm:ss.SSS +ZZZZ]`

### Browser Monitor
- Tracks open pages
- Monitors memory usage
- Triggers browser recycling
- Prevents memory leaks

### Log Levels
- `INFO`: Normal operations
- `WARN`: Recoverable errors
- `ERROR`: Critical failures

---

## Security Measures

### 1. Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Protected routes with middleware

### 2. API Rate Limiting
- Prevents abuse
- Configurable limits per endpoint

### 3. Input Validation
- Sanitizes user inputs
- Prevents SQL injection
- Validates email formats

### 4. Environment Variables
- Sensitive data in .env files
- Never committed to version control
- Different configs for dev/prod

---

## Deployment Considerations

### Production Setup
1. Use PM2 for process management
2. Set up Redis cluster for high availability
3. Use PostgreSQL connection pooling
4. Enable HTTPS with SSL certificates
5. Set up monitoring (e.g., Sentry, DataDog)
6. Configure backup strategy for database
7. Use CDN for frontend assets

### Scaling Strategy
- Horizontal scaling: Add more worker instances
- Vertical scaling: Increase worker concurrency
- Database: Read replicas for queries
- Redis: Cluster mode for queue distribution

---

## Future Enhancements

1. **AI-Powered Email Personalization**
   - Use GPT to generate custom emails per lead
   - Analyze lead's website for context

2. **Advanced Analytics Dashboard**
   - Email open rates
   - Click-through rates
   - Conversion tracking

3. **Multi-Channel Outreach**
   - LinkedIn automation
   - SMS campaigns
   - WhatsApp integration

4. **Lead Scoring**
   - ML model to rank lead quality
   - Prioritize high-value prospects

5. **CRM Integration**
   - Sync with Salesforce, HubSpot
   - Two-way data synchronization

---

## Troubleshooting Guide

### Issue: Jobs stuck in PENDING
**Cause**: Worker not running or crashed
**Solution**: Restart backend server, check worker logs

### Issue: No emails extracted
**Cause**: Hunter.io API key invalid or rate limit
**Solution**: Check API key, upgrade plan, or wait for reset

### Issue: Foreign key constraint error
**Cause**: Job deleted while worker processing
**Solution**: Fixed with job existence check in worker

### Issue: Browser crashes
**Cause**: Memory leak or too many pages open
**Solution**: Browser auto-recycles every 4 hours

### Issue: Duplicate leads
**Cause**: Unique key collision
**Solution**: System prevents duplicates via uniqueKey check

---

## System Requirements

### Development
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- 4GB RAM minimum
- Windows/Mac/Linux

### Production
- Node.js 18+ (LTS)
- PostgreSQL 14+ (with backups)
- Redis 6+ (cluster mode)
- 8GB RAM recommended
- Ubuntu 20.04+ or similar

---

## Conclusion

This system provides a complete end-to-end solution for lead generation automation. It handles scraping, enrichment, and outreach with built-in anti-detection, error handling, and real-time progress tracking. The queue-based architecture ensures scalability and reliability, while the React frontend provides an intuitive user experience.
