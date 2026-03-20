import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================
// PARTICLE NETWORK BACKGROUND ANIMATION
// ============================================
// GPU-accelerated canvas animation with:
// - Particle network (dots connected by lines)
// - Slow drift movement
// - Gentle mouse interaction
// - Brand colors: neon green (#9fbf00) + jungle greens
// - 60fps performance (transform/opacity only)
// - Accessibility: respects prefers-reduced-motion
// ============================================

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
}

interface MousePosition {
  x: number;
  y: number;
}

// Brand colors
const COLORS = {
  neonGreen: '#9fbf00',
  neonGreenLight: 'rgba(159, 191, 0, 0.6)',
  neonGreenFaint: 'rgba(159, 191, 0, 0.15)',
  jungleGreen: '#0d4534',
  jungleGreenLight: 'rgba(13, 69, 52, 0.4)',
};

// Configuration
const CONFIG = {
  particleCount: { desktop: 60, mobile: 30, small: 20 },
  connectionDistance: 120,
  mouseRadius: 150,
  mouseForce: 0.03,
  driftSpeed: 0.3,
  maxConnections: 3,
  particleRadius: { min: 1.5, max: 3 },
  opacity: { particle: 0.7, line: 0.25 },
};

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<MousePosition>({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const isActiveRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const [isVisible, setIsVisible] = useState(true);

  // Get particle count based on screen size
  const getParticleCount = useCallback(() => {
    const width = window.innerWidth;
    if (width < 480) return CONFIG.particleCount.small;
    if (width < 768) return CONFIG.particleCount.mobile;
    return CONFIG.particleCount.desktop;
  }, []);

  // Initialize particles
  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const count = getParticleCount();
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * CONFIG.driftSpeed,
        vy: (Math.random() - 0.5) * CONFIG.driftSpeed,
        radius: CONFIG.particleRadius.min + Math.random() * (CONFIG.particleRadius.max - CONFIG.particleRadius.min),
      });
    }

    particlesRef.current = particles;
  }, [getParticleCount]);

  // Handle resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
    }

    dimensionsRef.current = { width: rect.width, height: rect.height };
    initParticles();
  }, [initParticles]);

  // Handle mouse move (throttled)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
  }, []);

  // Check visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isVisible || reducedMotionRef.current) return;

    const animate = () => {
      if (!isActiveRef.current) return;

      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const { width, height } = dimensionsRef.current;

      if (!ctx || !canvas || particles.length === 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Calculate drift (gentle sine wave motion)
        const time = Date.now() * 0.001;
        const driftX = Math.sin(time * 0.5 + i * 0.5) * 0.5;
        const driftY = Math.cos(time * 0.3 + i * 0.7) * 0.5;

        // Mouse interaction (gentle push)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.mouseRadius && dist > 0) {
          const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
          const angle = Math.atan2(dy, dx);
          p.x -= Math.cos(angle) * force * CONFIG.mouseForce * 100;
          p.y -= Math.sin(angle) * force * CONFIG.mouseForce * 100;
        }

        // Apply velocity with drift
        p.x += p.vx + driftX * 0.1;
        p.y += p.vy + driftY * 0.1;

        // Gentle return to base position (like a spring)
        const homeX = p.baseX - p.x;
        const homeY = p.baseY - p.y;
        p.x += homeX * 0.005;
        p.y += homeY * 0.005;

        // Wrap around edges (with buffer)
        const buffer = 50;
        if (p.x < -buffer) { p.x = width + buffer; p.baseX = p.x; }
        if (p.x > width + buffer) { p.x = -buffer; p.baseX = p.x; }
        if (p.y < -buffer) { p.y = height + buffer; p.baseY = p.y; }
        if (p.y > height + buffer) { p.y = -buffer; p.baseY = p.y; }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.neonGreen;
        ctx.globalAlpha = CONFIG.opacity.particle;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, COLORS.neonGreenLight);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = CONFIG.opacity.particle * 0.5;
        ctx.fill();
      }

      // Draw connections
      ctx.globalAlpha = CONFIG.opacity.line;
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        let connections = 0;

        for (let j = i + 1; j < particles.length && connections < CONFIG.maxConnections; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.connectionDistance) {
            const opacity = (1 - dist / CONFIG.connectionDistance) * CONFIG.opacity.line;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(159, 191, 0, ${opacity})`;
            ctx.stroke();
            connections++;
          }
        }
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    isActiveRef.current = true;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible]);

  // Setup and cleanup
  useEffect(() => {
    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize, handleMouseMove, handleMouseLeave]);

  // Don't render if reduced motion is preferred
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        opacity: 0.6,
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{
          // Ensure no layout interference
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
