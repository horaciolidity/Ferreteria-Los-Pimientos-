// src/components/pos/CashRegister.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Printer, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

/* ===================== Diálogo de movimientos ===================== */
const CashMovementDialog = ({ isOpen, onOpenChange }) => {
  const { dispatch } = usePOS();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('income');

  const handleAddMovement = () => {
    if (Number(amount) <= 0 || !description.trim()) {
      toast({
        title: 'Error',
        description: 'Monto y descripción son requeridos.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({
      type: 'ADD_CASH_MOVEMENT',
      payload: { type, concept: description.trim(), amount: Number(amount || 0) },
    });

    toast({
      title: 'Movimiento agregado',
      description: `Se ${type === 'income' ? 'agregó' : 'retiró'} $${Number(amount).toFixed(2)}.`,
    });

    onOpenChange(false);
    setAmount(0);
    setDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-border">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                variant={type === 'income' ? 'default' : 'outline'}
                onClick={() => setType('income')}
                className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'border-border'}
              >
                Ingreso
              </Button>
              <Button
                variant={type === 'expense' ? 'default' : 'outline'}
                onClick={() => setType('expense')}
                className={type === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'border-border'}
              >
                Retiro
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="mov_amount">Monto</Label>
            <Input
              id="mov_amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="mov_desc">Descripción</Label>
            <Textarea
              id="mov_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button onClick={handleAddMovement} className="w-full">
            Agregar Movimiento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ===================== Caja Principal ===================== */
export default function CashRegister() {
  const { state, dispatch } = usePOS();
  const [openingAmount, setOpeningAmount] = useState(0);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const cr = state.cashRegister || {};
  const {
    openingAmount: currentOpening = 0,
    salesByType = { cash: 0, transfer: 0, mixed: 0, credit: 0, card: 0, account: 0 },
    currentAmount = 0,
    movements = [],
    isOpen = false,
    openedAt,
    cashFromMixed = 0, // parte en efectivo de ventas mixtas
  } = cr;

  /* ===================== Totales de ventas ===================== */
  const totalCashSales = Number(salesByType.cash || 0);
  const totalTransferSales = Number(salesByType.transfer || 0);
  const totalMixedSales = Number(salesByType.mixed || 0);

  /* ===================== Movimientos netos ===================== */
  const movNet = (movements || []).reduce((acc, mov) => {
    if (mov.type === 'income') return acc + Number(mov.amount || 0);
    if (mov.type === 'expense') return acc - Number(mov.amount || 0);
    return acc;
  }, 0);

  /* ===================== Cálculos de caja ===================== */
  // Saldo real esperado por lógica contable (sin intervención del usuario)
  const computedCurrentAmount = useMemo(() => {
    return (
      Number(currentOpening || 0) +
      Number(totalCashSales || 0) +
      Number(cashFromMixed || 0) +
      Number(movNet || 0)
    );
  }, [currentOpening, totalCashSales, cashFromMixed, movNet]);

  // Monto esperado (idéntico al saldo real calculado)
  const expectedAmount = computedCurrentAmount;

  // Diferencia: entre lo que el usuario declara físicamente en caja y lo calculado
  const difference = Number(currentAmount || 0) - Number(expectedAmount || 0);

  /* ===================== Totales del turno ===================== */
  const salesInTurn = useMemo(() => {
    if (!openedAt) return [];
    const start = new Date(openedAt);
    return (state.sales || []).filter((s) => {
      if (s.type === 'quote') return false;
      const when = new Date(s.timestamp);
      return when >= start;
    });
  }, [state.sales, openedAt]);

  const subtotalTurno = salesInTurn.reduce(
    (s, x) => s + Number(x.subtotal || 0) - Number(x.itemDiscounts || 0) - Number(x.discount || 0),
    0
  );
  const ivaTurno = salesInTurn.reduce((s, x) => s + Number(x.taxAmount || x.tax || 0), 0);
  const totalTurno = salesInTurn.reduce((s, x) => s + Number(x.total || 0), 0);
  const gananciaTurno = salesInTurn.reduce((s, x) => s + Number(x.profit || 0), 0);
  const desgloseMetodo = salesInTurn.reduce((acc, s) => {
    const m = s?.payment?.method ?? s?.paymentMethod ?? 'desconocido';
    acc[m] = (acc[m] || 0) + Number(s.total || 0);
    return acc;
  }, {});

  /* ===================== Apertura / Cierre ===================== */
  const handleOpenRegister = () => {
    if (Number(openingAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'El monto inicial debe ser mayor a 0.',
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'OPEN_CASH_REGISTER', payload: Number(openingAmount) });
    toast({
      title: 'Caja abierta',
      description: `Caja abierta con un monto inicial de $${Number(openingAmount).toFixed(2)}`,
    });
    setOpeningAmount(0);
  };

  const handleCloseRegister = () => {
    if (!isOpen) return;
    const msg = `
FÓRMULA:
Esperado = Monto inicial + Ventas Efectivo + Efectivo de Mixto + Movimientos

Monto inicial: $${Number(currentOpening).toFixed(2)}
Ventas Efectivo: $${Number(totalCashSales).toFixed(2)}
Efectivo de Mixto: $${Number(cashFromMixed || 0).toFixed(2)}
Movimientos: $${Number(movNet).toFixed(2)}

Esperado: $${Number(expectedAmount).toFixed(2)}
Actual:   $${Number(currentAmount).toFixed(2)}
Diferencia: $${Number(difference).toFixed(2)}

¿Confirmar cierre de caja?`;
    if (window.confirm(msg)) {
      dispatch({
        type: 'CLOSE_CASH_REGISTER',
        payload: { currentAmount: computedCurrentAmount },
      });
      toast({
        title: 'Caja cerrada',
        description: `Caja cerrada con un monto final de $${Number(
          computedCurrentAmount
        ).toFixed(2)}`,
      });
    }
  };

  /* ===================== Impresión de cierre ===================== */
  const printReport = (closure) => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      toast({
        title: 'Pop-up bloqueado',
        description: 'Permití ventanas emergentes para imprimir.',
        variant: 'destructive',
      });
      return;
    }
    const style = `
      <style>
        body{font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:#111}
        h1{font-size:20px;margin:0 0 8px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f6f6f6}
        .right{text-align:right}
      </style>
    `;
    const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
    const movNetClosure = (closure.movements || []).reduce((a, m) => {
      if (m.type === 'income') return a + Number(m.amount || 0);
      if (m.type === 'expense') return a - Number(m.amount || 0);
      return a;
    }, 0);
    const html = `
      <!doctype html><html><head><meta charset="utf-8"><title>Cierre de Caja</title>${style}</head><body>
        <h1>Cierre de Caja</h1>
        <p>
          Abierta: ${new Date(closure.openedAt).toLocaleString()}<br/>
          Cerrada: ${new Date(closure.closedAt).toLocaleString()}
        </p>
        <table>
          <tr><th>Inicial</th><th>Ventas Efectivo</th><th>Mov. Neto</th><th>Esperado</th><th>Actual</th><th>Diferencia</th></tr>
          <tr>
            <td class="right">${fmt(closure.openingAmount)}</td>
            <td class="right">${fmt(closure.salesByType?.cash || 0)}</td>
            <td class="right">${fmt(movNetClosure)}</td>
            <td class="right">${fmt(closure.expectedAmount)}</td>
            <td class="right">${fmt(closure.currentAmount)}</td>
            <td class="right">${fmt(closure.difference)}</td>
          </tr>
        </table>
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  /* ===================== Render ===================== */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Caja</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Caja */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Estado de Caja</h2>

          {isOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Unlock className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-lg font-medium text-green-500">Caja Abierta</p>
                    <p className="text-sm text-muted-foreground">
                      Abierta el: {openedAt ? new Date(openedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setIsMovementDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Movimiento
                </Button>
              </div>

              <div className="space-y-2 text-base">
                <div className="flex justify-between text-muted-foreground">
                  <span>Monto Inicial</span>
                  <span className="font-medium">${Number(currentOpening).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ventas (Efectivo)</span>
                  <span className="font-medium">${Number(totalCashSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ventas (Transf.)</span>
                  <span className="font-medium">${Number(totalTransferSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Ventas (Mixto - Total)</span>
                  <span className="font-medium">${Number(totalMixedSales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Mixto (Parte en efectivo)</span>
                  <span className="font-medium">${Number(cashFromMixed || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Movimientos</span>
                  <span
                    className={`font-medium ${
                      movNet >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    ${Number(movNet).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-foreground text-lg font-bold border-t border-border pt-2 mt-2">
                  <span>Monto Esperado (Efectivo)</span>
                  <span>${Number(expectedAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-foreground text-2xl font-bold">
                  <span>Monto Actual (Efectivo)</span>
                  <span>${Number(computedCurrentAmount).toFixed(2)}</span>
                </div>
                <div
                  className={`flex justify-between text-lg font-semibold ${
                    Number(difference) === 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <span>Diferencia</span>
                  <span>${Number(difference).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fórmula: inicial + ventas efectivo + efectivo de mixto + movimientos
                </p>
              </div>

              <Button
                onClick={handleCloseRegister}
                className="w-full bg-red-600 hover:bg-red-700 h-12 text-base"
              >
                <Lock className="h-4 w-4 mr-2" />
                Cerrar Caja
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Lock className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-lg font-medium text-red-500">Caja Cerrada</p>
                  {state.cashClosures.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Último cierre:{' '}
                      {new Date(
                        state.cashClosures[state.cashClosures.length - 1].closedAt
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="openingAmount">Monto Inicial</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(parseFloat(e.target.value) || 0)}
                  className="h-12 text-lg"
                  placeholder="0.00"
                />
              </div>
              <Button
                onClick={handleOpenRegister}
                className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caja
              </Button>
            </div>
          )}
        </div>

        {/* Totales del turno */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Totales del Turno</h2>
          {!isOpen ? (
            <p className="text-muted-foreground">
              Abrí la caja para empezar un turno y ver sus totales.
            </p>
          ) : (
            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span>Subtotal (sin IVA)</span>
                <span className="font-medium">${Number(subtotalTurno).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA</span>
                <span className="font-medium">${Number(ivaTurno).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-medium">${Number(totalTurno).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ganancia Neta</span>
                <span className="font-medium text-green-600">
                  ${Number(gananciaTurno).toFixed(2)}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">
                  Desglose por método (total ventas)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(desgloseMetodo).map(([m, v]) => (
                    <div
                      key={m}
                      className="flex justify-between bg-background/50 rounded px-3 py-2 text-sm"
                    >
                      <span className="capitalize">{m}</span>
                      <span className="font-medium">${Number(v).toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.keys(desgloseMetodo).length === 0 && (
                    <div className="text-muted-foreground text-sm">Sin ventas aún.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Cierres */}
      <div className="card-glass p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <History className="mr-2 h-5 w-5" />
          Historial de Cierres
        </h2>
        <div className="overflow-y-auto max-h-96 scrollbar-thin space-y-3">
          {state.cashClosures.length === 0 ? (
            <p className="text-muted-foreground text-center pt-8">No hay cierres de caja.</p>
          ) : (
            [...state.cashClosures].reverse().map((closure, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-background/50 p-3 rounded-lg text-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {new Date(closure.closedAt).toLocaleDateString()}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(closure.openedAt).toLocaleTimeString()} -{' '}
                      {new Date(closure.closedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div
                    className={`font-bold ${
                      Number(closure.difference || 0) === 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    Dif: ${Number(closure.difference || 0).toFixed(2)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => printReport(closure)}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Printer size={16} />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <CashMovementDialog
        isOpen={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
      />
    </div>
  );
}
