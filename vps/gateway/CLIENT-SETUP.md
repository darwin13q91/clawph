# Client Customization Guide
## How to Configure Custom Responses for Each Client

---

## 📋 **For Bob's Restaurant Example:**

### **Step 1: Create the Client**

```bash
curl -X POST https://webhook.amajungle.com/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Bob'"'"'s Restaurant",
    "bot_token": "123456:ABC-DEF1234...",
    "chat_id": "123456789"
  }'
```

**Response:**
```json
{
  "client_id": "client_abc123...",
  "webhook_url": "https://webhook.amajungle.com/webhook/client_abc123...",
  "config_url": "https://webhook.amajungle.com/admin/clients/client_abc123.../config",
  "status": "created"
}
```

---

### **Step 2: Customize Responses**

```bash
curl -X POST https://webhook.amajungle.com/admin/clients/client_abc123.../config \
  -H "Content-Type: application/json" \
  -d '{
    "custom_responses": {
      "greeting": "Welcome to Bob'"'"'s Restaurant! 🍽️ We serve the best pasta in town. How can I help you?",
      "hours": "🕐 We'"'"'re open:\nMon-Thu: 10 AM - 10 PM\nFri-Sat: 10 AM - 11 PM\nSun: 11 AM - 9 PM",
      "menu": "📋 Our specialties:\n• Spaghetti Bolognese - $12\n• Margherita Pizza - $10\n• Caesar Salad - $8\n\nFull menu: bobsrestaurant.com/menu",
      "contact": "📞 Call us: (555) 123-4567\n📧 Email: hello@bobsrestaurant.com\n📍 Location: 123 Main St",
      "reservation": "🪑 To make a reservation:\n1. Call (555) 123-4567\n2. Or book online: bobsrestaurant.com/book",
      "fallback": "Thanks for messaging Bob'"'"'s Restaurant! A staff member will reply shortly. 👋"
    }
  }'
```

---

## 🎯 **Available Response Types:**

| Type | Trigger | Use Case |
|------|---------|----------|
| **greeting** | "hi", "hello" | Welcome message |
| **hours** | "hour", "open", "time" | Business hours |
| **contact** | "contact", "call", "phone" | Contact info |
| **menu** | "menu", "food", "dish" | Menu/products |
| **pricing** | "price", "cost", "how much" | Pricing info |
| **help** | "help", "support" | General help |
| **fallback** | (any other) | Default response |

---

## 📊 **View Current Config:**

```bash
curl https://webhook.amajungle.com/admin/clients/client_abc123.../config
```

---

## ✅ **Test the Bot:**

1. Message the bot on Telegram
2. Try: "Hello" → Should show custom greeting
3. Try: "What are your hours?" → Should show custom hours
4. Try: "Menu" → Should show custom menu

---

## 💰 **What to Charge:**

| Service | Price | Time |
|---------|-------|------|
| **Setup** (create + basic config) | $200-300 one-time | 30 min |
| **Custom responses** (5-10 Q&A) | $50-100 | 15 min |
| **Monthly hosting** | $50-100/month | - |
| **Updates/changes** | $25-50 per change | 5 min |

---

## 🚀 **Next Client - Just 2 Commands:**

```bash
# Create
curl -X POST https://webhook.amajungle.com/admin/clients -H "Content-Type: application/json" \
  -d '{"business_name":"Jane'"'"'s Boutique","bot_token":"...","chat_id":"..."}'

# Configure
curl -X POST https://webhook.amajungle.com/admin/clients/CLIENT_ID/config \
  -H "Content-Type: application/json" \
  -d '{"custom_responses":{"greeting":"Welcome to Jane'"'"'s! 👗","hours":"...","menu":"..."}}'
```

---

**Ready to onboard your first client?** 🎯
