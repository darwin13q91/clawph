/**
 * Scout Helper Module
 * Handles spawning Scout agent for Amazon product audits
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const SCOUT_CONFIG = {
  SCRIPT_PATH: '/home/darwin/.openclaw/agents/scout/scripts/deep-audit.sh',
  REPORTS_DIR: '/home/darwin/.openclaw/agents/scout/reports',
  TIMEOUT_MS: 120000, // 2 minutes
  ENABLED: process.env.SCOUT_FALLBACK_ENABLED !== 'false'
};

/**
 * Spawn Scout agent to perform deep audit for an ASIN
 * @param {string} asin - Amazon ASIN to analyze
 * @returns {Promise<Object>} Scout analysis results in RapidAPI-compatible format
 */
async function spawnScoutForASIN(asin) {
  if (!SCOUT_CONFIG.ENABLED) {
    throw new Error('Scout fallback is disabled');
  }

  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) {
    throw new Error(`Invalid ASIN format: ${asin}`);
  }

  console.log(`[SCOUT] Spawning for ASIN: ${asin}`);

  try {
    const { stdout, stderr } = await execAsync(
      `bash "${SCOUT_CONFIG.SCRIPT_PATH}" ${asin}`,
      {
        timeout: SCOUT_CONFIG.TIMEOUT_MS,
        cwd: '/home/darwin/.openclaw/agents/scout'
      }
    );

    if (stderr) {
      console.warn('[SCOUT] stderr:', stderr);
    }

    // Parse the report file path from output
    const reportMatch = stdout.match(/Report:\s*(\S+)/);
    const reportFile = reportMatch ? reportMatch[1] : null;

    // Parse the compact JSON output at the end
    const lines = stdout.trim().split('\n');
    const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"asin"'));

    let scoutData;
    if (jsonLine) {
      try {
        scoutData = JSON.parse(jsonLine);
      } catch (e) {
        console.warn('[SCOUT] Failed to parse JSON output, reading from file');
      }
    }

    // If JSON parsing failed, read from report file
    if (!scoutData && reportFile) {
      scoutData = readScoutReport(reportFile);
    }

    if (!scoutData) {
      throw new Error('Failed to extract Scout data from output or file');
    }

    return transformScoutToRapidApiFormat(scoutData, asin);

  } catch (error) {
    console.error('[SCOUT] Execution failed:', error.message);
    throw error;
  }
}

/**
 * Read and parse a Scout report file
 * @param {string} reportPath - Path to Scout report JSON
 * @returns {Object} Parsed report data
 */
function readScoutReport(reportPath) {
  try {
    // If file doesn't exist, try to find most recent report for this ASIN
    if (!fs.existsSync(reportPath)) {
      const asin = path.basename(reportPath).split('_')[0];
      const reportsDir = SCOUT_CONFIG.REPORTS_DIR;

      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir)
          .filter(f => f.startsWith(asin) && f.endsWith('.json'))
          .sort()
          .reverse();

        if (files.length > 0) {
          reportPath = path.join(reportsDir, files[0]);
        }
      }
    }

    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report file not found: ${reportPath}`);
    }

    const content = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(content);

  } catch (error) {
    console.error('[SCOUT] Failed to read report:', error.message);
    throw error;
  }
}

/**
 * Transform Scout report format to RapidAPI-compatible format
 * This ensures the rest of the system can consume Scout data the same way
 */
function transformScoutToRapidApiFormat(scoutData, asin) {
  // Handle both compact output format and full report format
  const extraction = scoutData.rawExtraction || scoutData;

  return {
    source: 'scout',
    asin: asin,
    timestamp: scoutData.auditMetadata?.timestamp || new Date().toISOString(),
    product: {
      asin: asin,
      title: extraction.title || 'Unknown Product',
      price: extraction.price || null,
      rating: extraction.rating || null,
      reviews_count: extraction.reviewCount || extraction.reviews || 0,
      bestsellers_rank: extraction.bsr || null,
      brand: extraction.brand || null,
      availability: extraction.availability || null,
      images: extraction.images || [],
      features: extraction.features || [],
      has_a_plus_content: extraction.hasAPlus || false,
      a_plus_content: extraction.aPlusContent || [],
      description: extraction.description || null
    },
    scout: {
      screenshotFile: scoutData.auditMetadata?.screenshotFile || null,
      reportFile: scoutData.auditMetadata?.reportFile || null,
      extractionMethod: 'browser_agent',
      extractionTimestamp: scoutData.auditMetadata?.timestamp
    },
    analysis: {
      listing_quality_score: null,
      optimization_opportunities: [],
      competitive_position: null
    }
  };
}

module.exports = {
  spawnScoutForASIN,
  readScoutReport,
  transformScoutToRapidApiFormat,
  SCOUT_CONFIG
};
