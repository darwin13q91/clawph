import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

const AboutPage = lazy(() => import('./pages/AboutPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

import HeroSection from './sections/HeroSection';
import LeadMagnetSection from './sections/LeadMagnetSection';
import VisualDemoSection from './sections/VisualDemoSection';
import HowItWorksSection from './sections/HowItWorksSection';
import SimplePricingSection from './sections/SimplePricingSection';
import SimpleFAQSection from './sections/SimpleFAQSection';
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
      <VisualDemoSection />
      <HowItWorksSection />
      <SimplePricingSection />
      <SimpleFAQSection />
      <ContactSection />
    </main>
  );
}

function App() {
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
      <div className="relative bg-jungle min-h-screen">
        {/* Grain overlay */}
        <div className="grain-overlay" />

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
                <Navigation />
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
