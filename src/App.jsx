
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import POSScreen from '@/pages/POSScreen';
import CustomerDisplay from '@/pages/CustomerDisplay';
import { POSProvider } from '@/contexts/POSContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <POSProvider>
        <Router>
          <Helmet>
            <title>FerrePOS - Sistema POS para Ferretería</title>
            <meta name="description" content="Sistema POS completo para ferreterías con gestión de inventario, ventas y clientes" />
          </Helmet>
          <Routes>
            <Route path="/" element={<POSScreen />} />
            <Route path="/customer-display" element={<CustomerDisplay />} />
          </Routes>
          <Toaster />
        </Router>
      </POSProvider>
    </ThemeProvider>
  );
}

export default App;
