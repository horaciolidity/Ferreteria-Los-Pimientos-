// src/components/pos/ProductManagement.jsx
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit3, Trash2, Upload, Download, Search, Minus, FileDown } from 'lucide-react';
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
  const fileInputRef = useRef(null);

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

  const q = (searchQuery || '').toLowerCase();
  const filteredProducts = state.products.filter(product => {
    const name = String(product.name ?? '').toLowerCase();
    const code = String(product.code ?? '').toLowerCase();
    const cat  = String(product.category ?? '').toLowerCase();
    return name.includes(q) || code.includes(q) || cat.includes(q);
  });

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
    setNewProduct({
      code: product.code ?? '',
      name: product.name ?? '',
      price: Number(product.price ?? 0),
      cost: Number(product.cost ?? 0),
      stock: Number(product.stock ?? 0),
      unit: product.unit || 'unidad',
      category: product.category ?? '',
      providerId: product.providerId ?? '',
      minStock: Number(product.minStock ?? 0)
    });
    setEditingProduct(product);
    setIsAddDialogOpen(true);
  };

  const handleDeleteProduct = (productId) => {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return;
    if (window.confirm(`¿Eliminar el producto "${prod.name}"?`)) {
      dispatch({ type: 'DELETE_PRODUCT', payload: productId });
      toast({ title: "Producto eliminado", description: `"${prod.name}" ha sido eliminado` });
    }
  };

  /* ---------------- Importar lista TXT/CSV ---------------- */
  const importProductsClick = () => fileInputRef.current?.click();

  const normalizeKey = (s='') =>
    s.toString()
     .toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g,'')  // quita acentos
     .replace(/\s+/g,'')
     .replace(/[^a-z0-9_]/g,'');

  const parseNumber = (v) => {
    if (v == null) return null;
    const str = String(v).trim();
    if (!str) return null;
    // soporte "1.234,56" y "1,234.56"
    const hasComma = str.includes(',');
    const hasDot   = str.includes('.');
    let clean = str.replace(/\s/g,'');
    if (hasComma && hasDot) {
      // asume coma decimal si última coma está después del último punto
      const lastComma = clean.lastIndexOf(',');
      const lastDot   = clean.lastIndexOf('.');
      if (lastComma > lastDot) clean = clean.replace(/\./g,'').replace(',', '.');
      else clean = clean.replace(/,/g,'');
    } else if (hasComma && !hasDot) {
      clean = clean.replace(',', '.');
    }
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  };

  const detectSep = (text) => {
    const first = (text.split(/\r?\n/)[0] || '');
    if (first.includes('\t')) return '\t';
    if (first.includes(';'))  return ';';
    return ','; // default CSV
  };

  const importFromFile = async (file) => {
    if (!file) return;
    try {
      const content = await file.text();
      const sep = detectSep(content);
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        toast({ title: 'Archivo vacío', variant: 'destructive' });
        return;
      }

      // cabecera
      const header = lines[0].split(sep).map(h => normalizeKey(h));
      const idx = (names) => {
        const targets = Array.isArray(names) ? names : [names];
        for (const t of targets.map(normalizeKey)) {
          const i = header.indexOf(t);
          if (i !== -1) return i;
        }
        return -1;
      };

      const iCode  = idx(['code','codigo','código']);
      const iName  = idx(['name','nombre']);
      const iPrice = idx(['price','precio']);
      const iCost  = idx(['cost','costo']);
      const iStock = idx(['stock']);
      const iMin   = idx(['minstock','stockminimo','stockmin']);

      if (iCode === -1 && iName === -1) {
        toast({ title: 'Cabecera inválida', description: 'Debe existir "code/código" o "name/nombre".', variant: 'destructive' });
        return;
      }

      let found = 0, updated = 0, notFound = 0;
      const updates = [];

      // Mapas para búsquedas rápidas
      const byCode  = new Map(state.products.map(p => [String(p.code ?? '').toLowerCase(), p]));
      const byName  = new Map(state.products.map(p => [String(p.name ?? '').toLowerCase(), p]));

      for (let li = 1; li < lines.length; li++) {
        const cols = lines[li].split(sep);
        const code = iCode >= 0 ? String(cols[iCode] ?? '').trim() : '';
        const name = iName >= 0 ? String(cols[iName] ?? '').trim() : '';

        let prod = null;
        if (code) prod = byCode.get(code.toLowerCase());
        if (!prod && name) prod = byName.get(name.toLowerCase());

        if (!prod) { notFound++; continue; }
        found++;

        const upd = {};
        if (iPrice >= 0) {
          const n = parseNumber(cols[iPrice]);
          if (n != null) upd.price = n;
        }
        if (iCost >= 0) {
          const n = parseNumber(cols[iCost]);
          if (n != null) upd.cost = n;
        }
        if (iStock >= 0) {
          const n = parseNumber(cols[iStock]);
          if (n != null) upd.stock = Math.max(0, Math.trunc(n));
        }
        if (iMin >= 0) {
          const n = parseNumber(cols[iMin]);
          if (n != null) upd.minStock = Math.max(0, Math.trunc(n));
        }

        if (Object.keys(upd).length > 0) {
          updates.push({ id: prod.id, updates: upd, name: prod.name });
          updated++;
        }
      }

      const msg = `Productos en archivo: ${lines.length - 1}
Encontrados: ${found}
Con cambios: ${updated}
No encontrados: ${notFound}

¿Aplicar cambios?`;
      if (!window.confirm(msg)) return;

      updates.forEach(u => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: u.id, updates: u.updates } }));
      toast({ title: 'Importación completada', description: `Actualizados: ${updated} / No encontrados: ${notFound}` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al importar', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ---------------- Exportadores (CSV / TXT / XLS) ---------------- */
  const exportCSV = () => {
    const sep = ',';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Código','Nombre','Proveedor','Precio','Costo','Stock','Unidad','Categoría','MinStock'
    ].map(esc).join(sep);

    const rows = state.products.map(p => {
      const provider = state.providers.find(pr => pr.id === p.providerId);
      return [
        p.code, p.name, provider?.name || '',
        Number(p.price ?? 0).toFixed(2),
        Number(p.cost ?? 0).toFixed(2),
        Number(p.stock ?? 0),
        p.unit || 'unidad',
        p.category || '',
        Number(p.minStock ?? 0)
      ].map(esc).join(sep);
    }).join('\n');

    const csv = `${header}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "CSV generado", description: "Se descargó el archivo." });
  };

  const exportTXT = () => {
    const header = 'Código\tNombre\tProveedor\tPrecio\tCosto\tStock\tUnidad\tCategoría\tMinStock';
    const rows = state.products.map(p => {
      const provider = state.providers.find(pr => pr.id === p.providerId);
      return [
        p.code ?? '',
        p.name ?? '',
        provider?.name || '',
        Number(p.price ?? 0).toFixed(2),
        Number(p.cost ?? 0).toFixed(2),
        Number(p.stock ?? 0),
        p.unit || 'unidad',
        p.category || '',
        Number(p.minStock ?? 0)
      ].join('\t');
    }).join('\n');

    const tsv = `${header}\n${rows}`;
    const blob = new Blob([tsv], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "TXT generado", description: "Se descargó el archivo." });
  };

  const exportXLS = () => {
    const table = (headers, rows) => `
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    `;

    const headers = ['Código','Nombre','Proveedor','Precio','Costo','Stock','Unidad','Categoría','MinStock'];
    const rows = state.products.map(p => {
      const provider = state.providers.find(pr => pr.id === p.providerId);
      return [
        p.code ?? '',
        p.name ?? '',
        provider?.name || '',
        Number(p.price ?? 0).toFixed(2),
        Number(p.cost ?? 0).toFixed(2),
        Number(p.stock ?? 0),
        p.unit || 'unidad',
        p.category || '',
        Number(p.minStock ?? 0)
      ];
    });

    const html =
      `<!doctype html><html><head><meta charset="utf-8"></head><body>
        <h2 style="font-size:18px">Productos</h2>
        <div>Generado: ${new Date().toLocaleString()}</div>
        ${table(headers, rows)}
      </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_${Date.now()}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Excel generado", description: "Se descargó el archivo .xls." });
  };

  const adjustStock = (productId, adjustment) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    const newStock = Math.max(0, Number(product.stock || 0) + Number(adjustment || 0));
    dispatch({ type: 'UPDATE_PRODUCT', payload: { id: productId, updates: { stock: newStock } } });
    toast({ title: "Stock ajustado", description: `${product.name}: ${product.stock} → ${newStock}` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <div className="flex flex-wrap gap-2">
          {/* IMPORTAR */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            className="hidden"
            onChange={(e) => importFromFile(e.target.files?.[0])}
          />
          <Button onClick={importProductsClick} variant="outline" title="Importar TXT/CSV con cabecera">
            <Upload className="h-4 w-4 mr-2" />Importar
          </Button>

          {/* EXPORTS */}
          <Button onClick={exportXLS} variant="outline" title="Exportar a Excel (.xls)">
            <FileDown className="h-4 w-4 mr-2" />XLS
          </Button>
          <Button onClick={exportTXT} variant="outline" title="Exportar a TXT (tabulado)">
            <FileDown className="h-4 w-4 mr-2" />TXT
          </Button>
          <Button onClick={exportCSV} variant="outline" title="Exportar a CSV">
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>

          {/* NUEVO / EDITAR */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>
            </DialogTrigger>
            <DialogContent className="card-glass border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={newProduct.code}
                    onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    type="number" step="0.01" min="0"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    type="number" step="0.01" min="0"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number" min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidad</Label>
                  <Select value={newProduct.unit} onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => (<option key={cat} value={cat} />))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="providerId">Proveedor</Label>
                  <Select
                    value={newProduct.providerId}
                    onValueChange={(value) => setNewProduct({ ...newProduct, providerId: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                    <SelectContent>
                      {state.providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minStock">Stock mínimo</Label>
                  <Input
                    id="minStock"
                    type="number" min="0"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <Button onClick={handleSaveProduct} className="flex-1">
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Buscador */}
      <div className="card-glass p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <Search className="h-5 w-5 text-primary" />
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Tabla */}
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
              {filteredProducts.map((product, index) => {
                const price = Number(product.price ?? 0);
                const cost  = Number(product.cost ?? 0);
                const margin = price > 0 ? ((price - cost) / price * 100) : 0;
                const stock = Number(product.stock ?? 0);
                const stockColor = stock <= Number(product.minStock ?? 0)
                  ? (stock === 0 ? 'text-red-500' : 'text-yellow-500')
                  : 'text-green-500';
                const provider = state.providers.find(p => p.id === product.providerId);

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border/50 hover:bg-accent"
                  >
                    <td className="p-3 text-muted-foreground">{product.code}</td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3 text-muted-foreground">{provider?.name || 'N/A'}</td>
                    <td className="p-3 text-right">${price.toFixed(2)}</td>
                    <td className={`p-3 text-right font-medium ${stockColor}`}>{stock} {product.unit || 'unidad'}</td>
                    <td className="p-3 text-right text-green-500">{margin.toFixed(1)}%</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => adjustStock(product.id, -1)} className="h-8 w-8 text-red-500">
                          <Minus size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => adjustStock(product.id, 1)} className="h-8 w-8 text-green-500">
                          <Plus size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEditProduct(product)} className="h-8 w-8 text-primary">
                          <Edit3 size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 text-red-500">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
