# Amazon-Client Service

Multi-tenant Amazon Seller Central automation platform for OpenClaw.

## Overview

Amazon-Client provides automated tools for Amazon sellers:
- **Inventory Management** - Track stock levels, FBA shipments
- **Dynamic Pricing** - Automated repricing based on competitors
- **Review Monitoring** - Track and respond to customer reviews
- **Competitor Intelligence** - Price tracking and market analysis
- **Customer Service** - Automated buyer message handling
- **Analytics** - Sales reports and business intelligence

## Pricing Tiers

| Tier | Price/Month | Bots Included | ASINs | Check Frequency |
|------|-------------|---------------|-------|-----------------|
| Starter | $300 | Inventory, Pricing | 100 | Hourly |
| Growth | $600 | + Reviews, Competitors | 500 | 30 min |
| Pro | $1,200 | + Customer Service, Analytics | 2,000 | 15 min |
| Enterprise | $2,500 | All + Custom Dev | Unlimited | Real-time |

## Quick Start

### 1. Initial Setup

```bash
# Clone/navigate to the project
cd /home/darwin/.openclaw/workspace/Amazon-Client

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Start Core Infrastructure

```bash
# Start shared services
docker-compose up -d nginx redis postgres-shared sp-api-gateway

# Verify services are running
docker-compose ps
```

### 3. Onboard Your First Client

```bash
# Make script executable
chmod +x clients/scripts/onboard-client.sh

# Onboard a client
export MASTER_ENCRYPTION_KEY="your-key"
export AC_BASE_DOMAIN="your-domain.com"
export SP_API_CLIENT_ID="your-client-id"

./clients/scripts/onboard-client.sh "Acme Corp" "A1B2C3D4E5F6" "growth"
```

### 4. Start Client Services

```bash
# After onboarding, start the client's database and bots
docker-compose up -d postgres-client-001

# Start the assigned bots
docker-compose up -d inventory-bot-client-001 pricing-bot-client-001 \
                   review-bot-client-001 competitor-bot-client-001
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│                   (Reverse Proxy + SSL)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  SP-API  │  │ Webhooks │  │  Admin   │
│  Gateway │  │          │  │   API    │
└────┬─────┘  └──────────┘  └──────────┘
     │
     ├──────────────────────────────────┐
     │                                  │
     ▼                                  ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Orders  │  │ Inventory│  │ Pricing  │
│   API    │  │   API    │  │   API    │
└──────────┘  └──────────┘  └──────────┘

Client Isolation:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Client 001  │ │  Client 002  │ │  Client 003  │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │   DB     │ │ │ │   DB     │ │ │ │   DB     │ │
│ ├──────────┤ │ │ ├──────────┤ │ │ ├──────────┤ │
│ │Inventory │ │ │ │Inventory │ │ │ │Inventory │ │
│ │Pricing   │ │ │ │Pricing   │ │ │ │Pricing   │ │
│ │Review    │ │ │ │Review    │ │ │ │Review    │ │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Directory Structure

```
Amazon-Client/
├── docker-compose.yml          # Main orchestration file
├── .env.example                # Environment template
├── README.md                   # This file
│
├── shared/                     # Shared infrastructure
│   ├── sp-api/                 # SP-API Gateway service
│   │   ├── src/
│   │   │   ├── auth/           # LWA token management
│   │   │   ├── api/            # Orders, Inventory, Pricing APIs
│   │   │   ├── utils/          # Rate limiting, error handling
│   │   │   └── routes/         # Express routes
│   │   └── Dockerfile
│   ├── nginx/                  # Reverse proxy config
│   ├── redis/                  # Redis configuration
│   └── monitoring/             # Prometheus config
│
├── clients/                    # Client-specific data
│   ├── scripts/                # Onboarding automation
│   │   └── onboard-client.sh   # Client creation script
│   ├── secrets/                # Encrypted client credentials
│   └── templates/              # Configuration templates
│
├── bots/                       # Bot implementations
│   ├── inventory-bot/
│   ├── pricing-bot/
│   ├── review-bot/
│   ├── competitor-bot/
│   ├── customer-service-bot/
│   └── analytics-bot/
│
└── docs/                       # Documentation
    └── COMPETITOR_BOT.md       # Competitor bot guide
```

## API Endpoints

### SP-API Gateway

```
GET  /health                           # Health check
POST /admin/clients/:clientId/init     # Initialize client auth
GET  /admin/status                     # Service status

# Orders
GET  /api/:clientId/orders
GET  /api/:clientId/orders/:orderId
GET  /api/:clientId/orders/:orderId/items

# Inventory
GET  /api/:clientId/inventory/summaries
GET  /api/:clientId/inventory/item/:sellerSku
GET  /api/:clientId/inventory/shipments

# Pricing
GET  /api/:clientId/pricing/competitive?asins=...
GET  /api/:clientId/pricing/offers/:asin
GET  /api/:clientId/pricing/item-offers/:asin
POST /api/:clientId/pricing/calculate  # Repricing calculator
```

### Webhooks

```
POST /webhook/:clientId/inventory
POST /webhook/:clientId/pricing
POST /webhook/:clientId/reviews
POST /webhook/:clientId/competitors
POST /webhook/:clientId/analytics
```

## Security

- **Client Isolation**: Each client has their own PostgreSQL database
- **Credential Encryption**: All SP-API credentials encrypted at rest
- **File Permissions**: Secrets directories use chmod 700 (owner-only)
- **Rate Limiting**: Per-client rate limiting to respect SP-API limits
- **Network Segmentation**: Docker networks isolate client traffic

## Scaling to 50 Clients on $5/month VPS

### Resource Allocation (estimated)

| Service | RAM | CPU | Notes |
|---------|-----|-----|-------|
| NGINX | 64MB | 0.1 | Lightweight proxy |
| Redis | 128MB | 0.25 | Rate limiting cache |
| Postgres Shared | 256MB | 0.25 | Gateway metadata |
| SP-API Gateway | 512MB | 0.5 | Central bottleneck |
| Client DBs (50) | 256MB avg | 0.25 avg | On-demand allocation |
| Bots (150-300) | 128MB avg | 0.1 avg | Staggered scheduling |

### Optimization Strategies

1. **Staggered Scheduling**: Bots don't all run at the same time
2. **Connection Pooling**: Shared DB connections
3. **Redis Caching**: Minimize SP-API calls
4. **Lightweight Images**: Alpine-based containers
5. **Log Rotation**: Prevent disk space issues

## Monitoring

Enable Prometheus monitoring:
```bash
docker-compose --profile monitoring up -d prometheus
```

Access metrics at: `http://your-domain:9090`

## Troubleshooting

### Common Issues

**Containers won't start**
```bash
# Check logs
docker-compose logs sp-api-gateway
docker-compose logs postgres-shared
```

**SP-API authentication fails**
```bash
# Re-initialize client auth
curl -X POST http://localhost/admin/clients/client-001/init
```

**Database connection issues**
```bash
# Check client DB is running
docker-compose ps | grep postgres-client
```

## License

Private - For OpenClaw deployment only
