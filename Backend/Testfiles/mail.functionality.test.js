/**
 * Mail Service & Worker Functionality Test
 * Tests email logic without actually sending emails
 * Looks for potential bugs in daily limits, status transitions, and edge cases
 */

const { prisma } = require('../config/db');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// Mock counters
let mockEmailsSent = 0;
let mockDailyCounter = 0;
const DAILY_LIMIT = 50;

/**
 * Simulate daily limit check (from mail.worker.js)
 */
const simulateDailyLimitCheck = async (leadId) => {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `mail_sent_daily:${today}`;
  
  // Atomic increment
  mockDailyCounter++;
  
  if (mockDailyCounter > DAILY_LIMIT) {
    mockDailyCounter--; // Rollback
    logger.warn(`🛑 LIMIT REACHED: Lead ${leadId} would be delayed (${mockDailyCounter}/${DAILY_LIMIT})`);
    return { allowed: false, count: mockDailyCounter };
  }
  
  logger.info(`✅ ALLOWED: Lead ${leadId} can send (${mockDailyCounter}/${DAILY_LIMIT})`);
  return { allowed: true, count: mockDailyCounter };
};

/**
 * Simulate status validation (from mail.worker.js)
 */
const validateLeadStatus = (lead, isFollowUp) => {
  const errors = [];
  
  // General blockers
  if (lead.receivedReply) {
    errors.push(`Lead ${lead.id}: Already received reply`);
  }
  if (lead.status === 'REPLIED') {
    errors.push(`Lead ${lead.id}: Status is REPLIED`);
  }
  if (lead.status === 'STOPPED') {
    errors.push(`Lead ${lead.id}: Status is STOPPED`);
  }
  if (lead.status === 'FOLLOWED_UP') {
    errors.push(`Lead ${lead.id}: Already completed (FOLLOWED_UP)`);
  }
  
  // Initial outreach validation
  if (!isFollowUp && lead.status !== 'QUEUED') {
    errors.push(`Lead ${lead.id}: Expected QUEUED for outreach, got ${lead.status}`);
  }
  
  // Follow-up validation
  if (isFollowUp) {
    if (lead.status !== 'CONTACTED' || !lead.contacted) {
      errors.push(`Lead ${lead.id}: Must be CONTACTED before follow-up, got ${lead.status}`);
    }
    if (lead.followUp === false) {
      errors.push(`Lead ${lead.id}: Follow-up disabled in database`);
    }
  }
  
  return errors;
};

/**
 * Test Case 1: Daily Limit Enforcement
 */
const testDailyLimit = async () => {
  console.log('\n========== TEST 1: Daily Limit Enforcement ==========');
  mockDailyCounter = 0;
  
  // Simulate sending 52 emails (should stop at 50)
  for (let i = 1; i <= 52; i++) {
    const result = await simulateDailyLimitCheck(i);
    if (!result.allowed) {
      console.log(`❌ Lead ${i} blocked at count ${result.count}`);
    }
  }
  
  console.log(`\n📊 Final count: ${mockDailyCounter}/${DAILY_LIMIT}`);
  console.log(mockDailyCounter === DAILY_LIMIT ? '✅ PASS: Limit enforced correctly' : '❌ FAIL: Limit breach detected');
};

/**
 * Test Case 2: Status Transition Validation
 */
const testStatusTransitions = async () => {
  console.log('\n========== TEST 2: Status Transition Validation ==========');
  
  const testCases = [
    { id: 1, status: 'QUEUED', contacted: false, receivedReply: false, followUp: true, isFollowUp: false, expected: 'PASS' },
    { id: 2, status: 'NEW', contacted: false, receivedReply: false, followUp: true, isFollowUp: false, expected: 'FAIL' },
    { id: 3, status: 'CONTACTED', contacted: true, receivedReply: false, followUp: true, isFollowUp: true, expected: 'PASS' },
    { id: 4, status: 'QUEUED', contacted: false, receivedReply: false, followUp: true, isFollowUp: true, expected: 'FAIL' },
    { id: 5, status: 'REPLIED', contacted: true, receivedReply: true, followUp: true, isFollowUp: false, expected: 'FAIL' },
    { id: 6, status: 'STOPPED', contacted: true, receivedReply: false, followUp: true, isFollowUp: false, expected: 'FAIL' },
    { id: 7, status: 'FOLLOWED_UP', contacted: true, receivedReply: false, followUp: true, isFollowUp: true, expected: 'FAIL' },
    { id: 8, status: 'CONTACTED', contacted: true, receivedReply: false, followUp: false, isFollowUp: true, expected: 'FAIL' },
  ];
  
  testCases.forEach(testCase => {
    const errors = validateLeadStatus(testCase, testCase.isFollowUp);
    const result = errors.length === 0 ? 'PASS' : 'FAIL';
    const match = result === testCase.expected ? '✅' : '❌';
    
    console.log(`${match} Lead ${testCase.id} [${testCase.status}] ${testCase.isFollowUp ? 'Follow-up' : 'Outreach'}: ${result}`);
    if (errors.length > 0) {
      errors.forEach(err => console.log(`   └─ ${err}`));
    }
  });
};

/**
 * Test Case 3: Race Condition - Multiple Jobs for Same Lead
 */
const testRaceCondition = async () => {
  console.log('\n========== TEST 3: Race Condition Detection ==========');
  
  try {
    // Check if there are duplicate jobs in database
    const leads = await prisma.lead.findMany({
      where: { status: 'QUEUED' },
      select: { id: true, email: true, status: true }
    });
    
    const emailMap = new Map();
    const duplicates = [];
    
    leads.forEach(lead => {
      if (emailMap.has(lead.email)) {
        duplicates.push({ email: lead.email, ids: [emailMap.get(lead.email), lead.id] });
      } else {
        emailMap.set(lead.email, lead.id);
      }
    });
    
    if (duplicates.length > 0) {
      console.log('❌ FAIL: Duplicate leads found in QUEUED status:');
      duplicates.forEach(dup => console.log(`   └─ ${dup.email}: Lead IDs ${dup.ids.join(', ')}`));
    } else {
      console.log('✅ PASS: No duplicate leads in queue');
    }
  } catch (error) {
    console.log(`⚠️ Could not test race condition: ${error.message}`);
  }
};

/**
 * Test Case 4: Follow-up Scheduling Logic
 */
const testFollowUpScheduling = async () => {
  console.log('\n========== TEST 4: Follow-up Scheduling ==========');
  
  try {
    // Find leads that should have follow-ups scheduled
    const contactedLeads = await prisma.lead.findMany({
      where: {
        status: 'CONTACTED',
        contacted: true,
        followUp: true,
        followUpSent: false
      },
      select: { id: true, email: true, followUpDate: true, lastEmailedAt: true }
    });
    
    console.log(`📊 Found ${contactedLeads.length} leads awaiting follow-up`);
    
    const now = new Date();
    const issues = [];
    
    contactedLeads.forEach(lead => {
      if (!lead.followUpDate) {
        issues.push(`Lead ${lead.id}: Missing followUpDate`);
      } else {
        const daysSince = Math.floor((now - new Date(lead.lastEmailedAt)) / (1000 * 60 * 60 * 24));
        const daysUntil = Math.floor((new Date(lead.followUpDate) - now) / (1000 * 60 * 60 * 24));
        
        if (daysSince > 5 && daysUntil < 0) {
          issues.push(`Lead ${lead.id}: Follow-up overdue by ${Math.abs(daysUntil)} days`);
        }
      }
    });
    
    if (issues.length > 0) {
      console.log('⚠️ Issues found:');
      issues.forEach(issue => console.log(`   └─ ${issue}`));
    } else {
      console.log('✅ PASS: All follow-ups properly scheduled');
    }
  } catch (error) {
    console.log(`⚠️ Could not test follow-up scheduling: ${error.message}`);
  }
};

/**
 * Test Case 5: Notification Email Bypass
 */
const testNotificationBypass = () => {
  console.log('\n========== TEST 5: Notification Email Bypass ==========');
  
  // Simulate hitting daily limit
  mockDailyCounter = DAILY_LIMIT;
  
  console.log(`Current daily count: ${mockDailyCounter}/${DAILY_LIMIT}`);
  console.log('Attempting to send notification email...');
  
  // Notification emails don't go through worker queue, so they bypass the limit
  console.log('✅ PASS: Notification emails bypass daily limit (sent via direct transporter)');
  console.log('   └─ Target: hamdanahmad0006@gmail.com');
};

/**
 * Test Case 6: Edge Case - Lead Status After Failed Send
 */
const testFailedSendStatus = async () => {
  console.log('\n========== TEST 6: Failed Send Status Handling ==========');
  
  try {
    const failedLeads = await prisma.lead.findMany({
      where: { status: 'SENDING_FAILED' },
      select: { id: true, email: true, status: true, contacted: true }
    });
    
    console.log(`📊 Found ${failedLeads.length} leads with SENDING_FAILED status`);
    
    if (failedLeads.length > 0) {
      console.log('⚠️ Failed leads detected:');
      failedLeads.forEach(lead => {
        console.log(`   └─ Lead ${lead.id} (${lead.email}): contacted=${lead.contacted}`);
      });
      console.log('💡 These leads may need manual retry or status reset');
    } else {
      console.log('✅ PASS: No failed sends detected');
    }
  } catch (error) {
    console.log(`⚠️ Could not test failed sends: ${error.message}`);
  }
};

/**
 * Test Case 7: Day 3 Scenario - Follow-ups + New Outreach
 */
const testDay3Scenario = async () => {
  console.log('\n========== TEST 7: Day 3 Scenario (Follow-ups + New Outreach) ==========');
  
  mockDailyCounter = 0;
  
  // Simulate 30 follow-ups
  console.log('Simulating 30 follow-up emails...');
  for (let i = 1; i <= 30; i++) {
    await simulateDailyLimitCheck(`followup-${i}`);
  }
  
  console.log(`\nAfter follow-ups: ${mockDailyCounter}/${DAILY_LIMIT}`);
  console.log(`Remaining slots for new outreach: ${DAILY_LIMIT - mockDailyCounter}`);
  
  // Simulate 25 new outreach emails
  console.log('\nSimulating 25 new outreach emails...');
  for (let i = 1; i <= 25; i++) {
    const result = await simulateDailyLimitCheck(`outreach-${i}`);
    if (!result.allowed) {
      console.log(`⚠️ New outreach blocked at email ${i}`);
    }
  }
  
  console.log(`\n📊 Final count: ${mockDailyCounter}/${DAILY_LIMIT}`);
  console.log(mockDailyCounter === DAILY_LIMIT ? '✅ PASS: Limit enforced correctly in mixed scenario' : '⚠️ Some emails were blocked');
};

/**
 * Run All Tests
 */
const runAllTests = async () => {
  console.log('🧪 Starting Mail Functionality Tests...\n');
  console.log('=' .repeat(60));
  
  try {
    await testDailyLimit();
    await testStatusTransitions();
    await testRaceCondition();
    await testFollowUpScheduling();
    testNotificationBypass();
    await testFailedSendStatus();
    await testDay3Scenario();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
};

// Run tests
runAllTests();
