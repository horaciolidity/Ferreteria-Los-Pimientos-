
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit3, Trash2, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

export default function CustomerManagement() {
  const { state, dispatch, addCustomer } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', creditLimit: 0 });

  const filteredCustomers = state.customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const resetForm = () => {
    setNewCustomer({ name: '', phone: '', email: '', address: '', creditLimit: 0 });
    setEditingCustomer(null);
  };

  const handleSaveCustomer = () => {
    if (editingCustomer) {
      if (!newCustomer.name?.trim() || !newCustomer.phone?.trim()) {
        toast({ title: "Error", description: "Nombre y teléfono son requeridos", variant: "destructive" });
        return;
      }
      dispatch({ type: 'UPDATE_CUSTOMER', payload: { id: editingCustomer.id, updates: newCustomer } });
      toast({ title: "Cliente actualizado", description: `${newCustomer.name} ha sido actualizado.` });
    } else {
      const created = addCustomer(newCustomer);
      if (!created) return;
    }
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditCustomer = (customer) => {
    setNewCustomer(customer);
    setEditingCustomer(customer);
    setIsAddDialogOpen(true);
  };

  const handleDeleteCustomer = (customerId) => {
    const customer = state.customers.find(c => c.id === customerId);
    if (customer?.balance < 0) {
      toast({ title: "Error", description: "No se puede eliminar un cliente con deuda pendiente.", variant: "destructive" });
      return;
    }
    dispatch({ type: 'DELETE_CUSTOMER', payload: customerId });
    toast({ title: "Cliente eliminado", description: "El cliente ha sido eliminado." });
  };

  const adjustBalance = (customerId, currentBalance) => {
    const payment = prompt(`Realizar pago para cliente. Saldo actual: $${currentBalance.toFixed(2)}. Ingrese monto:`);
    if (payment && !isNaN(parseFloat(payment))) {
      const newBalance = currentBalance + parseFloat(payment);
      dispatch({ type: 'UPDATE_CUSTOMER', payload: { id: customerId, updates: { balance: newBalance } } });
      toast({ title: "Saldo ajustado", description: `Nuevo saldo: $${newBalance.toFixed(2)}` });
    }
  };

  const getCustomerSales = (customerId) => state.sales.filter(sale => sale.customer?.id === customerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button></DialogTrigger>
          <DialogContent className="card-glass border-border">
            <DialogHeader><DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label htmlFor="name">Nombre *</Label><Input id="name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} /></div>
              <div><Label htmlFor="phone">Teléfono *</Label><Input id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} /></div>
              <div><Label htmlFor="address">Dirección</Label><Input id="address" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} /></div>
              <div><Label htmlFor="creditLimit">Límite de crédito</Label><Input id="creditLimit" type="number" min="0" value={newCustomer.creditLimit} onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: parseFloat(e.target.value) || 0 })} /></div>
              <div className="flex space-x-2"><Button onClick={handleSaveCustomer} className="flex-1">{editingCustomer ? 'Actualizar' : 'Agregar'}</Button><Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancelar</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-glass p-4 rounded-lg"><div className="flex items-center space-x-4"><Search className="h-5 w-5 text-primary" /><Input placeholder="Buscar clientes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" /></div></div>

      <div className="card-glass p-6 rounded-lg"><div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead><tr className="border-b border-border"><th className="text-left text-muted-foreground p-2">Nombre</th><th className="text-left text-muted-foreground p-2">Contacto</th><th className="text-right text-muted-foreground p-2">Saldo</th><th className="text-right text-muted-foreground p-2">Límite</th><th className="text-right text-muted-foreground p-2">Ventas</th><th className="text-center text-muted-foreground p-2">Acciones</th></tr></thead>
          <tbody>
            {filteredCustomers.map((customer, index) => {
              const customerSales = getCustomerSales(customer.id);
              const totalSalesValue = customerSales.reduce((sum, sale) => sum + sale.total, 0);
              const balanceColor = customer.balance < 0 ? 'text-red-500' : customer.balance > 0 ? 'text-green-500' : 'text-muted-foreground';
              return (
                <motion.tr key={customer.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-border/50 hover:bg-accent">
                  <td className="p-3"><div className="font-medium">{customer.name}</div><div className="text-muted-foreground text-sm">{customer.address}</div></td>
                  <td className="p-3"><div className="text-muted-foreground text-sm"><div>{customer.email}</div><div>{customer.phone}</div></div></td>
                  <td className={`p-3 text-right font-medium ${balanceColor}`}>${customer.balance.toFixed(2)}</td>
                  <td className="p-3 text-right text-muted-foreground">${customer.creditLimit.toFixed(2)}</td>
                  <td className="p-3 text-right"><div>{customerSales.length}</div><div className="text-muted-foreground text-sm">${totalSalesValue.toFixed(2)}</div></td>
                  <td className="p-3"><div className="flex items-center justify-center space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => adjustBalance(customer.id, customer.balance)} className="h-8 w-8 text-green-500"><CreditCard size={16} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEditCustomer(customer)} className="h-8 w-8 text-primary"><Edit3 size={16} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteCustomer(customer.id)} className="h-8 w-8 text-red-500"><Trash2 size={16} /></Button>
                  </div></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {filteredCustomers.length === 0 && <div className="text-center py-8"><Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" /><p className="text-muted-foreground">No se encontraron clientes</p></div>}
      </div></div>
    </div>
  );
}
