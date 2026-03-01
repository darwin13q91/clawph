#!/bin/bash
# Database initialization template for new clients

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
    -- Inventory tracking
    CREATE SCHEMA IF NOT EXISTS inventory;
    
    CREATE TABLE IF NOT EXISTS inventory.products (
        id SERIAL PRIMARY KEY,
        asin VARCHAR(20) UNIQUE NOT NULL,
        seller_sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(500),
        current_stock INT DEFAULT 0,
        inbound_stock INT DEFAULT 0,
        reserved_stock INT DEFAULT 0,
        reorder_point INT DEFAULT 10,
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Pricing data
    CREATE SCHEMA IF NOT EXISTS pricing;
    
    CREATE TABLE IF NOT EXISTS pricing.products (
        id SERIAL PRIMARY KEY,
        asin VARCHAR(20) UNIQUE NOT NULL,
        seller_sku VARCHAR(100) NOT NULL,
        our_price DECIMAL(10,2),
        min_price DECIMAL(10,2),
        max_price DECIMAL(10,2),
        buy_box_price DECIMAL(10,2),
        lowest_competitor_price DECIMAL(10,2),
        repricing_enabled BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Competitor tracking
    CREATE SCHEMA IF NOT EXISTS competitors;
    
    CREATE TABLE IF NOT EXISTS competitors.tracked_products (
        id SERIAL PRIMARY KEY,
        asin VARCHAR(20) NOT NULL,
        tracked_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS competitors.price_history (
        id SERIAL PRIMARY KEY,
        asin VARCHAR(20) NOT NULL,
        seller_id VARCHAR(50),
        price DECIMAL(10,2),
        is_buy_box_winner BOOLEAN DEFAULT FALSE,
        recorded_at TIMESTAMP DEFAULT NOW()
    );

    -- Analytics
    CREATE SCHEMA IF NOT EXISTS analytics;
    
    CREATE TABLE IF NOT EXISTS analytics.daily_sales (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        orders_count INT DEFAULT 0,
        units_sold INT DEFAULT 0,
        revenue DECIMAL(12,2) DEFAULT 0,
        fees DECIMAL(12,2) DEFAULT 0,
        UNIQUE(date)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_inventory_asin ON inventory.products(asin);
    CREATE INDEX IF NOT EXISTS idx_pricing_asin ON pricing.products(asin);
    CREATE INDEX IF NOT EXISTS idx_competitor_history ON competitors.price_history(asin, recorded_at);
EOSQL
