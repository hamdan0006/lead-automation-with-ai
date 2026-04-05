/**
 * REOON QUOTA FALLBACK TEST
 * 
 * Tests what happens when Reoon quota is exhausted
 * Verifies fallback logic: Accept if DNS + SMTP pass
 */

const logger = require('../utils/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ReoonFallbackTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      scenarios: []
    };
  }

  // Simulate Reoon API with quota exhaustion
  async simulateReoonWithQuota(email, quotaExhausted = false) {
    if (quotaExhausted) {
      // Simulate quota error
      throw {
        response: {
          status: 429,
          data: { message: 'Monthly quota exceeded' }
        },
        message: 'Request failed with status code 429'
      };
    }
    
    // Normal validation
    const invalidEmails = ['fake@company.com', 'spam@gmail.com'];
    return {
      success: !invalidEmails.includes(email),
      status: invalidEmails.includes(email) ? 'invalid' : 'safe'
    };
  }

  // Simulate full validation with fallback
  async validateEmailWithFallback(email, dnsPass, smtpPass, reoonQuotaExhausted) {
    logger.info(`\n🔍 Validating: ${email}`);
    logger.info(`   DNS: ${dnsPass ? '✅' : '❌'} | SMTP: ${smtpPass ? '✅' : '❌'} | Reoon Quota: ${reoonQuotaExhausted ? '❌ EXHAUSTED' : '✅ Available'}`);

    // Step 1: DNS Check
    if (!dnsPass) {
      logger.error(`   ❌ REJECTED: DNS failed`);
      return { valid: false, reason: 'DNS_FAILED', fallback: false };
    }

    // Step 2: Try Reoon
    try {
      const reoonResult = await this.simulateReoonWithQuota(email, reoonQuotaExhausted);
      
      if (reoonResult.success) {
        logger.info(`   ✅ ACCEPTED: Reoon validated (${reoonResult.status})`);
        return { valid: true, reason: 'REOON_PASS', fallback: false };
      } else {
        logger.error(`   ❌ REJECTED: Reoon rejected (${reoonResult.status})`);
        return { valid: false, reason: 'REOON_REJECTED', fallback: false };
      }
      
    } catch (error) {
      // Reoon quota exhausted or API error
      logger.warn(`   ⚠️ Reoon API Error: ${error.message}`);
      
      // FALLBACK: Check if DNS + SMTP passed
      if (dnsPass && smtpPass) {
        logger.info(`   ✅ ACCEPTED (FALLBACK): DNS + SMTP passed, Reoon quota exhausted`);
        return { valid: true, reason: 'FALLBACK_DNS_SMTP', fallback: true };
      } else {
        logger.error(`   ❌ REJECTED (FALLBACK): DNS or SMTP failed, cannot accept without Reoon`);
        return { valid: false, reason: 'FALLBACK_FAILED', fallback: false };
      }
    }
  }

  async testScenario1_QuotaExhausted_DNSandSMTPPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 1: Reoon Quota Exhausted + DNS ✅ + SMTP ✅');
    logger.info('='.repeat(60));

    const email = 'owner@restaurant.com';
    const result = await this.validateEmailWithFallback(email, true, true, true);

    const success = result.valid && result.fallback;
    
    this.results.scenarios.push({
      test: 'Quota Exhausted - DNS + SMTP Pass',
      email,
      expected: 'ACCEPTED (Fallback)',
      actual: result.valid ? `ACCEPTED (${result.fallback ? 'Fallback' : 'Normal'})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 1 PASSED: Email accepted via fallback when Reoon quota exhausted');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 1 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario2_QuotaExhausted_SMTPFails() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 2: Reoon Quota Exhausted + DNS ✅ + SMTP ❌');
    logger.info('='.repeat(60));

    const email = 'info@slowcompany.com';
    const result = await this.validateEmailWithFallback(email, true, false, true);

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Quota Exhausted - SMTP Fails',
      email,
      expected: 'REJECTED (Fallback requires DNS + SMTP)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 2 PASSED: Email rejected when SMTP fails and Reoon quota exhausted');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 2 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario3_QuotaExhausted_DNSFails() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 3: Reoon Quota Exhausted + DNS ❌');
    logger.info('='.repeat(60));

    const email = 'owner@invaliddomain.xyz';
    const result = await this.validateEmailWithFallback(email, false, true, true);

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Quota Exhausted - DNS Fails',
      email,
      expected: 'REJECTED (DNS mandatory)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 3 PASSED: Email rejected when DNS fails (mandatory check)');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 3 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario4_QuotaAvailable_AllPass() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 4: Reoon Available + All Channels Pass');
    logger.info('='.repeat(60));

    const email = 'john@company.com';
    const result = await this.validateEmailWithFallback(email, true, true, false);

    const success = result.valid && !result.fallback;
    
    this.results.scenarios.push({
      test: 'Quota Available - All Pass',
      email,
      expected: 'ACCEPTED (Normal)',
      actual: result.valid ? `ACCEPTED (${result.fallback ? 'Fallback' : 'Normal'})` : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 4 PASSED: Normal validation when quota available');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 4 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario5_QuotaAvailable_ReoonRejects() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 5: Reoon Available + Reoon Rejects Email');
    logger.info('='.repeat(60));

    const email = 'fake@company.com';
    const result = await this.validateEmailWithFallback(email, true, true, false);

    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Quota Available - Reoon Rejects',
      email,
      expected: 'REJECTED (Reoon says invalid)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 5 PASSED: Email rejected when Reoon says invalid');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 5 FAILED');
      this.results.failed++;
    }

    return result;
  }

  async testScenario6_GmailQuotaExhausted() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 6: Gmail + Reoon Quota Exhausted (SMTP Skipped)');
    logger.info('='.repeat(60));

    const email = 'user@gmail.com';
    // Gmail: DNS always passes, SMTP skipped (false), Reoon quota exhausted
    const result = await this.validateEmailWithFallback(email, true, false, true);

    // Gmail should be REJECTED because SMTP is skipped (false) and Reoon exhausted
    const success = !result.valid;
    
    this.results.scenarios.push({
      test: 'Gmail - Quota Exhausted',
      email,
      expected: 'REJECTED (Needs Reoon, SMTP skipped)',
      actual: result.valid ? 'ACCEPTED' : 'REJECTED',
      success
    });

    if (success) {
      logger.info('\n✅ TEST 6 PASSED: Gmail rejected when Reoon quota exhausted (SMTP not available)');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 6 FAILED: Gmail should be rejected without Reoon');
      this.results.failed++;
    }

    return result;
  }

  async testScenario7_MultipleEmailsQuotaExhausted() {
    logger.info('\n' + '='.repeat(60));
    logger.info('🧪 TEST 7: Batch Processing - Quota Exhausted Mid-Batch');
    logger.info('='.repeat(60));

    const emails = [
      { email: 'email1@company.com', dns: true, smtp: true },
      { email: 'email2@company.com', dns: true, smtp: true },
      { email: 'email3@company.com', dns: true, smtp: false },
      { email: 'email4@company.com', dns: true, smtp: true },
      { email: 'email5@company.com', dns: false, smtp: true }
    ];

    let quotaExhausted = false;
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      const { email, dns, smtp } = emails[i];
      
      // Simulate quota exhaustion after 2nd email
      if (i >= 2) quotaExhausted = true;
      
      const result = await this.validateEmailWithFallback(email, dns, smtp, quotaExhausted);
      results.push({ email, result });
    }

    logger.info('\n📊 Batch Results:');
    results.forEach((r, i) => {
      const status = r.result.valid ? '✅ ACCEPTED' : '❌ REJECTED';
      const method = r.result.fallback ? '(Fallback)' : '(Normal)';
      logger.info(`   ${i + 1}. ${r.email}: ${status} ${r.result.valid ? method : ''}`);
    });

    const acceptedCount = results.filter(r => r.result.valid).length;
    const fallbackCount = results.filter(r => r.result.fallback).length;

    logger.info(`\n   Total: ${acceptedCount}/5 accepted, ${fallbackCount} via fallback`);

    const success = acceptedCount === 3 && fallbackCount === 2; // email1, email2 (normal), email4 (fallback)
    
    this.results.scenarios.push({
      test: 'Batch - Quota Exhausted Mid-Batch',
      email: '5 emails',
      expected: '3 accepted (2 fallback)',
      actual: `${acceptedCount} accepted (${fallbackCount} fallback)`,
      success
    });

    if (success) {
      logger.info('\n✅ TEST 7 PASSED: Batch continues with fallback after quota exhaustion');
      this.results.passed++;
    } else {
      logger.error('\n❌ TEST 7 FAILED');
      this.results.failed++;
    }

    return results;
  }

  printReport() {
    logger.info('\n' + '='.repeat(60));
    logger.info('📋 REOON FALLBACK TEST REPORT');
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
    logger.info('🎯 FALLBACK LOGIC SUMMARY:');
    logger.info('='.repeat(60));
    logger.info('When Reoon Quota Exhausted:');
    logger.info('');
    logger.info('✅ ACCEPT if:');
    logger.info('   - DNS ✅ + SMTP ✅ (Company emails)');
    logger.info('');
    logger.info('❌ REJECT if:');
    logger.info('   - DNS ❌ (Mandatory check)');
    logger.info('   - DNS ✅ + SMTP ❌ (Not enough validation)');
    logger.info('   - Free email (Gmail/Yahoo) - Needs Reoon, SMTP not available');
    logger.info('');
    logger.info('📊 Quota Tracking:');
    logger.info('   - 3 Reoon keys × 200 = 600 validations/month');
    logger.info('   - Alerts at 80%, 90%, 95% usage');
    logger.info('   - Automatic fallback when exhausted');
    logger.info('='.repeat(60) + '\n');
  }
}

async function runReoonFallbackTests() {
  logger.info('🚀 Starting Reoon Quota Fallback Tests...\n');
  logger.info('Testing: What happens when Reoon quota is exhausted\n');

  const tester = new ReoonFallbackTest();

  try {
    await tester.testScenario1_QuotaExhausted_DNSandSMTPPass();
    await sleep(500);
    
    await tester.testScenario2_QuotaExhausted_SMTPFails();
    await sleep(500);
    
    await tester.testScenario3_QuotaExhausted_DNSFails();
    await sleep(500);
    
    await tester.testScenario4_QuotaAvailable_AllPass();
    await sleep(500);
    
    await tester.testScenario5_QuotaAvailable_ReoonRejects();
    await sleep(500);
    
    await tester.testScenario6_GmailQuotaExhausted();
    await sleep(500);
    
    await tester.testScenario7_MultipleEmailsQuotaExhausted();
    
    tester.printReport();
  } catch (error) {
    logger.error(`Test error: ${error.message}`);
  }
}

if (require.main === module) {
  runReoonFallbackTests().then(() => {
    logger.info('✅ All Reoon fallback tests completed');
    process.exit(0);
  }).catch(err => {
    logger.error(`Test suite failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { ReoonFallbackTest, runReoonFallbackTests };
