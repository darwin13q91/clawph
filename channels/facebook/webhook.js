const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load configuration
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    console.log('✅ Facebook config loaded');
} catch (err) {
    console.error('❌ Failed to load Facebook config:', err.message);
    process.exit(1);
}

const router = express.Router();

/**
 * Facebook Webhook Verification
 * Facebook sends a GET request to verify the webhook
 */
router.get('/webhook/facebook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔍 Webhook verification attempt:', { mode, token: token ? 'present' : 'missing' });

    if (mode === 'subscribe' && token === config.verify_token) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error('❌ Webhook verification failed');
        res.sendStatus(403);
    }
});

/**
 * Facebook Webhook Receiver
 * Receives messages from Facebook Messenger
 */
router.post('/webhook/facebook', express.json(), async (req, res) => {
    const body = req.body;

    console.log('📩 Facebook webhook received:', JSON.stringify(body, null, 2));

    // Send 200 OK immediately (Facebook requires quick response)
    res.status(200).send('EVENT_RECEIVED');

    // Process the webhook asynchronously
    try {
        await processWebhook(body);
    } catch (err) {
        console.error('❌ Error processing webhook:', err);
    }
});

/**
 * Process incoming Facebook webhook
 */
async function processWebhook(data) {
    // Check if it's a page message
    if (data.object !== 'page') {
        console.log('⚠️ Not a page webhook, ignoring');
        return;
    }

    // Process each entry
    for (const entry of data.entry) {
        const pageID = entry.id;
        const time = entry.time;

        console.log(`📄 Page ${pageID} event at ${new Date(time * 1000)}`);

        // Process each messaging event
        for (const event of entry.messaging || []) {
            await processMessage(event);
        }
    }
}

/**
 * Process individual message
 */
async function processMessage(event) {
    const senderID = event.sender.id;
    const recipientID = event.recipient.id;
    const timestamp = event.timestamp;

    console.log(`💬 Message from ${senderID} to ${recipientID}`);

    // Handle text message
    if (event.message && event.message.text) {
        const messageText = event.message.text;
        console.log(`📝 Text: ${messageText}`);

        // Process with OpenClaw
        const response = await generateResponse(senderID, messageText);

        // Send reply back to Facebook
        await sendFacebookMessage(senderID, response);
    }

    // Handle postback (button clicks)
    if (event.postback) {
        const payload = event.postback.payload;
        console.log(`🔘 Postback: ${payload}`);

        const response = await handlePostback(senderID, payload);
        await sendFacebookMessage(senderID, response);
    }
}

/**
 * Generate response using OpenClaw
 * This connects to your existing OpenClaw system
 */
async function generateResponse(userID, message) {
    // TODO: Integrate with your main OpenClaw agent
    // For now, return a simple response

    const responses = {
        'hi': 'Hello! Welcome to AIOps Flow. How can I help you with AI today?',
        'hello': 'Hi there! I\'m the AIOps Flow AI assistant. What can I do for you?',
        'help': 'I can help you with:\n• AI strategy consulting\n• Business automation\n• Custom AI solutions\n• Technical support\n\nWhat would you like to know?',
        'services': 'We offer:\n🤖 AI Strategy Consulting\n⚙️ Business Process Automation\n💬 Custom Chatbot Development\n📊 Data Analytics Solutions\n\nInterested in any of these?',
        'contact': 'You can reach us at:\n📧 Email: contact@aiopsflow.com\n📱 Phone: +63 XXX XXX XXXX\n\nOr just ask me anything here!',
        'price': 'Our pricing depends on your specific needs. We offer:\n• Starter: $500-1,000\n• Business: $2,000-5,000\n• Enterprise: Custom quote\n\nWant to schedule a free consultation?'
    };

    const lowerMessage = message.toLowerCase().trim();

    // Check for keyword matches
    for (const [keyword, response] of Object.entries(responses)) {
        if (lowerMessage.includes(keyword)) {
            return response;
        }
    }

    // Default response
    return `Thanks for your message: "${message}"\n\nI'm AIOps Flow's AI assistant. I can help you with AI strategy, automation, and custom solutions. What would you like to know?`;
}

/**
 * Handle button postbacks
 */
async function handlePostback(userID, payload) {
    const postbackResponses = {
        'GET_STARTED': 'Welcome to AIOps Flow! 🚀\n\nWe help businesses build and launch their own AI. What can I help you with today?',
        'SERVICES': 'Our services:\n🤖 AI Consulting\n⚙️ Automation\n💬 Chatbots\n📊 Analytics\n\nWhich interests you?',
        'CONTACT': '📧 contact@aiopsflow.com\n📱 +63 XXX XXX XXXX\n\nSchedule a call: https://calendly.com/aiopsflow',
        'PRICING': '💰 Flexible pricing based on your needs:\n• Starter: $500-1,000\n• Business: $2,000-5,000\n• Enterprise: Custom\n\nBook a free consultation!'
    };

    return postbackResponses[payload] || 'I\'m not sure about that. Can you rephrase or ask something else?';
}

/**
 * Send message back to Facebook user
 */
async function sendFacebookMessage(recipientID, messageText) {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${config.page_access_token}`,
            {
                recipient: { id: recipientID },
                message: { text: messageText }
            }
        );

        if (response.data.error) {
            console.error('❌ Facebook API error:', response.data.error);
        } else {
            console.log('✅ Message sent to Facebook:', recipientID);
        }
    } catch (err) {
        console.error('❌ Failed to send Facebook message:', err.message);
    }
}

/**
 * Get user profile from Facebook
 */
async function getUserProfile(userID) {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/v18.0/${userID}?access_token=${config.page_access_token}&fields=first_name,last_name,profile_pic`
        );
        return response.data;
    } catch (err) {
        console.error('❌ Failed to get user profile:', err.message);
        return null;
    }
}

module.exports = router;

// If run directly, start standalone server
if (require.main === module) {
    const app = express();
    app.use(express.json());
    app.use('/', router);

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 Facebook webhook server running on port ${PORT}`);
        console.log(`📡 Webhook URL: ${config.webhook_url}`);
        console.log(`🔐 Verify Token: ${config.verify_token}`);
    });
}
