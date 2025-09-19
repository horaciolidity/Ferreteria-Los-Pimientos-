// src/components/pos/Statistics.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Package, Users, DollarSign, Calendar, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';

const COLORS = {
  green:  { bg: 'bg-green-500/10',  text: 'text-green-600'  },
  teal:   { bg: 'bg-teal-500/10',   text: 'text-teal-600'   },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-600'   },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-600' },
};

const currencyFmt = (n) => {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
};

const StatCard = ({ title, value, icon, color = 'green', prefix = '', suffix = '' }) => {
  const c = COLORS[color] || COLORS.green;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-6 rounded-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-full ${c.bg}`}>
          {React.cloneElement(icon, { className: `h-6 w-6 ${c.text}` })}
        </div>
      </div>
      <p className="text-3xl font-bold">
        {prefix}{value}{suffix}
      </p>
    </motion.div>
  );
};

export default function Statistics() {
  const { state } = usePOS();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [resetKey, setResetKey] = useState(0); // fuerza rerender al limpiar

  const filteredSales = useMemo(() => {
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return (state.sales || []).filter((sale) => {
      // excluir presupuestos del panel de KPIs
      if (sale.type === 'quote') return false;
      const when = new Date(sale.timestamp);
      if (startDate && when < startDate) return false;
      if (endDate && when > endDate) return false;
      return true;
    });
  }, [state.sales, dateRange]);

  // -------- KPIs --------
  const totalRevenue = useMemo(
    () => filteredSales.reduce((s, x) => s + Number(x.total || 0), 0),
    [filteredSales]
  );
  const totalProfit = useMemo(
    () => filteredSales.reduce((s, x) => s + Number(x.profit || 0), 0),
    [filteredSales]
  );
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const marginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // -------- Top Productos --------
  const topSellingProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach((sale) => {
      (sale.items || []).forEach((it) => {
        const id = it.id || it.code || it.name;
        if (!map[id]) map[id] = { name: it.name, quantity: 0, revenue: 0 };
        map[id].quantity += Number(it.quantity || 0);
        const line = Number(it.price || 0) * Number(it.quantity || 0) - Number(it.itemDiscount || 0);
        map[id].revenue += line;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredSales]);

  // -------- Top Clientes --------
  const topCustomers = useMemo(() => {
    const map = {};
    filteredSales.forEach((sale) => {
      const key = sale.customer?.id || sale.customer?.name || 'Consumidor Final';
      const name = sale.customer?.name || 'Consumidor Final';
      if (!map[key]) map[key] = { name, total: 0, count: 0 };
      map[key].total += Number(sale.total || 0);
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredSales]);

  // -------- Desglose por método de pago --------
  const paymentBreakdown = useMemo(() => {
    const acc = {};
    filteredSales.forEach((sale) => {
      const method = sale?.payment?.method ?? sale?.paymentMethod ?? 'desconocido';
      if (!acc[method]) acc[method] = { method, amount: 0, count: 0 };
      acc[method].amount += Number(sale.total || 0);
      acc[method].count += 1;
    });
    return Object.values(acc).sort((a, b) => b.amount - a.amount);
  }, [filteredSales]);

  // -------- Ventas por día --------
  const salesByDay = useMemo(() => {
    const acc = {};
    filteredSales.forEach((sale) => {
      const d = new Date(sale.timestamp);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!acc[day]) acc[day] = { day, amount: 0, count: 0 };
      acc[day].amount += Number(sale.total || 0);
      acc[day].count += 1;
    });
    return Object.values(acc).sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [filteredSales]);

  // Helpers para export
  const buildCSVBlocks = useCallback(() => {
    const sep = ',';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headerSummary = ['Ingresos','Ganancia','Ventas','TicketPromedio','MargenBruto(%)'].map(esc).join(sep);
    const rowSummary = [totalRevenue.toFixed(2), totalProfit.toFixed(2), totalSales, averageTicket.toFixed(2), marginPercentage.toFixed(1)].map(esc).join(sep);

    const headerPay = ['Metodo','Monto','Cantidad'].map(esc).join(sep);
    const payRows = paymentBreakdown.map(p => [p.method, p.amount.toFixed(2), p.count].map(esc).join(sep)).join('\n');

    const headerDays = ['Dia','Monto','Cantidad'].map(esc).join(sep);
    const dayRows = salesByDay.map(d => [d.day, d.amount.toFixed(2), d.count].map(esc).join(sep)).join('\n');

    const headerProducts = ['Producto','Cantidad','Ingresos'].map(esc).join(sep);
    const rowsProducts = topSellingProducts.map(p => [p.name, Number(p.quantity || 0).toFixed(2), p.revenue.toFixed(2)].map(esc).join(sep)).join('\n');

    const headerCustomers = ['Cliente','Ventas','Total'].map(esc).join(sep);
    const rowsCustomers = topCustomers.map(c => [c.name, c.count, c.total.toFixed(2)].map(esc).join(sep)).join('\n');

    const headerSales = ['Fecha','Documento','Tipo','Cliente','MetodoPago','Total','Ganancia'].map(esc).join(sep);
    const rowsSales = filteredSales.map(s => {
      const method = s?.payment?.method ?? s?.paymentMethod ?? '';
      return [
        new Date(s.timestamp).toLocaleString(),
        s.documentNumber,
        s.type,
        s.customer?.name || 'Consumidor Final',
        method,
        Number(s.total || 0).toFixed(2),
        Number(s.profit || 0).toFixed(2),
      ].map(esc).join(sep);
    }).join('\n');

    return {
      csv:
`RESUMEN
${headerSummary}
${rowSummary}

PAGO
${headerPay}
${payRows}

POR_DIA
${headerDays}
${dayRows}

TOP_PRODUCTOS
${headerProducts}
${rowsProducts}

TOP_CLIENTES
${headerCustomers}
${rowsCustomers}

VENTAS
${headerSales}
${rowsSales}
`,
      tsv:
`RESUMEN
Ingresos\tGanancia\tVentas\tTicketPromedio\tMargenBruto(%)
${totalRevenue.toFixed(2)}\t${totalProfit.toFixed(2)}\t${totalSales}\t${averageTicket.toFixed(2)}\t${marginPercentage.toFixed(1)}

PAGO
Metodo\tMonto\tCantidad
${paymentBreakdown.map(p=>`${p.method}\t${p.amount.toFixed(2)}\t${p.count}`).join('\n')}

POR_DIA
Dia\tMonto\tCantidad
${salesByDay.map(d=>`${d.day}\t${d.amount.toFixed(2)}\t${d.count}`).join('\n')}

TOP_PRODUCTOS
Producto\tCantidad\tIngresos
${topSellingProducts.map(p=>`${p.name}\t${Number(p.quantity||0).toFixed(2)}\t${p.revenue.toFixed(2)}`).join('\n')}

TOP_CLIENTES
Cliente\tVentas\tTotal
${topCustomers.map(c=>`${c.name}\t${c.count}\t${c.total.toFixed(2)}`).join('\n')}

VENTAS
Fecha\tDocumento\tTipo\tCliente\tMetodoPago\tTotal\tGanancia
${filteredSales.map(s=>{
  const method = s?.payment?.method ?? s?.paymentMethod ?? '';
  return `${new Date(s.timestamp).toLocaleString()}\t${s.documentNumber}\t${s.type}\t${(s.customer?.name||'Consumidor Final')}\t${method}\t${Number(s.total||0).toFixed(2)}\t${Number(s.profit||0).toFixed(2)}`
}).join('\n')}
`
    };
  }, [filteredSales, paymentBreakdown, salesByDay, topSellingProducts, topCustomers, totalRevenue, totalProfit, totalSales, averageTicket, marginPercentage]);

  // -------- Exportar CSV --------
  const exportCSV = useCallback(() => {
    const { csv } = buildCSVBlocks();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pos_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV generado', description: 'El reporte fue descargado.' });
  }, [buildCSVBlocks]);

  // -------- Exportar TXT --------
  const exportTXT = useCallback(() => {
    const { tsv } = buildCSVBlocks();
    const blob = new Blob([tsv], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pos_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'TXT generado', description: 'El reporte fue descargado.' });
  }, [buildCSVBlocks]);

  // -------- Exportar Excel (.xls compatible) --------
  const exportXLS = useCallback(() => {
    const table = (title, headers, rows) => `
      <h3 style="font-size:16px;margin:10px 0">${title}</h3>
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <br/>
    `;

    const payRows = paymentBreakdown.map(p => [p.method, p.amount.toFixed(2), p.count]);
    const dayRows = salesByDay.map(d => [d.day, d.amount.toFixed(2), d.count]);
    const prodRows = topSellingProducts.map(p => [p.name, Number(p.quantity||0).toFixed(2), p.revenue.toFixed(2)]);
    const custRows = topCustomers.map(c => [c.name, c.count, c.total.toFixed(2)]);
    const salesRows = filteredSales.map(s => {
      const method = s?.payment?.method ?? s?.paymentMethod ?? '';
      return [
        new Date(s.timestamp).toLocaleString(),
        s.documentNumber,
        s.type,
        s.customer?.name || 'Consumidor Final',
        method,
        Number(s.total || 0).toFixed(2),
        Number(s.profit || 0).toFixed(2),
      ];
    });

    const html =
      `<!doctype html><html><head><meta charset="utf-8"></head><body>
        <h2 style="font-size:20px">Reporte POS</h2>
        <div>Generado: ${new Date().toLocaleString()}</div>
        ${table('Resumen', ['Ingresos','Ganancia','Ventas','Ticket Promedio','Margen Bruto %'],
          [[totalRevenue.toFixed(2), totalProfit.toFixed(2), totalSales, averageTicket.toFixed(2), marginPercentage.toFixed(1)]])}
        ${table('Desglose por método de pago', ['Método','Monto','Cantidad'], payRows)}
        ${table('Ventas por día', ['Día','Monto','Cantidad'], dayRows)}
        ${table('Top 5 Productos', ['Producto','Cant.','Ingresos'], prodRows)}
        ${table('Top 5 Clientes', ['Cliente','Ventas','Total'], custRows)}
        ${table('Detalle de ventas', ['Fecha','Documento','Tipo','Cliente','Pago','Total','Ganancia'], salesRows)}
      </body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pos_${Date.now()}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Excel generado', description: 'El archivo .xls fue descargado.' });
  }, [filteredSales, paymentBreakdown, salesByDay, topSellingProducts, topCustomers, totalRevenue, totalProfit, totalSales, averageTicket, marginPercentage]);

  // -------- Exportar PDF (ventana imprimible) --------
  const exportPDF = useCallback(() => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      toast({ title: 'Pop-up bloqueado', description: 'Permití ventanas emergentes para exportar a PDF.', variant: 'destructive' });
      return;
    }
    const style = `
      <style>
        body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin:24px; color:#111}
        h1{font-size:20px;margin:0 0 8px}
        h2{font-size:16px;margin:18px 0 6px}
        table{width:100%; border-collapse: collapse; font-size:12px}
        th,td{border-bottom:1px solid #ddd; padding:6px 8px; text-align:left}
        th{background:#f6f6f6}
        .muted{color:#666}
        .right{text-align:right}
      </style>
    `;
    const payRows = paymentBreakdown.map(p => `<tr><td>${p.method}</td><td class="right">${currencyFmt(p.amount)}</td><td class="right">${p.count}</td></tr>`).join('');
    const dayRows = salesByDay.map(d => `<tr><td>${d.day}</td><td class="right">${currencyFmt(d.amount)}</td><td class="right">${d.count}</td></tr>`).join('');
    const salesRows = filteredSales.map(s => {
      const method = s?.payment?.method ?? s?.paymentMethod ?? '';
      return `<tr>
        <td>${new Date(s.timestamp).toLocaleString()}</td>
        <td>${s.documentNumber}</td>
        <td>${s.type}</td>
        <td>${s.customer?.name || 'Consumidor Final'}</td>
        <td>${method}</td>
        <td class="right">${currencyFmt(s.total)}</td>
        <td class="right">${currencyFmt(s.profit)}</td>
      </tr>`;
    }).join('');

    const prodRows = topSellingProducts.map(p => `<tr><td>${p.name}</td><td class="right">${Number(p.quantity||0).toFixed(2)}</td><td class="right">${currencyFmt(p.revenue)}</td></tr>`).join('');
    const custRows = topCustomers.map(c => `<tr><td>${c.name}</td><td class="right">${c.count}</td><td class="right">${currencyFmt(c.total)}</td></tr>`).join('');

    const html = `
      <!doctype html><html><head><meta charset="utf-8"><title>Reporte POS</title>${style}</head>
      <body>
        <h1>Reporte POS</h1>
        <div class="muted">Generado: ${new Date().toLocaleString()}</div>
        <h2>Resumen</h2>
        <table>
          <tr><th>Ingresos</th><th>Ganancia</th><th>Ventas</th><th>Ticket Promedio</th><th>Margen Bruto</th></tr>
          <tr>
            <td class="right">${currencyFmt(totalRevenue)}</td>
            <td class="right">${currencyFmt(totalProfit)}</td>
            <td class="right">${totalSales}</td>
            <td class="right">${currencyFmt(averageTicket)}</td>
            <td class="right">${marginPercentage.toFixed(1)}%</td>
          </tr>
        </table>

        <h2>Desglose por método de pago</h2>
        <table>
          <tr><th>Método</th><th>Monto</th><th>Cantidad</th></tr>
          ${payRows || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}
        </table>

        <h2>Ventas por día</h2>
        <table>
          <tr><th>Día</th><th>Monto</th><th>Cantidad</th></tr>
          ${dayRows || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}
        </table>

        <h2>Top 5 Productos</h2>
        <table>
          <tr><th>Producto</th><th>Cant.</th><th>Ingresos</th></tr>
          ${prodRows || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}
        </table>

        <h2>Top 5 Clientes</h2>
        <table>
          <tr><th>Cliente</th><th>Ventas</th><th>Total</th></tr>
          ${custRows || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}
        </table>

        <h2>Detalle de ventas</h2>
        <table>
          <tr><th>Fecha</th><th>Documento</th><th>Tipo</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Ganancia</th></tr>
          ${salesRows || '<tr><td colspan="7" class="muted">Sin datos</td></tr>'}
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }, [filteredSales, paymentBreakdown, salesByDay, topSellingProducts, topCustomers, totalRevenue, totalProfit, totalSales, averageTicket, marginPercentage]);

  const exportReport = (format) => {
    if (format === 'csv') return exportCSV();
    if (format === 'pdf') return exportPDF();
    if (format === 'txt') return exportTXT();
    if (format === 'xls') return exportXLS();
    toast({ title: `Formato no soportado`, description: String(format) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Estadísticas y Reportes</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => exportReport('xls')}>
            <FileDown className="h-4 w-4 mr-2" />Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('txt')}>
            <FileDown className="h-4 w-4 mr-2" />TXT
          </Button>
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <FileDown className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <FileDown className="h-4 w-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="card-glass p-4 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex items-center gap-2">
            <Input
              key={`start-${resetKey}`}
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
            />
            <span className="text-muted-foreground">a</span>
            <Input
              key={`end-${resetKey}`}
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => {
              setDateRange({ start: '', end: '' });
              setResetKey((k) => k + 1); // fuerza rerender y limpia UI
            }}
            variant="outline"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Ingresos" value={totalRevenue.toFixed(2)} icon={<DollarSign />} color="green" prefix="$" />
        <StatCard title="Ganancia" value={totalProfit.toFixed(2)} icon={<DollarSign />} color="teal" prefix="$" />
        <StatCard title="Ventas" value={totalSales} icon={<TrendingUp />} color="blue" />
        <StatCard title="Ticket Promedio" value={averageTicket.toFixed(2)} icon={<Users />} color="purple" prefix="$" />
        <StatCard title="Margen Bruto" value={marginPercentage.toFixed(1)} icon={<BarChart3 />} color="yellow" suffix="%" />
      </div>

      {/* Tablas de detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Productos más vendidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground pb-2">Producto</th>
                  <th className="text-right text-muted-foreground pb-2">Cant.</th>
                  <th className="text-right text-muted-foreground pb-2">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts.map((p, i) => (
                  <motion.tr
                    key={`${p.name}_${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50"
                  >
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-right text-muted-foreground">{Number(p.quantity || 0).toFixed(2)}</td>
                    <td className="py-3 text-right text-green-600 font-medium">{currencyFmt(p.revenue)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {topSellingProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No hay datos de ventas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top clientes */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Mejores clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground pb-2">Cliente</th>
                  <th className="text-right text-muted-foreground pb-2">Ventas</th>
                  <th className="text-right text-muted-foreground pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <motion.tr
                    key={`${c.name}_${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50"
                  >
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3 text-right text-muted-foreground">{c.count}</td>
                    <td className="py-3 text-right text-green-600 font-medium">{currencyFmt(c.total)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {topCustomers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">Sin compras registradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desglose por método de pago y ventas por día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pago */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Desglose por método de pago</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground pb-2">Método</th>
                  <th className="text-right text-muted-foreground pb-2">Monto</th>
                  <th className="text-right text-muted-foreground pb-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {paymentBreakdown.map((p, i) => (
                  <tr key={`${p.method}_${i}`} className="border-b border-border/50">
                    <td className="py-3 font-medium capitalize">{p.method}</td>
                    <td className="py-3 text-right text-green-600 font-medium">{currencyFmt(p.amount)}</td>
                    <td className="py-3 text-right text-muted-foreground">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paymentBreakdown.length === 0 && (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">No hay datos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Por día */}
        <div className="card-glass p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Ventas por día</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground pb-2">Día</th>
                  <th className="text-right text-muted-foreground pb-2">Monto</th>
                  <th className="text-right text-muted-foreground pb-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {salesByDay.map((d, i) => (
                  <tr key={`${d.day}_${i}`} className="border-b border-border/50">
                    <td className="py-3 font-medium">{d.day}</td>
                    <td className="py-3 text-right text-green-600 font-medium">{currencyFmt(d.amount)}</td>
                    <td className="py-3 text-right text-muted-foreground">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesByDay.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">Sin datos en el rango seleccionado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
