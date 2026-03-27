const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetLeadsForRetesting() {
    try {
        console.log('🔄 Starting reset of all Leads for re-enrichment...');

        const result = await prisma.lead.updateMany({
            data: {
                email: null,
                status: 'NEW',
                emailExtracted: false,
                websiteVisited: false,
                seoTitle: null,
                seoDescription: null,
                loadTime: null,
                isResponsive: null
            }
        });

        console.log(`✅ Successfully reset ${result.count} leads.`);
        console.log('🚀 You can now trigger the /scraper/extract-emails route to re-enrich them with the new Bing fallback!');

    } catch (error) {
        console.error('❌ Error resetting leads:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

resetLeadsForRetesting();
