// src/components/pos/DocumentPreview.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, X, Download } from 'lucide-react';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { issueDocument } from '@/lib/invoicing';

const DocumentPreview = ({ isOpen, onOpenChange, documentType, onConfirm }) => {
  const { state } = usePOS();
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const { settings } = state;

  // --- Totales (cálculo local consistente con el POS) ---
  const subtotal = (state.cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemDiscounts = (state.cart || []).reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
  const totalWithItemDiscounts = subtotal - itemDiscounts;
  const taxAmount = totalWithItemDiscounts * settings.taxRate;
  const finalTotal = totalWithItemDiscounts + taxAmount - (state.discount || 0);

  const getDocumentTitle = (type) => {
    switch (type) {
      case 'sale': return 'Factura';
      case 'remit': return 'Remito';
      case 'quote': return 'Presupuesto';
      case 'credit': return 'Nota de Crédito';
      default: return 'Documento';
    }
  };

  // --- Generación de “PDF” (stub) mediante issueDocument ---
  const generatePdf = async () => {
    setIsLoading(true);
    try {
      const payload = {
        cart: state.cart,
        customer: state.currentCustomer,
        totals: { subtotal, itemDiscounts, taxAmount, finalTotal },
      };

      const res = await issueDocument({
        type: documentType,
        payload,
        settings,
      });

      setPdfUrl(res?.pdf_url ?? null);
      if (!res?.pdf_url) {
        toast({ title: 'Vista previa generada', description: 'Usando stub local hasta integrar la API de facturación.' });
      }
    } catch (e) {
      console.error('generatePdf error:', e);
      setPdfUrl(null);
      toast({
        title: 'Error al generar documento',
        description: 'No se pudo conectar con la API de facturación.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPdfUrl(null);   // limpia vista previa anterior
      generatePdf();     // genera al abrir
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    onConfirm?.({ number: `TEMP-${Date.now()}`, pdf_url: pdfUrl });
    onOpenChange?.(false);
  };

  const handlePrint = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast({ title: 'Imprimir', description: 'No hay PDF real todavía. Se imprimirá el contenido del navegador.' });
      window.print();
    }
  };

  const getWatermarkStyle = () => {
    const wm = settings?.document?.watermark;
    if (documentType === 'remit' && wm?.text) {
      return {
        content: `"${wm.text}"`,
        fontSize: '60px',
        color: `rgba(128,128,128,${wm.opacity ?? 0.12})`,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${wm.rotation ?? 0}deg)`,
        zIndex: 0,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
      };
    }
    return {};
  };

  const docItems = (state.cart || []).map(item => ({
    ...item,
    totalPrice: (item.price * item.quantity) - (item.itemDiscount || 0),
  }));

  const title = getDocumentTitle(documentType);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-background text-foreground">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="flex items-center justify-between">
            {title}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange?.(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="A4" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="p-2 border-b border-border">
            <TabsTrigger value="A4">Vista Previa A4</TabsTrigger>
            <TabsTrigger value="80mm">Ticket 80mm</TabsTrigger>
            {pdfUrl && <TabsTrigger value="PDF">PDF</TabsTrigger>}
          </TabsList>

          <div className="flex-1 overflow-auto p-4">
            {/* ---- A4 ---- */}
            <TabsContent value="A4" className="flex-1">
              <div
                className="relative p-8 bg-white text-black min-h-[297mm] shadow-lg mx-auto w-[210mm] print-area"
                style={{
                  fontFamily: settings.document.fontFamily,
                  fontSize: `${settings.document.fontSize}pt`,
                  color: settings.document.fontColor,
                }}
              >
                {documentType === 'remit' && settings.document.watermark?.text && (
                  <div style={getWatermarkStyle()} />
                )}

                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-3xl font-bold">{settings.companyName}</h1>
                    <p>{settings.companyAddress}</p>
                    <p>{settings.companyPhone}</p>
                  </div>
                  {!!settings.document.logoUrl && (
                    <img className="h-20" alt="Company Logo" src={settings.document.logoUrl} />
                  )}
                </div>

                <h2 className="text-2xl font-bold text-center mb-6 border-b border-gray-300 pb-2">
                  {title} N° TEMP-XXX
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p><span className="font-semibold">Fecha:</span> {new Date().toLocaleDateString()}</p>
                    <p><span className="font-semibold">Hora:</span> {new Date().toLocaleTimeString()}</p>
                  </div>
                  <div>
                    {state.currentCustomer ? (
                      <>
                        <p><span className="font-semibold">Cliente:</span> {state.currentCustomer.name}</p>
                        <p><span className="font-semibold">Teléfono:</span> {state.currentCustomer.phone}</p>
                        <p><span className="font-semibold">Email:</span> {state.currentCustomer.email}</p>
                      </>
                    ) : (
                      <p><span className="font-semibold">Cliente:</span> Consumidor Final</p>
                    )}
                  </div>
                </div>

                <table className="w-full mb-6 border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="py-2 px-4 text-left">Producto</th>
                      <th className="py-2 px-4 text-right">Cantidad</th>
                      <th className="py-2 px-4 text-right">P. Unit.</th>
                      <th className="py-2 px-4 text-right">Desc.</th>
                      <th className="py-2 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docItems.map((item, index) => (
                      <tr key={item.cartId || index} className="border-b border-gray-200">
                        <td className="py-2 px-4">{item.name}</td>
                        <td className="py-2 px-4 text-right">{item.quantity} {item.unit}</td>
                        <td className="py-2 px-4 text-right">${item.price.toFixed(2)}</td>
                        <td className="py-2 px-4 text-right">${(item.itemDiscount || 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mb-6 text-base">
                  <div className="w-1/2 space-y-1">
                    <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Descuentos:</span><span>-${(itemDiscounts + (state.discount || 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>IVA ({(settings.taxRate * 100).toFixed(0)}%):</span><span>${taxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-300 pt-2 mt-2 text-xl"><span>Total:</span><span>${finalTotal.toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="text-center text-xs mt-auto pt-4 border-t border-gray-300">
                  {settings.document.legalFooter}
                  {settings.document.showQr && (
                    <div className="mt-2 flex justify-center">
                      <QRCodeSVG value={`Document: TEMP-XXX, Total: ${finalTotal.toFixed(2)}`} size={64} level="L" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ---- Ticket 80mm ---- */}
            <TabsContent value="80mm" className="flex-1">
              <div
                className="relative p-4 bg-white text-black min-h-[300px] shadow-lg mx-auto w-[80mm] text-xs print-area"
                style={{
                  fontFamily: settings.document.fontFamily,
                  fontSize: '8pt',
                  color: settings.document.fontColor,
                }}
              >
                <div className="text-center mb-4">
                  <h1 className="text-lg font-bold">{settings.companyName}</h1>
                  <p>{settings.companyAddress}</p>
                  <p>{settings.companyPhone}</p>
                  <p className="mt-2 font-semibold border-t border-gray-300 pt-2">
                    {title} N° TEMP-XXX
                  </p>
                </div>

                <div className="mb-4">
                  <p>Fecha: {new Date().toLocaleString()}</p>
                  {state.currentCustomer && <p>Cliente: {state.currentCustomer.name}</p>}
                </div>

                <table className="w-full mb-4 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="py-1 text-left">Item</th>
                      <th className="py-1 text-right">Cant.</th>
                      <th className="py-1 text-right">P. Unit.</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docItems.map((item, index) => (
                      <tr key={item.cartId || index} className="border-b border-gray-200">
                        <td className="py-1">{item.name}</td>
                        <td className="py-1 text-right">{item.quantity}</td>
                        <td className="py-1 text-right">${item.price.toFixed(2)}</td>
                        <td className="py-1 text-right">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right space-y-1 mb-4">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Descuentos:</span><span>-${(itemDiscounts + (state.discount || 0)).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA:</span><span>${taxAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t border-gray-300 pt-2 mt-2 text-base"><span>TOTAL:</span><span>${finalTotal.toFixed(2)}</span></div>
                </div>

                <div className="text-center text-[8pt] mt-auto pt-4 border-t border-gray-300">
                  {settings.document.legalFooter}
                  {settings.document.showQr && (
                    <div className="mt-2 flex justify-center">
                      <QRCodeSVG value={`Document: TEMP-XXX, Total: ${finalTotal.toFixed(2)}`} size={50} level="L" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ---- PDF (si existe url) ---- */}
            {pdfUrl && (
              <TabsContent value="PDF" className="flex-1 flex justify-center items-center">
                <iframe src={pdfUrl} width="100%" height="500px" className="border-none" title="Documento PDF" />
              </TabsContent>
            )}
          </div>
        </Tabs>

        <DialogFooter className="p-4 border-t border-border flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            <X className="h-4 w-4 mr-2" />Cancelar
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handlePrint} disabled={isLoading}>
              <Printer className="h-4 w-4 mr-2" />{isLoading ? 'Generando…' : 'Imprimir / Descargar'}
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              Confirmar y Emitir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
