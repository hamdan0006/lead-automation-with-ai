const validator = require('email-validator');
const emailExistence = require('email-existence');
const logger = require('./logger');

/**
 * Validates email existence using SMTP/MX check
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const checkExistence = (email) => {
    return new Promise((resolve) => {
        emailExistence.check(email, (error, response) => {
            if (error) {
                logger.debug(`📧 Existence check error for ${email}: ${error.message}`);
                return resolve(false);
            }
            resolve(response);
        });
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
