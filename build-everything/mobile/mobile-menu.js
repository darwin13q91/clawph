// Mobile Menu Toggle
// Add this to dashboard JS

document.addEventListener('DOMContentLoaded', function() {
    // Create mobile menu button
    const menuToggle = document.createElement('button');
    menuToggle.className = 'mobile-menu-toggle';
    menuToggle.innerHTML = '☰';
    menuToggle.setAttribute('aria-label', 'Toggle menu');
    document.body.appendChild(menuToggle);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Toggle menu
    menuToggle.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    // Close on overlay click
    overlay.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Close menu when clicking nav items (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
    
    // Handle resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            document.querySelector('.sidebar').classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});
