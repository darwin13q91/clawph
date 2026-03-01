FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Create directories
RUN mkdir -p logs config credentials

# Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
