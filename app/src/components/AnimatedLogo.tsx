import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

export default function AnimatedLogo({ className = '', size = 60 }: AnimatedLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    // Animate nodes with staggered pulse effect
    const nodes = nodesRef.current.filter(Boolean);
    
    nodes.forEach((node, index) => {
      if (node) {
        gsap.to(node, {
          opacity: 0.4,
          scale: 0.8,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: index * 0.15, // Stagger animation
        });
      }
    });

    return () => {
      nodes.forEach((node) => {
        if (node) gsap.killTweensOf(node);
      });
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(207, 255, 0, 0.5))' }}
    >
      {/* Circuit paths */}
      <g fill="none" stroke="#CFFF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Main stem */}
        <path d="M50 85 L50 50" />
        
        {/* Left side branches */}
        <path d="M50 50 L30 40 L20 35" />
        <path d="M50 50 L35 55 L25 60" />
        <path d="M50 50 L40 45 L28 42" />
        <path d="M50 65 L35 70 L25 75" />
        <path d="M50 35 L38 30 L28 25" />
        
        {/* Right side branches */}
        <path d="M50 50 L70 40 L80 35" />
        <path d="M50 50 L65 55 L75 60" />
        <path d="M50 50 L60 45 L72 42" />
        <path d="M50 65 L65 70 L75 75" />
        <path d="M50 35 L62 30 L72 25" />
        
        {/* Cross connections */}
        <path d="M30 40 L35 55" />
        <path d="M70 40 L65 55" />
        <path d="M35 70 L40 45" />
        <path d="M65 70 L60 45" />
        <path d="M38 30 L42 25" />
        <path d="M62 30 L58 25" />
      </g>
      
      {/* Glowing nodes */}
      <g fill="#CFFF00">
        {/* Center hub */}
        <circle 
          ref={(el) => { nodesRef.current[0] = el; }}
          cx="50" cy="50" r="4" 
          style={{ transformOrigin: '50px 50px' }}
        />
        
        {/* Stem nodes */}
        <circle 
          ref={(el) => { nodesRef.current[1] = el; }}
          cx="50" cy="65" r="2.5"
          style={{ transformOrigin: '50px 65px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[2] = el; }}
          cx="50" cy="35" r="2.5"
          style={{ transformOrigin: '50px 35px' }}
        />
        
        {/* Left nodes */}
        <circle 
          ref={(el) => { nodesRef.current[3] = el; }}
          cx="30" cy="40" r="2"
          style={{ transformOrigin: '30px 40px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[4] = el; }}
          cx="20" cy="35" r="2"
          style={{ transformOrigin: '20px 35px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[5] = el; }}
          cx="25" cy="60" r="2"
          style={{ transformOrigin: '25px 60px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[6] = el; }}
          cx="28" cy="42" r="2"
          style={{ transformOrigin: '28px 42px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[7] = el; }}
          cx="25" cy="75" r="2"
          style={{ transformOrigin: '25px 75px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[8] = el; }}
          cx="28" cy="25" r="2"
          style={{ transformOrigin: '28px 25px' }}
        />
        
        {/* Right nodes */}
        <circle 
          ref={(el) => { nodesRef.current[9] = el; }}
          cx="70" cy="40" r="2"
          style={{ transformOrigin: '70px 40px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[10] = el; }}
          cx="80" cy="35" r="2"
          style={{ transformOrigin: '80px 35px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[11] = el; }}
          cx="75" cy="60" r="2"
          style={{ transformOrigin: '75px 60px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[12] = el; }}
          cx="72" cy="42" r="2"
          style={{ transformOrigin: '72px 42px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[13] = el; }}
          cx="75" cy="75" r="2"
          style={{ transformOrigin: '75px 75px' }}
        />
        <circle 
          ref={(el) => { nodesRef.current[14] = el; }}
          cx="72" cy="25" r="2"
          style={{ transformOrigin: '72px 25px' }}
        />
      </g>
      
      {/* Outer glow ring (subtle) */}
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="#CFFF00"
        strokeWidth="0.5"
        opacity="0.2"
      />
    </svg>
  );
}
