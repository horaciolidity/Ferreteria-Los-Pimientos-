
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, Calculator, Users, Package, DollarSign, BarChart3, Settings, Monitor, History, Truck } from 'lucide-react';
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
import { Sun, Moon } from 'lucide-react';

export default function POSScreen() {
  const { state, dispatch } = usePOS();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputFocused = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

      if (e.key.startsWith('F') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          searchInputRef.current?.focus();
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
      }

      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        toast({ title: "🚧 Imprimir: Funcionalidad no implementada" });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, dispatch]);

  const openCustomerDisplay = () => {
    window.open('/customer-display', '_blank', 'width=1024,height=768');
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="p-4 pb-20 md:pb-16 max-w-screen-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="card-glass p-3 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{state.settings.companyName}</h1>
                <p className="text-muted-foreground">Sistema POS para Ferretería</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-accent">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button onClick={openCustomerDisplay} variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-accent">
                <Monitor className="h-4 w-4 mr-2" />
                Pantalla Cliente
              </Button>
              
              <div className={`card-glass px-3 py-2 rounded-lg text-sm font-medium ${state.cashRegister.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                {state.cashRegister.isOpen ? `Caja Abierta: $${state.cashRegister.currentAmount.toFixed(2)}` : 'Caja Cerrada'}
              </div>
            </div>
          </div>

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