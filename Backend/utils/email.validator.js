const validator = require('email-validator');
const dns = require('dns');
const net = require('net');
const { promisify } = require('util');
const logger = require('./logger');
const { validateWithThirdParty } = require('../Services/thirdPartyValidator.service');

const resolveMx = promisify(dns.resolveMx);

const FREE_PROVIDERS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

/**
 * Validates domain mail servers using DNS MX records
 * @param {string} email 
 * @returns {Promise<string|null>} Returns the highest priority MX record or null
 */
const checkDNS = async (email) => {
    try {
        const domain = email.split('@')[1];
        if (!domain) return null;

        const mxRecords = await resolveMx(domain);
        
        if (mxRecords && mxRecords.length > 0) {
            // Sort by priority to get the primary MX record
            mxRecords.sort((a, b) => a.priority - b.priority);
            return mxRecords[0].exchange;
        }
        return null;
    } catch (error) {
        logger.debug(`📧 DNS check error for ${email}: ${error.code || error.message}`);
        return null;
    }
};

/**
 * Validates using SMTP
 * @param {string} email
 * @param {string} mxRecord
 * @returns {Promise<boolean>}
 */
const checkSMTP = async (email, mxRecord) => {
    return new Promise((resolve) => {
        let isResolved = false;
        const socket = net.createConnection(25, mxRecord);
        
        const finish = (result) => {
            if (!isResolved) {
                isResolved = true;
                socket.destroy();
                resolve(result);
            }
        };

        socket.setTimeout(6000); // 6 sec timeout
        
        let step = 0;
        
        socket.on('data', (data) => {
            const response = data.toString();
            if (response.startsWith('220') && step === 0) {
                socket.write('HELO hi.com\r\n');
                step++;
            } else if (response.startsWith('250') && step === 1) {
                socket.write('MAIL FROM:<admin@hi.com>\r\n');
                step++;
            } else if (response.startsWith('250') && step === 2) {
                socket.write(`RCPT TO:<${email}>\r\n`);
                step++;
            } else if ((response.startsWith('250') || response.startsWith('251')) && step === 3) {
                socket.write('QUIT\r\n');
                finish(true);
            } else if (response.startsWith('5')) {
                socket.write('QUIT\r\n');
                finish(false);
            }
        });
        
        socket.on('error', () => finish(false));
        socket.on('timeout', () => finish(false));
    });
};

/**
 * Full Email Validation Pipeline matching the new requirements
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const validateEmail = async (email) => {
    // 1. Syntax Check
    if (!validator.validate(email)) {
        logger.debug(`❌ Invalid syntax: ${email}`);
        return false;
    }

    const domain = email.split('@')[1].toLowerCase();
    const isFree = FREE_PROVIDERS.includes(domain);

    // Step 1: DNS Check
    const mxRecord = await checkDNS(email);
    const passesDNS = !!mxRecord;
    
    // Step 2: SMTP Check
    let passesSMTP = false;
    if (passesDNS) {
        passesSMTP = await checkSMTP(email, mxRecord);
    }
    
    const passesBasicTests = passesDNS && passesSMTP;

    if (!passesBasicTests) {
        logger.debug(`❌ Email failed mandatory basic tests (DNS/SMTP): ${email}`);
        return false;
    }

    if (isFree) {
        // Free providers MUST also pass 3rd Party
        const passesThirdParty = await validateWithThirdParty(email);
        if (passesThirdParty) {
            logger.debug(`✅ Free Email Validated (DNS+SMTP+3rdParty): ${email}`);
            return true;
        } else {
            logger.debug(`❌ Free email failed 3rd party test: ${email}`);
            return false;
        }
    } else {
        // Company domains that passed DNS+SMTP are trusted
        logger.debug(`✅ Company Email Validated (DNS+SMTP): ${email}`);
        return true;
    }
};

module.exports = {
    validateEmail
};
