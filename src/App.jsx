// src/App.jsx
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import POSScreen from '@/pages/POSScreen';
import CustomerDisplay from '@/pages/CustomerDisplay';
import { POSProvider } from '@/contexts/POSContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function App() {
  useEffect(() => {
    document.title = 'FerrePOS - Sistema POS para Ferretería';
  }, []);

  return (
    <ThemeProvider>
      <POSProvider>
        <Router>
          <Routes>
            <Route path="/" element={<POSScreen />} />
            <Route path="/customer-display" element={<CustomerDisplay />} />
            {/* Fallback para cualquier ruta desconocida */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </POSProvider>
    </ThemeProvider>
  );
}

export default App;
