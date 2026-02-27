const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const PORT = 8888;
const HOST = '127.0.0.1';

// Serve static files
function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Run Python aggregator
async function getAggregatedData() {
    try {
        const { stdout } = await execPromise('python3 server/aggregator.py --json', {
            cwd: '/home/darwin/.openclaw/workspace/apps/command-center',
            timeout: 15000
        });
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Aggregator error:', error);
        return { error: 'Failed to aggregate data', timestamp: new Date().toISOString() };
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API endpoint
    if (pathname === '/api/status') {
        const data = await getAggregatedData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }
    
    // Serve index.html
    if (pathname === '/') {
        serveFile(res, path.join(__dirname, '../public/index.html'), 'text/html');
        return;
    }
    
    // Static files
    if (pathname.startsWith('/')) {
        const ext = path.extname(pathname);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        };
        
        const filePath = path.join(__dirname, '../public', pathname);
        serveFile(res, filePath, contentTypes[ext] || 'application/octet-stream');
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, HOST, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        UNIFIED COMMAND CENTER                            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Dashboard: http://${HOST}:${PORT}                      ║`);
    console.log('║  Aggregates all systems into unified view                ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
});
