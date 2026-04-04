require('dotenv').config();
const imaps = require('imap-simple');
const { prisma } = require('../config/db');

const testReplyDetection = async () => {
    console.log('🧪 Testing Reply Detection with NEW logic...\n');

    const config = {
        imap: {
            user: process.env.SMTP_EMAIL,
            password: process.env.App_Pass,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 15000,
            connTimeout: 15000,
        },
    };

    let connection;
    try {
        console.log('🔌 Connecting to Gmail...');
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        console.log('✅ Connected!\n');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`📨 Found ${messages.length} unread messages\n`);

        let foundTestEmail = false;
        let repliesFound = 0;

        for (let i = 0; i < messages.length; i++) {
            const item = messages[i];
            const header = item.parts.find((part) => part.which === 'HEADER');
            
            // NEW LOGIC - Better email extraction
            const fromRaw = header.body.from[0];
            let senderEmail = null;
            
            // Try to extract email from "Name <email@domain.com>" format
            const emailMatch = fromRaw.match(/<([^>]+)>/);
            if (emailMatch) {
                senderEmail = emailMatch[1].toLowerCase().trim();
            } else {
                // If no angle brackets, assume the whole string is the email
                senderEmail = fromRaw.toLowerCase().trim();
            }

            // Check if this is our test email
            if (senderEmail.includes('adiluae213')) {
                foundTestEmail = true;
                console.log(`🎯 FOUND TEST EMAIL!`);
                console.log(`   Raw From: ${fromRaw}`);
                console.log(`   Extracted Email: ${senderEmail}`);
                console.log(`   Subject: ${header.body.subject?.[0] || 'No subject'}`);
                
                // NEW LOGIC - Case-insensitive search
                const lead = await prisma.lead.findFirst({
                    where: {
                        email: {
                            equals: senderEmail,
                            mode: 'insensitive'
                        }
                    }
                });

                if (lead) {
                    console.log(`   ✅ MATCHED TO LEAD!`);
                    console.log(`      Lead ID: ${lead.id}`);
                    console.log(`      Lead Name: ${lead.name}`);
                    console.log(`      Lead Status: ${lead.status}`);
                    console.log(`\n   🔥 This reply WOULD BE DETECTED with the new code!\n`);
                    repliesFound++;
                } else {
                    console.log(`   ❌ NOT MATCHED (This shouldn't happen!)`);
                }
            }
        }

        if (!foundTestEmail) {
            console.log('⚠️  Test email (adiluae213@gmail.com) NOT found in unread messages');
            console.log('   Make sure the reply is still UNREAD in Gmail\n');
            
            console.log('📧 Showing first 5 unread emails:');
            for (let i = 0; i < Math.min(5, messages.length); i++) {
                const item = messages[i];
                const header = item.parts.find((part) => part.which === 'HEADER');
                const fromRaw = header.body.from[0];
                const emailMatch = fromRaw.match(/<([^>]+)>/);
                const email = emailMatch ? emailMatch[1] : fromRaw;
                console.log(`   ${i + 1}. ${email}`);
            }
        }

        console.log(`\n📊 Summary: Found ${repliesFound} lead replies`);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    } finally {
        if (connection) {
            connection.end();
        }
        await prisma.$disconnect();
    }
};

testReplyDetection();
