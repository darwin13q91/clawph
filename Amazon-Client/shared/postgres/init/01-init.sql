#!/bin/bash
set -e

# Initialize shared database schema

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
    -- Client management table
    CREATE TABLE IF NOT EXISTS clients (
        client_id VARCHAR(20) PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        tier VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
    );

    -- API rate limit tracking
    CREATE TABLE IF NOT EXISTS api_usage (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(20) REFERENCES clients(client_id),
        endpoint VARCHAR(100) NOT NULL,
        requests_count INT DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE
    );

    -- System events log
    CREATE TABLE IF NOT EXISTS system_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        client_id VARCHAR(20),
        message TEXT,
        severity VARCHAR(20) DEFAULT 'info',
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_api_usage_client_date ON api_usage(client_id, date);
    CREATE INDEX IF NOT EXISTS idx_events_client ON system_events(client_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON system_events(created_at);
EOSQL

echo "Shared database initialized successfully"
