# DigitalOcean VPS Setup Guide
## For OpenClaw Facebook Webhook

---

## 📋 Prerequisites

- DigitalOcean account (sign up at digitalocean.com)
- Credit card/PayPal for payment ($5/month)
- Your domain: amajungle.com (Namecheap)

---

## 🎯 Step 1: Create Droplet (VPS)

### 1.1 Sign Up / Log In
1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Sign up or log in
3. Add payment method ($5 will be charged monthly)

### 1.2 Create New Droplet
1. Click **"Create"** → **"Droplets"**
2. Choose Configuration:

**Region:**
```
Singapore (SGP1) - closest to Philippines
```

**Plan:**
```
Basic
$5/month
1 GB RAM / 1 CPU / 25 GB SSD
```

**Operating System:**
```
Ubuntu 22.04 (LTS) x64
```

**Authentication:**
```
SSH Key (recommended)
OR Password (easier for beginners)
```

**Hostname:**
```
openclaw-webhook
```

### 1.3 Click "Create Droplet"
- Wait 1-2 minutes for server to be ready
- Note the **IP Address** (e.g., 128.199.123.45)

---

## 🎯 Step 2: Configure DNS (Namecheap)

### 2.1 Log into Namecheap
1. Go to [namecheap.com](https://namecheap.com)
2. Log in
3. Go to **Domain List**
4. Find **amajungle.com** → Click **Manage**

### 2.2 Add DNS Record
1. Click **"Advanced DNS"** tab
2. Click **"Add New Record"**

**Add these records:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | webhook | YOUR_VPS_IP | Automatic |
| A Record | @ | YOUR_VPS_IP | Automatic |

**Example:**
```
Type: A Record
Host: webhook
Value: 128.199.123.45 (your DigitalOcean IP)
TTL: Automatic
```

### 2.3 Save Changes
- Wait 5-30 minutes for DNS to propagate
- Test: `ping webhook.amajungle.com`

---

## 🎯 Step 3: Connect to VPS

### 3.1 Using Terminal (Mac/Linux)
```bash
ssh root@YOUR_VPS_IP
```

### 3.2 Using Windows
Use PuTTY or Windows Terminal
```
Host: YOUR_VPS_IP
Username: root
Password: (the one you set or SSH key)
```

### 3.3 First Login - Update System
```bash
# Update packages
apt update && apt upgrade -y

# Install required software
apt install -y nodejs npm python3 python3-pip git curl nginx certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2
```

---

## 🎯 Step 4: Deploy OpenClaw Facebook Webhook

### 4.1 Create Directory
```bash
mkdir -p /opt/openclaw
 cd /opt/openclaw
```

### 4.2 Copy Your Files
From your laptop, copy the facebook channel:
```bash
# On your laptop, run:
scp -r ~/.openclaw/workspace/channels/facebook root@YOUR_VPS_IP:/opt/openclaw/
```

### 4.3 Or Clone from Git (if you pushed to git)
```bash
git clone YOUR_REPO_URL .
```

### 4.4 Install Dependencies
```bash
cd /opt/openclaw/facebook
npm install
```

### 4.5 Update Config
Edit `/opt/openclaw/facebook/config.json`:
```json
{
  "app_id": "1314033703880439",
  "app_secret": "edf77897c1bd0d930014d09b0dac89b1",
  "page_access_token": "EAASrG1Akhvc...",
  "verify_token": "AiOpsFlow13!ED",
  "webhook_url": "https://webhook.amajungle.com/webhook/facebook",
  "page_id": "102825747988156",
  "enabled": true
}
```

---

## 🎯 Step 5: SSL Certificate (HTTPS)

### 5.1 Get Certificate
```bash
certbot --nginx -d webhook.amajungle.com
```

### 5.2 Follow Prompts
- Enter email
- Agree to terms
- Select: Redirect HTTP to HTTPS

### 5.3 Auto-renewal
```bash
systemctl enable certbot.timer
```

---

## 🎯 Step 6: Nginx Configuration

### 6.1 Create Config
```bash
nano /etc/nginx/sites-available/webhook
```

Add:
```nginx
server {
    listen 80;
    server_name webhook.amajungle.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 Enable Site
```bash
ln -s /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🎯 Step 7: Start Webhook Server

### 7.1 Using PM2
```bash
cd /opt/openclaw/facebook
pm2 start webhook.js --name "facebook-webhook"
pm2 save
pm2 startup
```

### 7.2 Check Status
```bash
pm2 status
pm2 logs facebook-webhook
```

---

## 🎯 Step 8: Test Everything

### 8.1 Test Webhook Endpoint
```bash
curl "https://webhook.amajungle.com/webhook/facebook?hub.mode=subscribe&hub.verify_token=AiOpsFlow13!ED&hub.challenge=test123"
```

Should return: `test123`

### 8.2 Test in Facebook
1. Go to Facebook Dev Console
2. Messenger → Webhooks
3. Callback URL: `https://webhook.amajungle.com/webhook/facebook`
4. Verify Token: `AiOpsFlow13!ED`
5. Click **Verify**

✅ Should say "Success!"

---

## 🎯 Step 9: Subscribe to Events

After webhook verified:
1. Click **"Add Subscriptions"**
2. Check:
   - ✅ messages
   - ✅ messaging_postbacks
   - ✅ messaging_optins
3. Save

---

## ✅ Done!

Your Facebook bot is now live at:
```
https://webhook.amajungle.com
```

**Monthly Cost:** $5

---

## 🔧 Maintenance Commands

```bash
# Check logs
pm2 logs

# Restart
pm2 restart facebook-webhook

# Update code
cd /opt/openclaw/facebook && git pull && pm2 restart facebook-webhook

# Renew SSL (auto, but manual check)
certbot renew --dry-run
```

---

## 🆘 Troubleshooting

**If webhook fails:**
1. Check firewall: `ufw allow 80,443`
2. Check nginx: `nginx -t`
3. Check pm2: `pm2 logs`
4. Check DNS: `nslookup webhook.amajungle.com`

---

Ready to start? 🚀
