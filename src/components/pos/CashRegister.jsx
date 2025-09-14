
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Lock, Unlock, Printer, History, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';
import { Textarea } from '../ui/textarea';

const CashMovementDialog = ({ isOpen, onOpenChange }) => {
    const { dispatch } = usePOS();
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [type, setType] = useState('income');

    const handleAddMovement = () => {
        if (amount <= 0 || !description.trim()) {
            toast({ title: 'Error', description: 'Monto y descripción son requeridos.', variant: 'destructive'});
            return;
        }
        dispatch({ type: 'ADD_CASH_MOVEMENT', payload: { amount, description, type } });
        toast({ title: 'Movimiento agregado', description: `Se ${type === 'income' ? 'agregó' : 'retiró'} $${amount.toFixed(2)}.`});
        onOpenChange(false);
        setAmount(0);
        setDescription('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect border-border">
                <DialogHeader><DialogTitle>Nuevo Movimiento de Caja</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="mov_type">Tipo</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <Button variant={type === 'income' ? 'default' : 'outline'} onClick={() => setType('income')} className={`${type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'border-border'}`}>Ingreso</Button>
                            <Button variant={type === 'expense' ? 'default' : 'outline'} onClick={() => setType('expense')} className={`${type === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'border-border'}`}>Retiro</Button>
                        </div>
                    </div>
                    <div><Label htmlFor="mov_amount">Monto</Label><Input id="mov_amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
                    <div><Label htmlFor="mov_desc">Descripción</Label><Textarea id="mov_desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                    <Button onClick={handleAddMovement} className="w-full">Agregar Movimiento</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function CashRegister() {
  const { state, dispatch } = usePOS();
  const [openingAmount, setOpeningAmount] = useState(0);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const handleOpenRegister = () => {
    if (openingAmount <= 0) {
      toast({ title: "Error", description: "El monto inicial debe ser mayor a 0.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'OPEN_CASH_REGISTER', payload: openingAmount });
    toast({ title: "Caja abierta", description: `Caja abierta con un monto inicial de $${openingAmount.toFixed(2)}` });
    setOpeningAmount(0);
  };

  const handleCloseRegister = () => {
    const { openingAmount, movements, salesByType, currentAmount } = state.cashRegister;
    const totalCashSales = salesByType.cash;
    const cashMovements = (movements || []).reduce((acc, mov) => mov.type === 'income' ? acc + mov.amount : acc - mov.amount, 0);
    const expectedAmount = openingAmount + totalCashSales + cashMovements;
    const difference = currentAmount - expectedAmount;

    if (window.confirm(`Monto esperado: $${expectedAmount.toFixed(2)}\nMonto actual: $${currentAmount.toFixed(2)}\nDiferencia: $${difference.toFixed(2)}\n\n¿Confirmar cierre de caja?`)) {
      dispatch({ type: 'CLOSE_CASH_REGISTER' });
      toast({ title: "Caja cerrada", description: `Caja cerrada con un monto final de $${currentAmount.toFixed(2)}` });
    }
  };

  const printReport = (closure) => {
    toast({ title: "🚧 Imprimir Reporte: Funcionalidad no implementada" });
    console.log("Printing report for closure:", closure);
  };

  const { openingAmount: currentOpening, salesByType, currentAmount, movements, isOpen, openedAt } = state.cashRegister;
  const totalCashSales = salesByType.cash || 0;
  const totalTransferSales = salesByType.transfer || 0;
  const totalMixedSales = salesByType.mixed || 0;
  const cashMovements = (movements || []).reduce((acc, mov) => mov.type === 'income' ? acc + mov.amount : acc - mov.amount, 0);
  const expectedAmount = currentOpening + totalCashSales + cashMovements;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Caja</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Estado de Caja</h2>
          {isOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div className="flex items-center space-x-3"><Unlock className="h-8 w-8 text-green-500" /><div><p className="text-lg font-medium text-green-500">Caja Abierta</p><p className="text-sm text-muted-foreground">Abierta el: {new Date(openedAt).toLocaleString()}</p></div></div><Button size="sm" onClick={() => setIsMovementDialogOpen(true)}><Plus className="h-4 w-4 mr-2"/>Movimiento</Button></div>
              <div className="space-y-2 text-base">
                <div className="flex justify-between text-muted-foreground"><span>Monto Inicial:</span><span className="font-medium">${currentOpening.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Ventas (Efectivo):</span><span className="font-medium">${totalCashSales.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Ventas (Transf.):</span><span className="font-medium">${totalTransferSales.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Ventas (Mixto):</span><span className="font-medium">${totalMixedSales.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Movimientos:</span><span className={`font-medium ${cashMovements >= 0 ? 'text-green-500' : 'text-red-500'}`}>${cashMovements.toFixed(2)}</span></div>
                <div className="flex justify-between text-foreground text-lg font-bold border-t border-border pt-2 mt-2"><span>Monto Esperado (Efectivo):</span><span>${expectedAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-foreground text-2xl font-bold"><span>Monto Actual (Efectivo):</span><span>${currentAmount.toFixed(2)}</span></div>
              </div>
              <Button onClick={handleCloseRegister} className="w-full bg-red-600 hover:bg-red-700 h-12 text-base"><Lock className="h-4 w-4 mr-2" />Cerrar Caja</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3"><Lock className="h-8 w-8 text-red-500" /><div><p className="text-lg font-medium text-red-500">Caja Cerrada</p>{state.cashClosures.length > 0 && <p className="text-sm text-muted-foreground">Último cierre: {new Date(state.cashClosures[state.cashClosures.length-1].closedAt).toLocaleString()}</p>}</div></div>
              <div><Label htmlFor="openingAmount">Monto Inicial</Label><Input id="openingAmount" type="number" step="0.01" min="0" value={openingAmount} onChange={(e) => setOpeningAmount(parseFloat(e.target.value) || 0)} className="h-12 text-lg" placeholder="0.00" /></div>
              <Button onClick={handleOpenRegister} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"><Unlock className="h-4 w-4 mr-2" />Abrir Caja</Button>
            </div>
          )}
        </div>
        
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center"><History className="mr-2 h-5 w-5"/>Historial de Cierres</h2>
          <div className="overflow-y-auto max-h-96 scrollbar-thin space-y-3">
            {state.cashClosures.length === 0 ? <p className="text-muted-foreground text-center pt-8">No hay cierres de caja.</p> :
              [...state.cashClosures].reverse().map((closure, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/50 p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{new Date(closure.closedAt).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">{new Date(closure.openedAt).toLocaleTimeString()} - {new Date(closure.closedAt).toLocaleTimeString()}</p>
                    </div>
                    <div className={`font-bold ${closure.difference === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Dif: ${closure.difference.toFixed(2)}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => printReport(closure)} className="h-8 w-8 text-muted-foreground"><Printer size={16}/></Button>
                  </div>
                </motion.div>
              ))
            }
          </div>
        </div>
      </div>
      <CashMovementDialog isOpen={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen} />
    </div>
  );
}
