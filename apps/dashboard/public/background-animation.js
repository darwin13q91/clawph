/**
 * Amajungle Dashboard - Interactive Particle Background Animation
 * Subtle, professional connected particles with mouse interaction
 * Respects prefers-reduced-motion for accessibility
 */
(function() {
    'use strict';

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        return; // Don't initialize animation if user prefers reduced motion
    }

    // Configuration
    const CONFIG = {
        particleCount: 45,
        connectionDistance: 120,
        mouseDistance: 180,
        particleSpeed: 0.3,
        particleSize: 2,
        lineWidth: 0.8,
        colors: {
            particle: 'rgba(159, 191, 0, 0.6)',      // Neon green (primary)
            particleAlt: 'rgba(34, 197, 94, 0.4)',   // Jungle green
            line: 'rgba(159, 191, 0, 0.15)',         // Subtle neon lines
            mouse: 'rgba(159, 191, 0, 0.8)'          // Brighter on mouse interaction
        }
    };

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-background';
    
    // Apply styles for background positioning
    Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '0',  // Changed from -1 to 0
        pointerEvents: 'none',
        opacity: '0.7'
    });

    // Insert canvas at the beginning of body
    if (document.body) {
        document.body.insertBefore(canvas, document.body.firstChild);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.insertBefore(canvas, document.body.firstChild);
        });
    }

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null };
    let animationId = null;
    let isVisible = true;
    let lastTime = 0;

    // Resize canvas
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * CONFIG.particleSpeed;
            this.vy = (Math.random() - 0.5) * CONFIG.particleSpeed;
            this.size = Math.random() * CONFIG.particleSize + 1;
            this.opacity = Math.random() * 0.4 + 0.3;
            this.useAltColor = Math.random() > 0.7;
        }

        update() {
            // Mouse interaction - particles gently repel from cursor
            if (mouse.x !== null && mouse.y !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.mouseDistance && distance > 0) {
                    const force = (CONFIG.mouseDistance - distance) / CONFIG.mouseDistance;
                    const angle = Math.atan2(dy, dx);
                    this.vx += Math.cos(angle) * force * 0.02;
                    this.vy += Math.sin(angle) * force * 0.02;
                }
            }

            // Apply velocity
            this.x += this.vx;
            this.y += this.vy;

            // Damping to prevent excessive speed
            this.vx *= 0.99;
            this.vy *= 0.99;

            // Keep minimum movement
            if (Math.abs(this.vx) < 0.05) this.vx += (Math.random() - 0.5) * 0.02;
            if (Math.abs(this.vy) < 0.05) this.vy += (Math.random() - 0.5) * 0.02;

            // Wrap around edges
            if (this.x < 0) this.x = width;
            else if (this.x > width) this.x = 0;
            
            if (this.y < 0) this.y = height;
            else if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.useAltColor 
                ? CONFIG.colors.particleAlt 
                : CONFIG.colors.particle;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Initialize particles
    function initParticles() {
        particles = [];
        for (let i = 0; i < CONFIG.particleCount; i++) {
            particles.push(new Particle());
        }
    }

    // Draw connections between nearby particles
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.connectionDistance) {
                    const opacity = (1 - distance / CONFIG.connectionDistance) * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = CONFIG.colors.line;
                    ctx.globalAlpha = opacity;
                    ctx.lineWidth = CONFIG.lineWidth;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }

            // Draw connection to mouse if nearby
            if (mouse.x !== null && mouse.y !== null) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.mouseDistance) {
                    const opacity = (1 - distance / CONFIG.mouseDistance) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = CONFIG.colors.mouse;
                    ctx.globalAlpha = opacity;
                    ctx.lineWidth = CONFIG.lineWidth * 1.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    // Animation loop with frame throttling for performance
    function animate(currentTime) {
        if (!isVisible) {
            animationId = requestAnimationFrame(animate);
            return;
        }

        // Throttle to ~30fps for performance (update every ~33ms)
        if (currentTime - lastTime < 33) {
            animationId = requestAnimationFrame(animate);
            return;
        }
        lastTime = currentTime;

        ctx.clearRect(0, 0, width, height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        drawConnections();

        animationId = requestAnimationFrame(animate);
    }

    // Event listeners
    window.addEventListener('resize', () => {
        resize();
        initParticles();
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Visibility API to pause animation when tab is hidden
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
    });

    // Touch support for mobile
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Initialize
    function init() {
        resize();
        initParticles();
        animate(0);
    }

    // Start animation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
})();