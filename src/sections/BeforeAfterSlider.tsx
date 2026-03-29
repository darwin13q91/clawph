import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

export default function BeforeAfterSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const beforeTasks = [
    'Manually updating 50+ listings daily',
    'Checking PPC campaigns 3x per day',
    'Copy-pasting data between spreadsheets',
    'Missing restock alerts',
    'Working 60+ hours per week',
  ];

  const afterTasks = [
    'Listings analyzed by River AI with specific recommendations',
    'PPC recommendations based on ACoS and conversion data',
    'Weekly performance reports via Telegram/Email',
    'Alerts for critical issues (stockouts, policy changes)',
    '5+ hours saved weekly on monitoring and analysis',
  ];

  return (
    <section className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-12 bg-jungle/80 backdrop-blur-sm relative overflow-hidden pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-neon/10 border border-neon/20 mb-4 sm:mb-6"
          >
            <span className="text-neon text-xs sm:text-sm font-mono">Interactive Comparison</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-warm mb-4"
          >
            Before vs{' '}
            <span className="text-neon">With AmaJungle</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-warm-72 text-base sm:text-lg max-w-2xl mx-auto px-4 sm:px-0"
          >
            Drag the slider to see the transformation
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-warm/10 shadow-2xl"
          style={{ height: 'min(500px, 70vh)' }}
          ref={containerRef}
        >
          {/* Before Side */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 to-jungle-dark/50 p-6 sm:p-8 lg:p-10">
            <div className="h-full flex flex-col">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-red-400 mb-4 sm:mb-6">
                ❌ Manual Grind
              </h3>
              <ul className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                {beforeTasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-warm/80 text-sm sm:text-base">{task}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-950/30 rounded-lg border border-red-500/20">
                <p className="text-red-400 font-bold text-sm sm:text-base">60+ hours/week</p>
                <p className="text-warm/60 text-xs sm:text-sm">Reactive, stressed, no time to grow</p>
              </div>
            </div>
          </div>

          {/* After Side (Clipped) */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-jungle to-jungle-light p-6 sm:p-8"
            style={{
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            }}
          >
            <div className="h-full flex flex-col">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-neon mb-4 sm:mb-6">
                ✅ With AmaJungle
              </h3>
              <ul className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                {afterTasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-neon flex-shrink-0 mt-0.5" />
                    <span className="text-warm text-sm sm:text-base">{task}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-neon/10 rounded-lg border border-neon/30">
                <p className="text-neon font-bold text-sm sm:text-base">5+ hours saved weekly</p>
                <p className="text-warm/60 text-xs sm:text-sm">Proactive, strategic, scaling fast</p>
              </div>
            </div>
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-gray-400" />
                <div className="w-0.5 h-4 bg-gray-400" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-sm text-white">
            Drag →
          </div>
        </motion.div>
      </div>
    </section>
  );
}
