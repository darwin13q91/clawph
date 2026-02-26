# Multi-Agent Restaurant Business Architecture

Solar-powered Ubuntu laptop = ~$0/mo operating cost → $500/mo pure margin per client

## 💡 Business Model

| Client Type | Monthly Fee | Setup Cost | Margin |
|-------------|-------------|------------|--------|
| Restaurant (basic) | $500/mo | $2,000 | ~95% |
| Restaurant (pro) | $1,000/mo | $3,500 | ~95% |
| Multi-location chain | $2,500/mo | $5,000 | ~97% |

**Your edge:** One laptop, multiple agents, near-zero marginal cost per client.

## 🏗️ Architecture

```
business/
├── agents/                    # Individual restaurant agents
│   ├── italian-bistro/        # Owner 1 - Italian restaurant
│   ├── coffee-corner/         # Owner 2 - Coffee shop  
│   └── beach-resort/          # Owner 3 - Resort/hotel
│
├── shared-skills/             # Reusable across all agents
│   ├── menu-qa/
│   ├── reservations/
│   ├── reviews/
│   └── hours-location/
│
├── docs/                      # Business documentation
│   ├── pricing.md
│   ├── onboarding.md
│   └── solar-setup.md
│
└── infra/                     # Infrastructure configs
    ├── docker-compose.yml     # Multi-agent orchestration
    ├── nginx.conf            # Reverse proxy per agent
    └── phone-numbers.json    # Twilio/Vonage config
```

## 🤖 Agent Structure

Each agent has:

### 1. Base Identity (same engine)
- Restaurant name
- Personality/tone (friendly, professional, casual)
- Operating hours
- Contact info

### 2. Shared Skills (base layer)
```yaml
shared_skills:
  - menu_qa:           # Answer menu questions
  - reservations:      # Book tables
  - hours_location:    # When/where are you open
  - faq_handler:       # Common questions
  - review_collector:  # Ask for Google reviews
```

### 3. Custom Skills (owner layer)
```yaml
custom_skills:
  italian-bistro:
    - wine_pairing          # Suggest wine with dishes
    - italian_pronunciation # How to say "bruschetta"
    - chef_specials         # Daily recommendations
    
  coffee-corner:
    - loyalty_program       # Punch card system
    - brewing_guide         # Coffee education
    - daily_specials        # Morning pastry deals
    
  beach-resort:
    - room_booking          # Direct reservations
    - amenity_info          # Pool, spa, gym hours
    - local_activities      # Things to do nearby
```

## 📱 Channels Per Agent

| Channel | Setup | Cost |
|---------|-------|------|
| WhatsApp Business | Twilio API | ~$0.005/msg |
| SMS | Vonage/Twilio | ~$0.0075/msg |
| Website Widget | Embedded iframe | Free |
| Phone (voice) | Twilio SIP | ~$0.013/min |
| Telegram Bot | BotFather | Free |

## ☀️ Solar-Powered Ubuntu Setup

### Hardware
- Laptop: ThinkPad T480 (15W idle, 25W load) - $300 used
- Solar panel: 100W foldable - $150
- Battery: 200Wh power station - $200
- 4G LTE modem: $50

### Power Math
- Laptop: 20W average × 24h = 480Wh/day
- Solar: 100W × 6h sun = 600Wh/day (summer)
- Buffer: 200Wh battery for cloudy days

### Software Stack
```yaml
base_system:
  os: Ubuntu 24.04 LTS Server (minimal)
  container_runtime: Docker + Docker Compose
  reverse_proxy: Nginx
  monitoring: Netdata (low resource)
  
agents:
  runtime: OpenClaw Gateway
  isolation: Docker containers per agent
  database: SQLite per agent (lightweight)
  
backup:
  strategy: Daily rsync to cloud (free tier)
  target: Backblaze B2 or AWS S3 Glacier
```

## 🚀 Deployment

### Single Laptop, Multiple Agents

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx.conf:/etc/nginx/nginx.conf
    
  italian-bistro:
    image: openclaw-agent:latest
    environment:
      - AGENT_ID=italian-bistro
      - PORT=18790
      - SHARED_SKILLS=/skills/base
      - CUSTOM_SKILLS=/skills/italian
    volumes:
      - ./shared-skills:/skills/base
      - ./agents/italian-bistro/skills:/skills/italian
      - ./agents/italian-bistro/data:/data
    
  coffee-corner:
    image: openclaw-agent:latest
    environment:
      - AGENT_ID=coffee-corner
      - PORT=18791
    volumes:
      - ./shared-skills:/skills/base
      - ./agents/coffee-corner/skills:/skills/coffee
      
  # ... more agents
```

### Resource Allocation

| Resource | Per Agent | 5 Agents | 10 Agents |
|----------|-----------|----------|-----------|
| RAM | 512MB | 2.5GB | 5GB |
| CPU | 10% | 50% | 100% |
| Storage | 1GB | 5GB | 10GB |
| Network | ~5GB/mo | ~25GB/mo | ~50GB/mo |

**Laptop limit:** ~8-10 agents comfortably

## 📋 Onboarding Checklist

### Week 1: Setup
- [ ] Collect menu, FAQ, hours from owner
- [ ] Create agent profile
- [ ] Train on custom knowledge
- [ ] Test all shared skills
- [ ] Configure phone number/WhatsApp

### Week 2: Deploy
- [ ] Deploy agent container
- [ ] Set up website widget
- [ ] Configure DNS (agent.restaurantdomain.com)
- [ ] SSL certificate
- [ ] Monitoring alerts

### Week 3: Train
- [ ] Owner trains with agent
- [ ] Staff tests real scenarios
- [ ] Fine-tune responses
- [ ] Document edge cases

### Week 4: Go Live
- [ ] Soft launch (friends/family)
- [ ] Monitor conversations
- [ ] Adjust personality/tone
- [ ] Full public launch

## 💰 Pricing Strategy

### Basic ($500/mo)
- WhatsApp + SMS channels
- Menu Q&A, reservations, hours
- Basic review collection
- 1,000 messages/mo included

### Pro ($1,000/mo)
- All Basic features
- Custom skills (wine pairing, loyalty, etc.)
- Phone voice agent
- Website widget
- Analytics dashboard
- 5,000 messages/mo

### Enterprise ($2,500/mo)
- All Pro features
- Multiple locations
- Priority support
- Custom integrations (POS, etc.)
- Unlimited messages
- Dedicated phone number

## 🔄 Scaling Options

### Phase 1: Single Laptop (Now)
- 1 laptop, 3-5 clients
- $1,500-2,500/mo revenue
- Learn, refine, build case studies

### Phase 2: Mini Fleet (6 months)
- 3 laptops, 15-20 clients
- $7,500-10,000/mo revenue
- Hire part-time support

### Phase 3: Cloud Hybrid (12 months)
- Keep solar for edge/offline
- Cloud VPS for overflow
- 50+ clients
- $25,000+/mo revenue

## 🛡️ Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Laptop dies | Spare $300 laptop ready |
| Cloudy week | 200Wh battery + grid backup |
| Client churn | 3-month minimum contracts |
| API costs spike | Per-message billing to clients |
| Competition | Custom skills = moat |

## 📊 Success Metrics

Track per agent:
- Messages handled / day
- Reservation conversion rate
- Customer satisfaction (CSAT)
- Response time (target: < 5 sec)
- Owner time saved (hours/week)

---

**Next Steps:**
1. Set up solar laptop hardware
2. Create first agent (your test restaurant)
3. Build 3 shared skills
4. Document everything
5. Find first paying client
