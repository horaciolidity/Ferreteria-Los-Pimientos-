// src/lib/invoicing.js
// Cliente de facturación electrónica "híbrido":
// - Si hay backend disponible (AFIP/ARCA), envía la venta para emitir comprobante y obtener CAE/PDF.
// - Si no hay backend o falla, devuelve un documento temporal (training) con numeración TEMP.

// Uso esperado desde el POSContext:
//   const doc = await issueDocument({ sale, settings })
//   => { number, cae, cae_due_date, pdf_url, provider, training, extra }

 /**
  * Estructura esperada de sale:
  * {
  *   id, timestamp, type ('sale'|'credit'|'remit'|'quote'),
  *   items: [{ id, code, name, quantity, price, itemDiscount, cost }],
  *   subtotal, itemDiscounts, discount, taxAmount, total, profit,
  *   payment: { method: 'cash'|'card'|'transfer'|'account', amountPaid, change },
  *   customer: { id, name, docType, docNumber, email, phone, address, ivaCondition, cuit? }
  * }
  *
  * settings.invoicing:
  * {
  *   enabled: boolean,
  *   provider: 'AFIP' | 'ARCA',
  *   posNumber: number,
  *   concept: 1|2|3,          // 1 Producto, 2 Servicios, 3 Ambos (AFIP)
  *   docTypeDefault: number,  // 99 Consumidor Final
  *   ivaCondition: 'RI'|'RNI'|'MT'|'CF'|'EX'
  * }
  *
  * ENV:
  *  - VITE_INVOICING_API_BASE : Base URL del backend (https://mi-backend.com)
  *  - VITE_INVOICING_API_TOKEN: Token Bearer opcional
  */
export async function issueDocument({ sale, settings }) {
  const tempDoc = {
    number: `TEMP-${Date.now()}`,
    cae: null,
    cae_due_date: null,
    pdf_url: null,
    provider: settings?.invoicing?.provider || 'none',
    training: true,
    extra: {},
  };

  try {
    if (!settings?.invoicing?.enabled) return tempDoc;

    const API_BASE = import.meta.env?.VITE_INVOICING_API_BASE;
    if (!API_BASE) return tempDoc;

    const payload = mapSaleToInvoicePayload(sale, settings);

    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(import.meta.env?.VITE_INVOICING_API_TOKEN
          ? { Authorization: `Bearer ${import.meta.env.VITE_INVOICING_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Si el backend responde error, trabajamos en modo TEMP.
      const errText = await safeReadText(res);
      console.error('Invoicing API error', res.status, errText);
      return tempDoc;
    }

    const data = await res.json();
    // Respuesta esperada del backend:
    // {
    //   number: 'B 0001-00001234',
    //   cae: 'XXXXXXXXXXXXXX',
    //   cae_due_date: 'YYYY-MM-DD',
    //   pdf_url: 'https://.../doc.pdf',
    //   provider: 'AFIP'|'ARCA',
    //   extra: {...} // opcional
    // }

    return {
      number: data.number || tempDoc.number,
      cae: data.cae || null,
      cae_due_date: data.cae_due_date || null,
      pdf_url: data.pdf_url || null,
      provider: data.provider || settings?.invoicing?.provider || 'none',
      training: false,
      extra: data.extra || {},
    };
  } catch (err) {
    console.error('Invoicing API exception', err);
    return tempDoc;
  }
}

function mapSaleToInvoicePayload(sale, settings) {
  const provider = settings?.invoicing?.provider || 'AFIP';
  const docType = sale?.customer?.docType ?? settings?.invoicing?.docTypeDefault ?? 99; // 99 = CF
  const docNumber = sale?.customer?.docNumber ?? '0';
  const posNumber = settings?.invoicing?.posNumber ?? 1;
  const concept = settings?.invoicing?.concept ?? 1; // 1=Productos

  // Determinar tipo de comprobante (simplificado)
  const cbte_tipo = pickCbteTipo(sale, settings);

  const items = (sale?.items || []).map((it) => ({
    code: it.code || it.id,
    description: it.name,
    qty: Number(it.quantity || 0),
    unit_price: Number(it.price || 0),
    discount: Number(it.itemDiscount || 0),
    iva_id: 5, // 21% AFIP (ajustar si manejás distintas alícuotas)
  }));

  return {
    provider,                 // 'AFIP' | 'ARCA'
    pos_number: posNumber,    // Punto de Venta
    cbte_tipo,                // Tipo de comprobante (p.ej. 11=C, 6=B, 13=NC C, 8=NC B)
    concept,                  // 1/2/3
    doc_type: docType,        // 99 CF, etc.
    doc_number: String(docNumber),
    customer: {
      name: sale?.customer?.name || 'Consumidor Final',
      email: sale?.customer?.email || '',
      phone: sale?.customer?.phone || '',
      address: sale?.customer?.address || '',
      iva_condition: sale?.customer?.ivaCondition || settings?.invoicing?.ivaCondition || 'CF',
      cuit: sale?.customer?.cuit || null,
    },
    items,
    totals: {
      subtotal: Number(sale?.subtotal || 0),
      item_discounts: Number(sale?.itemDiscounts || 0),
      discount: Number(sale?.discount || 0),
      tax: Number(sale?.taxAmount || 0),
      total: Number(sale?.total || 0),
    },
    payment: sale?.payment || {},
    meta: {
      local_sale_id: sale?.id || null,
      timestamp: sale?.timestamp || new Date().toISOString(),
      source: 'POS-Ferreteria',
      app_version: import.meta.env?.VITE_APP_VERSION || 'dev',
      // Podés agregar más campos por auditoría:
      profit: Number(sale?.profit || 0),
      type: sale?.type || 'sale',
    },
  };
}

function pickCbteTipo(sale, settings) {
  // Simplificación: Comprobantes B/C y sus notas de crédito.
  // En la práctica, la letra depende de la condición IVA del emisor y receptor.
  const isCreditNote = String(sale?.type || '').toLowerCase() === 'credit';
  const ivaBuyer = (sale?.customer?.ivaCondition || settings?.invoicing?.ivaCondition || 'CF').toUpperCase();
  const isCF = ivaBuyer === 'CF';

  // C (11) o B (6); NC C (13) o NC B (8)
  if (isCreditNote) return isCF ? 13 : 8;
  return isCF ? 11 : 6;
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
