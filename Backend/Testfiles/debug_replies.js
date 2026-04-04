require('dotenv').config();
const imaps = require('imap-simple');
const { prisma } = require('../config/db');

/**
 * Debug script to see WHO replied and if they're in the database
 */
const debugReplies = async () => {
    console.log('🔍 Debugging Reply Detection...\n');

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
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER'],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`📨 Found ${messages.length} unread messages\n`);

        if (messages.length === 0) {
            console.log('❌ No unread messages found. Make sure the lead reply is unread in Gmail.');
            return;
        }

        console.log('📧 Checking each unread message:\n');
        console.log('='.repeat(80));

        for (let i = 0; i < Math.min(messages.length, 20); i++) {
            const item = messages[i];
            const header = item.parts.find((part) => part.which === 'HEADER');
            
            const fromRaw = header.body.from[0];
            const senderEmail = fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw;
            const subject = header.body.subject?.[0] || 'No subject';
            const date = header.body.date?.[0] || 'Unknown date';

            console.log(`\n${i + 1}. From: ${fromRaw}`);
            console.log(`   Extracted Email: ${senderEmail}`);
            console.log(`   Subject: ${subject}`);
            console.log(`   Date: ${date}`);

            // Check if this email exists in database
            const lead = await prisma.lead.findUnique({
                where: { email: senderEmail }
            });

            if (lead) {
                console.log(`   ✅ MATCH FOUND! Lead ID: ${lead.id}, Name: ${lead.name}, Status: ${lead.status}`);
            } else {
                console.log(`   ❌ NOT IN DATABASE`);
                
                // Check if similar email exists (case-insensitive)
                const similarLead = await prisma.lead.findFirst({
                    where: {
                        email: {
                            equals: senderEmail,
                            mode: 'insensitive'
                        }
                    }
                });

                if (similarLead) {
                    console.log(`   ⚠️  Found similar (case mismatch): ${similarLead.email}`);
                }
            }
            console.log('-'.repeat(80));
        }

        console.log('\n\n📊 Summary:');
        console.log('='.repeat(80));
        
        // Get all contacted leads
        const contactedLeads = await prisma.lead.findMany({
            where: {
                status: 'CONTACTED',
                email: { not: null }
            },
            select: {
                id: true,
                name: true,
                email: true,
                company: true,
                lastEmailedAt: true
            },
            orderBy: {
                lastEmailedAt: 'desc'
            },
            take: 10
        });

        console.log(`\n📤 Recently contacted leads (last 10):`);
        contactedLeads.forEach((lead, idx) => {
            console.log(`   ${idx + 1}. ${lead.email} - ${lead.name || lead.company} (ID: ${lead.id})`);
        });

        console.log('\n\n💡 Troubleshooting:');
        console.log('   1. Check if the reply email matches exactly with a lead email above');
        console.log('   2. If not, the lead might have replied from a different email address');
        console.log('   3. Check Gmail to see the actual "From" address of the reply');

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
    } finally {
        if (connection) {
            connection.end();
        }
        await prisma.$disconnect();
    }
};

debugReplies();
