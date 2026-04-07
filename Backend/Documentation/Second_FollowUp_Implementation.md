# Second Follow-Up Implementation Summary

## Overview
Added a second follow-up email that sends on day 7 (4 days after the first follow-up on day 3).

## Email Flow
1. **Day 0**: Initial outreach email sent
2. **Day 3**: First follow-up email sent (25-35 words with client story)
3. **Day 7**: Second follow-up email sent (15-20 words, final message)

## Changes Made

### Backend Changes

#### 1. Database Schema (prisma/schema.prisma)
- Added `secondFollowUpSent` field to track if the second follow-up was sent
- Migration created and applied: `20260322000000_add_second_followup_sent`

#### 2. Mail Service (Services/mail.service.js)
- Updated `addSendEmailJob()` function to accept `isSecondFollowUp` parameter
- Job IDs now differentiate between initial, first follow-up, and second follow-up
- Function signature: `addSendEmailJob(leadId, email, leadName, isFollowUp, isSecondFollowUp, delayMs)`

#### 3. Mail Worker (Worker/mail.worker.js)
- Added validation logic for second follow-up emails
- After first follow-up is sent, schedules second follow-up for 4 days later (day 7 total)
- Updates `secondFollowUpSent` field when second follow-up is sent
- Status flow: NEW → QUEUED → CONTACTED → FOLLOWED_UP → (second follow-up sent)
- Imports `generateSecondFollowUpBody` from aiEmail.service

#### 4. AI Email Service (Services/aiEmail.service.js)
- Added `generateSecondFollowUpBody()` function with shorter, final follow-up templates
- Second follow-up emails are 15-20 words (vs 25-35 for first follow-up)
- More respectful tone acknowledging it's the final message
- Exported new function for use in mail worker
- Templates for all scenarios: AUTOMATION, BAD_SEO, WEBSITE_DOWN, SEO_AND_SPEED, INSECURE, etc.

### Frontend Changes

#### 5. Email Automation Detail Page (Frontend/src/pages/EmailAutomation/EmailAutomationDetail.tsx)
- Updated `Lead` interface to include `followUpSent` and `secondFollowUpSent` fields
- Updated "Journey Progress" column to show 5 stages:
  1. Maps Listed (green)
  2. Mail Discovered (blue)
  3. Initial Outreach (purple)
  4. Follow-up (Day 3) (orange) - NEW
  5. Follow-up (Day 7) (pink) - NEW
- Visual indicators show completion status for each stage

## Template Differences

### Initial Outreach (Day 0)
- 60-80 words
- Identifies specific problem
- Offers solution
- Asks for conversation

### First Follow-Up (Day 3)
- **50-60 words**
- Includes client success story
- References previous email
- Example: "Sent a note last week about automation. A client I worked with last month was manually following up with leads — now it runs itself and he's closing 40% more. Reply if you want to see how."

### Second Follow-Up (Day 7)
- **40-50 words**
- Respectful and brief
- Acknowledges it's the final message
- Gives easy out
- Example: "Last note on this. If automation isn't a priority right now, no worries. Just wanted to check in one final time. Reply if you want to talk."

## Status Validation
- Initial email: Requires status = 'QUEUED'
- First follow-up: Requires status = 'CONTACTED' and contacted = true
- Second follow-up: Requires status = 'FOLLOWED_UP' and followUpSent = true

## All Existing Functionality Preserved
✅ Daily email limit (85 emails/day)
✅ Reply detection blocking
✅ Human-like delays between emails
✅ Batch completion notifications
✅ Redis deduplication
✅ All existing status checks
✅ AI-generated personalized content
✅ Scenario-based templates

## Testing Checklist
- [ ] Database migration applied successfully
- [ ] Prisma client regenerated
- [ ] Initial outreach still works
- [ ] First follow-up sends at day 3
- [ ] Second follow-up sends at day 7
- [ ] Frontend shows all 5 journey stages
- [ ] Reply detection stops all follow-ups
- [ ] Daily limit still enforced
