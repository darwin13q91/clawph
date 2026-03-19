import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import LeadMagnetPopup from './components/LeadMagnetPopup';
import StickyCTA from './components/StickyCTA';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

import HeroSection from './sections/HeroSection';
import LeadMagnetSection from './sections/LeadMagnetSection';
import ROICalculator from './sections/ROICalculator';
import BeforeAfterSlider from './sections/BeforeAfterSlider';
import InteractiveChecklist from './sections/InteractiveChecklist';
import InteractiveFAQ from './sections/InteractiveFAQ';
import HowItWorksSection from './sections/HowItWorksSection';
import SimplePricingSection from './sections/SimplePricingSection';
import ContactSection from './sections/ContactSection';

gsap.registerPlugin(ScrollTrigger);

// Scroll to top on route change, but respect hash fragments
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  
  useEffect(() => {
    if (hash) {
      // Wait for DOM to render, then scroll to the target element
      const timer = setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  
  return null;
}

// Home page component
function HomePage() {
  // Global scroll snap for pinned sections
  useEffect(() => {
    const timer = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter(st => st.vars.pin)
        .sort((a, b) => a.start - b.start);
      
      const maxScroll = ScrollTrigger.maxScroll(window);
      
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map(st => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            const inPinned = pinnedRanges.some(
              r => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            
            if (!inPinned) return value;

            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );

            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <main id="main-content" className="relative">
      {/* Pinned Hero */}
      <HeroSection />

      {/* Flowing Sections */}
      <LeadMagnetSection />
      <ROICalculator />
      <BeforeAfterSlider />
      <InteractiveChecklist />
      <HowItWorksSection />
      <SimplePricingSection />
      <InteractiveFAQ />
      <ContactSection />
      
      {/* Sticky Mobile CTA */}
      <StickyCTA />
    </main>
  );
}

function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showGrain, setShowGrain] = useState(false);

  useEffect(() => {
    // Page load sequence
    const loadTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    // Grain overlay fade in
    const grainTimer = setTimeout(() => {
      setShowGrain(true);
    }, 300);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(grainTimer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
      <div className="relative bg-jungle min-h-screen">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showGrain ? 0.04 : 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="grain-overlay"
          />
        </AnimatePresence>

        {/* Lead Magnet Popup - Exit Intent & Timer */}
        <LeadMagnetPopup 
          delayMs={30000}  // Show after 30 seconds
          exitIntent={true} // Also show on exit intent
          cookieDays={7}   // Don't show again for 7 days if dismissed
        />

        {/* Toast notifications */}
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#0B3A2C',
              color: '#F6F7EB',
              border: '1px solid rgba(207, 255, 0, 0.3)',
            },
          }}
        />

        {/* Routes */}
        <Suspense fallback={
          <div className="min-h-screen bg-jungle flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neon border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/" element={
              <>
                <motion.div
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: isLoaded ? 0 : -100, opacity: isLoaded ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Navigation />
                </motion.div>
                <HomePage />
                <Footer />
              </>
            } />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Analytics />
      </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
