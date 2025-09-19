// src/components/pos/ProviderManagement.jsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Plus,
  Edit3,
  Trash2,
  Search,
  FileDown,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePOS } from "@/contexts/POSContext";
import { toast } from "@/components/ui/use-toast";

/* ---------- Formulario de proveedor ---------- */
const ProviderForm = ({ provider, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    provider || { name: "", contactPerson: "", phone: "", email: "" }
  );

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido.",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="provName">Nombre *</Label>
        <Input
          id="provName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="provContact">Contacto</Label>
        <Input
          id="provContact"
          value={formData.contactPerson}
          onChange={(e) =>
            setFormData({ ...formData, contactPerson: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="provPhone">Teléfono</Label>
        <Input
          id="provPhone"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="provEmail">Email</Label>
        <Input
          id="provEmail"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />
      </div>

      <div className="flex space-x-2">
        <Button onClick={handleSave} className="flex-1">
          Guardar
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

/* ---------- Listado de proveedores ---------- */
const ProviderList = ({ onEdit }) => {
  const { state, dispatch } = usePOS();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProviders = (state.providers || []).filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (providerId, providerName) => {
    if (window.confirm(`¿Seguro que quieres eliminar a ${providerName}?`)) {
      dispatch({ type: "DELETE_PROVIDER", payload: providerId });
      toast({ title: "Proveedor eliminado" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-glass p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <Search className="h-5 w-5 text-primary" />
          <Input
            placeholder="Buscar proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="card-glass p-6 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground p-2">Nombre</th>
                <th className="text-left text-muted-foreground p-2">
                  Contacto
                </th>
                <th className="text-center text-muted-foreground p-2">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map((p) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border/50 hover:bg-accent"
                >
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">
                    <div className="text-muted-foreground">{p.contactPerson}</div>
                    <div className="text-muted-foreground/80 text-xs">
                      {p.phone} | {p.email}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(p)}
                        className="h-8 w-8 text-primary"
                      >
                        <Edit3 size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="h-8 w-8 text-red-500"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredProviders.length === 0 && (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">
                No se encontraron proveedores
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Vista de Recompra por proveedor ---------- */
const RestockView = () => {
  const { state, dispatch } = usePOS();

  const restockData = useMemo(() => {
    return Object.entries(state.providerRestock || {})
      .map(([providerId, products]) => {
        const provider = (state.providers || []).find((p) => p.id === providerId);
        if (!provider) return null;

        const items = Object.entries(products)
          .map(([productId, soldQty]) => {
            const product = (state.products || []).find((p) => p.id === productId);
            if (!product) return null;

            const suggestedQty = Math.max(
              0,
              (Number(product.minStock) || 0) + Number(soldQty || 0) - Number(product.stock || 0)
            );

            return { ...product, soldQty: Number(soldQty || 0), suggestedQty };
          })
          .filter(Boolean);

        return { provider, items };
      })
      .filter(Boolean);
  }, [state.providerRestock, state.products, state.providers]);

  const exportToCSV = (_providerId, providerName, items) => {
    let csv = "\uFEFFCódigo,Producto,Vendido,Stock Actual,Sugerido\n"; // BOM + cabecera
    items.forEach((it) => {
      csv += `${it.code},${it.name},${it.soldQty},${it.stock},${it.suggestedQty}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recompra_${providerName.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Recompra exportada" });
  };

  const markAsAttended = (providerId) => {
    dispatch({ type: "RESET_PROVIDER_RESTOCK", payload: providerId });
    toast({ title: "Recompra reseteada" });
  };

  return (
    <div className="space-y-6">
      {restockData.length === 0 && (
        <div className="card-glass p-8 rounded-lg text-center">
          <Truck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground">
            No hay datos de recompra. Realice ventas para generarlos.
          </p>
        </div>
      )}

      {restockData.map(({ provider, items }) => (
        <div key={provider.id} className="card-glass p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{provider.name}</h3>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAsAttended(provider.id)}
                className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar Atendido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(provider.id, provider.name, items)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-muted-foreground">Producto</th>
                  <th className="p-2 text-right text-muted-foreground">Vendido</th>
                  <th className="p-2 text-right text-muted-foreground">Stock Actual</th>
                  <th className="p-2 text-right text-muted-foreground">Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2 text-right text-muted-foreground">
                      {item.soldQty}
                    </td>
                    <td className="p-2 text-right font-medium text-yellow-500">
                      {item.stock}
                    </td>
                    <td className="p-2 text-right font-bold text-green-500">
                      {Number(item.suggestedQty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Página principal de Proveedores ---------- */
export default function ProviderManagement() {
  const { addProvider, dispatch } = usePOS();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  const handleSave = (data) => {
    if (editingProvider) {
      dispatch({
        type: "UPDATE_PROVIDER",
        payload: { id: editingProvider.id, updates: data },
      });
      toast({ title: "Proveedor actualizado" });
    } else {
      addProvider(data);
    }
    setIsFormOpen(false);
    setEditingProvider(null);
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    setEditingProvider(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProvider(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>

          <DialogContent className="card-glass border-border">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
            </DialogHeader>

            <ProviderForm
              provider={editingProvider}
              onSave={handleSave}
              onCancel={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Listado</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ProviderList onEdit={handleEdit} />
        </TabsContent>

        <TabsList className="hidden" />
        <TabsContent value="restock" className="hidden">
          <RestockView />
        </TabsContent>
      </Tabs>

      {/* Si querés mostrar “Recompra” como segunda pestaña, 
          reemplazá el bloque de Tabs por este:

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Listado</TabsTrigger>
          <TabsTrigger value="restock">Recompra</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <ProviderList onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="restock">
          <RestockView />
        </TabsContent>
      </Tabs>
      */}
    </div>
  );
}
