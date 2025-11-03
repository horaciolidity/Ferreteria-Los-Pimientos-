// src/contexts/POSContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import { issueDocument } from '@/lib/invoicing';

const POSContext = createContext(null);

/* --------------------- Datos iniciales --------------------- */
const STORAGE_KEY = 'ferrePOS_data';

const initialState = {
  cart: [],
  products: [],
  customers: [],
  providers: [],
  providerRestock: {},

  sales: [],
  documents: [],

  cashRegister: {
    isOpen: false,
    openingAmount: 0,
    currentAmount: 0,
    movements: [], // {id,type:'income'|'expense'|'opening'|'closing',concept,amount,timestamp}
    openedAt: null,
    closedAt: null,
    salesByType: { cash: 0, transfer: 0, mixed: 0, credit: 0, card: 0, account: 0 },
    cashFromMixed: 0, // acumulado de efectivo de ventas "mixto"
  },
  cashClosures: [],

  settings: {
    taxRate: 0.21,
    currency: 'ARS',
    companyName: 'Ferretería El Tornillo',
    address: 'Av. Principal 123, Ciudad',
    phone: '+54 11 1234-5678',
    cuit: '',
    ivaCondition: 'CF',
    restockThreshold: 30,
    document: {
      fontFamily: 'Inter',
      fontSize: 12,
      fontColor: '#000000',
      logoUrl: '',
      showQr: true,
      legalFooter: 'Gracias por su compra.',
      watermark: {
        text: 'DOCUMENTO NO VÁLIDO',
        opacity: 0.1,
        rotation: -45,
      },
    },
    invoicing: {
      enabled: false,
      provider: 'AFIP', // 'AFIP' | 'ARCA'
      posNumber: 1,
      concept: 1,
      docTypeDefault: 99,
      ivaCondition: 'CF',
    },
  },

  currentCustomer: null,
  paymentMethod: 'cash',
  paymentAmount: '',
  discount: 0,
  notes: '',
};

const sampleProviders = [
  { id: 'prov1', name: 'Ferretería Central', contactPerson: 'Carlos Ruiz', phone: '11-4567-8901', email: 'compras@central.com' },
  { id: 'prov2', name: 'Pinturas SA',       contactPerson: 'Ana Gomez',   phone: '11-2345-6789', email: 'ventas@pinturassa.com' },
  { id: 'prov3', name: 'Eléctrica Norte',   contactPerson: 'Pedro Martin',phone: '11-3456-7890', email: 'pedidos@electricanorte.com' },
];

const sampleProducts = [
  { id: '1', code: '7891234567890', name: 'Tornillo Phillips 3x20mm', price: 15.50,  cost: 8.00,   stock: 500, unit: 'unidad', category: 'Tornillería',  providerId: 'prov1', minStock: 50 },
  { id: '2', code: '7891234567891', name: 'Pintura Látex Blanco 4L',  price: 2850.00, cost: 1900.00, stock: 25,  unit: 'unidad', category: 'Pinturas',    providerId: 'prov2', minStock: 5  },
  { id: '3', code: '7891234567892', name: 'Cable Unipolar 2.5mm',     price: 180.00,  cost: 120.00, stock: 1000, unit: 'metro',  category: 'Electricidad',providerId: 'prov3', minStock: 100 },
  { id: '4', code: '7891234567893', name: 'Martillo 500g',            price: 1250.00, cost: 800.00, stock: 15,  unit: 'unidad', category: 'Herramientas', providerId: 'prov1', minStock: 3  },
  { id: '5', code: '7891234567894', name: 'Cemento Portland 50kg',    price: 950.00,  cost: 650.00, stock: 80,  unit: 'kg',     category: 'Construcción', providerId: 'prov1', minStock: 20 },
];

const sampleCustomers = [
  { id: '1', name: 'Juan Pérez',  email: 'juan@email.com',  phone: '+541198765432', address: 'Calle Falsa 123', balance: 0,    creditLimit: 50000 },
  { id: '2', name: 'María García',email: 'maria@email.com', phone: '+541155551234', address: 'Av. Libertador 456', balance: -1500, creditLimit: 30000 },
];

/* --------------------- Reducer --------------------- */
function posReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    /* ------ Carrito ------ */
    case 'ADD_TO_CART': {
      const it = action.payload;
      const existing = state.cart.find(x => x.id === it.id && Number(x.price) === Number(it.price));
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(x =>
            x === existing ? { ...x, quantity: Number(x.quantity) + Number(it.quantity || 1) } : x
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          { ...it, cartId: cryptoRandom(), itemDiscount: it.itemDiscount || 0, note: it.note || '' },
        ],
      };
    }
    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: state.cart.map(i => (i.cartId === action.payload.cartId ? { ...i, ...action.payload.updates } : i)),
      };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.cartId !== action.payload) };
    case 'CLEAR_CART':
      return { ...state, cart: [], currentCustomer: null, paymentMethod: 'cash', paymentAmount: '', discount: 0, notes: '' };

    /* ------ Maestro ------ */
    case 'SET_CUSTOMER':       return { ...state, currentCustomer: action.payload || null };
    case 'SET_PAYMENT_METHOD': return { ...state, paymentMethod: action.payload };
    case 'SET_PAYMENT_AMOUNT': {
      const v = action.payload;
      return { ...state, paymentAmount: v === '' ? '' : Number(v || 0) };
    }
    case 'SET_DISCOUNT':       return { ...state, discount: Number(action.payload || 0) };
    case 'SET_NOTES':          return { ...state, notes: action.payload || '' };

    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, { ...action.payload, id: Date.now().toString() }] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => (p.id === action.payload.id ? { ...p, ...action.payload.updates } : p)) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };

    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, { ...action.payload, id: Date.now().toString(), balance: 0 }] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => (c.id === action.payload.id ? { ...c, ...action.payload.updates } : c)) };
      case 'DELETE_CUSTOMER': {
  const id = action.payload;
  return {
    ...state,
    customers: state.customers.filter(c => c.id !== id),
    // Limpia cualquier referencia activa al cliente actual
    currentCustomer: state.currentCustomer?.id === id ? null : state.currentCustomer,
  };
}


    case 'ADD_PROVIDER':
      return { ...state, providers: [...state.providers, { ...action.payload, id: Date.now().toString() }] };
    case 'UPDATE_PROVIDER':
      return { ...state, providers: state.providers.map(p => (p.id === action.payload.id ? { ...p, ...action.payload.updates } : p)) };
    case 'DELETE_PROVIDER':
      return { ...state, providers: state.providers.filter(p => p.id !== action.payload) };

    case 'RESET_PROVIDER_RESTOCK': {
      const next = { ...state.providerRestock };
      delete next[action.payload];
      return { ...state, providerRestock: next };
    }

    /* ------ Caja ------ */
    case 'OPEN_CASH_REGISTER':
  return {
    ...state,
    cashRegister: {
      isOpen: true,
      openedAt: new Date().toISOString(),
      openingAmount: Number(action.payload || 0),
      currentAmount: Number(action.payload || 0),
      salesByType: { cash: 0, transfer: 0, mixed: 0, credit: 0, card: 0, account: 0 },
      cashFromMixed: 0,
      movements: [
        {
          id: cryptoRandom(),
          type: 'opening',
          concept: 'Apertura',
          amount: Number(action.payload || 0),
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
    case 'REGISTER_SALE': {
      const sale = action.payload;
      if (!state.cashRegister.isOpen) return state;

      const method = sale.paymentMethod || 'cash';
      const total = Number(sale.total || 0);
      const profit = Number(sale.profit || 0);

      // Movimientos de caja
      const movements = [...state.cashRegister.movements];
      const newMovement = {
        id: cryptoRandom(),
        type: method === 'cash' || method === 'mixed' ? 'income' : 'info',
        concept: `Venta (${method})`,
        amount: method === 'cash' || method === 'mixed' ? total : 0,
        timestamp: sale.timestamp || new Date().toISOString(),
      };

      if (method === 'cash' || method === 'mixed') {
        movements.push(newMovement);
      }

      // Actualización de caja
      const newCash = { ...state.cashRegister };
      if (method === 'cash') {
        newCash.currentAmount += total;
        newCash.salesByType.cash += total;
      } else if (method === 'transfer') {
        newCash.salesByType.transfer += total;
      } else if (method === 'mixed') {
        newCash.currentAmount += total * 0.5;
        newCash.cashFromMixed += total * 0.5;
        newCash.salesByType.mixed += total;
      }

      // Guardar movimiento y venta del día
      return {
        ...state,
        sales: [
          ...state.sales,
          {
            ...sale,
            timestamp: sale.timestamp || new Date().toISOString(),
            profit,
          },
        ],
        cashRegister: {
          ...newCash,
          movements,
        },
      };
    }


    case 'ADD_CASH_MOVEMENT': {
      if (!state.cashRegister.isOpen) return state;
      const { type, concept, amount } = action.payload;
      const signed = type === 'income' ? Number(amount || 0) : -Number(amount || 0);
      return {
        ...state,
        cashRegister: {
          ...state.cashRegister,
          currentAmount: Number(state.cashRegister.currentAmount) + signed,
          movements: [
            ...state.cashRegister.movements,
            { id: cryptoRandom(), type, concept, amount: Number(amount || 0), timestamp: new Date().toISOString() },
          ],
        },
      };
    }

 case 'CLOSE_CASH_REGISTER': {
  const cr = state.cashRegister;
  const { openingAmount, movements, salesByType, currentAmount, openedAt, cashFromMixed } = cr;

  const cashMovements = movements.reduce((acc, m) => {
    if (m.type === 'income') return acc + Number(m.amount || 0);
    if (m.type === 'expense') return acc - Number(m.amount || 0);
    return acc;
  }, 0);

  const expectedAmount =
    Number(openingAmount || 0) +
    Number(salesByType.cash || 0) +
    Number(cashFromMixed || 0) +
    Number(cashMovements || 0);

  const difference = Number(currentAmount || 0) - expectedAmount;

  const inTurn = state.sales.filter(
    (s) => openedAt && new Date(s.timestamp) >= new Date(openedAt) && s.type !== 'quote'
  );

  const subtotalTurno = inTurn.reduce(
    (s, x) => s + Number(x.subtotal || 0) - Number(x.itemDiscounts || 0) - Number(x.discount || 0),
    0
  );
  const ivaTurno = inTurn.reduce((s, x) => s + Number(x.taxAmount || 0), 0);
  const totalTurno = inTurn.reduce((s, x) => s + Number(x.total || 0), 0);
  const gananciaNetaTurno = inTurn.reduce((s, x) => s + Number(x.profit || 0), 0);

  const desgloseMetodo = inTurn.reduce((acc, s) => {
    const m = s?.payment?.method ?? s?.paymentMethod ?? 'desconocido';
    acc[m] = (acc[m] || 0) + Number(s.total || 0);
    return acc;
  }, {});

  const closure = {
    ...cr,
    expectedAmount,
    difference,
    closedAt: new Date().toISOString(),
    subtotalTurno,
    ivaTurno,
    totalTurno,
    gananciaNetaTurno,
    desgloseMetodo,
    movements: [
      ...movements,
      {
        id: cryptoRandom(),
        type: 'closing',
        concept: 'Cierre',
        amount: Number(currentAmount || 0),
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return {
    ...state,
    cashClosures: [...state.cashClosures, closure],
    cashRegister: {
      isOpen: false,
      openedAt: null,
      openingAmount: 0,
      currentAmount: 0,
      movements: [],
      salesByType: { cash: 0, transfer: 0, mixed: 0, credit: 0, card: 0, account: 0 },
      cashFromMixed: 0,
    },
  };
}


    /* ------ Ventas ------ */
    case 'SAVE_SALE': {
      const sale = action.payload;

      // Descontar stock
      const products = state.products.map(p => {
        const sold = sale.items.filter(i => i.id === p.id).reduce((s, i) => s + Number(i.quantity || 0), 0);
        return sold ? { ...p, stock: Math.max(0, Number(p.stock || 0) - sold) } : p;
      });

      // Caja (solo si está abierta)
      let cashRegister = { ...state.cashRegister };
      if (cashRegister.isOpen) {
        const method = sale.payment?.method || state.paymentMethod || 'cash';
        const total  = Number(sale.total || 0);
        const paid   = Number(sale.payment?.amountPaid || 0);
        const change = Number(sale.payment?.change || 0);

        if (method === 'cash') {
          if (total > 0) {
            cashRegister.currentAmount += total;
            cashRegister.movements.push({
              id: cryptoRandom(), type: 'income', concept: `Venta ${sale.documentNumber}`, amount: total, timestamp: new Date().toISOString(),
            });
          }
          if (change > 0) {
            cashRegister.currentAmount -= change;
            cashRegister.movements.push({
              id: cryptoRandom(), type: 'expense', concept: `Vuelto ${sale.documentNumber}`, amount: change, timestamp: new Date().toISOString(),
            });
          }
          cashRegister.salesByType.cash = Number(cashRegister.salesByType.cash || 0) + total;

        } else if (method === 'mixed') {
          // Parte efectivamente recibida en EFECTIVO
          const cashPart = Math.min(paid, total);
          if (cashPart > 0) {
            cashRegister.currentAmount += cashPart;
            cashRegister.cashFromMixed = Number(cashRegister.cashFromMixed || 0) + cashPart;
            cashRegister.movements.push({
              id: cryptoRandom(), type: 'income', concept: `Venta (mixto) ${sale.documentNumber}`, amount: cashPart, timestamp: new Date().toISOString(),
            });
          }
          cashRegister.salesByType.mixed = Number(cashRegister.salesByType.mixed || 0) + total;

        } else if (method === 'account') {
          // *** A CUENTA con pago parcial ***
          const upfront = Math.max(0, paid); // lo que entregó ahora (efectivo/seña)
          if (upfront > 0) {
            cashRegister.currentAmount += upfront;
            cashRegister.movements.push({
              id: cryptoRandom(),
              type: 'income',
              concept: `Seña a cuenta ${sale.documentNumber}`,
              amount: upfront,
              timestamp: new Date().toISOString(),
            });
            // lo registramos en métricas también
            cashRegister.salesByType.cash = Number(cashRegister.salesByType.cash || 0) + upfront;
          }
          // el total entero se considera operación "a cuenta" para métricas
          cashRegister.salesByType.account = Number(cashRegister.salesByType.account || 0) + total;

        } else if (method === 'transfer' || method === 'card') {
          // No afecta caja física
          cashRegister.salesByType[method] = Number(cashRegister.salesByType[method] || 0) + total;

        } else {
          // fallback por si aparece otro método
          cashRegister.salesByType[method] = Number(cashRegister.salesByType[method] || 0) + total;
        }
      }

      // Cuenta corriente (crédito / a cuenta)
      let customers = state.customers;
      const method = sale.payment?.method || state.paymentMethod || 'cash';
      if ((sale.type === 'credit' || method === 'account') && sale.customer?.id) {
        const total = Number(sale.total || 0);
        const upfront = Math.max(0, Number(sale.payment?.amountPaid || 0));
        const toAccount = Math.max(0, total - upfront); // lo que realmente queda debiendo
        customers = customers.map(c =>
          (c.id === sale.customer.id ? { ...c, balance: Number(c.balance || 0) - toAccount } : c)
        );
      }

      // providerRestock
      const providerRestock = { ...state.providerRestock };
      sale.items.forEach(item => {
        const product = state.products.find(p => p.id === item.id);
        if (product?.providerId) {
          if (!providerRestock[product.providerId]) providerRestock[product.providerId] = {};
          providerRestock[product.providerId][item.id] = Number(providerRestock[product.providerId][item.id] || 0) + Number(item.quantity || 0);
        }
      });

      // Documentos (meta)
      const documents = [
        ...state.documents,
        {
          saleId: sale.id,
          number: sale.documentNumber,
          pdf_url: sale.fiscal?.pdf_url || null,
          provider: sale.fiscal?.provider || null,
          cae: sale.fiscal?.cae || null,
          cae_due_date: sale.fiscal?.cae_due_date || null,
          training: !!sale.fiscal?.training,
          created_at: sale.timestamp,
        },
      ];

      return {
        ...state,
        sales: [sale, ...state.sales],
        products,
        cashRegister,
        customers,
        providerRestock,
        documents,
        cart: [],
        currentCustomer: null,
        paymentMethod: 'cash',
        paymentAmount: '',
        discount: 0,
        notes: '',
      };
    }

    // Compatibilidad legacy + helpers
    case 'PROCESS_SALE': {
      const p = action.payload;
      const sale = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: p.type || 'sale',
        items: p.cart || [],
        subtotal: Number(p.subtotal || 0),
        itemDiscounts: (p.cart || []).reduce((s, it) => s + Number(it.itemDiscount || 0), 0),
        discount: Number(p.discount || 0),
        taxAmount: Number(p.tax || 0),
        total: Number(p.total || 0),
        profit: Number(p.profit || 0),
        payment: {
          method: p.paymentMethod || 'cash',
          amountPaid: Number(p.paymentAmount || 0),
          change: Number(p.change || 0),
        },
        paymentMethod: p.paymentMethod || 'cash',
        paymentAmount: Number(p.paymentAmount || 0),
        change: Number(p.change || 0),
        notes: p.notes || '',
        customer: p.customer || null,
        documentNumber: p.document?.number || `TEMP-${Date.now()}`,
        fiscal: {
          training: !p.document?.pdf_url, provider: 'none',
          cae: null, cae_due_date: null, pdf_url: p.document?.pdf_url || null,
        },
      };
      return posReducer(state, { type: 'SAVE_SALE', payload: sale });
    }

    case 'CLEAR_SALES_HISTORY': {
      return {
        ...state,
        sales: [],
        documents: [],
      };
    }

    case 'CONVERT_QUOTE_TO_SALE': {
      const q = action.payload;
      // Convertimos el presupuesto en una venta real, método cash por defecto (pagado exacto)
      const newSale = {
        ...q,
        id: cryptoRandom(),
        timestamp: new Date().toISOString(),
        type: 'sale',
        payment: {
          method: q?.payment?.method || 'cash',
          amountPaid: q?.payment?.amountPaid ?? q?.total ?? 0,
          change: 0,
        },
        paymentMethod: q?.payment?.method || 'cash',
        paymentAmount: q?.payment?.amountPaid ?? q?.total ?? 0,
        change: 0,
        documentNumber: `TEMP-${Date.now()}`,
        fiscal: { training: true, provider: 'none', cae: null, cae_due_date: null, pdf_url: null, extra: {} },
      };
      return posReducer(state, { type: 'SAVE_SALE', payload: newSale });
    }

    default:
      return state;
  }
}

/* --------------------- Helpers de cálculo --------------------- */
const calcSubtotal = (cart) =>
  (cart || []).reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);

const calcItemDiscounts = (cart) =>
  (cart || []).reduce((sum, it) => sum + Number(it.itemDiscount || 0), 0);

const calcDetail = (cart, discount, taxRate) => {
  const subtotal = calcSubtotal(cart);
  const itemDiscounts = calcItemDiscounts(cart);
  const base = subtotal - itemDiscounts;
  const taxAmount = Number((base * Number(taxRate ?? 0)).toFixed(2));
  const total = Number((base + taxAmount - Number(discount || 0)).toFixed(2));
  return { subtotal, itemDiscounts, base, taxAmount, total };
};

const calcProfit = (cart) =>
  (cart || []).reduce((sum, it) => sum + (Number(it.price || 0) - Number(it.cost || 0)) * Number(it.quantity || 0), 0);

/* --------------------- Provider --------------------- */
export function POSProvider({ children }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergedSettings = {
          ...initialState.settings,
          ...(parsed.settings || {}),
          document: {
            ...initialState.settings.document,
            ...(parsed.settings?.document || {}),
            watermark: {
              ...initialState.settings.document.watermark,
              ...(parsed.settings?.document?.watermark || {}),
            },
          },
        };

        mergedSettings.taxRate = Number(mergedSettings.taxRate ?? 0.21);

        dispatch({
          type: 'LOAD_DATA',
          payload: {
            ...initialState,
            ...parsed,
            settings: mergedSettings,
            products: parsed.products?.length ? parsed.products : sampleProducts,
            customers: parsed.customers?.length ? parsed.customers : sampleCustomers,
            providers: parsed.providers?.length ? parsed.providers : sampleProviders,
            providerRestock: parsed.providerRestock || {},
            cashRegister: parsed.cashRegister
              ? { ...initialState.cashRegister, ...parsed.cashRegister }
              : initialState.cashRegister,
          },
        });
      } else {
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            ...initialState,
            products: sampleProducts,
            customers: sampleCustomers,
            providers: sampleProviders,
          },
        });
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
      dispatch({
        type: 'LOAD_DATA',
        payload: {
          ...initialState,
          products: sampleProducts,
          customers: sampleCustomers,
          providers: sampleProviders,
        },
      });
    }
  }, []);

  useEffect(() => {
    const handler = (ev) => {
      const customer = ev?.detail || null;
      dispatch({ type: 'SET_CUSTOMER', payload: customer });
    };
    window.addEventListener('pos:set-customer', handler);
    return () => window.removeEventListener('pos:set-customer', handler);
  }, []);

useEffect(() => {
  try {
    // Guardar datos sin incluir el carrito (para no duplicar en storage)
    const toSave = { ...state, cart: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

    const hasCart = Array.isArray(state.cart) && state.cart.length > 0;
    const hasPayment = Number(state.paymentAmount || 0) > 0;
    const shouldBroadcast = hasCart || hasPayment;

    if (!shouldBroadcast) return;

    const channel = new BroadcastChannel('ferrePOS');
    const d = calcDetail(state.cart, state.discount, state.settings.taxRate);

    // 🔒 Blindado: nunca enviar cart vacío salvo que se haya limpiado explícitamente
    channel.postMessage({
      type: 'STATE_UPDATE',
      cart: hasCart ? state.cart : undefined,
      currentCustomer: hasCart ? state.currentCustomer : undefined,
      paymentMethod: state.paymentMethod || 'cash',
      paymentAmount: Number(state.paymentAmount || 0),
      discount: Number(state.discount || 0),
      total: hasCart ? d.total : undefined,
    });

    channel.close();
  } catch (err) {
    console.error('Broadcast error:', err);
  }
}, [
  state.cart,
  state.currentCustomer,
  state.paymentMethod,
  state.paymentAmount,
  state.discount,
]);

  /* --------------------- API expuesta --------------------- */
  const addToCart = (product, quantity = 1, customPrice = null, note = '') => {
    if (!product) return;
    if (Number(quantity) <= 0) {
      toast({ title: 'Error', description: 'La cantidad debe ser mayor a 0', variant: 'destructive' });
      return;
    }
    if (product.unit === 'unidad' && Number(quantity) > Number(product.stock || 0)) {
      toast({
        title: 'Stock insuficiente',
        description: `Solo hay ${product.stock} ${product.unit}(s) disponibles`,
        variant: 'destructive',
      });
      return;
    }
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        ...product,
        quantity: Number(quantity || 1),
        price: Number(customPrice ?? product.price ?? 0),
        note: note || '',
      },
    });
    toast({ title: 'Producto agregado', description: `${product.name} x${quantity}` });
  };

  const setPaymentMethod = (m) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: m });
  const setPaymentAmount = (v) => dispatch({ type: 'SET_PAYMENT_AMOUNT', payload: v });
  const applyDiscount = (v) => dispatch({ type: 'SET_DISCOUNT', payload: v });

  const setCustomer = (customer) => dispatch({ type: 'SET_CUSTOMER', payload: customer || null });
  const setCustomerById = (id) => {
    const customer = state.customers.find(c => c.id === id) || null;
    dispatch({ type: 'SET_CUSTOMER', payload: customer });
  };

  const calculateDetail = () => calcDetail(state.cart, state.discount, state.settings.taxRate);
  const calculateTotal = () => calculateDetail().total;
  const calculateProfit = () => calcProfit(state.cart);

  const processSale = async (type = 'sale') => {
    if (!state.cart.length) {
      toast({ title: 'Error', description: 'El carrito está vacío', variant: 'destructive' });
      return null;
    }
    const { subtotal, itemDiscounts, taxAmount, total } = calculateDetail();
    const profit = calculateProfit();

    if (type !== 'quote' && type !== 'credit') {
      if (state.paymentMethod === 'cash' && Number(state.paymentAmount || 0) < total) {
        toast({
          title: 'Pago insuficiente',
          description: `Total: $${total.toFixed(2)} / Pagado: $${Number(state.paymentAmount || 0).toFixed(2)}`,
          variant: 'destructive',
        });
        return null;
      }
    }
    if (type === 'credit' && !state.currentCustomer) {
      toast({ title: 'Error', description: 'Debe seleccionar un cliente para venta a cuenta', variant: 'destructive' });
      return null;
    }

    const sale = {
      id: cryptoRandom(),
      timestamp: new Date().toISOString(),
      type,
      items: state.cart.map(it => ({
        id: it.id, code: it.code, name: it.name,
        quantity: Number(it.quantity || 0),
        price: Number(it.price || 0),
        cost: Number(it.cost || 0),
        itemDiscount: Number(it.itemDiscount || 0),
        note: it.note || '',
      })),
      subtotal: Number(subtotal.toFixed(2)),
      itemDiscounts: Number(itemDiscounts.toFixed(2)),
      discount: Number(state.discount || 0),
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      payment: {
        method: state.paymentMethod,
        amountPaid: Number(state.paymentAmount || 0),
        change: state.paymentMethod === 'cash' ? Number(Math.max(0, (Number(state.paymentAmount || 0) - total)).toFixed(2)) : 0,
      },
      paymentMethod: state.paymentMethod,
      paymentAmount: Number(state.paymentAmount || 0),
      change: state.paymentMethod === 'cash' ? Number(Math.max(0, (Number(state.paymentAmount || 0) - total)).toFixed(2)) : 0,

      customer: state.currentCustomer,
      notes: state.notes || '',
      documentNumber: null,
      fiscal: { training: true, provider: 'none', cae: null, cae_due_date: null, pdf_url: null, extra: {} },
    };

    if (['sale', 'credit'].includes(type) && state.settings.invoicing?.enabled) {
      try {
        const doc = await issueDocument({ sale, settings: state.settings });
        sale.documentNumber = doc.number;
        sale.fiscal = {
          training: !!doc.training,
          provider: doc.provider || state.settings.invoicing?.provider || 'none',
          cae: doc.cae || null,
          cae_due_date: doc.cae_due_date || null,
          pdf_url: doc.pdf_url || null,
          extra: doc.extra || {},
        };
      } catch (e) {
        console.error('IssueDocument error', e);
        sale.documentNumber = `TEMP-${Date.now()}`;
        sale.fiscal = { ...sale.fiscal, training: true };
      }
    } else {
      sale.documentNumber = `TEMP-${Date.now()}`;
    }

    dispatch({ type: 'SAVE_SALE', payload: sale });

    toast({
      title: type === 'quote' ? 'Presupuesto registrado' : 'Venta registrada',
      description: sale.fiscal.training ? 'Documento temporal (modo entrenamiento)' : `Comprobante ${sale.documentNumber}`,
    });

    return sale;
  };

  const addCustomer = (customerData) => {
    if (!customerData?.name?.trim() || !customerData?.phone?.trim()) {
      toast({ title: 'Error', description: 'Nombre y teléfono son requeridos', variant: 'destructive' });
      return null;
    }
    const newCustomer = { ...customerData, id: Date.now().toString(), balance: 0, creditLimit: customerData.creditLimit || 0 };
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    toast({ title: 'Cliente agregado', description: `${newCustomer.name} ha sido agregado.` });
    return newCustomer;
  };
  const deleteCustomer = (id) => {
  dispatch({ type: 'DELETE_CUSTOMER', payload: id });
  toast({ title: 'Cliente eliminado', description: 'El cliente ha sido eliminado correctamente.' });
};


  const addProvider = (providerData) => {
    if (!providerData?.name?.trim()) {
      toast({ title: 'Error', description: 'El nombre del proveedor es requerido.', variant: 'destructive' });
      return null;
    }
    const newProvider = { ...providerData, id: Date.now().toString() };
    dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
    toast({ title: 'Proveedor agregado', description: `${newProvider.name} ha sido agregado.` });
    return newProvider;
  };

  const value = useMemo(() => ({
    state,
    dispatch,
    addToCart,
    setPaymentMethod,
    setPaymentAmount,
    applyDiscount,
    setCustomer,
    setCustomerById,
    calculateSubtotal: () => calcSubtotal(state.cart),
    calculateTax: () => Number(calcSubtotal(state.cart) * Number(state.settings.taxRate ?? 0)),
    calculateTotal,
    calculateProfit,
    calculateDetail,
    processSale,
    addCustomer,
    deleteCustomer,
    addProvider,
  }), [state]);

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

/* --------------------- Hooks --------------------- */
export const usePOS = () => {
  const ctx = useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used within a POSProvider');
  return ctx;
};

/* --------------------- Utils --------------------- */
function cryptoRandom() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
