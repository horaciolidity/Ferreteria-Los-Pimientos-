
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Scale, Ruler, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

export default function ProductSearch({ searchQuery }) {
  const { state, addToCart } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return state.products.slice(0, 12);
    
    const query = searchQuery.toLowerCase();
    return state.products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.code.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }, [searchQuery, state.products]);

  const handleProductClick = (product) => {
    if (product.unit === 'unidad') {
      addToCart(product, 1);
    } else {
      setSelectedProduct(product);
      setQuantity(1);
      setCustomPrice('');
      setIsDialogOpen(true);
    }
  };

  const handleAddWithQuantity = () => {
    if (!selectedProduct) return;
    
    const qty = parseFloat(quantity);
    const price = customPrice ? parseFloat(customPrice) : selectedProduct.price;
    
    if (qty <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser mayor a 0", variant: "destructive" });
      return;
    }

    if (customPrice && price <= 0) {
      toast({ title: "Error", description: "El precio debe ser mayor a 0", variant: "destructive" });
      return;
    }

    addToCart(selectedProduct, qty, customPrice ? price : null);
    setIsDialogOpen(false);
    setSelectedProduct(null);
  };

  const getUnitIcon = (unit) => {
    switch (unit) {
      case 'kg': return <Scale className="h-4 w-4" />;
      case 'metro': return <Ruler className="h-4 w-4" />;
      case 'litro': return <Droplets className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStockColor = (product) => {
    if (product.stock === 0) return 'text-red-500';
    if (product.stock <= product.minStock) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto scrollbar-thin">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </p>
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-glass p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
              onClick={() => handleProductClick(product)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getUnitIcon(product.unit)}
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {product.category}
                  </span>
                </div>
                <span className={`text-xs font-medium ${getStockColor(product)}`}>
                  {product.stock} {product.unit}
                </span>
              </div>
              
              <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              
              <p className="text-muted-foreground text-sm mb-2">
                Código: {product.code}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-primary font-semibold">
                  ${product.price.toFixed(2)}
                </span>
                <Button
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductClick(product);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="card-glass border-border">
          <DialogHeader>
            <DialogTitle>
              Agregar {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">
                Cantidad ({selectedProduct?.unit})
              </Label>
              <Input
                id="quantity"
                type="number"
                step={selectedProduct?.unit === 'unidad' ? '1' : '0.1'}
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
            
            <div>
              <Label htmlFor="customPrice">
                Precio personalizado (opcional)
              </Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={`Precio actual: $${selectedProduct?.price.toFixed(2)}`}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleAddWithQuantity}
                className="flex-1"
              >
                Agregar al carrito
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
