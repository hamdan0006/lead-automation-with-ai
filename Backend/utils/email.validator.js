const validator = require('email-validator');
const dns = require('dns');
const { promisify } = require('util');
const logger = require('./logger');

const resolveMx = promisify(dns.resolveMx);

/**
 * Validates domain mail servers using DNS MX records
 * This completely bypasses the AWS Port 25 block because it uses Port 53 (DNS)
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const checkExistence = async (email) => {
    return new Promise(async (resolve) => {
        try {
            const domain = email.split('@')[1];
            if (!domain) return resolve(false);

            // Fast timeout for DNS resolution (3 seconds)
            const timeout = setTimeout(() => {
                logger.warn(`🕒 DNS timeout for ${domain} - skipping...`);
                resolve(false);
            }, 3000);

            const mxRecords = await resolveMx(domain);
            clearTimeout(timeout);
            
            if (mxRecords && mxRecords.length > 0) {
                resolve(true); // Domain has active mail servers
            } else {
                resolve(false);
            }
        } catch (error) {
            logger.debug(`📧 MX check error for ${email}: ${error.code || error.message}`);
            resolve(false);
        }
    });
};
/**
 * Full Email Validation Pipeline
 * 1. Syntax check (email-validator)
 * 2. Existence check (email-existence via SMTP)
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const validateEmail = async (email) => {
    // 1. Syntax Check
    if (!validator.validate(email)) {
        logger.debug(`❌ Invalid syntax: ${email}`);
        return false;
    }

    // 2. Existence Check
    const exists = await checkExistence(email);
    if (!exists) {
        logger.debug(`❌ Email does not exist (SMTP check failed): ${email}`);
    } else {
        logger.debug(`✅ Email validated and exists: ${email}`);
    }

    return exists;
};

module.exports = {
    validateEmail
};
