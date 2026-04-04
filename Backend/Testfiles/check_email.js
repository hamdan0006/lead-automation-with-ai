require('dotenv').config();
const { prisma } = require('../config/db');

const checkEmail = async () => {
    const testEmail = 'adiluae213@gmail.com';
    
    console.log(`🔍 Searching for: ${testEmail}\n`);
    
    // Exact match
    const exactMatch = await prisma.lead.findUnique({
        where: { email: testEmail }
    });
    
    if (exactMatch) {
        console.log('✅ FOUND with exact match:');
        console.log(`   ID: ${exactMatch.id}`);
        console.log(`   Name: ${exactMatch.name}`);
        console.log(`   Email: ${exactMatch.email}`);
        console.log(`   Status: ${exactMatch.status}`);
        console.log(`   Company: ${exactMatch.company}`);
    } else {
        console.log('❌ NOT FOUND with exact match');
    }
    
    console.log('\n---\n');
    
    // Case-insensitive match
    const caseInsensitiveMatch = await prisma.lead.findFirst({
        where: {
            email: {
                equals: testEmail,
                mode: 'insensitive'
            }
        }
    });
    
    if (caseInsensitiveMatch) {
        console.log('✅ FOUND with case-insensitive match:');
        console.log(`   ID: ${caseInsensitiveMatch.id}`);
        console.log(`   Name: ${caseInsensitiveMatch.name}`);
        console.log(`   Email: ${caseInsensitiveMatch.email}`);
        console.log(`   Status: ${caseInsensitiveMatch.status}`);
        console.log(`   Company: ${caseInsensitiveMatch.company}`);
    } else {
        console.log('❌ NOT FOUND with case-insensitive match');
    }
    
    console.log('\n---\n');
    
    // Search for similar emails
    const similarEmails = await prisma.lead.findMany({
        where: {
            email: {
                contains: 'adiluae',
                mode: 'insensitive'
            }
        },
        take: 5
    });
    
    if (similarEmails.length > 0) {
        console.log(`🔎 Found ${similarEmails.length} similar email(s):`);
        similarEmails.forEach((lead, idx) => {
            console.log(`   ${idx + 1}. ${lead.email} (ID: ${lead.id}, Status: ${lead.status})`);
        });
    } else {
        console.log('❌ No similar emails found');
    }
    
    await prisma.$disconnect();
};

checkEmail();
