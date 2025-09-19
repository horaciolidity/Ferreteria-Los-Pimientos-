// src/components/pos/PaymentPanel.jsx
import React, { useState, useEffect } from "react";
import {
  CreditCard,
  DollarSign,
  Receipt,
  FileText,
  Calculator,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePOS } from "@/contexts/POSContext";
import DocumentPreview from "@/components/pos/DocumentPreview";
import NumericInput from "@/components/common/NumericInput";

export default function PaymentPanel() {
  // Tomamos dispatch si el contexto lo expone (en algunas versiones lo hace)
  const pos = usePOS();
  const {
    state,
    setPaymentMethod,
    setPaymentAmount,
    applyDiscount,
    calculateTotal,
    addCustomer,
  } = pos;
  const dispatch = pos?.dispatch; // puede ser undefined

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [documentType, setDocumentType] = useState("sale"); // sale | remit | quote | credit
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: 0,
  });

  const total = calculateTotal();
  const change =
    state.paymentMethod === "cash"
      ? Math.max(0, Number(state.paymentAmount || 0) - total)
      : 0;

  // Si el método es transferencia, igualo el monto pagado al total automáticamente
  useEffect(() => {
    if (state.paymentMethod === "transfer") {
      setPaymentAmount(total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paymentMethod, total]);

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === "transfer") {
      setPaymentAmount(total);
    } else if (method === "cash") {
      // en efectivo reiniciamos para tipear manualmente (sin forzar 0 en el input)
      setPaymentAmount(null);
    } else if (method === "mixed") {
      // en mixto iniciamos vacío para que el usuario indique la parte en efectivo
      setPaymentAmount(null);
    }
  };

  const setCustomerSafe = (customer) => {
    try {
      if (typeof dispatch === "function") {
        dispatch({ type: "SET_CUSTOMER", payload: customer });
      }
    } catch (_) {}
  };

  const handleAddNewCustomer = () => {
    const created = addCustomer(newCustomer);
    if (created) {
      setCustomerSafe(created);
      setIsCustomerDialogOpen(false);
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: "",
        creditLimit: 0,
      });
    }
  };

  const handleFinalize = (type) => {
    setDocumentType(type);
    setIsPreviewOpen(true);
  };

  if (state.cart.length === 0) {
    return (
      <div className="card-glass p-6 rounded-lg text-center py-16">
        <Calculator className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">
          Agregá productos para pagar
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="card-glass p-6 rounded-lg space-y-6 text-base">
        <h2 className="text-xl font-semibold">Finalizar Venta</h2>

        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente (opcional)</Label>
          <div className="flex space-x-2">
            <Select
              onValueChange={(val) => {
                const customer = state.customers.find((c) => c.id === val);
                setCustomerSafe(customer);
              }}
              value={state.currentCustomer?.id || ""}
            >
              <SelectTrigger className="flex-1 h-12 text-base">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {state.customers.map((customer) => (
                  <SelectItem
                    key={customer.id}
                    value={customer.id}
                    className="text-base"
                  >
                    {customer.name}
                    {customer.balance < 0 && (
                      <span className="text-red-500 ml-2">
                        (Debe: ${Math.abs(customer.balance).toFixed(2)})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog
              open={isCustomerDialogOpen}
              onOpenChange={setIsCustomerDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 w-12">
                  <Users />
                </Button>
              </DialogTrigger>
              <DialogContent className="card-glass border-border">
                <DialogHeader>
                  <DialogTitle>Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Nombre *</Label>
                    <Input
                      id="customerName"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Teléfono *</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerAddress">Dirección</Label>
                    <Input
                      id="customerAddress"
                      value={newCustomer.address}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="creditLimit">Límite de crédito</Label>
                    <NumericInput
                      id="creditLimit"
                      allowDecimal={false}
                      value={newCustomer.creditLimit}
                      onChange={(v) =>
                        setNewCustomer({
                          ...newCustomer,
                          creditLimit: typeof v === "number" ? v : 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleAddNewCustomer} className="flex-1">
                      Agregar Cliente
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCustomerDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-2">
          <Label>Método de pago</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="lg"
              variant={state.paymentMethod === "cash" ? "default" : "outline"}
              onClick={() => handlePaymentMethodChange("cash")}
              className="h-14 text-base"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Efectivo
            </Button>
            <Button
              size="lg"
              variant={
                state.paymentMethod === "transfer" ? "default" : "outline"
              }
              onClick={() => handlePaymentMethodChange("transfer")}
              className="h-14 text-base"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Transf.
            </Button>
            <Button
              size="lg"
              variant={state.paymentMethod === "mixed" ? "default" : "outline"}
              onClick={() => handlePaymentMethodChange("mixed")}
              className="h-14 text-base"
            >
              Mixto
            </Button>
          </div>
        </div>

        {/* Monto en efectivo (si aplica) */}
        {state.paymentMethod !== "transfer" && (
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">
              Monto {state.paymentMethod === "cash" ? "recibido" : "en efectivo"}
            </Label>
            <NumericInput
              id="paymentAmount"
              value={state.paymentAmount}
              onChange={(v) => setPaymentAmount(typeof v === "number" ? v : 0)}
              className="h-12 text-lg"
            />
            {state.paymentMethod === "cash" && change > 0 && (
              <div className="text-green-600 font-semibold text-lg">
                Vuelto: ${change.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Descuento global */}
        <div className="space-y-2">
          <Label htmlFor="discount">Descuento Global ($)</Label>
          <NumericInput
            id="discount"
            value={state.discount}
            onChange={(v) => applyDiscount(typeof v === "number" ? v : 0)}
            className="h-12 text-lg"
          />
        </div>

        {/* Total */}
        <div className="bg-primary/10 p-4 rounded-lg text-center">
          <p className="text-muted-foreground">Total a pagar</p>
          <p className="text-4xl font-bold">${total.toFixed(2)}</p>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            id="btn-invoice"
            size="lg"
            onClick={() => handleFinalize("sale")}
            disabled={!state.cashRegister.isOpen}
            className="h-16 text-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <Receipt className="h-5 w-5 mr-2" />
            Factura (F10)
          </Button>

          <Button
            id="btn-remit"
            size="lg"
            onClick={() => handleFinalize("remit")}
            variant="outline"
            className="h-16 text-lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Remito (F9)
          </Button>

          <Button
            id="btn-quote"
            size="lg"
            onClick={() => handleFinalize("quote")}
            variant="outline"
            className="h-16 text-lg col-span-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-500"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Presupuesto (F8)
          </Button>

          <Button
            onClick={() => handleFinalize("credit")}
            variant="outline"
            size="lg"
            disabled={!state.currentCustomer}
            className="h-16 text-lg col-span-2 border-purple-500 text-purple-500 hover:bg-purple-500/10 hover:text-purple-500 disabled:opacity-50"
          >
            <Users className="h-5 w-5 mr-2" />
            A Cuenta
          </Button>
        </div>

        {!state.cashRegister.isOpen && (
          <div className="text-center text-red-500 text-sm mt-2">
            La caja debe estar abierta para procesar ventas.
          </div>
        )}
      </div>

      {/* Preview: confirma y emite (DocumentPreview se encarga de llamar a processSale) */}
      <DocumentPreview
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        documentType={documentType}
        onConfirm={() => {
          // No llamamos a processSale acá para evitar doble emisión.
          setIsPreviewOpen(false);
        }}
      />
    </>
  );
}
