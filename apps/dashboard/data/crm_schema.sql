-- CRM Database Schema for Amajungle Dashboard
-- Created: 2026-03-12

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Contacts table: Store client information
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company TEXT,
    phone TEXT,
    source TEXT DEFAULT 'manual', -- 'echo_form', 'river_audit', 'calendly', 'manual', 'referral'
    status TEXT DEFAULT 'lead', -- 'lead', 'qualified', 'customer', 'churned', 'cold'
    tags TEXT, -- comma-separated tags
    first_contact_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Interactions table: Track all touchpoints with contacts
CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'email_received', 'email_sent', 'audit_request', 'audit_completed', 'calendly_booking', 'call', 'note', 'status_change'
    source TEXT NOT NULL, -- 'echo', 'river', 'calendly', 'manual'
    source_id TEXT, -- reference to original record (email_id, audit_id, etc.)
    subject TEXT,
    content TEXT,
    metadata TEXT, -- JSON for extra data (email opens, clicks, audit scores, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Deals/Pipeline table: Track sales opportunities
CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    stage TEXT DEFAULT 'new_lead', -- 'new_lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    value REAL DEFAULT 0, -- deal value in USD
    currency TEXT DEFAULT 'USD',
    expected_close_date DATE,
    actual_close_date DATE,
    close_reason TEXT, -- for closed_lost: why we lost
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp 
AFTER UPDATE ON contacts
BEGIN
    UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_deals_timestamp 
AFTER UPDATE ON deals
BEGIN
    UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update last_interaction_date on contacts when interaction is added
CREATE TRIGGER IF NOT EXISTS update_contact_last_interaction
AFTER INSERT ON interactions
BEGIN
    UPDATE contacts SET last_interaction_date = NEW.created_at WHERE id = NEW.contact_id;
END;

-- View: Contact summary with latest interaction
CREATE VIEW IF NOT EXISTS contact_summary AS
SELECT 
    c.*,
    COUNT(DISTINCT i.id) as interaction_count,
    COUNT(DISTINCT d.id) as deal_count,
    SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END) as total_value_won,
    MAX(i.created_at) as latest_interaction_date,
    (SELECT subject FROM interactions WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as latest_interaction_subject
FROM contacts c
LEFT JOIN interactions i ON c.id = i.contact_id
LEFT JOIN deals d ON c.id = d.contact_id
GROUP BY c.id;

-- View: Pipeline summary
CREATE VIEW IF NOT EXISTS pipeline_summary AS
SELECT 
    stage,
    COUNT(*) as deal_count,
    SUM(value) as total_value,
    AVG(value) as avg_value,
    MIN(expected_close_date) as earliest_close,
    MAX(expected_close_date) as latest_close
FROM deals
WHERE stage NOT IN ('closed_won', 'closed_lost')
GROUP BY stage;

-- View: Monthly stats
CREATE VIEW IF NOT EXISTS monthly_stats AS
SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(DISTINCT CASE WHEN source = 'echo_form' THEN id END) as leads_from_echo,
    COUNT(DISTINCT CASE WHEN source = 'river_audit' THEN id END) as leads_from_river,
    COUNT(DISTINCT CASE WHEN source = 'calendly' THEN id END) as leads_from_calendly,
    COUNT(DISTINCT CASE WHEN source = 'manual' THEN id END) as leads_from_manual,
    COUNT(DISTINCT id) as total_new_contacts
FROM contacts
GROUP BY strftime('%Y-%m', created_at);
