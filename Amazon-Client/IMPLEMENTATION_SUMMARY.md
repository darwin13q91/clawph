# Amazon-Client Service - Implementation Summary

## Overview
Complete multi-tenant Amazon Seller Central automation infrastructure for OpenClaw.

---

## Created Files

### 1. Docker Compose Infrastructure (`docker-compose.yml`)
- **NGINX Reverse Proxy**: Routes traffic, handles SSL, rate limiting per client
- **SP-API Gateway**: Shared authentication and API coordination service
- **Redis**: Rate limiting cache and bot coordination
- **PostgreSQL Shared**: Gateway metadata (not client data)
- **Bot Templates**: All 6 bot types (inventory, pricing, review, competitor, customer-service, analytics)

### 2. SP-API Shared Skills (`shared/sp-api/`)

#### Authentication Module (`src/auth/index.js`)
- LWA (Login with Amazon) token refresh
- Encrypted credential storage (AES-256-CBC)
- In-memory token caching
- Automatic token refresh before expiry

#### Rate Limiting Handler (`src/utils/rateLimiter.js`)
- Per-client rate limiting
- Endpoint-specific limits (orders: 20/s, pricing: 10/s)
- Token bucket algorithm for burst handling
- Redis-backed sliding window
- Retry with exponential backoff

#### API Wrappers
- **Orders API** (`src/api/orders.js`): Get orders, order items, buyer info
- **Inventory API** (`src/api/inventory.js`): Stock levels, FBA shipments
- **Pricing API** (`src/api/pricing.js`): Competitive pricing, repricing calculator

#### Error Handling (`src/utils/errorHandler.js`)
- Retryable error classification
- Exponential backoff with jitter
- Rate limit detection (429 handling)
- Structured error responses

### 3. Client Onboarding Script (`clients/scripts/onboard-client.sh`)

**Features:**
- Takes: `business_name`, `amazon_seller_id`, `tier`
- Creates isolated PostgreSQL database per client
- Generates encrypted credential files
- Creates client configuration JSON
- Generates Docker Compose entries
- Sets up Nginx routing
- Outputs: Webhook URLs, dashboard login, API key

**Security:**
- All credentials encrypted at rest
- Directory permissions set to 700 (chmod 700 equivalent)
- Secure password generation
- HMAC-signed webhooks

### 4. Competitor-Bot Documentation (`docs/COMPETITOR_BOT.md`)

**Covers:**
- How competitor price tracking works
- ASIN-based monitoring with SP-API endpoints
- Tracking frequency by pricing tier
- Automated repricing strategies (Buy Box, Lowest, Position targets)
- Profit protection algorithms
- Alert system configuration
- Webhook payload formats
- Best practices and troubleshooting

### 5. Directory Structure

```
Amazon-Client/
├── docker-compose.yml              # Main orchestration
├── .env.example                    # Configuration template
├── README.md                       # Complete documentation
│
├── shared/
│   ├── sp-api/                     # SP-API Gateway service
│   │   ├── src/
│   │   │   ├── auth/               # LWA authentication
│   │   │   ├── api/                # Orders, Inventory, Pricing
│   │   │   ├── utils/              # Rate limiting, errors, logging
│   │   │   ├── routes/             # Express routes
│   │   │   └── index.js            # Main entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── nginx/
│   │   └── nginx.conf              # Reverse proxy config
│   ├── redis/
│   │   └── redis.conf              # Cache configuration
│   ├── postgres/
│   │   └── init/01-init.sql        # Shared DB schema
│   └── monitoring/
│       └── prometheus.yml          # Metrics collection
│
├── clients/
│   ├── scripts/
│   │   └── onboard-client.sh       # Onboarding automation
│   ├── secrets/                    # Client data (created per client)
│   └── templates/
│       ├── client-config.json      # Config template
│       └── init-db.sql             # DB schema template
│
├── bots/                           # All 6 bot types with Dockerfiles
│   ├── inventory-bot/
│   ├── pricing-bot/
│   ├── review-bot/
│   ├── competitor-bot/
│   ├── customer-service-bot/
│   └── analytics-bot/
│
└── docs/
    └── COMPETITOR_BOT.md           # Competitor bot documentation
```

---

## Pricing Tiers

| Tier | Price | Bots | Features |
|------|-------|------|----------|
| Starter | $300/mo | Inventory, Pricing | Basic tracking |
| Growth | $600/mo | + Reviews, Competitors | Auto-repricing |
| Pro | $1,200/mo | + Customer Service, Analytics | Advanced analytics |
| Enterprise | $2,500/mo | All + Custom | Priority support, custom dev |

---

## Scalability for $5/Month VPS

### Resource Estimates (50 clients)

| Component | RAM | CPU | Optimization |
|-----------|-----|-----|--------------|
| NGINX | 64MB | 0.1 | Alpine Linux |
| Redis | 128MB | 0.25 | 128MB maxmemory |
| Postgres Shared | 256MB | 0.25 | Connection pooling |
| SP-API Gateway | 512MB | 0.5 | Central service |
| Client DBs | 128MB avg | 0.1 avg | On-demand |
| Bots | 64MB avg | 0.05 avg | Staggered schedule |

### Key Optimizations
1. **Staggered Scheduling**: Bots run at different times
2. **Redis Caching**: Minimize SP-API calls
3. **Connection Pooling**: Reuse DB connections
4. **Alpine Containers**: Minimal footprint
5. **Resource Limits**: Docker memory/CPU constraints

---

## Security Measures

1. **Client Isolation**: Separate PostgreSQL per client
2. **Credential Encryption**: AES-256-CBC at rest
3. **File Permissions**: 700 on secrets directories
4. **Rate Limiting**: Per-client SP-API limits
5. **Network Segmentation**: Docker bridge networks
6. **Secure Headers**: Helmet.js in SP-API Gateway

---

## Quick Start Commands

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start infrastructure
docker-compose up -d nginx redis postgres-shared sp-api-gateway

# 3. Onboard first client
chmod +x clients/scripts/onboard-client.sh
./clients/scripts/onboard-client.sh "Business Name" "A1B2C3" "growth"

# 4. Start client services
docker-compose up -d postgres-client-001
docker-compose up -d inventory-bot-client-001 pricing-bot-client-001
```

---

## API Endpoints

### Health & Admin
- `GET /health` - Service health
- `POST /admin/clients/:id/init` - Initialize client
- `GET /admin/status` - System status

### Orders
- `GET /api/:clientId/orders`
- `GET /api/:clientId/orders/:orderId`

### Inventory
- `GET /api/:clientId/inventory/summaries`
- `GET /api/:clientId/inventory/item/:sku`

### Pricing
- `GET /api/:clientId/pricing/competitive?asins=...`
- `POST /api/:clientId/pricing/calculate`

### Webhooks
- `POST /webhook/:clientId/inventory`
- `POST /webhook/:clientId/pricing`
- `POST /webhook/:clientId/competitors`

---

## Next Steps for Production

1. **SSL Certificates**: Add certbot or Cloudflare
2. **Backup Strategy**: Automate PostgreSQL backups
3. **Monitoring**: Enable Prometheus/Grafana
4. **Alerting**: Configure PagerDuty/Opsgenie
5. **CI/CD**: GitHub Actions for deployment
