const axios = require('axios');
const config = require('./config.json');

async function testFacebookWithoutWebhook() {
    console.log('🧪 Testing Facebook Connection (No Webhook Required)\n');
    
    const token = config.page_access_token;
    
    // Test 1: Get Page Info
    console.log('1️⃣ Getting Page Info...');
    try {
        const pageRes = await axios.get(`https://graph.facebook.com/v18.0/me?access_token=${token}`);
        console.log('✅ Page Connected!');
        console.log('   Name:', pageRes.data.name);
        console.log('   ID:', pageRes.data.id);
        console.log('   Category:', pageRes.data.category || 'N/A');
    } catch (err) {
        console.error('❌ Failed:', err.response?.data?.error?.message || err.message);
        return;
    }
    
    // Test 2: Get Page Accounts (Pages you manage)
    console.log('\n2️⃣ Getting Managed Pages...');
    try {
        const accountsRes = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
        if (accountsRes.data.data && accountsRes.data.data.length > 0) {
            console.log('✅ Pages Found:', accountsRes.data.data.length);
            accountsRes.data.data.forEach((page, i) => {
                console.log(`   ${i + 1}. ${page.name}`);
                console.log(`      ID: ${page.id}`);
                console.log(`      Category: ${page.category || 'N/A'}`);
            });
            
            // Save first page ID to config
            const firstPage = accountsRes.data.data[0];
            console.log(`\n💡 Use this Page ID: ${firstPage.id}`);
        } else {
            console.log('⚠️ No pages found. Token may not have page permissions.');
        }
    } catch (err) {
        console.error('❌ Failed:', err.response?.data?.error?.message || err.message);
    }
    
    // Test 3: Get Page Insights (if available)
    console.log('\n3️⃣ Checking Page Insights...');
    try {
        const insightsRes = await axios.get(`https://graph.facebook.com/v18.0/me/insights?metric=page_impressions&access_token=${token}`);
        console.log('✅ Insights accessible');
    } catch (err) {
        console.log('ℹ️ Insights not available (normal for new pages)');
    }
    
    // Test 4: Check Token Permissions
    console.log('\n4️⃣ Checking Token Permissions...');
    try {
        const debugRes = await axios.get(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${config.app_id}|${config.app_secret}`);
        const data = debugRes.data.data;
        console.log('✅ Token Valid!');
        console.log('   Expires:', data.expires_at ? new Date(data.expires_at * 1000).toLocaleString() : 'Never');
        console.log('   Scopes:', data.scopes?.join(', ') || 'N/A');
        
        // Check for required permissions
        const required = ['pages_messaging', 'pages_read_engagement'];
        const hasRequired = required.every(scope => data.scopes?.includes(scope));
        if (hasRequired) {
            console.log('   ✅ Has required permissions');
        } else {
            console.log('   ⚠️ Missing some permissions:', required.filter(s => !data.scopes?.includes(s)).join(', '));
        }
    } catch (err) {
        console.error('❌ Failed:', err.response?.data?.error?.message || err.message);
    }
    
    console.log('\n📋 SUMMARY:');
    console.log('   Token: ✅ Working');
    console.log('   Page: ✅ Connected');
    console.log('   Webhook: ❌ Not needed for these tests');
    console.log('\n💡 To receive messages, you need a webhook.');
    console.log('   But you can SEND messages using this token!');
}

testFacebookWithoutWebhook();
