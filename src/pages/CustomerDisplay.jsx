import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, CreditCard, DollarSign, Receipt } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { usePOS } from '@/contexts/POSContext';

export default function CustomerDisplay() {
  const { state: globalState } = usePOS();
  const [displayData, setDisplayData] = useState({
    cart: [],
    currentCustomer: null,
    paymentMethod: 'cash',
    paymentAmount: 0,
    discount: 0,
    total: 0
  });

  useEffect(() => {
    const calculateTotal = (cart, discount, taxRate) => {
        const subtotal = (cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemDiscounts = (cart || []).reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
        const totalWithItemDiscounts = subtotal - itemDiscounts;
        const tax = totalWithItemDiscounts * taxRate;
        return totalWithItemDiscounts + tax - discount;
    };

    const channel = new BroadcastChannel('ferrePOS');
    
    const handleMessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        const { cart, currentCustomer, paymentMethod, paymentAmount, discount } = event.data;
        setDisplayData({
          cart: cart || [],
          currentCustomer,
          paymentMethod: paymentMethod || 'cash',
          paymentAmount: paymentAmount || 0,
          discount: discount || 0,
          total: calculateTotal(cart, discount, globalState.settings.taxRate)
        });
      }
    };
    
    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [globalState.settings.taxRate]);

  const subtotal = displayData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemDiscount = displayData.cart.reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
  const tax = (subtotal - totalItemDiscount) * globalState.settings.taxRate;
  const change = displayData.paymentMethod === 'cash' ? Math.max(0, displayData.paymentAmount - displayData.total) : 0;

  const getPaymentIcon = () => {
    switch (displayData.paymentMethod) {
      case 'cash': return <DollarSign className="h-8 w-8" />;
      case 'transfer': return <CreditCard className="h-8 w-8" />;
      case 'mixed': return <><DollarSign className="h-8 w-8" /><CreditCard className="h-8 w-8" /></>;
      default: return <Receipt className="h-8 w-8" />;
    }
  };

  const getPaymentLabel = () => {
    switch (displayData.paymentMethod) {
      case 'cash': return 'Efectivo';
      case 'transfer': return 'Transferencia';
      case 'mixed': return 'Mixto';
      default: return 'Efectivo';
    }
  };

  return (
    <>
      <Helmet>
        <title>Pantalla Cliente - FerrePOS</title>
        <meta name="description" content="Pantalla de cliente para el sistema POS de ferretería" />
      </Helmet>
      
      <div className="min-h-screen bg-background p-8 text-foreground">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold">{globalState.settings.companyName}</h1>
            <p className="text-2xl text-muted-foreground mt-2">Gracias por su compra</p>
          </div>

          {displayData.currentCustomer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-glass p-6 rounded-lg mb-6 text-center">
              <h2 className="text-2xl font-semibold">Cliente: <span className="text-primary">{displayData.currentCustomer.name}</span></h2>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card-glass p-6 rounded-lg">
              <h2 className="text-3xl font-semibold mb-4 flex items-center"><ShoppingCart className="h-8 w-8 mr-3" />Su Compra</h2>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                <AnimatePresence>
                  {displayData.cart.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <ShoppingCart className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground text-xl">El carrito está vacío</p>
                    </motion.div> // <-- Aquí estaba el error, faltaba cerrar esta motion.div
                  ) : (
                    displayData.cart.map((item, index) => (
                      <motion.div key={item.cartId || index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between p-4 bg-background/50 rounded-lg text-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-muted-foreground text-base">{item.quantity} {item.unit} × ${item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold text-xl">${(item.price * item.quantity).toFixed(2)}</p>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-8">
              <div className="card-glass p-6 rounded-lg">
                <h2 className="text-3xl font-semibold mb-4">Resumen</h2>
                <div className="space-y-3 text-xl">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                  {(totalItemDiscount > 0 || displayData.discount > 0) && <div className="flex justify-between text-green-500"><span>Descuentos:</span><span>-${(totalItemDiscount + displayData.discount).toFixed(2)}</span></div>}
                  <div className="flex justify-between text-muted-foreground"><span>IVA ({globalState.settings.taxRate * 100}%):</span><span>${tax.toFixed(2)}</span></div>
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between text-4xl font-bold"><span>Total:</span><span className="pulse-glow rounded-lg px-2">${displayData.total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              {displayData.paymentAmount > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-6 rounded-lg">
                  <h2 className="text-3xl font-semibold mb-4 flex items-center">{getPaymentIcon()}<span className="ml-3">Pago</span></h2>
                  <div className="space-y-3 text-xl">
                    <div className="flex justify-between text-muted-foreground"><span>Método:</span><span className="font-medium">{getPaymentLabel()}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Recibido:</span><span>${displayData.paymentAmount.toFixed(2)}</span></div>
                    {change > 0 && <div className="flex justify-between text-green-500 text-2xl font-semibold"><span>Vuelto:</span><span>${change.toFixed(2)}</span></div>}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </>
  );
}
