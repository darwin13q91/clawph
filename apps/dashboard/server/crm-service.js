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
        const schemaPath = path.join(__dirname, '..', 'data', 'crm_schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
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
            const { name, email, company, phone, source, status, tags, notes } = contact;
            const sql = `
                INSERT INTO contacts (name, email, company, phone, source, status, tags, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [name, email, company, phone, source || 'manual', status || 'lead', tags, notes], function(err) {
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
            const allowedFields = ['name', 'email', 'company', 'phone', 'status', 'tags', 'notes'];
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
                SELECT i.*, c.name as contact_name, c.email as contact_email, c.company
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

    // ============ DEALS ============

    getDeals(filters = {}) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT d.*, c.name as contact_name, c.email as contact_email, c.company
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

    // ============ STATS & ANALYTICS ============

    getStats() {
        return new Promise((resolve, reject) => {
            const singleQueries = {
                totalContacts: 'SELECT COUNT(*) as count FROM contacts',
                totalDeals: 'SELECT COUNT(*) as count FROM deals',
                pipelineValue: `SELECT SUM(value) as total FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')`,
                wonValue: `SELECT SUM(value) as total FROM deals WHERE stage = 'closed_won'`,
                recentContacts: 'SELECT COUNT(*) as count FROM contacts WHERE created_at >= date("now", "-30 days")',
                recentInteractions: 'SELECT COUNT(*) as count FROM interactions WHERE created_at >= date("now", "-30 days")'
            };

            const arrayQueries = {
                byStatus: 'SELECT status, COUNT(*) as count FROM contacts GROUP BY status',
                bySource: 'SELECT source, COUNT(*) as count FROM contacts GROUP BY source',
                byStage: 'SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM deals GROUP BY stage'
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