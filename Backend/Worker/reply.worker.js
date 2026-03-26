const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { prisma } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Check for new replies in the Gmail inbox silently
 */
const checkReplies = async () => {
    const config = {
        imap: {
            user: process.env.SMTP_EMAIL,
            password: process.env.App_Pass,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 3000,
        },
    };

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Only search for UNSEEN (New) messages
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false, // Don't mark as seen until we confirm it's a lead
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            for (const item of messages) {
                const all = item.parts.find((part) => part.which === '');
                const id = item.attributes.uid;
                const header = item.parts.find((part) => part.which === 'HEADER');
                const senderEmail = header.body.from[0].match(/<([^>]+)>/)?.[1] || header.body.from[0];

                // 🤫 SILENT CHECK: NO LOGGING IF NOT FOUND
                const lead = await prisma.lead.findUnique({
                    where: { email: senderEmail }
                });

                if (lead) {
                    // 🎉 WE FOUND A REAL REPLY
                    logger.info(`🔥 Real Reply Found: ${lead.name || lead.email} (${senderEmail})`);

                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            receivedReply: true,
                            status: 'REPLIED'
                        }
                    });

                    // Now mark as seen in Gmail so we don't process it again
                    await connection.addFlags(id, '\\Seen');
                }
                // If lead is null, we stay silent and do nothing.
            }
        }

        connection.end();
    } catch (error) {
        // Log errors only (like auth issues), not individual message failures
        logger.error(`❌ Reply Polling Error: ${error.message}`);
    }
};

/**
 * Starts the polling loop
 */
const startReplyWorker = () => {
    logger.info('📡 Quiet Reply Polling Worker started (Looking for lead replies only)');
    
    // Poll every 5 minutes
    setInterval(checkReplies, 5 * 60 * 1000);

    // Run once immediately on start
    checkReplies();
};

module.exports = {
    startReplyWorker
};
