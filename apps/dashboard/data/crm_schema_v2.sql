-- CRM Database Schema for Amajungle Dashboard
-- Updated: 2026-03-13 with VIP, Priority Queue, and Analytics features

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
    
    -- NEW: VIP and Priority fields
    is_vip BOOLEAN DEFAULT 0,
    vip_since DATETIME,
    vip_source TEXT, -- 'calendly', 'manual', 'auto'
    priority_level INTEGER DEFAULT 3, -- 0=VIP/TIER_0, 1=TIER_1, 2=TIER_2, 3=TIER_3
    
    -- NEW: Analytics fields
    is_test BOOLEAN DEFAULT 0,
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
    type TEXT NOT NULL, -- 'email_received', 'email_sent', 'audit_request', 'audit_completed', 'calendly_booking', 'call', 'note', 'status_change', 'followup_sent'
    source TEXT NOT NULL, -- 'echo', 'river', 'calendly', 'manual', 'piper'
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

-- NEW: Followup tracking table
CREATE TABLE IF NOT EXISTS followup_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    audit_sent_at DATETIME,
    followup_scheduled_for DATETIME,
    followup_sent_at DATETIME,
    followup_sent BOOLEAN DEFAULT 0,
    calendly_booked BOOLEAN DEFAULT 0,
    calendly_booked_at DATETIME,
    metadata TEXT, -- JSON for audit score, store URL, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- NEW: Analytics events table for test vs real tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- 'audit_request', 'email_received', 'calendly_booking', 'followup_sent'
    contact_id INTEGER,
    email TEXT,
    is_test BOOLEAN DEFAULT 0,
    metadata TEXT, -- JSON for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_is_vip ON contacts(is_vip);
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority_level);
CREATE INDEX IF NOT EXISTS idx_contacts_is_test ON contacts(is_test);

CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_followup_contact ON followup_tracking(contact_id);
CREATE INDEX IF NOT EXISTS idx_followup_scheduled ON followup_tracking(followup_scheduled_for);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_is_test ON analytics_events(is_test);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

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
    (SELECT subject FROM interactions WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as latest_interaction_subject,
    -- NEW: Followup status
    f.followup_sent as has_followup_sent,
    f.calendly_booked as has_calendly_booked,
    f.followup_scheduled_for as followup_due_date
FROM contacts c
LEFT JOIN interactions i ON c.id = i.contact_id
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN followup_tracking f ON c.id = f.contact_id
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

-- NEW: View: VIP Clients
CREATE VIEW IF NOT EXISTS vip_clients AS
SELECT 
    c.*,
    COUNT(DISTINCT i.id) as interaction_count,
    MAX(i.created_at) as last_interaction
FROM contacts c
LEFT JOIN interactions i ON c.id = i.contact_id
WHERE c.is_vip = 1
GROUP BY c.id
ORDER BY c.vip_since DESC;

-- NEW: View: Test vs Real Analytics
CREATE VIEW IF NOT EXISTS test_real_analytics AS
SELECT 
    DATE(created_at) as date,
    SUM(CASE WHEN is_test = 0 THEN 1 ELSE 0 END) as real_count,
    SUM(CASE WHEN is_test = 1 THEN 1 ELSE 0 END) as test_count,
    COUNT(*) as total_count
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- NEW: View: Pending Followups
CREATE VIEW IF NOT EXISTS pending_followups AS
SELECT 
    c.id as contact_id,
    c.name,
    c.email,
    c.is_vip,
    f.audit_sent_at,
    f.followup_scheduled_for,
    json_extract(f.metadata, '$.audit_score') as audit_score,
    json_extract(f.metadata, '$.store_url') as store_url,
    CASE 
        WHEN f.followup_scheduled_for < datetime('now') THEN 'overdue'
        WHEN date(f.followup_scheduled_for) = date('now') THEN 'due_today'
        ELSE 'scheduled'
    END as status
FROM contacts c
JOIN followup_tracking f ON c.id = f.contact_id
WHERE f.followup_sent = 0 
  AND f.calendly_booked = 0
ORDER BY f.followup_scheduled_for ASC;

-- NEW: View: Dashboard Stats Summary
CREATE VIEW IF NOT EXISTS dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM contacts WHERE is_test = 0) as total_real_contacts,
    (SELECT COUNT(*) FROM contacts WHERE is_test = 1) as total_test_contacts,
    (SELECT COUNT(*) FROM contacts WHERE is_vip = 1 AND is_test = 0) as total_vip_real,
    (SELECT COUNT(*) FROM contacts WHERE is_vip = 1 AND is_test = 1) as total_vip_test,
    (SELECT COUNT(*) FROM followup_tracking WHERE followup_sent = 1) as total_followups_sent,
    (SELECT COUNT(*) FROM followup_tracking WHERE followup_sent = 0 AND calendly_booked = 0 AND followup_scheduled_for < datetime('now')) as overdue_followups,
    (SELECT COUNT(*) FROM followup_tracking WHERE calendly_booked = 1) as total_calendly_bookings,
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'audit_request' AND is_test = 0 AND created_at >= date('now', '-7 days')) as audits_real_7d,
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'audit_request' AND is_test = 1 AND created_at >= date('now', '-7 days')) as audits_test_7d;
