# Facebook Messenger Integration - Setup Complete

## ✅ STATUS: Ready for Facebook Configuration

### Webhook Server Running
- **Local Port:** 3001
- **Public URL:** https://7fe7-143-44-165-226.ngrok-free.app/webhook/facebook
- **Status:** 🟢 Online

---

## 🚀 NEXT STEPS (Do This in Facebook Dev Console)

### Step 1: Go to Facebook Developers
1. Visit: https://developers.facebook.com/apps
2. Select your app: **AIOps Flow** (or your app name)

### Step 2: Configure Webhook
1. In left sidebar, click **"Messenger"**
2. Click **"Settings"** under Messenger
3. Scroll to **"Webhooks"** section
4. Click **"Add Callback URL"**

### Step 3: Enter Webhook Details

| Field | Value |
|-------|-------|
| **Callback URL** | `https://7fe7-143-44-165-226.ngrok-free.app/webhook/facebook` |
| **Verify Token** | `AiOpsFlow13!ED` |

Click **"Verify and Save"**

✅ If it says "Success!", your webhook is connected!

### Step 4: Subscribe to Events
After webhook is verified:
1. Click **"Add Subscriptions"**
2. Check these boxes:
   - ✅ **messages** (receive messages)
   - ✅ **messaging_postbacks** (button clicks)
   - ✅ **messaging_optins** (user starts chat)

Click **"Save"**

### Step 5: Get Your Page ID
1. In the same page, look for **"Access Tokens"** section
2. Select your Page: **AIOps Flow**
3. It will show you the **Page ID** (numbers)
4. Copy this number!

---

## 📝 Update Config with Page ID

Once you have the Page ID, update:
`~/.openclaw/workspace/channels/facebook/config.json`

```json
{
  "page_id": "YOUR_PAGE_ID_HERE",
  ...
}
```

---

## 🧪 Test Your Bot

### Method 1: Messenger
1. Go to your Facebook Page: facebook.com/aiopsflow
2. Click **"Message"** button
3. Send: "Hello"
4. You should get a reply from your bot!

### Method 2: Test Script
```bash
cd ~/.openclaw/workspace/channels/facebook
node test-send.js
```

---

## 📋 Files Created

| File | Purpose |
|------|---------|
| `config.json` | Your credentials (secure) |
| `webhook.js` | Receives Facebook messages |
| `test-webhook.js` | Test connection |
| `package.json` | Dependencies |

---

## 🔐 Security Notes

- Config file has restricted permissions (`chmod 600`)
- Never commit `config.json` to git
- ngrok URL changes when restarted
- For production, use a permanent domain

---

## 🎯 Troubleshooting

### "Webhook verification failed"
- Check ngrok is still running: `curl http://localhost:4040/api/tunnels`
- Restart ngrok if URL changed
- Update webhook URL in Facebook with new ngrok URL

### "No reply from bot"
- Check webhook server is running: `ps aux | grep webhook.js`
- Check logs: `tail -f /tmp/facebook-webhook.log`
- Make sure Page is subscribed to webhook

### "Invalid token"
- Regenerate Page Access Token in Facebook Dev Console
- Update `config.json`
- Restart webhook server

---

## 🚀 Production Setup

For live deployment:

1. **Get permanent domain** (e.g., webhook.aiopsflow.com)
2. **Set up SSL** (Let's Encrypt)
3. **Use permanent webhook URL**
4. **Run on VPS** (not laptop)
5. **Set up monitoring**

---

## ✅ Summary

**What I built:**
- ✅ Facebook webhook receiver
- ✅ Message processing
- ✅ Auto-reply system
- ✅ Secure credential storage
- ✅ Test scripts

**What you need to do:**
1. Configure webhook in Facebook Dev Console
2. Get Page ID
3. Test with a message

**Give me your Page ID when you get it!** 📘
