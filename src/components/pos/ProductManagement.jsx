
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, Upload, Download, Search, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

export default function ProductManagement() {
  const { state, dispatch } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    price: 0,
    cost: 0,
    stock: 0,
    unit: 'unidad',
    category: '',
    providerId: '',
    minStock: 0
  });

  const categories = [...new Set(state.products.map(p => p.category).filter(Boolean))];
  
  const filteredProducts = state.products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setNewProduct({
      code: '',
      name: '',
      price: 0,
      cost: 0,
      stock: 0,
      unit: 'unidad',
      category: '',
      providerId: '',
      minStock: 0
    });
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    if (!newProduct.name.trim() || !newProduct.code.trim()) {
      toast({ title: "Error", description: "Nombre y código son requeridos", variant: "destructive" });
      return;
    }

    if (editingProduct) {
      dispatch({ type: 'UPDATE_PRODUCT', payload: { id: editingProduct.id, updates: newProduct } });
      toast({ title: "Producto actualizado", description: `${newProduct.name} ha sido actualizado` });
    } else {
      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
      toast({ title: "Producto agregado", description: `${newProduct.name} ha sido agregado` });
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditProduct = (product) => {
    setNewProduct(product);
    setEditingProduct(product);
    setIsAddDialogOpen(true);
  };

  const handleDeleteProduct = (productId) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: productId });
    toast({ title: "Producto eliminado", description: "El producto ha sido eliminado" });
  };

  const exportProducts = () => {
    const dataStr = JSON.stringify(state.products, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'productos.json';
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Productos exportados" });
  };

  const importProducts = () => {
    toast({ title: "🚧 Esta funcionalidad no está implementada" });
  };

  const adjustStock = (productId, adjustment) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    const newStock = Math.max(0, product.stock + adjustment);
    dispatch({ type: 'UPDATE_PRODUCT', payload: { id: productId, updates: { stock: newStock } } });
    toast({ title: "Stock ajustado", description: `${product.name}: ${product.stock} → ${newStock}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <div className="flex space-x-2">
          <Button onClick={importProducts} variant="outline"><Upload className="h-4 w-4 mr-2" />Importar</Button>
          <Button onClick={exportProducts} variant="outline"><Download className="h-4 w-4 mr-2" />Exportar</Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button></DialogTrigger>
            <DialogContent className="card-glass border-border max-w-2xl">
              <DialogHeader><DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="code">Código *</Label><Input id="code" value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} /></div>
                <div><Label htmlFor="name">Nombre *</Label><Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
                <div><Label htmlFor="price">Precio</Label><Input id="price" type="number" step="0.01" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label htmlFor="cost">Costo</Label><Input id="cost" type="number" step="0.01" min="0" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label htmlFor="stock">Stock</Label><Input id="stock" type="number" min="0" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label htmlFor="unit">Unidad</Label><Select value={newProduct.unit} onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unidad">Unidad</SelectItem><SelectItem value="kg">Kilogramo</SelectItem><SelectItem value="metro">Metro</SelectItem><SelectItem value="litro">Litro</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="category">Categoría</Label><Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} list="categories" /><datalist id="categories">{categories.map(cat => (<option key={cat} value={cat} />))}</datalist></div>
                <div><Label htmlFor="providerId">Proveedor</Label><Select value={newProduct.providerId} onValueChange={(value) => setNewProduct({ ...newProduct, providerId: value })}><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{state.providers.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                <div><Label htmlFor="minStock">Stock mínimo</Label><Input id="minStock" type="number" min="0" value={newProduct.minStock} onChange={(e) => setNewProduct({ ...newProduct, minStock: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="flex space-x-2 mt-4"><Button onClick={handleSaveProduct} className="flex-1">{editingProduct ? 'Actualizar' : 'Agregar'}</Button><Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancelar</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="card-glass p-4 rounded-lg"><div className="flex items-center space-x-4"><Search className="h-5 w-5 text-primary" /><Input placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" /></div></div>

      <div className="card-glass p-6 rounded-lg"><div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="text-left text-muted-foreground p-2">Código</th><th className="text-left text-muted-foreground p-2">Nombre</th><th className="text-left text-muted-foreground p-2">Proveedor</th><th className="text-right text-muted-foreground p-2">Precio</th><th className="text-right text-muted-foreground p-2">Stock</th><th className="text-right text-muted-foreground p-2">Margen</th><th className="text-center text-muted-foreground p-2">Acciones</th></tr></thead>
          <tbody>
            {filteredProducts.map((product, index) => {
              const margin = product.price > 0 ? ((product.price - product.cost) / product.price * 100) : 0;
              const stockColor = product.stock <= product.minStock ? (product.stock === 0 ? 'text-red-500' : 'text-yellow-500') : 'text-green-500';
              const provider = state.providers.find(p => p.id === product.providerId);
              return (
                <motion.tr key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-border/50 hover:bg-accent">
                  <td className="p-3 text-muted-foreground">{product.code}</td>
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3 text-muted-foreground">{provider?.name || 'N/A'}</td>
                  <td className="p-3 text-right">${product.price.toFixed(2)}</td>
                  <td className={`p-3 text-right font-medium ${stockColor}`}>{product.stock} {product.unit}</td>
                  <td className="p-3 text-right text-green-500">{margin.toFixed(1)}%</td>
                  <td className="p-3"><div className="flex items-center justify-center space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => adjustStock(product.id, -1)} className="h-8 w-8 text-red-500"><Minus size={16} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => adjustStock(product.id, 1)} className="h-8 w-8 text-green-500"><Plus size={16} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEditProduct(product)} className="h-8 w-8 text-primary"><Edit3 size={16} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 text-red-500"><Trash2 size={16} /></Button>
                  </div></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {filteredProducts.length === 0 && <div className="text-center py-8"><Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" /><p className="text-muted-foreground">No se encontraron productos</p></div>}
      </div></div>
    </div>
  );
}
