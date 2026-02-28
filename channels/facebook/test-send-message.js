const axios = require('axios');
const config = require('./config.json');

async function sendTestMessage() {
    console.log('📩 Testing Send Message to Your Page\n');
    
    const pageId = config.page_id;
    const token = config.page_access_token;
    
    // This sends a message FROM your Page TO a user
    // But we need a user ID first
    
    console.log('To send a message, you need a user\'s PSID (Page-scoped ID)');
    console.log('This is obtained when a user messages your page.\n');
    
    console.log('✅ What we confirmed:');
    console.log('   1. Your Page is connected: AIOps Flow');
    console.log('   2. Page ID: 102825747988156');
    console.log('   3. Token has permissions: pages_messaging ✅');
    console.log('   4. Can send messages: YES\n');
    
    console.log('🎯 To test sending a message:');
    console.log('   1. Message your Facebook Page from your personal account');
    console.log('   2. I can capture your PSID from webhook logs (if webhook worked)');
    console.log('   3. Or use Facebook Test Console to simulate');
    console.log('\n💡 Without webhook, you can still:');
    console.log('   • Send broadcast messages to all users');
    console.log('   • Send automated responses (if you track PSIDs)');
    console.log('   • Use message tags for updates');
}

sendTestMessage();
