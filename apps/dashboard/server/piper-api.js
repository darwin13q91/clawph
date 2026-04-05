/**
 * Piper Email Manager API Module
 * Exposes email campaign metrics, lead pipeline, and CRM data for dashboards
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Paths
const PIPER_DATA_DIR = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'piper', 'data');
const CRM_DB_PATH = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'workspace', 'apps', 'dashboard', 'data', 'crm.db');

/**
 * Get all sent email records from Piper's data directory
 */
function getSentEmails() {
  const sentDir = path.join(PIPER_DATA_DIR, 'sent');
  const emails = [];
  
  try {
    if (!fs.existsSync(sentDir)) {
      return emails;
    }
    
    const files = fs.readdirSync(sentDir).filter(f => f.endsWith('_sent.json'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(sentDir, file), 'utf8');
        const data = JSON.parse(content);
        emails.push({
          id: file.replace('_sent.json', ''),
          ...data,
          file: file
        });
      } catch (e) {
        console.warn(`Failed to parse ${file}:`, e.message);
      }
    }
  } catch (e) {
    console.warn('Error reading sent emails:', e.message);
  }
  
  return emails.sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
}

/**
 * Get email campaign metrics
 */
function getEmailCampaignMetrics() {
  const emails = getSentEmails();
  const today = new Date().toISOString().split('T')[0];
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const todayEmails = emails.filter(e => e.sent_at && e.sent_at.startsWith(today));
  const last7DaysEmails = emails.filter(e => e.sent_at && e.sent_at >= last7Days);
  const last30DaysEmails = emails.filter(e => e.sent_at && e.sent_at >= last30Days);
  
  // Calculate score distribution
  const scoreDistribution = {
    '0-30': 0,   // Poor
    '31-50': 0,  // Fair
    '51-70': 0,  // Good
    '71-85': 0,  // Very Good
    '86-100': 0  // Excellent
  };
  
  emails.forEach(e => {
    const score = e.score || 0;
    if (score <= 30) scoreDistribution['0-30']++;
    else if (score <= 50) scoreDistribution['31-50']++;
    else if (score <= 70) scoreDistribution['51-70']++;
    else if (score <= 85) scoreDistribution['71-85']++;
    else scoreDistribution['86-100']++;
  });
  
  return {
    total_sent: emails.length,
    sent_today: todayEmails.length,
    sent_last_7_days: last7DaysEmails.length,
    sent_last_30_days: last30DaysEmails.length,
    score_distribution: scoreDistribution,
    average_score: emails.length > 0 
      ? Math.round(emails.reduce((sum, e) => sum + (e.score || 0), 0) / emails.length * 10) / 10 
      : 0,
    recent_emails: emails.slice(0, 10).map(e => ({
      id: e.id,
      client_name: e.client_name,
      client_email: e.client_email,
      score: e.score,
      sent_at: e.sent_at,
      store_url: e.store_url ? new URL(e.store_url).hostname : null
    }))
  };
}

/**
 * Get lead pipeline data from CRM
 */
async function getLeadPipeline() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CRM_DB_PATH)) {
      resolve({
        stages: [],
        status_counts: [],
        total_contacts: 0,
        pipeline_value: 0,
        won_value: 0,
        recent_conversions: [],
        lead_scores: [
          { category: 'VIP', count: 0 },
          { category: 'Hot', count: 0 },
          { category: 'Warm', count: 0 },
          { category: 'Cold', count: 0 }
        ]
      });
      return;
    }
    
    const db = new sqlite3.Database(CRM_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check schema version by querying PRAGMA
      db.all("PRAGMA table_info(contacts)", [], (err, columns) => {
        if (err) {
          console.warn('Failed to get schema info:', err.message);
        }
        
        const hasIsTest = columns?.some(c => c.name === 'is_test');
        const hasPriorityLevel = columns?.some(c => c.name === 'priority_level');
        
        // Build queries based on schema version
        const isTestFilter = hasIsTest ? 'WHERE is_test = 0' : '';
        const prioritySelect = hasPriorityLevel 
          ? `CASE 
              WHEN priority_level = 0 THEN 'VIP'
              WHEN priority_level = 1 THEN 'Hot'
              WHEN priority_level = 2 THEN 'Warm'
              ELSE 'Cold'
            END`
          : `CASE 
              WHEN status = 'customer' THEN 'VIP'
              WHEN status = 'qualified' THEN 'Hot'
              WHEN status = 'lead' THEN 'Warm'
              ELSE 'Cold'
            END`;
        
        const queries = {
          byStatus: `SELECT status, COUNT(*) as count FROM contacts ${isTestFilter} GROUP BY status`,
          byStage: `SELECT stage, COUNT(*) as count, SUM(value) as total_value FROM deals GROUP BY stage`,
          pipelineValue: `SELECT SUM(value) as total FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')`,
          wonValue: `SELECT SUM(value) as total FROM deals WHERE stage = 'closed_won'`,
          totalContacts: `SELECT COUNT(*) as count FROM contacts ${isTestFilter}`,
          recentConversions: `
            SELECT c.id, c.name, c.email, c.company, c.status, c.source, 
                   MAX(i.created_at) as converted_at, d.value as deal_value
            FROM contacts c
            JOIN interactions i ON c.id = i.contact_id
            LEFT JOIN deals d ON c.id = d.contact_id
            WHERE c.status IN ('customer', 'qualified', 'closed_won') 
              ${hasIsTest ? 'AND c.is_test = 0' : ''}
              AND i.type IN ('calendly_booking', 'status_change', 'email_sent', 'deal_created')
            GROUP BY c.id
            ORDER BY i.created_at DESC
            LIMIT 10
          `,
          leadScores: `
            SELECT 
              ${prioritySelect} as category,
              COUNT(*) as count
            FROM contacts
            ${isTestFilter}
            GROUP BY ${hasPriorityLevel ? 'priority_level' : 'status'}
            ORDER BY count DESC
          `
        };
        
        const results = {};
        let pending = Object.keys(queries).length;
        
        for (const [key, sql] of Object.entries(queries)) {
          db.all(sql, [], (err, rows) => {
            if (err) {
              console.warn(`Query ${key} failed:`, err.message);
              results[key] = [];
            } else {
              results[key] = rows;
            }
            pending--;
            if (pending === 0) {
              db.close();
              
              // Normalize lead scores to always have all categories
              const rawScores = results.leadScores || [];
              const scoreMap = {
                'VIP': 0, 'Hot': 0, 'Warm': 0, 'Cold': 0
              };
              rawScores.forEach(s => {
                if (s.category && scoreMap.hasOwnProperty(s.category)) {
                  scoreMap[s.category] = s.count;
                }
              });
              const normalizedScores = Object.entries(scoreMap).map(([category, count]) => ({
                category, count
              }));
              
              resolve({
                stages: results.byStage || [],
                status_counts: results.byStatus || [],
                pipeline_value: results.pipelineValue?.[0]?.total || 0,
                won_value: results.wonValue?.[0]?.total || 0,
                total_contacts: results.totalContacts?.[0]?.count || 0,
                recent_conversions: results.recentConversions || [],
                lead_scores: normalizedScores
              });
            }
          });
        }
      });
    });
  });
}

/**
 * Get active email campaigns (sequences in progress)
 */
function getActiveCampaigns() {
  const followupsDir = path.join(PIPER_DATA_DIR, 'followups');
  const campaigns = [];
  
  try {
    if (fs.existsSync(followupsDir)) {
      const files = fs.readdirSync(followupsDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(followupsDir, file), 'utf8');
          const data = JSON.parse(content);
          campaigns.push({
            id: file.replace('.json', ''),
            ...data
          });
        } catch (e) {
          // Skip invalid files
        }
      }
    }
  } catch (e) {
    console.warn('Error reading followups:', e.message);
  }
  
  return {
    active_campaigns: campaigns.length,
    campaigns: campaigns.slice(0, 10)
  };
}

/**
 * Get revenue metrics
 */
async function getRevenueMetrics() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CRM_DB_PATH)) {
      resolve({
        total_won: 0,
        total_deals_won: 0,
        pipeline_value: 0,
        avg_deal_size: 0,
        conversion_rate: 0,
        recent_wins: []
      });
      return;
    }
    
    const db = new sqlite3.Database(CRM_DB_PATH, sqlite3.OPEN_READONLY);
    
    // Check schema version first
    db.all("PRAGMA table_info(deals)", [], (err, columns) => {
      const hasActualCloseDate = columns?.some(c => c.name === 'actual_close_date');
      const orderBy = hasActualCloseDate 
        ? 'ORDER BY d.actual_close_date DESC' 
        : 'ORDER BY d.updated_at DESC';
      
      const queries = {
        wonDeals: `SELECT SUM(value) as total, COUNT(*) as count, AVG(value) as avg 
                   FROM deals WHERE stage = 'closed_won'`,
        pipelineDeals: `SELECT SUM(value) as total FROM deals 
                        WHERE stage NOT IN ('closed_won', 'closed_lost')`,
        allDeals: `SELECT stage, COUNT(*) as count FROM deals GROUP BY stage`,
        recentWins: `
          SELECT d.id, d.title, d.value, 
                 ${hasActualCloseDate ? 'd.actual_close_date' : 'd.updated_at as actual_close_date'}, 
                 c.name as contact_name, c.company
          FROM deals d
          JOIN contacts c ON d.contact_id = c.id
          WHERE d.stage = 'closed_won'
          ${orderBy}
          LIMIT 10
        `
      };
      
      const results = {};
      let pending = Object.keys(queries).length;
      
      for (const [key, sql] of Object.entries(queries)) {
        db.all(sql, [], (err, rows) => {
          if (err) {
            console.warn(`Revenue query ${key} failed:`, err.message);
            results[key] = [];
          } else {
            results[key] = rows;
          }
          pending--;
          if (pending === 0) {
            db.close();
            
            const won = results.wonDeals?.[0] || { total: 0, count: 0, avg: 0 };
            const pipeline = results.pipelineDeals?.[0]?.total || 0;
            const allDeals = results.allDeals || [];
            
            const totalDeals = allDeals.reduce((sum, d) => sum + d.count, 0);
            const wonCount = allDeals.find(d => d.stage === 'closed_won')?.count || 0;
            
            resolve({
              total_won: won.total || 0,
              total_deals_won: won.count || 0,
              pipeline_value: pipeline,
              avg_deal_size: Math.round(won.avg || 0),
              conversion_rate: totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0,
              recent_wins: results.recentWins || []
            });
          }
        });
      }
    });
  });
}

/**
 * Get complete dashboard data for Piper
 */
async function getPiperDashboardData() {
  const [campaignMetrics, pipeline, activeCampaigns, revenue] = await Promise.all([
    Promise.resolve(getEmailCampaignMetrics()),
    getLeadPipeline(),
    Promise.resolve(getActiveCampaigns()),
    getRevenueMetrics()
  ]);
  
  return {
    timestamp: new Date().toISOString(),
    email_campaigns: campaignMetrics,
    lead_pipeline: pipeline,
    active_campaigns: activeCampaigns,
    revenue: revenue
  };
}

/**
 * Handle API requests for Piper data
 */
async function handlePiperApiRequest(url, res, req) {
  const pathname = url.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return true;
  }
  
  // Piper Dashboard Data - Main endpoint
  if (pathname === '/api/piper/dashboard') {
    try {
      const data = await getPiperDashboardData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Piper dashboard error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Email Campaign Metrics
  if (pathname === '/api/piper/email-metrics') {
    try {
      const data = getEmailCampaignMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        ...data 
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Lead Pipeline
  if (pathname === '/api/piper/pipeline') {
    try {
      const data = await getLeadPipeline();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        ...data 
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Lead Scores
  if (pathname === '/api/piper/lead-scores') {
    try {
      const pipeline = await getLeadPipeline();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        lead_scores: pipeline.lead_scores,
        total_contacts: pipeline.total_contacts
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Recent Conversions
  if (pathname === '/api/piper/conversions') {
    try {
      const pipeline = await getLeadPipeline();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        recent_conversions: pipeline.recent_conversions
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Revenue Metrics
  if (pathname === '/api/piper/revenue') {
    try {
      const data = await getRevenueMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        ...data 
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Active Campaigns
  if (pathname === '/api/piper/campaigns') {
    try {
      const data = getActiveCampaigns();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        timestamp: new Date().toISOString(),
        ...data 
      }));
      return true;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return true;
    }
  }
  
  // Not a Piper API endpoint
  return false;
}

module.exports = {
  handlePiperApiRequest,
  getPiperDashboardData,
  getEmailCampaignMetrics,
  getLeadPipeline,
  getRevenueMetrics,
  getActiveCampaigns,
  getSentEmails
};
