
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Package, Users, DollarSign, Calendar, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

const StatCard = ({ title, value, icon, color, prefix = '', suffix = '' }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-6 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>
      <div className={`p-2 rounded-full bg-${color}-500/20`}>{React.cloneElement(icon, { className: `h-6 w-6 text-${color}-500` })}</div>
    </div>
    <p className="text-3xl font-bold">{prefix}{value}{suffix}</p>
  </motion.div>
);

export default function Statistics() {
  const { state } = usePOS();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredSales = useMemo(() => {
    return state.sales.filter(sale => {
      if (sale.type === 'quote') return false;
      const saleDate = new Date(sale.timestamp);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }, [state.sales, dateRange]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const marginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const topSellingProducts = useMemo(() => {
    const productSales = {};
    filteredSales.flatMap(sale => sale.items).forEach(item => {
      if (!productSales[item.id]) productSales[item.id] = { name: item.name, quantity: 0, revenue: 0 };
      productSales[item.id].quantity += item.quantity;
      productSales[item.id].revenue += item.price * item.quantity - (item.itemDiscount || 0);
    });
    return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredSales]);

  const exportReport = (format) => {
    toast({ title: `🚧 Exportar a ${format.toUpperCase()}: Funcionalidad no implementada` });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Estadísticas y Reportes</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportReport('csv')}><FileDown className="h-4 w-4 mr-2"/>CSV</Button>
            <Button variant="outline" onClick={() => exportReport('pdf')}><FileDown className="h-4 w-4 mr-2"/>PDF</Button>
        </div>
      </div>

      <div className="card-glass p-4 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2">
            <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <span className="text-muted-foreground">a</span>
            <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
          <Button onClick={() => setDateRange({ start: '', end: '' })} variant="outline">Limpiar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Ingresos" value={totalRevenue.toFixed(2)} icon={<DollarSign />} color="green" prefix="$" />
        <StatCard title="Ganancia" value={totalProfit.toFixed(2)} icon={<DollarSign />} color="teal" prefix="$" />
        <StatCard title="Ventas" value={totalSales} icon={<TrendingUp />} color="blue" />
        <StatCard title="Ticket Promedio" value={averageTicket.toFixed(2)} icon={<Users />} color="purple" prefix="$" />
        <StatCard title="Margen Bruto" value={marginPercentage.toFixed(1)} icon={<BarChart3 />} color="yellow" suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Productos más vendidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead><tr className="border-b border-border"><th className="text-left text-muted-foreground pb-2">Producto</th><th className="text-right text-muted-foreground pb-2">Cant.</th><th className="text-right text-muted-foreground pb-2">Ingresos</th></tr></thead>
              <tbody>
                {topSellingProducts.map((p, i) => (
                  <motion.tr key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50"><td className="py-3 font-medium">{p.name}</td><td className="py-3 text-right text-muted-foreground">{p.quantity.toFixed(2)}</td><td className="py-3 text-right text-green-500 font-medium">${p.revenue.toFixed(2)}</td></motion.tr>
                ))}
              </tbody>
            </table>
            {topSellingProducts.length === 0 && <div className="text-center py-8"><Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" /><p className="text-muted-foreground">No hay datos de ventas.</p></div>}
          </div>
        </div>
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Novedades</h2>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Reportes de stock bajo, recompras, etc. Próximamente 🚀</p>
          </div>
        </div>
      </div>
    </div>
  );
}
