import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

// ============================================
// JUNGLE BACKGROUND EFFECTS COMPONENT
// ============================================
// Subtle ambient animations for jungle theme:
// - Floating leaves/vines (decorative SVG elements)
// - Ambient particles (fireflies/spores)
// - Gradient pulse (hero section)
// - Scroll-triggered parallax layers
// ============================================

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

// SVG Leaf Component - Simple tropical leaf shape
const FloatingLeaf = ({ 
  delay = 0, 
  duration = 20, 
  size = 40,
  startX = -100,
  endX = 120,
  yPos = 20,
  rotation = 0
}: { 
  delay?: number; 
  duration?: number; 
  size?: number;
  startX?: number;
  endX?: number;
  yPos?: number;
  rotation?: number;
}) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: `${yPos}%`,
        left: `${startX}%`,
        width: size,
        height: size,
      }}
      initial={{ x: 0, y: 0, rotate: rotation, opacity: 0 }}
      animate={{
        x: [`0vw`, `${endX - startX}vw`],
        y: [0, -20, 10, -15, 5],
        rotate: [rotation, rotation + 15, rotation - 10, rotation + 8, rotation],
        opacity: [0, 0.15, 0.12, 0.1, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Tropical leaf shape */}
        <path
          d="M50 5 C30 15, 10 35, 5 60 C15 55, 25 58, 35 65 C25 62, 15 68, 8 80 C20 75, 30 78, 40 85 C35 82, 25 88, 20 95 C35 90, 45 92, 50 95 C55 92, 65 90, 80 95 C75 88, 65 82, 60 85 C70 78, 80 75, 92 80 C85 68, 75 62, 65 65 C75 58, 85 55, 95 60 C90 35, 70 15, 50 5 Z"
          fill="#CFFF00"
          fillOpacity="0.4"
        />
        {/* Leaf vein */}
        <path
          d="M50 15 L50 85"
          stroke="#0B3A2C"
          strokeWidth="2"
          strokeOpacity="0.3"
        />
      </svg>
    </motion.div>
  );
};

// Floating Vine Component - Curved vine segment
const FloatingVine = ({
  delay = 0,
  duration = 25,
  startX = -50,
  endX = 150,
  yPos = 40,
  scale = 1,
}: {
  delay?: number;
  duration?: number;
  startX?: number;
  endX?: number;
  yPos?: number;
  scale?: number;
}) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: `${yPos}%`,
        left: `${startX}%`,
        width: 200 * scale,
        height: 100 * scale,
      }}
      initial={{ x: 0, opacity: 0 }}
      animate={{
        x: [`0vw`, `${endX - startX}vw`],
        y: [0, -30, 20, -15, 0],
        opacity: [0, 0.08, 0.06, 0.04, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Curved vine */}
        <path
          d="M0 80 Q50 20, 100 50 T200 30"
          stroke="#0B3A2C"
          strokeWidth="3"
          strokeOpacity="0.5"
          fill="none"
        />
        {/* Small leaves along vine */}
        <ellipse cx="50" cy="35" rx="8" ry="12" fill="#0d4534" fillOpacity="0.4" transform="rotate(-30 50 35)" />
        <ellipse cx="100" cy="50" rx="6" ry="10" fill="#0d4534" fillOpacity="0.3" transform="rotate(20 100 50)" />
        <ellipse cx="150" cy="40" rx="7" ry="11" fill="#0d4534" fillOpacity="0.35" transform="rotate(-15 150 40)" />
      </svg>
    </motion.div>
  );
};

// Particle/Firefly Component
const ParticleEffect = ({ 
  particles,
  isMobile 
}: { 
  particles: Particle[];
  isMobile: boolean;
}) => {
  if (isMobile) return null; // Disable on mobile for performance

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: '#CFFF00',
            boxShadow: `0 0 ${particle.size * 2}px #CFFF00`,
          }}
          initial={{ 
            y: '100vh', 
            opacity: 0,
            scale: 0.5 
          }}
          animate={{ 
            y: '-10vh',
            opacity: [0, 0.2, 0.15, 0.1, 0],
            scale: [0.5, 1, 1.2, 1, 0.8],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

// Gradient Pulse Overlay for Hero
const GradientPulse = () => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(207, 255, 0, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(13, 69, 52, 0.3) 0%, transparent 40%)',
      }}
      animate={{
        background: [
          'radial-gradient(ellipse at 30% 50%, rgba(207, 255, 0, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(13, 69, 52, 0.3) 0%, transparent 40%)',
          'radial-gradient(ellipse at 50% 40%, rgba(207, 255, 0, 0.04) 0%, transparent 45%), radial-gradient(ellipse at 40% 60%, rgba(13, 69, 52, 0.35) 0%, transparent 45%)',
          'radial-gradient(ellipse at 70% 50%, rgba(207, 255, 0, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 30% 40%, rgba(13, 69, 52, 0.25) 0%, transparent 40%)',
          'radial-gradient(ellipse at 30% 50%, rgba(207, 255, 0, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(13, 69, 52, 0.3) 0%, transparent 40%)',
        ],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Parallax Layer Component
const ParallaxLayer = ({
  children,
  speed = 0.5,
  className = "",
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 200 * speed]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className={`pointer-events-none ${className}`}
      style={{ y: smoothY }}
    >
      {children}
    </motion.div>
  );
};

// Main Background Effects Component
export default function BackgroundEffects() {
  const [isMobile, setIsMobile] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile for performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate particles on client side only
  useEffect(() => {
    if (isMobile) return;
    
    const newParticles: Particle[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 100 + Math.random() * 20,
      size: Math.random() * 3 + 2, // 2-5px
      duration: Math.random() * 20 + 25, // 25-45s
      delay: Math.random() * 30,
    }));
    
    setParticles(newParticles);
  }, [isMobile]);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* ============================================
          1. FLOATING LEAVES - Slow drift across screen
          ============================================ */}
      <FloatingLeaf delay={0} duration={30} size={60} startX={-10} endX={110} yPos={15} rotation={15} />
      <FloatingLeaf delay={8} duration={35} size={45} startX={-15} endX={115} yPos={60} rotation={-20} />
      <FloatingLeaf delay={15} duration={28} size={50} startX={-5} endX={105} yPos={35} rotation={30} />
      <FloatingLeaf delay={22} duration={32} size={35} startX={-12} endX={112} yPos={80} rotation={-10} />
      
      {/* Second wave of leaves - smaller and more subtle */}
      {!isMobile && (
        <>
          <FloatingLeaf delay={5} duration={40} size={30} startX={110} endX={-10} yPos={25} rotation={180} />
          <FloatingLeaf delay={12} duration={38} size={25} startX={115} endX={-15} yPos={70} rotation={160} />
          <FloatingLeaf delay={20} duration={42} size={35} startX={108} endX={-8} yPos={45} rotation={200} />
        </>
      )}

      {/* ============================================
          2. FLOATING VINES - Decorative vine segments
          ============================================ */}
      {!isMobile && (
        <>
          <FloatingVine delay={3} duration={45} startX={-30} endX={130} yPos={20} scale={0.8} />
          <FloatingVine delay={18} duration={50} startX={-40} endX={140} yPos={75} scale={1} />
          <FloatingVine delay={30} duration={48} startX={120} endX={-20} yPos={50} scale={0.6} />
        </>
      )}

      {/* ============================================
          3. AMBIENT PARTICLES - Fireflies/spores
          ============================================ */}
      <ParticleEffect particles={particles} isMobile={isMobile} />

      {/* ============================================
          4. SCROLL PARALLAX LAYERS - Background depth
          ============================================ */}
      {!isMobile && (
        <>
          {/* Deep background layer - slowest */}
          <ParallaxLayer speed={0.2} className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full bg-[#0d4534] opacity-5 blur-3xl" />
            <div className="absolute top-[60%] right-[15%] w-96 h-96 rounded-full bg-[#082f23] opacity-10 blur-3xl" />
          </ParallaxLayer>

          {/* Mid background layer */}
          <ParallaxLayer speed={0.35} className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[40%] left-[60%] w-48 h-48 rounded-full bg-[#CFFF00] opacity-[0.02] blur-2xl" />
            <div className="absolute top-[80%] left-[20%] w-72 h-72 rounded-full bg-[#0B3A2C] opacity-5 blur-3xl" />
          </ParallaxLayer>
        </>
      )}

      {/* ============================================
          GLOBAL AMBIENT GRADIENT OVERLAY
          ============================================ */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(207, 255, 0, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(13, 69, 52, 0.1) 0%, transparent 40%)
          `,
        }}
      />
    </div>
  );
}

// Export individual components for section-specific use
export { FloatingLeaf, FloatingVine, ParticleEffect, GradientPulse, ParallaxLayer };
