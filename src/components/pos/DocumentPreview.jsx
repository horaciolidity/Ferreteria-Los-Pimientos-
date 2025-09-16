// src/components/pos/DocumentPreview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, X, Download } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';
import { QRCodeSVG } from 'qrcode.react';

const DocumentPreview = ({
  isOpen,
  onOpenChange,
  documentType = 'sale',       // 'sale' | 'remit' | 'quote' | 'credit'
  sale: saleProp = null,       // opcional: si viene, es reimpresión
  onConfirm,                   // opcional: callback al confirmar/emitir
}) => {
  const { state, processSale, calculateDetail } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [sale, setSale] = useState(saleProp);
  const [pdfUrl, setPdfUrl] = useState(null);

  // -------- Helpers de settings/empresa --------
  const settings = state?.settings || {};
  const companyName   = settings.companyName || 'Mi Comercio';
  const companyAddr   = settings.address || settings.companyAddress || '';
  const companyPhone  = settings.phone || settings.companyPhone || '';
  const companyCUIT   = settings.cuit || '';
  const companyIVA    = settings.ivaCondition || 'CF';
  const docCfg        = settings.document || {};
  const watermark     = docCfg.watermark || { text: 'DOCUMENTO NO VÁLIDO', opacity: 0.08, rotation: -30 };

  // -------- Título por tipo --------
  const title = useMemo(() => {
    switch (documentType) {
      case 'sale':   return 'Factura';
      case 'remit':  return 'Remito';
      case 'quote':  return 'Presupuesto';
      case 'credit': return 'Nota de crédito';
      default:       return 'Documento';
    }
  }, [documentType]);

  // -------- Venta activa (prop o local) --------
  useEffect(() => { setSale(saleProp || null); }, [saleProp]);

  // -------- PDF URL si ya fue emitida --------
  useEffect(() => {
    setPdfUrl(sale?.fiscal?.pdf_url || null);
  }, [sale, isOpen]);

  // -------- Totales y items (según flujo) --------
  const computed = useMemo(() => {
    if (sale) {
      return {
        items: sale.items || [],
        subtotal: Number(sale.subtotal || 0),
        itemDiscounts: Number(sale.itemDiscounts || 0),
        discount: Number(sale.discount || 0),
        taxAmount: Number(sale.taxAmount || 0),
        total: Number(sale.total || 0),
        customer: sale.customer || null,
        number: sale.documentNumber || 'TEMP',
        training: !!sale?.fiscal?.training,
        cae: sale?.fiscal?.cae || null,
        cae_due: sale?.fiscal?.cae_due_date || null,
      };
    }
    // Si no hay sale (modo preview previo a emitir), calculo desde el carrito
    if (typeof calculateDetail === 'function') {
      const d = calculateDetail();
      return {
        items: (state.cart || []).map(it => ({
          ...it,
          totalPrice: Number(it.price || 0) * Number(it.quantity || 0) - Number(it.itemDiscount || 0),
        })),
        subtotal: Number(d.subtotal || 0),
        itemDiscounts: Number(d.itemDiscounts || 0),
        discount: Number(state.discount || 0),
        taxAmount: Number(d.taxAmount || 0),
        total: Number(d.total || 0),
        customer: state.currentCustomer || null,
        number: 'TEMP',
        training: true,
        cae: null,
        cae_due: null,
      };
    }
    // Fallback si no está calculateDetail (compat)
    const subtotal = (state.cart || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
    const itemDiscounts = (state.cart || []).reduce((s, it) => s + Number(it.itemDiscount || 0), 0);
    const base = subtotal - itemDiscounts;
    const taxRate = Number(settings.taxRate || 0);
    const taxAmount = Number((base * taxRate).toFixed(2));
    const total = Number((base + taxAmount - Number(state.discount || 0)).toFixed(2));
    return {
      items: (state.cart || []).map(it => ({
        ...it,
        totalPrice: Number(it.price || 0) * Number(it.quantity || 0) - Number(it.itemDiscount || 0),
      })),
      subtotal,
      itemDiscounts,
      discount: Number(state.discount || 0),
      taxAmount,
      total,
      customer: state.currentCustomer || null,
      number: 'TEMP',
      training: true,
      cae: null,
      cae_due: null,
    };
  }, [sale, state, settings, calculateDetail]);

  // -------- Acciones --------
  const handlePrint = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      // Fallback: imprime la vista actual del navegador
      window.print();
    }
  };

  const handleDownload = () => {
    if (pdfUrl) window.open(pdfUrl, '_blank');
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      // Si ya hay sale (reimpresión), no reemitimos
      if (sale?.id) {
        onOpenChange(false);
        return;
      }
      // Emitir/guardar desde acá (modo legacy)
      const created = await processSale(documentType);
      if (!created) {
        toast({ title: 'No se pudo emitir', variant: 'destructive' });
        return;
      }
      setSale(created);
      setPdfUrl(created?.fiscal?.pdf_url || null);
      if (typeof onConfirm === 'function') {
        onConfirm({
          number: created.documentNumber,
          pdf_url: created?.fiscal?.pdf_url || null,
          cae: created?.fiscal?.cae || null,
          cae_due_date: created?.fiscal?.cae_due_date || null,
        });
      }
      toast({
        title: 'Documento emitido',
        description: created?.fiscal?.training ? 'Documento temporal (modo entrenamiento)' : `Comprobante ${created?.documentNumber}`,
      });
    } catch (e) {
      toast({ title: 'Error al emitir', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // -------- Estilos watermark --------
  const showWatermark = computed.training && watermark?.text;
  const watermarkStyle = showWatermark
    ? {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `rotate(${watermark.rotation ?? -30}deg)`,
        opacity: watermark.opacity ?? 0.08,
        fontSize: 60,
        color: '#888',
      }
    : null;

  return (
    <Dialog open={!!isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {title}{' '}
            <span className="ml-2 text-sm text-muted-foreground">
              {sale?.documentNumber ? `- ${sale.documentNumber}` : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          <Tabs defaultValue="A4" className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="A4">Vista A4</TabsTrigger>
              <TabsTrigger value="80mm">Ticket 80mm</TabsTrigger>
              {pdfUrl && <TabsTrigger value="PDF">PDF</TabsTrigger>}
            </TabsList>

            {/* A4 */}
            <TabsContent value="A4" className="relative flex-1 overflow-auto bg-white text-black p-8 print-area">
              {/* Encabezado */}
              <div className="mb-6">
                <div className="text-2xl font-bold">{companyName}</div>
                <div className="text-sm">{companyAddr} · Tel: {companyPhone}</div>
                <div className="text-sm">CUIT: {companyCUIT || '—'} · IVA: {companyIVA}</div>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{title}</div>
                  <div className="text-sm text-muted-foreground">{sale?.documentNumber || 'TEMPORAL'}</div>
                </div>
                <div className="text-right text-sm">
                  <div>Fecha: {new Date(sale?.timestamp || Date.now()).toLocaleString()}</div>
                  <div>Cliente: {computed.customer?.name || 'Consumidor Final'}</div>
                  {computed.customer?.docNumber && <div>Doc: {computed.customer.docNumber}</div>}
                </div>
              </div>

              {/* Items */}
              <table className="w-full text-sm border-t border-b">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-2">Código</th>
                    <th className="py-2 pr-2">Descripción</th>
                    <th className="py-2 pr-2 text-right">Cant.</th>
                    <th className="py-2 pr-2 text-right">P.Unit</th>
                    <th className="py-2 pr-2 text-right">Dto.</th>
                    <th className="py-2 pl-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {(computed.items || []).map((it, idx) => {
                    const line = it.totalPrice != null
                      ? Number(it.totalPrice || 0)
                      : (Number(it.price || 0) * Number(it.quantity || 0) - Number(it.itemDiscount || 0));
                    return (
                      <tr key={it.cartId || it.id || idx} className="border-t">
                        <td className="py-1 pr-2">{it.code || it.id || '-'}</td>
                        <td className="py-1 pr-2">{it.name}</td>
                        <td className="py-1 pr-2 text-right">{it.quantity}</td>
                        <td className="py-1 pr-2 text-right">${Number(it.price || 0).toFixed(2)}</td>
                        <td className="py-1 pr-2 text-right">${Number(it.itemDiscount || 0).toFixed(2)}</td>
                        <td className="py-1 pl-2 text-right">${Number(line).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totales */}
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>${computed.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Desc. items</span><span>-${computed.itemDiscounts.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Desc. global</span><span>-${computed.discount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA</span><span>${computed.taxAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total</span><span>${computed.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* CAE */}
              {!computed.training && sale?.fiscal?.cae && (
                <div className="mt-3 text-[12px]">
                  CAE: {sale.fiscal.cae} · Vto: {sale.fiscal.cae_due_date || '—'}
                </div>
              )}

              {/* QR / Footer legal */}
              <div className="mt-4 text-xs text-center">
                {docCfg.legalFooter || ''}
                {docCfg.showQr && (
                  <div className="mt-2 flex justify-center">
                    <QRCodeSVG
                      value={`Doc:${sale?.documentNumber || 'TEMP'}|Total:${computed.total.toFixed(2)}`}
                      size={64}
                      level="L"
                    />
                  </div>
                )}
              </div>

              {/* Watermark entrenamiento */}
              {showWatermark && (
                <div style={watermarkStyle}>
                  {watermark.text}
                </div>
              )}
            </TabsContent>

            {/* Ticket 80mm */}
            <TabsContent value="80mm" className="flex-1 overflow-auto bg-white text-black p-4">
              <div className="w-[80mm]">
                <div className="text-center">
                  <div className="font-bold">{companyName}</div>
                  <div className="text-xs">{companyAddr}</div>
                  <div className="text-xs">CUIT: {companyCUIT || '—'} · IVA: {companyIVA}</div>
                </div>
                <div className="my-2 text-xs flex justify-between">
                  <span>{title}</span>
                  <span>{new Date(sale?.timestamp || Date.now()).toLocaleString()}</span>
                </div>
                <div className="text-xs">Nro: {sale?.documentNumber || 'TEMPORAL'}</div>
                <div className="my-2 border-t border-b py-1">
                  {(computed.items || []).map((it, idx) => {
                    const line = it.totalPrice != null
                      ? Number(it.totalPrice || 0)
                      : (Number(it.price || 0) * Number(it.quantity || 0) - Number(it.itemDiscount || 0));
                    return (
                      <div key={it.cartId || it.id || idx} className="flex justify-between text-xs">
                        <span className="mr-2 truncate">{it.name} x{it.quantity}</span>
                        <span>${line.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between"><span>Subtotal</span><span>${computed.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Desc.items</span><span>-${computed.itemDiscounts.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Desc.global</span><span>-${computed.discount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA</span><span>${computed.taxAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total</span><span>${computed.total.toFixed(2)}</span>
                  </div>
                </div>
                {!computed.training && sale?.fiscal?.cae && (
                  <div className="mt-2 text-[10px]">
                    CAE: {sale.fiscal.cae} Vto: {sale.fiscal.cae_due_date || '—'}
                  </div>
                )}
                {docCfg.showQr && (
                  <div className="mt-2 flex justify-center">
                    <QRCodeSVG
                      value={`Doc:${sale?.documentNumber || 'TEMP'}|Total:${computed.total.toFixed(2)}`}
                      size={56}
                      level="L"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PDF externo del backend */}
            {pdfUrl && (
              <TabsContent value="PDF" className="flex-1">
                <iframe src={pdfUrl} title="PDF Factura" className="w-full h-[60vh] border" />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />Cerrar
          </Button>
          <Button onClick={handlePrint} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-2" />
            {pdfUrl ? 'Imprimir / Abrir PDF' : 'Imprimir'}
          </Button>
          <Button variant="secondary" onClick={handleDownload} disabled={!pdfUrl}>
            <Download className="h-4 w-4 mr-2" />Descargar PDF
          </Button>

          {/* Solo mostrar Confirmar si todavía no existe una venta emitida */}
          {!sale?.id && (
            <Button onClick={handleConfirm} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? 'Emitiendo...' : 'Confirmar y Emitir'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
