/**
 * EMAIL VALIDATION TEST - 3-Channel System
 * 
 * Tests all scenarios for DNS + SMTP + Reoon validation
 * 
 * Scenarios:
 * 1. Company email - All 3 pass
 * 2. Company email - DNS pass, SMTP fail, Reoon pass
 * 3. Company email - All 3 fail
 * 4. Gmail/Yahoo - DNS + Reoon pass (SMTP skipped)
 * 5. Gmail/Yahoo - DNS pass, Reoon fail
 * 6. info@ email - All fail but domain matches
 * 7. Multiple valid emails - AI ranking
 */

const logger = require('../utils/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class EmailValidationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      scenarios: []
    };
  }

  // Simulate DNS check
  simulateDNS(email) {
    const domain = email.split('@')[1];
    
    // Simulate: Valid domains have MX records
    const invalidDomains = ['fakebusiness123.com', 'notreal456.com', 'invalid.xyz'];
    
    if (invalidDomains.includes(domain)) {
      return { pass: false, mxRecord: null };
    }
    
    return { pass: true, mxRecord: `mail.${domain}` };
  }

  // Simulate SMTP check
  simulateSMTP(email, mxRecord) {
    const domain = email.split('@')[1];
    const localPart = email.split('@')[0];
    
    // Gmail/Yahoo block SMTP verification
    const freeProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    if (freeProviders.includes(domain)) {
      return { pass: false, reason: 'Free provider blocks SMTP' };
    }
    
    // Simulate: Some emails fail SMTP
    const smtpFailEmails = ['info@slowresponse.com', 'contact@timeout.com', 'support@blocked.com'];
    if (smtpFailEmails.includes(email)) {
      return { pass: false, reason: 'SMTP timeout or rejection' };
    }
    
    // Simulate: Invalid local parts
    if (localPart.includes('invalid') || localPart.includes('fake')) {
      return { pass: false, reason: 'Mailbox does not exist' };
    }
    
    return { pass: true };
  }

  // Simulate Reoon API
  simulateReoon(email) {
    const domain = email.split('@')[1];
    const localPart = email.split('@')[0];
    
    // Simulate: Reoon catches disposable/invalid emails
    const reoonFailEmails = [
      'fake@company.com',
      'invalid@business.com',
      'notreal@gmail.com',
      'spam@yahoo.com'
    ];
    
    if (reoonFailEmails.includes(email)) {
      return { pass: false, status: 'invalid' };
    }
    
    // Simulate: Reoon validates most real-looking emails
    return { pass: true, status: 'safe' };
  }

  // Main validation logic (mirrors your actual code)
  async validateEmail(email, websiteDomain = null) {
    const domain = email.split('@')[1].toLowerCase();
    const localPart = email.split('@')[0].toLowerCase();
    const freeProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const isFree = freeProviders.includes(domain);

    logger.info(`\n🔍 Validating: ${email}`);
    logger.info(`   Type: ${isFree ? 'Free Email' : 'Company Email'}`);

    // STEP 1: DNS Check (Mandatory for ALL)
    const dnsResult = this.simulateDNS(email);
    logger.info(`   1️⃣ DNS Check: ${dnsResult.pass ? '✅ PASS' : '❌ FAIL'} ${dnsResult.mxRecord ? `(MX: ${dnsResult.mxRecord})` : ''}`);
    
    if (!dnsResult.pass) {
      logger.error(`   ❌ REJECTED: No MX record found`);
      return { valid: false, reason: 'DNS_FAILED', score: -1 };
    }

    // STEP 2: SMTP Check
    if (isFree) {
      // Free emails: Skip SMTP
      logger.info(`   2️⃣ SMTP Check: ⏭️ SKIPPED (Free provider blocks SMTP)`);
      
      // STEP 3: Reoon (Required for free emails)
      const reoonResult = this.simulateReoon(email);
      logger.info(`   3️⃣ Reoon API: ${reoonResult.pass ? '✅ PASS' : '❌ FAIL'} (${reoonResult.status})`);
      
      if (reoonResult.pass) {
        logger.info(`   ✅ ACCEPTED: DNS + Reoon passed`);
        return { valid: true, reason: 'DNS_REOON_PASS', score: 2 };
      } else {
        logger.error(`   ❌ REJECTED: Reoon validation failed`);
        return { valid: false, reason: 'REOON_FAILED', score: -1 };
      }
    } else {
      // Company emails: All 3 required
      const smtpResult = this.simulateSMTP(email, dnsResult.mxRecord);
      logger.info(`   2️⃣ SMTP Check: ${smtpResult.pass ? '✅ PASS' : '❌ FAIL'} ${!smtpResult.pass ? `(${smtpResult.reason})` : ''}`);
      
      const reoonResult = this.simulateReoon(email);
      logger.info(`   3️⃣ Reoon API: ${reoonResult.pass ? '✅ PASS' : '❌ FAIL'} (${reoonResult.status})`);
      
      // Check if all 3 passed
      if (dnsResult.pass && smtpResult.pass && reoonResult.pass) {
        logger.info(`   ✅ ACCEPTED: All 3 channels passed`);
        return { valid: true, reason: 'ALL_3_PASS', score: 2 };
      }
      
      // Special case: info@ with domain match
      const isInfoEmail = ['info', 'contact', 'hello', 'support'].includes(localPart);
      const domainMatches = websiteDomain && email.includes(websiteDomain);
      
      if (isInfoEmail && domainMatches) {
        logger.warn(`   ⚠️ ACCEPTED (Exception): info@ email with domain match`);
        return { valid: true, reason: 'INFO_DOMAIN_MATCH', score: 1 };
      }
      
      logger.error(`   ❌ REJECTED: Not all 3 channels passed`);
      return { valid: false, reason: 'VALIDATION_FAILED', score: -1 };
    }
  }

  async testScenario1_CompanyEmailAllPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 1: Company Email - All 3 Channels Pass');
    logger.info('='.repeat(60));

    const email = 'john@acmerestaurant.com';
    const result = await this.validateEmail(email, 'acmerestaurant.com');

    const success = result.valid && result.score === 2;
    
    this.results.scenarios.push({
      test: 'Company Email - All 3 Pass',
      email,
      expected: 'ACCEPTED (Score: 2)',
      actual: result.valid ? `ACCEPTED (Score: ${result.score})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 1 PASSED: Company email with all 3 channels passing is accepted');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 1 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario2_CompanyEmailSMTPFail() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 2: Company Email - SMTP Fails, Others Pass');
    logger.info('='.repeat(60));

    const email = 'info@slowresponse.com';
    const result = await this.validateEmail(email, 'slowresponse.com');

    // Should be rejected (not info@ exception because SMTP failed)
    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Company Email - SMTP Fail',
      email,
      expected: 'REJECTED (All 3 required)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 2 PASSED: Company email rejected when SMTP fails');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 2 FAILED: Should reject when SMTP fails');
      this.results.failed++;
    }

    return result;
  }

  async testScenario3_CompanyEmailAllFail() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 3: Company Email - All Channels Fail');
    logger.info('='.repeat(60));

    const email = 'fake@fakebusiness123.com';
    const result = await this.validateEmail(email);

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Company Email - All Fail',
      email,
      expected: 'REJECTED',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 3 PASSED: Invalid company email rejected');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 3 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario4_GmailPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 4: Gmail - DNS + Reoon Pass (SMTP Skipped)');
    logger.info('='.repeat(60));

    const email = 'john.doe@gmail.com';
    const result = await this.validateEmail(email);

    const success = result.valid && result.score === 2;
    
    this.results.scenarios.push({
      test: 'Gmail - Valid',
      email,
      expected: 'ACCEPTED (SMTP skipped)',
      actual: result.valid ? `ACCEPTED (Score: ${result.score})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 4 PASSED: Valid Gmail accepted with SMTP skipped');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 4 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario5_GmailReoonFail() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 5: Gmail - Reoon Fails');
    logger.info('='.repeat(60));

    const email = 'notreal@gmail.com';
    const result = await this.validateEmail(email);

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Gmail - Reoon Fail',
      email,
      expected: 'REJECTED',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 5 PASSED: Invalid Gmail rejected by Reoon');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 5 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario6_YahooPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 6: Yahoo - DNS + Reoon Pass (SMTP Skipped)');
    logger.info('='.repeat(60));

    const email = 'business.owner@yahoo.com';
    const result = await this.validateEmail(email);

    const success = result.valid && result.score === 2;
    
    this.results.scenarios.push({
      test: 'Yahoo - Valid',
      email,
      expected: 'ACCEPTED (SMTP skipped)',
      actual: result.valid ? `ACCEPTED (Score: ${result.score})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 6 PASSED: Valid Yahoo accepted with SMTP skipped');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 6 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario7_InfoEmailDomainMatch() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 7: info@ Email - Validation Fails BUT Domain Matches');
    logger.info('='.repeat(60));

    const email = 'info@blocked.com';
    const result = await this.validateEmail(email, 'blocked.com');

    const success = result.valid && result.score === 1;
    
    this.results.scenarios.push({
      test: 'info@ - Domain Match Exception',
      email,
      expected: 'ACCEPTED (Score: 1, Exception)',
      actual: result.valid ? `ACCEPTED (Score: ${result.score})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 7 PASSED: info@ email accepted despite validation failure (domain match)');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 7 FAILED: Should accept info@ with domain match');
      this.results.failed++;
    }

    return result;
  }

  async testScenario8_InfoEmailNoDomainMatch() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 8: info@ Email - Validation Fails, No Domain Match');
    logger.info('='.repeat(60));

    const email = 'info@blocked.com';
    const result = await this.validateEmail(email, 'differentdomain.com');

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'info@ - No Domain Match',
      email,
      expected: 'REJECTED (No exception)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 8 PASSED: info@ email rejected when domain doesn\'t match');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 8 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario9_MultipleEmails() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 9: Multiple Valid Emails - Best Selection');
    logger.info('='.repeat(60));

    const candidates = [
      { email: 'info@restaurant.com', domain: 'restaurant.com' },
      { email: 'owner@restaurant.com', domain: 'restaurant.com' },
      { email: 'john@restaurant.com', domain: 'restaurant.com' },
      { email: 'contact@restaurant.com', domain: 'restaurant.com' }
    ];

    const validEmails = [];
    
    for (const candidate of candidates) {
      const result = await this.validateEmail(candidate.email, candidate.domain);
      if (result.valid) {
        validEmails.push({ email: candidate.email, score: result.score });
      }
    }

    logger.info(`\n📊 Valid emails found: ${validEmails.length}`);
    validEmails.forEach(e => {
      logger.info(`   - ${e.email} (Score: ${e.score})`);
    });

    // Simulate AI ranking (personal names > generic)
    const ranked = validEmails.sort((a, b) => {
      const aIsGeneric = ['info', 'contact', 'hello', 'support'].some(g => a.email.startsWith(g));
      const bIsGeneric = ['info', 'contact', 'hello', 'support'].some(g => b.email.startsWith(g));
      
      if (!aIsGeneric && bIsGeneric) return -1;
      if (aIsGeneric && !bIsGeneric) return 1;
      return b.score - a.score;
    });

    const bestEmail = ranked[0];
    logger.info(`\n🏆 Best email selected: ${bestEmail.email}`);

    const success = validEmails.length >= 3 && !bestEmail.email.startsWith('info');
    
    this.results.scenarios.push({
      test: 'Multiple Emails - AI Ranking',
      email: bestEmail.email,
      expected: 'Personal email ranked higher than info@',
      actual: `Selected: ${bestEmail.email}`,
      success
    });

    if (success) {
      logger.info('\n✅ TEST 9 PASSED: Personal email ranked higher than generic');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 9 FAILED');
      this.results.failed++;
    }

    return { validEmails, bestEmail };
  }

  async testScenario10_OutlookPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 10: Outlook - DNS + Reoon Pass (SMTP Skipped)');
    logger.info('='.repeat(60));

    const email = 'business@outlook.com';
    const result = await this.validateEmail(email);

    const success = result.valid && result.score === 2;
    
    this.results.scenarios.push({
      test: 'Outlook - Valid',
      email,
      expected: 'ACCEPTED (SMTP skipped)',
      actual: result.valid ? `ACCEPTED (Score: ${result.score})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 10 PASSED: Valid Outlook accepted with SMTP skipped');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 10 FAILED');
      this.results.failed++;
    }

    return result;
  }

  printReport() {
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 EMAIL VALIDATION TEST REPORT');
    logger.info('='.repeat(60));
    logger.info(`✅ Tests Passed: ${this.results.passed}`);
    logger.info(`❌ Tests Failed: ${this.results.failed}`);
    logger.info(`📊 Total Tests: ${this.results.passed + this.results.failed}`);
    
    logger.info('\n📝 SCENARIO RESULTS:');
    this.results.scenarios.forEach((scenario, i) => {
      const status = scenario.success ? '✅' : '❌';
      logger.info(`\n${i + 1}. ${status} ${scenario.test}`);
      logger.info(`   Email: ${scenario.email}`);
      logger.info(`   Expected: ${scenario.expected}`);
      logger.info(`   Actual: ${scenario.actual}`);
    });

    logger.info('\n' + '='.repeat(60));
    logger.info('🎯 VALIDATION RULES SUMMARY:');
    logger.info('='.repeat(60));
    logger.info('1. Company Emails:');
    logger.info('   - DNS ✅ + SMTP ✅ + Reoon ✅ = ACCEPTED (Score: 2)');
    logger.info('   - Any channel fails = REJECTED');
    logger.info('   - Exception: info@ with domain match = ACCEPTED (Score: 1)');
    logger.info('');
    logger.info('2. Free Emails (Gmail/Yahoo/Outlook/Hotmail):');
    logger.info('   - DNS ✅ + Reoon ✅ = ACCEPTED (Score: 2)');
    logger.info('   - SMTP check is SKIPPED (providers block it)');
    logger.info('   - If Reoon fails = REJECTED');
    logger.info('');
    logger.info('3. API Keys:');
    logger.info('   - Reoon: 3 keys rotating (600 validations/month)');
    logger.info('   - ZeroBounce: REMOVED ❌');
    logger.info('='.repeat(60) + '\n');
  }
}

async function runEmailValidationTests() {
  logger.info('🚀 Starting Email Validation Tests (3-Channel System)...\n');
  logger.info('Testing: DNS + SMTP + Reoon validation logic\n');

  const tester = new EmailValidationTest();

  try {
    await tester.testScenario1_CompanyEmailAllPass();
    await sleep(500);
    
    await tester.testScenario2_CompanyEmailSMTPFail();
    await sleep(500);
    
    await tester.testScenario3_CompanyEmailAllFail();
    await sleep(500);
    
    await tester.testScenario4_GmailPass();
    await sleep(500);
    
    await tester.testScenario5_GmailReoonFail();
    await sleep(500);
    
    await tester.testScenario6_YahooPass();
    await sleep(500);
    
    await tester.testScenario7_InfoEmailDomainMatch();
    await sleep(500);
    
    await tester.testScenario8_InfoEmailNoDomainMatch();
    await sleep(500);
    
    await tester.testScenario9_MultipleEmails();
    await sleep(500);
    
    await tester.testScenario10_OutlookPass();
    
    tester.printReport();
  } catch (error) {
    logger.error(`Test error: ${error.message}`);
  }
}

if (require.main === module) {
  runEmailValidationTests().then(() => {
    logger.info('✅ All email validation tests completed');
    process.exit(0);
  }).catch(err => {
    logger.error(`Test suite failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { EmailValidationTest, runEmailValidationTests };
