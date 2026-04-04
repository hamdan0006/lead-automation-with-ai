const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

const API_KEYS = [
    process.env.REOON_API_KEY1,
    process.env.REOON_API_KEY2,
    process.env.REOON_API_KEY3,
    process.env.ZERO_BOUNCE_API_KEY
].filter(Boolean);

let currentKeyIndex = 0;

/**
 * Validates email using rotating 3rd party providers
 */
const validateWithThirdParty = async (email) => {
    if (API_KEYS.length === 0) {
        logger.warn('No 3rd party API keys found in .env');
        return false;
    }

    const key = API_KEYS[currentKeyIndex];
    // Rotate index
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

    try {
        if (key === process.env.ZERO_BOUNCE_API_KEY) {
            // Use ZeroBounce
            logger.info(`🔍 Validating ${email} with ZeroBounce API`);
            const url = `https://api.zerobounce.net/v2/validate?api_key=${key}&email=${email}&ip_address=`;
            const response = await axios.get(url);
            const status = response.data.status;
            return status === 'valid' || status === 'catch-all';
        } else {
            // Use Reoon
            logger.info(`🔍 Validating ${email} with Reoon API`);
            const url = `https://emailverifier.reoon.com/api/v1/verify?email=${email}&key=${key}&mode=power`;
            const response = await axios.get(url);
            const status = response.data.status;
            return status === 'safe' || status === 'valid';
        }
    } catch (error) {
        logger.error(`❌ 3rd Party Validation error for ${email}: ${error.message}`);
        return false;
    }
};

module.exports = {
    validateWithThirdParty
};
