import { StrictMode } from 'react';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PricingPage from './pages/PricingPage';
import AdminOpsPage from './pages/AdminOpsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PricingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin/ops" element={<AdminOpsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </StrictMode>
  );
}