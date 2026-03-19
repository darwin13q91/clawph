// Navigation fix - Add this BEFORE </body>
document.addEventListener('DOMContentLoaded', function() {
    
    // Override showSection to scroll to panels
    window.showSection = function(section) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (event && event.target) {
            event.target.closest('.nav-item').classList.add('active');
        }
        
        // Map sections to panel IDs
        const panelMap = {
            'overview': 'statsGrid',
            'polymarket': 'polymarketPanel',
            'trading': 'tradingPanel',
            'models': 'modelsPanel',
            'channels': 'channelsPanel',
            'cron': null, // Not implemented yet
            'logs': 'logsPanel'
        };
        
        const targetId = panelMap[section];
        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight temporarily
                element.style.boxShadow = '0 0 0 3px var(--accent-primary)';
                setTimeout(() => {
                    element.style.boxShadow = '';
                }, 1000);
            }
        }
        
        // Update header title
        const titles = {
            'overview': 'Dashboard',
            'polymarket': 'Polymarket Scanner',
            'trading': 'Paper Trading',
            'models': 'AI Models',
            'channels': 'Channels',
            'cron': 'Cron Jobs',
            'logs': 'System Logs'
        };
        const titleEl = document.querySelector('.header-title');
        if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';
    };
    
    console.log('✅ Navigation fixed - clicking sidebar scrolls to section');
});
