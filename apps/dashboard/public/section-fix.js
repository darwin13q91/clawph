// Quick fix - wrap content sections properly
// Run this in browser console or add to HTML

// Add section wrappers after page loads
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    // Create overview section
    const overviewSection = document.createElement('div');
    overviewSection.id = 'overviewSection';
    overviewSection.className = 'section-content';
    overviewSection.style.display = 'block';
    
    // Move existing content into overview
    while (mainContent.firstChild) {
        overviewSection.appendChild(mainContent.firstChild);
    }
    mainContent.appendChild(overviewSection);
    
    // Create system section (models, channels, logs)
    const systemSection = document.createElement('div');
    systemSection.id = 'systemSection';
    systemSection.className = 'section-content';
    systemSection.style.display = 'none';
    systemSection.innerHTML = '<div class="loading-container"><div class="spinner"></div><div>Loading System...</div></div>';
    mainContent.appendChild(systemSection);
    
    console.log('✅ Sections created');
});

// Override showSection to work with the new structure
window.showSection = function(section) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // Hide all
    document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
    
    // Show selected
    const sectionMap = {
        'overview': 'overviewSection',
        'polymarket': 'overviewSection',
        'trading': 'overviewSection',
        'models': 'overviewSection',  // For now, show in overview
        'channels': 'overviewSection',
        'cron': 'overviewSection',
        'logs': 'overviewSection'
    };
    
    const targetId = sectionMap[section] || 'overviewSection';
    const target = document.getElementById(targetId);
    if (target) target.style.display = 'block';
    
    // Update title
    const titles = {
        'overview': 'Dashboard',
        'polymarket': 'Polymarket',
        'trading': 'Paper Trading',
        'models': 'AI Models',
        'channels': 'Channels',
        'cron': 'Cron Jobs',
        'logs': 'System Logs'
    };
    const titleEl = document.querySelector('.header-title');
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';
};
