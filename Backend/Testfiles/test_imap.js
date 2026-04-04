require('dotenv').config();
const imaps = require('imap-simple');

/**
 * Test IMAP connection to Gmail
 */
const testIMAPConnection = async () => {
    console.log('🔍 Testing IMAP connection...');
    console.log(`📧 Email: ${process.env.SMTP_EMAIL}`);
    console.log(`🔑 App Password: ${process.env.App_Pass ? '***' + process.env.App_Pass.slice(-4) : 'NOT SET'}`);

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
        console.log('🔌 Connecting to Gmail IMAP...');
        connection = await imaps.connect(config);
        console.log('✅ Connected successfully!');

        console.log('📂 Opening INBOX...');
        await connection.openBox('INBOX');
        console.log('✅ INBOX opened!');

        console.log('🔍 Searching for UNSEEN messages...');
        const messages = await connection.search(['UNSEEN'], {
            bodies: ['HEADER'],
            markSeen: false
        });
        console.log(`📨 Found ${messages.length} unread messages`);

        if (messages.length > 0) {
            console.log('\n📧 Sample unread messages:');
            messages.slice(0, 5).forEach((msg, idx) => {
                const header = msg.parts.find(p => p.which === 'HEADER');
                const from = header?.body?.from?.[0] || 'Unknown';
                const subject = header?.body?.subject?.[0] || 'No subject';
                console.log(`  ${idx + 1}. From: ${from}`);
                console.log(`     Subject: ${subject}`);
            });
        }

        console.log('\n✅ IMAP test completed successfully!');
        console.log('🎉 Reply detection should work on the server.');

    } catch (error) {
        console.error('\n❌ IMAP Test Failed!');
        console.error(`Error: ${error.message}`);
        
        if (error.source === 'timeout-auth') {
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Check if App Password is correct');
            console.error('   2. Verify 2FA is enabled on Gmail');
            console.error('   3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        } else if (error.source === 'timeout-connection') {
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Check internet connection');
            console.error('   2. Verify firewall allows port 993');
            console.error('   3. Check if Gmail IMAP is enabled');
        } else if (error.message.includes('Invalid credentials')) {
            console.error('\n💡 Troubleshooting:');
            console.error('   1. Email or App Password is incorrect');
            console.error('   2. Generate new App Password');
            console.error('   3. Make sure you\'re using App Password, not regular password');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            connection.end();
        }
    }
};

testIMAPConnection();
