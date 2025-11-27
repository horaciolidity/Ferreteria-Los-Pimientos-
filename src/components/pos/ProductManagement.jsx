import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, Upload, Download, Search, Minus, AlertTriangle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

// Función de validación mejorada
const validateProduct = (product, products, editingId = null) => {
  const errors = [];

  // Validar código único
  const duplicateCode = products.find(p => 
    p.code === product.code && p.id !== editingId
  );
  if (duplicateCode) {
    errors.push(`El código "${product.code}" ya existe en el producto "${duplicateCode.name}"`);
  }

  // Validar campos requeridos
  if (!product.code?.trim()) errors.push("El código es requerido");
  if (!product.name?.trim()) errors.push("El nombre es requerido");
  
  // Validar precios
  if (product.price < 0) errors.push("El precio no puede ser negativo");
  if (product.cost < 0) errors.push("El costo no puede ser negativo");
  if (product.price < product.cost) {
    errors.push("El precio de venta no puede ser menor al costo");
  }

  // Validar stock
  if (product.stock < 0) errors.push("El stock no puede ser negativo");
  if (product.minStock < 0) errors.push("El stock mínimo no puede ser negativo");

  return errors;
};

export default function ProductManagement() {
  const { state, dispatch } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  
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

  // Obtener categorías únicas para el filtro
  const categories = useMemo(() => 
    [...new Set(state.products.map(p => p.category).filter(Boolean).sort())],
    [state.products]
  );

  // Productos filtrados y ordenados con useMemo para mejor rendimiento
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = state.products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !categoryFilter || product.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Ordenar alfabéticamente por nombre
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.products, searchQuery, categoryFilter]);

  // Paginación para manejar muchos productos
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Mostrar 50 productos por página

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);

  // Validar producto en tiempo real
  const validateInRealTime = useCallback((product, editingId = null) => {
    const errors = validateProduct(product, state.products, editingId);
    setValidationErrors(errors);
    return errors.length === 0;
  }, [state.products]);

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
    setValidationErrors([]);
  };

  const handleSaveProduct = () => {
    if (!validateInRealTime(newProduct, editingProduct?.id)) {
      toast({ 
        title: "Errores de validación", 
        description: validationErrors.join(', '), 
        variant: "destructive" 
      });
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
    setCurrentPage(1); // Volver a primera página después de agregar
  };

  const handleEditProduct = (product) => {
    setNewProduct(product);
    setEditingProduct(product);
    setIsAddDialogOpen(true);
    validateInRealTime(product, product.id);
  };

  const handleDeleteProduct = (productId) => {
    const product = state.products.find(p => p.id === productId);
    if (product && window.confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
      dispatch({ type: 'DELETE_PRODUCT', payload: productId });
      toast({ title: "Producto eliminado", description: "El producto ha sido eliminado" });
    }
  };

  // Exportación mejorada
  const exportProducts = (format = 'json') => {
    try {
      let dataStr, mimeType, extension;
      
      if (format === 'csv') {
        const headers = ['Código', 'Nombre', 'Proveedor', 'Precio', 'Costo', 'Stock', 'Unidad', 'Categoría', 'Stock Mínimo'];
        const csvData = state.products.map(p => [
          p.code,
          p.name,
          state.providers.find(prov => prov.id === p.providerId)?.name || 'N/A',
          p.price,
          p.cost,
          p.stock,
          p.unit,
          p.category,
          p.minStock
        ]);
        
        const csvContent = [headers, ...csvData]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        
        dataStr = csvContent;
        mimeType = 'text/csv;charset=utf-8;';
        extension = 'csv';
      } else {
        dataStr = JSON.stringify(state.products, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      }

      const dataBlob = new Blob([dataStr], { type: mimeType });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productos.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: `Productos exportados a ${format.toUpperCase()}` });
    } catch (error) {
      console.error('Error exporting products:', error);
      toast({ 
        title: "Error al exportar", 
        description: "No se pudieron exportar los productos", 
        variant: "destructive" 
      });
    }
  };

  const adjustStock = (productId, adjustment) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newStock = Math.max(0, product.stock + adjustment);
    dispatch({ type: 'UPDATE_PRODUCT', payload: { id: productId, updates: { stock: newStock } } });
    toast({ 
      title: "Stock ajustado", 
      description: `${product.name}: ${product.stock} → ${newStock}` 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Gestión de Productos 
          <span className="text-sm text-muted-foreground ml-2">
            ({state.products.length} productos totales)
          </span>
        </h1>
        <div className="flex space-x-2">
          <Button onClick={() => exportProducts('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
          <Button onClick={() => exportProducts('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />Exportar JSON
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="card-glass border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>
              
              {/* Mostrar errores de validación */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">Errores de validación:</span>
                  </div>
                  <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código *</Label>
                  <Input 
                    id="code" 
                    value={newProduct.code} 
                    onChange={(e) => {
                      const updated = { ...newProduct, code: e.target.value };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                    className={validationErrors.some(e => e.includes('código')) ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input 
                    id="name" 
                    value={newProduct.name} 
                    onChange={(e) => {
                      const updated = { ...newProduct, name: e.target.value };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={newProduct.price} 
                    onChange={(e) => {
                      const updated = { ...newProduct, price: parseFloat(e.target.value) || 0 };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input 
                    id="cost" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={newProduct.cost} 
                    onChange={(e) => {
                      const updated = { ...newProduct, cost: parseFloat(e.target.value) || 0 };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    min="0" 
                    value={newProduct.stock} 
                    onChange={(e) => {
                      const updated = { ...newProduct, stock: parseFloat(e.target.value) || 0 };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidad</Label>
                  <Select 
                    value={newProduct.unit} 
                    onValueChange={(value) => {
                      const updated = { ...newProduct, unit: value };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramo</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input 
                    id="category" 
                    value={newProduct.category} 
                    onChange={(e) => {
                      const updated = { ...newProduct, category: e.target.value };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                    list="categories" 
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="providerId">Proveedor</Label>
                  <Select 
                    value={newProduct.providerId} 
                    onValueChange={(value) => {
                      const updated = { ...newProduct, providerId: value };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..."/>
                    </SelectTrigger>
                    <SelectContent>
                      {state.providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minStock">Stock mínimo</Label>
                  <Input 
                    id="minStock" 
                    type="number" 
                    min="0" 
                    value={newProduct.minStock} 
                    onChange={(e) => {
                      const updated = { ...newProduct, minStock: parseFloat(e.target.value) || 0 };
                      setNewProduct(updated);
                      validateInRealTime(updated, editingProduct?.id);
                    }}
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button 
                  onClick={handleSaveProduct} 
                  className="flex-1"
                  disabled={validationErrors.length > 0}
                >
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    setIsAddDialogOpen(false); 
                    resetForm(); 
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros mejorados */}
      <div className="card-glass p-4 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <Search className="h-5 w-5 text-primary" />
            <Input 
              placeholder="Buscar productos por nombre, código o categoría..." 
              value={searchQuery} 
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Resetear a primera página al buscar
              }} 
              className="flex-1" 
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchQuery || categoryFilter) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                  setCurrentPage(1);
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Mostrando {paginatedProducts.length} de {filteredAndSortedProducts.length} productos
        </div>
      </div>

      {/* Tabla con paginación */}
      <div className="card-glass p-6 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground p-2">Código</th>
                <th className="text-left text-muted-foreground p-2">Nombre</th>
                <th className="text-left text-muted-foreground p-2">Proveedor</th>
                <th className="text-right text-muted-foreground p-2">Precio</th>
                <th className="text-right text-muted-foreground p-2">Stock</th>
                <th className="text-right text-muted-foreground p-2">Margen</th>
                <th className="text-center text-muted-foreground p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => {
                const margin = product.price > 0 ? ((product.price - product.cost) / product.price * 100) : 0;
                const stockColor = product.stock <= product.minStock ? 
                  (product.stock === 0 ? 'text-red-500' : 'text-yellow-500') : 'text-green-500';
                const provider = state.providers.find(p => p.id === product.providerId);
                
                return (
                  <motion.tr 
                    key={product.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.05 }} 
                    className="border-b border-border/50 hover:bg-accent"
                  >
                    <td className="p-3 text-muted-foreground font-mono">{product.code}</td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3 text-muted-foreground">{provider?.name || 'N/A'}</td>
                    <td className="p-3 text-right">${product.price.toFixed(2)}</td>
                    <td className={`p-3 text-right font-medium ${stockColor}`}>
                      {product.stock} {product.unit}
                      {product.stock <= product.minStock && (
                        <AlertTriangle className="h-3 w-3 inline ml-1" />
                      )}
                    </td>
                    <td className="p-3 text-right text-green-500">{margin.toFixed(1)}%</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center space-x-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => adjustStock(product.id, -1)} 
                          className="h-8 w-8 text-red-500"
                        >
                          <Minus size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => adjustStock(product.id, 1)} 
                          className="h-8 w-8 text-green-500"
                        >
                          <Plus size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEditProduct(product)} 
                          className="h-8 w-8 text-primary"
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteProduct(product.id)} 
                          className="h-8 w-8 text-red-500"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          
          {paginatedProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}