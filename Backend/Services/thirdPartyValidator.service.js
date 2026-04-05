const axios = require('axios');
const logger = require('../utils/logger');
const redis = require('../config/redis');
require('dotenv').config();

const API_KEYS = [
    process.env.REOON_API_KEY1,
    process.env.REOON_API_KEY2,
    process.env.REOON_API_KEY3
].filter(Boolean); // ZeroBounce removed

let currentKeyIndex = 0;

/**
 * Track Reoon API usage and send alerts
 */
const trackReoonUsage = async () => {
    try {
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `reoon:usage:${month}`;
        const count = await redis.incr(key);
        await redis.expire(key, 86400 * 35); // 35 days expiry
        
        const totalQuota = API_KEYS.length * 200; // 200 per key
        const usagePercent = Math.round((count / totalQuota) * 100);
        
        // Alert at 80%, 90%, 95%, 100%
        if (count === Math.floor(totalQuota * 0.8) || 
            count === Math.floor(totalQuota * 0.9) || 
            count === Math.floor(totalQuota * 0.95)) {
            logger.warn(`🚨 REOON QUOTA ALERT: ${count}/${totalQuota} used (${usagePercent}%)`);
        }
        
        if (count >= totalQuota) {
            logger.error(`🚨 REOON QUOTA EXHAUSTED: ${count}/${totalQuota} validations used this month!`);
        }
        
        return { count, totalQuota, usagePercent };
    } catch (err) {
        logger.warn(`⚠️ Failed to track Reoon usage: ${err.message}`);
        return null;
    }
};

/**
 * Validates email using rotating Reoon API keys
 * @param {string} email - Email to validate
 * @param {boolean} dnsPass - Did DNS check pass?
 * @param {boolean} smtpPass - Did SMTP check pass?
 * @returns {Promise<{success: boolean, fallback: boolean}>}
 */
const validateWithThirdParty = async (email, dnsPass = false, smtpPass = false) => {
    if (API_KEYS.length === 0) {
        logger.warn('⚠️ No Reoon API keys found in .env');
        
        // FALLBACK: Accept if DNS + SMTP passed
        if (dnsPass && smtpPass) {
            logger.warn(`⚠️ No API keys, but DNS + SMTP passed for ${email}. Accepting (fallback).`);
            return { success: true, fallback: true };
        }
        
        return { success: false, fallback: false };
    }

    const key = API_KEYS[currentKeyIndex];
    const keyNumber = currentKeyIndex + 1;
    
    // Rotate index for next call
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

    try {
        // Track usage
        await trackReoonUsage();
        
        // Use Reoon
        logger.info(`🔍 Validating ${email} with Reoon API (Key #${keyNumber})`);
        const url = `https://emailverifier.reoon.com/api/v1/verify?email=${email}&key=${key}&mode=power`;
        const response = await axios.get(url, { timeout: 10000 });
        const status = response.data.status;
        const isValid = status === 'safe' || status === 'valid';
        
        if (isValid) {
            logger.info(`✅ Reoon validated ${email}: ${status}`);
        } else {
            logger.warn(`❌ Reoon rejected ${email}: ${status}`);
        }
        
        return { success: isValid, fallback: false };
        
    } catch (error) {
        const isQuotaError = 
            error.response?.status === 429 || 
            error.response?.status === 402 || // Payment required
            error.message?.toLowerCase().includes('quota') ||
            error.message?.toLowerCase().includes('limit') ||
            error.response?.data?.message?.toLowerCase().includes('quota') ||
            error.response?.data?.message?.toLowerCase().includes('limit');
        
        if (isQuotaError) {
            logger.warn(`⚠️ Reoon quota exhausted for Key #${keyNumber}. Checking fallback...`);
            
            // FALLBACK: Accept if DNS + SMTP passed
            if (dnsPass && smtpPass) {
                logger.warn(`✅ FALLBACK ACCEPTED: ${email} passed DNS + SMTP (Reoon quota exhausted)`);
                return { success: true, fallback: true };
            } else {
                logger.error(`❌ FALLBACK REJECTED: ${email} failed DNS or SMTP (Reoon quota exhausted)`);
                return { success: false, fallback: false };
            }
        }
        
        // Other errors (network, timeout, etc.)
        logger.error(`❌ Reoon API error for ${email}: ${error.message}`);
        
        // FALLBACK: Accept if DNS + SMTP passed
        if (dnsPass && smtpPass) {
            logger.warn(`✅ FALLBACK ACCEPTED: ${email} passed DNS + SMTP (Reoon API error)`);
            return { success: true, fallback: true };
        }
        
        return { success: false, fallback: false };
    }
};

module.exports = {
    validateWithThirdParty,
    trackReoonUsage
};
