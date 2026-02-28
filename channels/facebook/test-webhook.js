const axios = require('axios');

const CONFIG = {
    webhookUrl: 'https://7fe7-143-44-165-226.ngrok-free.app/webhook/facebook',
    verifyToken: 'AiOpsFlow13!ED',
    pageAccessToken: 'EAASrG1AkhvcBQ8jdOZAgx26VsOfx53WaBWeLt1hSlHJZCIZCf6rI6cWXiLPZBiIOUZCIeE5EHKOB64BGXIZBLewzK3nrdVVqq0ZC9tXZBYKAZBZAzbePeODVoZBuwZC0xI4B7Prjjmx5q23kmde9K42RjfZCUV2XT8oARHcfdeiINt8TnBBAeFXp8c8D9ZBIlctzgVhYroqQryh4vT9aC7WMXOZAi0WEq6i5W5lMCQVunMxbWjak34S2L2euMajXlbQnBiHshNbFiZCZAgf6BcKGZC3OS2y3ExZBAZDZD'
};

async function testFacebookIntegration() {
    console.log('🧪 Testing Facebook Integration...\n');

    // Test 1: Get Page Info
    console.log('1️⃣ Getting Page info...');
    try {
        const pageResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me?access_token=${CONFIG.pageAccessToken}`
        );
        console.log('✅ Page connected:', pageResponse.data.name);
        console.log('   Page ID:', pageResponse.data.id);
    } catch (err) {
        console.error('❌ Failed to get Page info:', err.response?.data?.error?.message || err.message);
    }

    // Test 2: Get Page Accounts
    console.log('\n2️⃣ Getting Page accounts...');
    try {
        const accountsResponse = await axios.get(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${CONFIG.pageAccessToken}`
        );
        if (accountsResponse.data.data && accountsResponse.data.data.length > 0) {
            console.log('✅ Found Pages:');
            accountsResponse.data.data.forEach(page => {
                console.log(`   - ${page.name} (ID: ${page.id})`);
            });
        } else {
            console.log('⚠️ No Pages found. Make sure your token has the right permissions.');
        }
    } catch (err) {
        console.error('❌ Failed to get accounts:', err.response?.data?.error?.message || err.message);
    }

    // Test 3: Send Test Message (to yourself)
    console.log('\n3️⃣ Ready to send test message!');
    console.log('   Next step: Configure webhook in Facebook Dev Console');

    console.log('\n📋 SUMMARY:');
    console.log('   Webhook URL:', CONFIG.webhookUrl);
    console.log('   Verify Token:', CONFIG.verifyToken);
    console.log('   Page Token: Present ✓');
}

testFacebookIntegration();
