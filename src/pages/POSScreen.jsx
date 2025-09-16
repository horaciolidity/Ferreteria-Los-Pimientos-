// src/pages/POSScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ShoppingCart, Calculator, Users, Package, DollarSign,
  BarChart3, Settings, Monitor, History, Truck, Sun, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { usePOS } from '@/contexts/POSContext';
import ProductSearch from '@/components/pos/ProductSearch';
import Cart from '@/components/pos/Cart';
import PaymentPanel from '@/components/pos/PaymentPanel';
import ProductManagement from '@/components/pos/ProductManagement';
import CustomerManagement from '@/components/pos/CustomerManagement';
import ProviderManagement from '@/components/pos/ProviderManagement';
import CashRegister from '@/components/pos/CashRegister';
import SalesHistory from '@/components/pos/SalesHistory';
import Statistics from '@/components/pos/Statistics';
import SettingsPanel from '@/components/pos/SettingsPanel';
import KeyboardShortcutsBanner from '@/components/pos/KeyboardShortcutsBanner';
import { useTheme } from '@/contexts/ThemeContext';

export default function POSScreen() {
  const { state, dispatch } = usePOS();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isTyping =
        ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      // Evitamos que F-keys disparen acciones del navegador
      if (e.key.startsWith('F') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }

      // Atajos
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          if (!isTyping) searchInputRef.current?.focus();
          break;
        case 'F6':
          if (activeTab === 'pos') dispatch({ type: 'SET_PAYMENT_METHOD', payload: 'cash' });
          break;
        case 'F7':
          if (activeTab === 'pos') dispatch({ type: 'SET_PAYMENT_METHOD', payload: 'transfer' });
          break;
        case 'F8':
          if (activeTab === 'pos') document.getElementById('btn-quote')?.click();
          break;
        case 'F9':
          if (activeTab === 'pos') document.getElementById('btn-remit')?.click();
          break;
        case 'F10':
          if (activeTab === 'pos') document.getElementById('btn-invoice')?.click();
          break;
        default:
          break;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toast({ title: '🚧 Imprimir: Funcionalidad no implementada' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, dispatch]);

  // Abre la pantalla cliente respetando HashRouter (/#/customer-display)
  const openCustomerDisplay = () => {
    try {
      const base = window.location.origin;
      const url = `${base}/#/customer-display`; // usamos hash para evitar 404 en Vercel
      window.open(url, 'customer_display', 'width=1024,height=768');
    } catch {
      // fallback simple
      window.open('/#/customer-display', '_blank', 'width=1024,height=768');
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="p-4 pb-20 md:pb-16 max-w-screen-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* ===== BANNER SUPERIOR con imagen JPEG de fondo ===== */}
          <div
            className="relative rounded-xl overflow-hidden mb-6"
            style={{ height: 220 }}
          >
            {/* Capa de imagen (poné tu JPEG en /public/hero.jpeg) */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(/hero.jpeg)`,
                opacity: 0.6,
                filter: 'saturate(0.95) contrast(1.05)',
              }}
            />
            {/* Capa de degradado para legibilidad */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0) 100%)',
              }}
            />

            {/* Contenido del banner (encabezado) */}
            <div className="relative h-full px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-black/30 backdrop-blur">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{state.settings.companyName}</h1>
                  <p className="text-white/80">Sistema POS para Ferretería</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>

                <Button
                  onClick={openCustomerDisplay}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Pantalla Cliente
                </Button>

                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium backdrop-blur ${
                    state.cashRegister.isOpen ? 'bg-emerald-500/20 text-white' : 'bg-red-500/20 text-white'
                  }`}
                  title={state.cashRegister.isOpen ? 'Caja abierta' : 'Caja cerrada'}
                >
                  {state.cashRegister.isOpen
                    ? `Caja Abierta: $${state.cashRegister.currentAmount.toFixed(2)}`
                    : 'Caja Cerrada'}
                </div>
              </div>
            </div>
          </div>
          {/* ===== /BANNER SUPERIOR ===== */}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 md:flex md:w-auto card-glass p-1 bg-transparent border-border h-auto">
              <TabsTrigger value="pos"><Calculator className="h-4 w-4 mr-2" />POS</TabsTrigger>
              <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Productos</TabsTrigger>
              <TabsTrigger value="customers"><Users className="h-4 w-4 mr-2" />Clientes</TabsTrigger>
              <TabsTrigger value="providers"><Truck className="h-4 w-4 mr-2" />Proveedores</TabsTrigger>
              <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Historial</TabsTrigger>
              <TabsTrigger value="cash"><DollarSign className="h-4 w-4 mr-2" />Caja</TabsTrigger>
              <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-2" />Estadísticas</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Config.</TabsTrigger>
            </TabsList>

            <TabsContent value="pos">
              <div className="pos-grid">
                <div className="space-y-6">
                  <div className="card-glass p-6 rounded-lg">
                    <div className="flex items-center space-x-4 mb-4">
                      <Search className="h-6 w-6 text-primary" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Buscar producto por nombre o código de barras (F2)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 text-base h-12"
                      />
                    </div>
                    <ProductSearch searchQuery={searchQuery} />
                  </div>
                </div>
                <div className="space-y-6">
                  <Cart />
                  <PaymentPanel />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="products"><ProductManagement /></TabsContent>
            <TabsContent value="customers"><CustomerManagement /></TabsContent>
            <TabsContent value="providers"><ProviderManagement /></TabsContent>
            <TabsContent value="history"><SalesHistory /></TabsContent>
            <TabsContent value="cash"><CashRegister /></TabsContent>
            <TabsContent value="stats"><Statistics /></TabsContent>
            <TabsContent value="settings"><SettingsPanel /></TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <KeyboardShortcutsBanner />
    </div>
  );
}
