import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, Calendar, Printer, Package, DollarSign, Percent, FileText, CheckSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Importar el componente Label
import { usePOS } from '@/contexts/POSContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SaleDetail = ({ sale }) => {
  const { dispatch } = usePOS();
  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'transfer': return 'Transferencia';
      case 'mixed': return 'Mixto';
      case 'credit': return 'A Cuenta';
      default: return method;
    }
  };

  const reprintTicket = () => {
    toast({ title: "🚧 Reimprimir Ticket: Funcionalidad no implementada" });
  };
  
  const convertToSale = () => {
      dispatch({type: 'CONVERT_QUOTE_TO_SALE', payload: sale });
      toast({title: 'Presupuesto convertido', description: 'El presupuesto se ha convertido a una venta.'});
  };

  return (
    <DialogContent className="card-glass border-border max-w-2xl">
      <DialogHeader>
        <DialogTitle>Detalle de Venta - {sale.documentNumber}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin p-1">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Fecha:</p><p>{new Date(sale.timestamp).toLocaleString()}</p></div>
          <div><p className="text-muted-foreground">Tipo:</p><p className="capitalize">{sale.type.replace('_', ' ')}</p></div>
          {sale.customer && <div><p className="text-muted-foreground">Cliente:</p><p>{sale.customer.name}</p></div>}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-2 flex items-center"><Package className="h-4 w-4 mr-2" />Productos</h3>
          <div className="space-y-2">
            {sale.items.map((item, index) => (
              <div key={item.cartId || index} className="flex justify-between items-center bg-background/50 p-2 rounded-md">
                <div>
                  <p>{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} x ${item.price.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.quantity * item.price).toFixed(2)}</p>
                  {item.itemDiscount > 0 && <p className="text-xs text-green-500">-${item.itemDiscount.toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-2 flex items-center"><DollarSign className="h-4 w-4 mr-2" />Totales</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>${sale.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Descuentos:</span><span className="text-green-500">-${(sale.items.reduce((acc, i) => acc + (i.itemDiscount || 0), 0) + (sale.discount || 0)).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">IVA:</span><span>${sale.tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-border/50 mt-1 pt-1"><span>Total:</span><span>${sale.total.toFixed(2)}</span></div>
          </div>
        </div>
        
        {sale.type !== 'quote' && (
        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-2 flex items-center"><Percent className="h-4 w-4 mr-2" />Ganancia</h3>
          <div className="flex justify-between font-bold text-green-500"><span>Ganancia de la venta:</span><span>${(sale.profit || 0).toFixed(2)}</span></div>
        </div>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-2">Pago</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Método:</span><span>{getPaymentMethodLabel(sale.paymentMethod)}</span></div>
            {sale.paymentMethod !== 'transfer' && <div className="flex justify-between"><span className="text-muted-foreground">Monto Recibido:</span><span>${(sale.paymentAmount || 0).toFixed(2)}</span></div>}
            {sale.change > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Vuelto:</span><span>${sale.change.toFixed(2)}</span></div>}
          </div>
        </div>
        
      </div>
      <div className="flex justify-end pt-4 gap-2">
        {sale.type === 'quote' && <Button onClick={convertToSale} className="bg-green-600 hover:bg-green-700"><CheckSquare className="h-4 w-4 mr-2"/>Convertir a Venta</Button>}
        <Button onClick={reprintTicket}><Printer className="h-4 w-4 mr-2" />Reimprimir</Button>
      </div>
    </DialogContent>
  );
};


export default function SalesHistory() {
  /* PATCH: session filter */
  const sessionSince = React.useMemo(() => {
    if (state.cashRegister?.isOpen && state.cashRegister?.openedAt) return state.cashRegister.openedAt;
    const last = (state.cashClosures || [])[state.cashClosures.length - 1];
    return last?.closedAt || null; // if recently closed, show nothing (cleared panel)
  }, [state.cashRegister?.isOpen, state.cashRegister?.openedAt, state.cashClosures]);

  const visibleSales = React.useMemo(() => {
    const arr = sales || [];
    if (!sessionSince) return arr;
    const sinceMs = new Date(sessionSince).getTime();
    return arr.filter(s => new Date(s.timestamp).getTime() >= sinceMs);
  }, [sales, sessionSince]);

  const { state } = usePOS();
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    type: 'all',
    paymentMethod: 'all',
    search: ''
  });

  const filteredSales = useMemo(() => { /* patched */
    return [...state.sales]
      .reverse()
      .filter(sale => {
        const saleDate = new Date(sale.timestamp);
        const startDate = filters.dateStart ? new Date(filters.dateStart) : null;
        const endDate = filters.dateEnd ? new Date(filters.dateEnd) : null;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
        if (filters.type !== 'all' && sale.type !== filters.type) return false;
        if (filters.paymentMethod !== 'all' && sale.paymentMethod !== filters.paymentMethod) return false;
        if (filters.search && !(
            sale.documentNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
            sale.customer?.name.toLowerCase().includes(filters.search.toLowerCase())
        )) return false;
        
        return true;
      });
  }, [state.sales, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historial de Operaciones</h1>

      <div className="card-glass p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1"><Label>Desde</Label><Input type="date" value={filters.dateStart} onChange={(e) => handleFilterChange('dateStart', e.target.value)} /></div>
          <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={filters.dateEnd} onChange={(e) => handleFilterChange('dateEnd', e.target.value)} /></div>
          <div className="space-y-1"><Label>Tipo</Label><Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="sale">Venta</SelectItem><SelectItem value="quote">Presupuesto</SelectItem><SelectItem value="remit">Remito</SelectItem><SelectItem value="credit">Crédito</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label>Pago</Label><Select value={filters.paymentMethod} onValueChange={(v) => handleFilterChange('paymentMethod', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="mixed">Mixto</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label>Buscar</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Nro o Cliente..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="pl-8" /></div></div>
        </div>
      </div>

      <div className="card-glass p-6 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground p-2">Fecha</th>
                <th className="text-left text-muted-foreground p-2">Documento</th>
                <th className="text-left text-muted-foreground p-2">Tipo</th>
                <th className="text-left text-muted-foreground p-2">Cliente</th>
                <th className="text-right text-muted-foreground p-2">Total</th>
                <th className="text-right text-muted-foreground p-2">Ganancia</th>
                <th className="text-center text-muted-foreground p-2">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, index) => (
                <motion.tr key={sale.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }} className="border-b border-border/50 hover:bg-accent">
                  <td className="p-3 text-sm text-muted-foreground">{new Date(sale.timestamp).toLocaleString()}</td>
                  <td className="p-3 font-medium">{sale.documentNumber}</td>
                  <td className="p-3 capitalize text-yellow-500">{sale.type.replace('_', ' ')}</td>
                  <td className="p-3 text-muted-foreground">{sale.customer?.name || 'Consumidor Final'}</td>
                  <td className="p-3 text-right font-semibold">${sale.total.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-green-500">${(sale.profit || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </DialogTrigger>
                      <SaleDetail sale={sale} />
                    </Dialog>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && <div className="text-center py-8"><History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" /><p className="text-muted-foreground">No se encontraron operaciones.</p></div>}
        </div>
      </div>
    </div>
  );
}
