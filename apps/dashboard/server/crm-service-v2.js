const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'crm.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

class CRMService {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening CRM database:', err);
            } else {
                console.log('CRM database connected');
                this.initializeSchema();
            }
        });
    }

    initializeSchema() {
        const schemaPath = path.join(__dirname, '..', 'data', 'crm_schema_v2.sql');
        const fallbackSchemaPath = path.join(__dirname, '..', 'data', 'crm_schema.sql');
        
        const schemaToUse = fs.existsSync(schemaPath) ? schemaPath : fallbackSchemaPath;
        
        if (fs.existsSync(schemaToUse)) {
            const schema = fs.readFileSync(schemaToUse, 'utf8');
            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('Error initializing CRM schema:', err);
                } else {
                    console.log('CRM schema initialized');
                }
            });
        }
    }

    // ============ CONTACTS ============
    
    getContacts(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM contact_summary WHERE 1=1';
            const params = [];

            if (filters.status) {
                sql += ' AND status = ?';
                params.push(filters.status);
            }
            if (filters.source) {
                sql += ' AND source = ?';
                params.push(filters.source);
            }
            if (filters.search) {
                sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
                const search = `%${filters.search}%`;
                params.push(search, search, search);
            }
            if (filters.tag) {
                sql += ' AND tags LIKE ?';
                params.push(`%${filters.tag}%`);
            }
            if (filters.isVip !== undefined) {
                sql += ' AND is_vip = ?';
                params.push(filters.isVip ? 1 : 0);
            }
            if (filters.isTest !== undefined) {
                sql += ' AND is_test = ?';
                params.push(filters.isTest ? 1 : 0);
            }
            if (filters.priorityLevel !== undefined) {
                sql += ' AND priority_level = ?';
                params.push(filters.priorityLevel);
            }

            sql += ' ORDER BY last_interaction_date DESC';

            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }
            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(filters.offset);
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getContactById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getContactByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM contacts WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createContact(contact) {
        return new Promise((resolve, reject) => {
            const { 
                name, email, company, phone, source, status, tags, notes,
                isVip, vipSince, vipSource, priorityLevel, isTest 
            } = contact;
            
            const sql = `
                INSERT INTO contacts (
                    name, email, company, phone, source, status, tags, notes,
                    is_vip, vip_since, vip_source, priority_level, is_test
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(sql, [
                name, email, company, phone, source || 'manual', status || 'lead', tags, notes,
                isVip ? 1 : 0, vipSince || null, vipSource || null, 
                priorityLevel || 3, isTest ? 1 : 0
            ], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Contact with this email already exists'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve({ id: this.lastID, ...contact });
                }
            });
        });
    }

    updateContact(id, updates) {
        return new Promise((resolve, reject) => {
            const fieldMapping = {
                'name': 'name', 'email': 'email', 'company': 'company', 
                'phone': 'phone', 'status': 'status', 'tags': 'tags', 'notes': 'notes',
                'isVip': 'is_vip', 'vipSince': 'vip_since', 'vipSource': 'vip_source',
                'priorityLevel': 'priority_level', 'isTest': 'is_test'
            };
            
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updates)) {
                const dbField = fieldMapping[key];
                if (dbField) {
                    fields.push(`${dbField} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                reject(new Error('No valid fields to update'));
                return;
            }

            values.push(id);
            const sql = `UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    deleteContact(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    // ============ VIP MANAGEMENT ============
    
    setVIPStatus(email, isVip = true, source = 'manual', metadata = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                let contact = await this.getContactByEmail(email);
                
                if (!contact) {
                    // Create new contact with VIP status
                    contact = await this.createContact({
                        name: metadata.name || email.split('@')[0],
                        email: email,
                        company: metadata.company || '',
                        source: source,
                        status: 'qualified',
                        isVip: true,
                        vipSince: new Date().toISOString(),
                        vipSource: source,
                        priorityLevel: 0,
                        isTest: metadata.isTest || false,
                        tags: 'vip'
                    });
                } else {
                    // Update existing contact
                    await this.updateContact(contact.id, {
                        isVip: isVip,
                        vipSince: isVip ? new Date().toISOString() : null,
                        vipSource: isVip ? source : null,
                        priorityLevel: isVip ? 0 : 3,
                        status: isVip ? 'qualified' : contact.status,
                        tags: isVip ? (contact.tags ? contact.tags + ',vip' : 'vip') : (contact.tags || '').replace(/,vip|vip,|vip/g, '')
                    });
                }
                
                // Add interaction
                await this.createInteraction({
                    contact_id: contact.id || contact.ID,
                    type: isVip ? 'status_change' : 'note',
                    source: source,
                    subject: isVip ? 'VIP Status Added' : 'VIP Status Removed',
                    content: isVip ? 'Client marked as VIP' : 'VIP status removed',
                    metadata: JSON.stringify(metadata)
                });
                
                resolve(contact);
            } catch (err) {
                reject(err);
            }
        });
    }

    getVIPClients() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM vip_clients', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ============ INTERACTIONS ============

    getInteractions(contactId, options = {}) {
        return new Promise((resolve, reject) => {
            let sql = 'SELECT * FROM interactions WHERE contact_id = ?';
            const params = [contactId];

            if (options.type) {
                sql += ' AND type = ?';
                params.push(options.type);
            }

            sql += ' ORDER BY created_at DESC';

            if (options.limit) {
                sql += ' LIMIT ?';
                params.push(options.limit);
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    createInteraction(interaction) {
        return new Promise((resolve, reject) => {
            const { contact_id, type, source, source_id, subject, content, metadata } = interaction;
            const sql = `
                INSERT INTO interactions (contact_id, type, source, source_id, subject, content, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [
                contact_id, type, source, source_id, subject, content, 
                metadata ? JSON.stringify(metadata) : null
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...interaction });
            });
        });
    }

    getRecentInteractions(limit = 20) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT i.*, c.name as contact_name, c.email as contact_email, c.company, c.is_vip
                FROM interactions i
                JOIN contacts c ON i.contact_id = c.id
                ORDER BY i.created_at DESC
                LIMIT ?
            `;
            this.db.all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ============ FOLLOWUP TRACKING ============
    
    trackAuditForFollowup(contactId, auditData) {
        return new Promise((resolve, reject) => {
            const { auditScore, storeUrl, scheduledFor } = auditData;
            const metadata = JSON.stringify({
                audit_score: auditScore,
                store_url: storeUrl
            });
            
            const sql = `
                INSERT INTO followup_tracking (
                    contact_id, audit_sent_at, followup_scheduled_for, 
                    followup_sent, calendly_booked, metadata
                ) VALUES (?, datetime('now'), ?, 0, 0, ?)
            `;
            
            this.db.run(sql, [contactId, scheduledFor, metadata], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }
    
    markFollowupSent(contactId) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE followup_tracking 
                SET followup_sent = 1, followup_sent_at = datetime('now')
                WHERE contact_id = ? AND followup_sent = 0
            `;
            this.db.run(sql, [contactId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }
    
    markCalendlyBooked(email, bookingData = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const contact = await this.getContactByEmail(email);
                if (!contact) {
                    reject(new Error('Contact not found'));
                    return;
                }
                
                // Update followup tracking
                const sql = `
                    UPDATE followup_tracking 
                    SET calendly_booked = 1, calendly_booked_at = datetime('now')
                    WHERE contact_id = ?
                `;
                this.db.run(sql, [contact.id], async function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Also set VIP status
                    try {
                        await this.setVIPStatus(email, true, 'calendly', bookingData);
                        resolve({ changes: this.changes });
                    } catch (vipErr) {
                        reject(vipErr);
                    }
                }.bind(this));
            } catch (err) {
                reject(err);
            }
        }.bind(this));
    }
    
    getPendingFollowups() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM pending_followups', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ============ DEALS ============

    getDeals(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT d.*, c.name as contact_name, c.email as contact_email, c.company, c.is_vip
                FROM deals d
                JOIN contacts c ON d.contact_id = c.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.stage) {
                sql += ' AND d.stage = ?';
                params.push(filters.stage);
            }
            if (filters.contact_id) {
                sql += ' AND d.contact_id = ?';
                params.push(filters.contact_id);
            }
            if (filters.min_value) {
                sql += ' AND d.value >= ?';
                params.push(filters.min_value);
            }

            sql += ' ORDER BY d.updated_at DESC';

            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getDealById(id) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT d.*, c.name as contact_name, c.email as contact_email, c.company
                FROM deals d
                JOIN contacts c ON d.contact_id = c.id
                WHERE d.id = ?
            `;
            this.db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    createDeal(deal) {
        return new Promise((resolve, reject) => {
            const { contact_id, title, stage, value, currency, expected_close_date, notes } = deal;
            const sql = `
                INSERT INTO deals (contact_id, title, stage, value, currency, expected_close_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [contact_id, title, stage || 'new_lead', value || 0, currency || 'USD', expected_close_date, notes], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...deal });
            });
        });
    }

    updateDeal(id, updates) {
        return new Promise((resolve, reject) => {
            const allowedFields = ['title', 'stage', 'value', 'currency', 'expected_close_date', 'actual_close_date', 'close_reason', 'notes'];
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                reject(new Error('No valid fields to update'));
                return;
            }

            values.push(id);
            const sql = `UPDATE deals SET ${fields.join(', ')} WHERE id = ?`;

            this.db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    moveDealStage(id, newStage, options = {}) {
        return new Promise((resolve, reject) => {
            const updates = { stage: newStage };
            if (newStage === 'closed_won' || newStage === 'closed_lost') {
                updates.actual_close_date = new Date().toISOString().split('T')[0];
                if (options.close_reason) {
                    updates.close_reason = options.close_reason;
                }
            }
            this.updateDeal(id, updates).then(resolve).catch(reject);
        });
    }

    deleteDeal(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM deals WHERE id = ?', [id], function(err) {
                if (err) reject(err);
                else resolve({ id, changes: this.changes });
            });
        });
    }

    // ============ ANALYTICS ============
    
    logAnalyticsEvent(eventType, email, isTest = false, metadata = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get contact ID if exists
                const contact = await this.getContactByEmail(email);
                const contactId = contact ? contact.id : null;
                
                const sql = `
                    INSERT INTO analytics_events (event_type, contact_id, email, is_test, metadata)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                this.db.run(sql, [
                    eventType, contactId, email, isTest ? 1 : 0, 
                    JSON.stringify(metadata)
                ], function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                });
            } catch (err) {
                reject(err);
            }
        });
    }
    
    getAnalyticsStats(days = 7) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    event_type,
                    SUM(CASE WHEN is_test = 0 THEN 1 ELSE 0 END) as real_count,
                    SUM(CASE WHEN is_test = 1 THEN 1 ELSE 0 END) as test_count,
                    COUNT(*) as total_count
                FROM analytics_events
                WHERE created_at >= date('now', '-${days} days')
                GROUP BY event_type
            `;
            
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    getDashboardStats() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM dashboard_stats', [], (err, row) => {
                if (err) reject(err);
                else resolve(row || {});
            });
        });
    }

    // ============ STATS & ANALYTICS ============

    getStats() {
        return new Promise((resolve, reject) => {
            const singleQueries = {
                totalContacts: 'SELECT COUNT(*) as count FROM contacts',
                totalRealContacts: 'SELECT COUNT(*) as count FROM contacts WHERE is_test = 0',
                totalTestContacts: 'SELECT COUNT(*) as count FROM contacts WHERE is_test = 1',
                totalVIPs: 'SELECT COUNT(*) as count FROM contacts WHERE is_vip = 1',
                totalDeals: 'SELECT COUNT(*) as count FROM deals',
                pipelineValue: `SELECT SUM(value) as total FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')`,
                wonValue: `SELECT SUM(value) as total FROM deals WHERE stage = 'closed_won'`,
                recentContacts: 'SELECT COUNT(*) as count FROM contacts WHERE created_at >= date("now", "-30 days")',
                recentInteractions: 'SELECT COUNT(*) as count FROM interactions WHERE created_at >= date("now", "-30 days")'
            };

            const arrayQueries = {
                byStatus: 'SELECT status, COUNT(*) as count FROM contacts GROUP BY status',
                bySource: 'SELECT source, COUNT(*) as count FROM contacts GROUP BY source',
                byStage: 'SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM deals GROUP BY stage',
                byPriority: 'SELECT priority_level, COUNT(*) as count FROM contacts GROUP BY priority_level'
            };

            const results = {};
            let pending = Object.keys(singleQueries).length + Object.keys(arrayQueries).length;

            // Handle single row queries
            for (const [key, sql] of Object.entries(singleQueries)) {
                this.db.get(sql, [], (err, row) => {
                    if (err) {
                        results[key] = null;
                    } else {
                        results[key] = row;
                    }
                    pending--;
                    if (pending === 0) finish();
                });
            }

            // Handle array queries (GROUP BY)
            for (const [key, sql] of Object.entries(arrayQueries)) {
                this.db.all(sql, [], (err, rows) => {
                    if (err) {
                        results[key] = [];
                    } else {
                        results[key] = rows || [];
                    }
                    pending--;
                    if (pending === 0) finish();
                });
            }

            const finish = () => {
                // Calculate conversion rate
                const total = results.totalContacts?.count || 0;
                const customers = Array.isArray(results.byStatus) ? 
                    (results.byStatus.find(s => s.status === 'customer')?.count || 0) : 0;
                const conversionRate = total > 0 ? ((customers / total) * 100).toFixed(1) : 0;

                resolve({
                    ...results,
                    conversionRate
                });
            };
        });
    }

    getPipelineSummary() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM pipeline_summary', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ============ IMPORT HELPERS ============

    async findOrCreateContactByEmail(email, defaults = {}) {
        let contact = await this.getContactByEmail(email);
        if (!contact) {
            contact = await this.createContact({
                email,
                name: defaults.name || email.split('@')[0],
                company: defaults.company || '',
                source: defaults.source || 'manual',
                status: defaults.status || 'lead',
                isVip: defaults.isVip || false,
                isTest: defaults.isTest || false,
                priorityLevel: defaults.priorityLevel || 3,
                ...defaults
            });
        }
        return contact;
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = CRMService;
