#!/bin/bash
# Add New Agent to Infrastructure
# Usage: ./add-agent.sh <agent-name> <role>
# Example: ./add-agent.sh analyst business

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_NAME=$1
AGENT_ROLE=$2

if [ -z "$AGENT_NAME" ] || [ -z "$AGENT_ROLE" ]; then
    echo "Usage: $0 <agent-name> <role>"
    echo ""
    echo "Roles:"
    echo "  infrastructure  - Core system agents"
    echo "  business        - Business logic agents"
    echo "  customer        - Customer-facing agents"
    echo ""
    echo "Examples:"
    echo "  $0 scanner business"
    echo "  $0 security infrastructure"
    exit 1
fi

# Validate role
if [[ ! "$AGENT_ROLE" =~ ^(infrastructure|business|customer)$ ]]; then
    echo "❌ Invalid role: $AGENT_ROLE"
    echo "Valid roles: infrastructure, business, customer"
    exit 1
fi

# Check if agent already exists
if [ -d "$INFRA_DIR/agents/$AGENT_NAME" ]; then
    echo "❌ Agent '$AGENT_NAME' already exists"
    exit 1
fi

echo "🚀 Creating new agent: $AGENT_NAME"
echo "   Role: $AGENT_ROLE"
echo ""

# Create agent directory structure
mkdir -p "$INFRA_DIR/agents/$AGENT_NAME"/{config,data,skills}

# Generate agent config
cat > "$INFRA_DIR/agents/$AGENT_NAME/config/agent.yaml" << EOF
# Agent Configuration
agent:
  id: $AGENT_NAME
  name: $(echo "$AGENT_NAME" | sed 's/-/ /g' | sed 's/.*/\u&/')
  role: $AGENT_ROLE
  version: "1.0.0"
  
# Communication
redis:
  host: redis
  port: 6379
  channel: "agent:$AGENT_NAME"
  
# API
server:
  port: 18789
  host: 0.0.0.0
  
# Skills to load
skills:
  - name: base-communication
    enabled: true
  - name: task-handler
    enabled: true
  # Add more skills here
  
# Model configuration
model:
  primary: "kimi-coding/k2p5"
  fallback: "gpt-4o-mini"
  
# Logging
logging:
  level: info
  file: /app/data/agent.log
  max_size: 10MB
  max_files: 5
EOF

# Create AGENTS.md
cat > "$INFRA_DIR/agents/$AGENT_NAME/AGENTS.md" << EOF
# Agent: $(echo "$AGENT_NAME" | sed 's/-/ /g' | sed 's/.*/\u&/')

## Role
$AGENT_ROLE agent

## Purpose
TODO: Describe what this agent does

## Capabilities
- TODO: List capabilities

## Communication
- Subscribes to: agent:$AGENT_NAME
- Publishes to: agent:orchestrator

## Data
- Local storage: ./data/
- Shared: Via Redis

## Created
$(date +%Y-%m-%d)
EOF

# Create Dockerfile for this agent
cat > "$INFRA_DIR/agents/$AGENT_NAME/Dockerfile" << 'EOF'
FROM openclaw/agent:latest

LABEL agent.name="AGENT_NAME"
LABEL agent.role="AGENT_ROLE"

COPY config/ /app/config/
COPY skills/ /app/skills/

VOLUME ["/app/data"]

EXPOSE 18789

CMD ["openclaw", "start", "--config", "/app/config/agent.yaml"]
EOF

sed -i "s/AGENT_NAME/$AGENT_NAME/g" "$INFRA_DIR/agents/$AGENT_NAME/Dockerfile"
sed -i "s/AGENT_ROLE/$AGENT_ROLE/g" "$INFRA_DIR/agents/$AGENT_NAME/Dockerfile"

# Add to docker-compose.yml
echo ""
echo "📦 Adding to docker-compose.yml..."

# Find next available port
NEXT_PORT=$(grep -oP 'port: "\K18[0-9]{3}' "$INFRA_DIR/docker-compose.yml" | sort -n | tail -1)
if [ -z "$NEXT_PORT" ]; then
    NEXT_PORT=18800
else
    NEXT_PORT=$((NEXT_PORT + 1))
fi

# Add service to docker-compose
cat >> "$INFRA_DIR/docker-compose.yml" << EOF

  $AGENT_NAME:
    image: openclaw/agent:latest
    container_name: agent-$AGENT_NAME
    restart: unless-stopped
    environment:
      - AGENT_ID=$AGENT_NAME
      - AGENT_ROLE=$AGENT_ROLE
      - REDIS_URL=redis:6379
      - PORT=18789
    ports:
      - "$NEXT_PORT:18789"
    volumes:
      - ./agents/$AGENT_NAME:/app/config:ro
      - $AGENT_NAME-data:/app/data
    depends_on:
      - redis
      - orchestrator

EOF

# Add volume
cat >> "$INFRA_DIR/docker-compose.yml" << EOF
  $AGENT_NAME-data:
EOF

echo "✅ Agent '$AGENT_NAME' created successfully!"
echo ""
echo "📁 Files created:"
echo "  - agents/$AGENT_NAME/config/agent.yaml"
echo "  - agents/$AGENT_NAME/AGENTS.md"
echo "  - agents/$AGENT_NAME/Dockerfile"
echo ""
echo "🔌 Configuration:"
echo "  - Port: $NEXT_PORT"
echo "  - Role: $AGENT_ROLE"
echo "  - Redis: Connected"
echo ""
echo "🚀 To start this agent:"
echo "  cd infrastructure"
echo "  docker-compose up -d $AGENT_NAME"
echo ""
echo "📝 Next steps:"
echo "  1. Edit agents/$AGENT_NAME/config/agent.yaml"
echo "  2. Add skills to agents/$AGENT_NAME/skills/"
echo "  3. Update agents/$AGENT_NAME/AGENTS.md"
echo "  4. Start the agent"
