
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

const POSContext = createContext();

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
    movements: [],
    openedAt: null,
    closedAt: null,
    salesByType: { cash: 0, transfer: 0, mixed: 0, credit: 0 }
  },
  cashClosures: [],
  settings: {
    taxRate: 0.21,
    currency: 'ARS',
    companyName: 'Ferretería El Tornillo',
    companyAddress: 'Av. Principal 123, Ciudad',
    companyPhone: '+54 11 1234-5678',
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
        }
    }
  },
  currentCustomer: null,
  paymentMethod: 'cash',
  paymentAmount: 0,
  discount: 0,
  notes: ''
};

const sampleProviders = [
  { id: 'prov1', name: 'Ferretería Central', contactPerson: 'Carlos Ruiz', phone: '11-4567-8901', email: 'compras@central.com' },
  { id: 'prov2', name: 'Pinturas SA', contactPerson: 'Ana Gomez', phone: '11-2345-6789', email: 'ventas@pinturassa.com' },
  { id: 'prov3', name: 'Eléctrica Norte', contactPerson: 'Pedro Martin', phone: '11-3456-7890', email: 'pedidos@electricanorte.com' }
];

const sampleProducts = [
  { id: '1', code: '7891234567890', name: 'Tornillo Phillips 3x20mm', price: 15.50, cost: 8.00, stock: 500, unit: 'unidad', category: 'Tornillería', providerId: 'prov1', minStock: 50 },
  { id: '2', code: '7891234567891', name: 'Pintura Látex Blanco 4L', price: 2850.00, cost: 1900.00, stock: 25, unit: 'unidad', category: 'Pinturas', providerId: 'prov2', minStock: 5 },
  { id: '3', code: '7891234567892', name: 'Cable Unipolar 2.5mm', price: 180.00, cost: 120.00, stock: 1000, unit: 'metro', category: 'Electricidad', providerId: 'prov3', minStock: 100 },
  { id: '4', code: '7891234567893', name: 'Martillo 500g', price: 1250.00, cost: 800.00, stock: 15, unit: 'unidad', category: 'Herramientas', providerId: 'prov1', minStock: 3 },
  { id: '5', code: '7891234567894', name: 'Cemento Portland 50kg', price: 950.00, cost: 650.00, stock: 80, unit: 'kg', category: 'Construcción', providerId: 'prov1', minStock: 20 }
];

const sampleCustomers = [
  { id: '1', name: 'Juan Pérez', email: 'juan@email.com', phone: '+541198765432', address: 'Calle Falsa 123', balance: 0, creditLimit: 50000 },
  { id: '2', name: 'María García', email: 'maria@email.com', phone: '+541155551234', address: 'Av. Libertador 456', balance: -1500, creditLimit: 30000 }
];


function posReducer(state, action) {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.id === action.payload.id && item.price === action.payload.price);
      if (existingItem) {
        return { ...state, cart: state.cart.map(item => item.cartId === existingItem.cartId ? { ...item, quantity: item.quantity + action.payload.quantity } : item) };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, cartId: Date.now(), itemDiscount: 0, note: '' }] };
    }
    case 'UPDATE_CART_ITEM':
      return { ...state, cart: state.cart.map(item => item.cartId === action.payload.cartId ? { ...item, ...action.payload.updates } : item) };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.cartId !== action.payload) };
    case 'CLEAR_CART':
      return { ...state, cart: [], currentCustomer: null, paymentMethod: 'cash', paymentAmount: 0, discount: 0, notes: '' };
    case 'SET_CUSTOMER':
      return { ...state, currentCustomer: action.payload };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_PAYMENT_AMOUNT':
      return { ...state, paymentAmount: action.payload };
    case 'SET_DISCOUNT':
      return { ...state, discount: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, { ...action.payload, id: Date.now().toString() }] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? { ...p, ...action.payload.updates } : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, { ...action.payload, id: Date.now().toString(), balance: 0 }] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? { ...c, ...action.payload.updates } : c) };
    case 'ADD_PROVIDER':
      return { ...state, providers: [...state.providers, { ...action.payload, id: Date.now().toString() }] };
    case 'UPDATE_PROVIDER':
      return { ...state, providers: state.providers.map(p => p.id === action.payload.id ? { ...p, ...action.payload.updates } : p) };
    case 'DELETE_PROVIDER':
      return { ...state, providers: state.providers.filter(p => p.id !== action.payload) };
    case 'RESET_PROVIDER_RESTOCK': {
        const newProviderRestock = { ...state.providerRestock };
        delete newProviderRestock[action.payload];
        return { ...state, providerRestock: newProviderRestock };
    }
    case 'OPEN_CASH_REGISTER':
      return { ...state, cashRegister: { ...initialState.cashRegister, isOpen: true, openingAmount: action.payload, currentAmount: action.payload, openedAt: new Date().toISOString() } };
    case 'CLOSE_CASH_REGISTER': {
      const { openingAmount, movements, salesByType, currentAmount } = state.cashRegister;
      const totalCashSales = salesByType.cash;
      const cashMovements = movements.reduce((acc, mov) => mov.type === 'income' ? acc + mov.amount : acc - mov.amount, 0);
      const expectedAmount = openingAmount + totalCashSales + cashMovements;
      const difference = currentAmount - expectedAmount;
      const closure = { ...state.cashRegister, closedAt: new Date().toISOString(), expectedAmount, difference };
      return { ...state, cashRegister: { ...initialState.cashRegister }, cashClosures: [...state.cashClosures, closure] };
    }
    case 'ADD_CASH_MOVEMENT': {
        if (!state.cashRegister.isOpen) return state;
        const newCurrentAmount = action.payload.type === 'income' 
            ? state.cashRegister.currentAmount + action.payload.amount
            : state.cashRegister.currentAmount - action.payload.amount;

        return { ...state, cashRegister: { ...state.cashRegister, currentAmount: newCurrentAmount, movements: [...state.cashRegister.movements, {...action.payload, id: Date.now(), timestamp: new Date().toISOString()}] }};
    }
    case 'PROCESS_SALE': {
      const { subtotal, tax, total, change, type, document, profit, cart } = action.payload;
      const sale = { id: Date.now().toString(), items: cart, customer: state.currentCustomer, subtotal, tax, discount: state.discount, total, profit, paymentMethod: state.paymentMethod, paymentAmount: state.paymentAmount, change, notes: state.notes, timestamp: new Date().toISOString(), type, documentNumber: document.number };
      
      const newDocuments = [...state.documents, { ...document, saleId: sale.id }];

      if (type === 'quote') {
        return { ...state, sales: [...state.sales, sale], documents: newDocuments, cart: [], currentCustomer: null, paymentMethod: 'cash', paymentAmount: 0, discount: 0, notes: '' };
      }

      const updatedProducts = state.products.map(p => {
        const cartItem = cart.find(item => item.id === p.id);
        return cartItem ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) } : p;
      });

      let updatedCashRegister = { ...state.cashRegister };
      if (state.cashRegister.isOpen) {
        const cashAmount = state.paymentMethod === 'cash' ? total : (state.paymentMethod === 'mixed' ? state.paymentAmount : 0);
        if (cashAmount > 0) {
          updatedCashRegister.currentAmount += cashAmount;
        }
        updatedCashRegister.salesByType[state.paymentMethod] = (updatedCashRegister.salesByType[state.paymentMethod] || 0) + total;
      }

      let updatedCustomers = [...state.customers];
      if (state.currentCustomer && type === 'credit') {
        updatedCustomers = state.customers.map(c => c.id === state.currentCustomer.id ? { ...c, balance: c.balance - total } : c);
      }
      
      const updatedProviderRestock = { ...state.providerRestock };
      cart.forEach(item => {
        const product = state.products.find(p => p.id === item.id);
        if (product?.providerId) {
            if (!updatedProviderRestock[product.providerId]) updatedProviderRestock[product.providerId] = {};
            if (!updatedProviderRestock[product.providerId][item.id]) updatedProviderRestock[product.providerId][item.id] = 0;
            updatedProviderRestock[product.providerId][item.id] += item.quantity;
        }
      });

      return { ...state, sales: [...state.sales, sale], products: updatedProducts, cashRegister: updatedCashRegister, customers: updatedCustomers, providerRestock: updatedProviderRestock, documents: newDocuments, cart: [], currentCustomer: null, paymentMethod: 'cash', paymentAmount: 0, discount: 0, notes: '' };
    }
    case 'CONVERT_QUOTE_TO_SALE': {
        const quote = action.payload;
        const tempCartState = { cart: quote.items, discount: quote.discount };
        const total = calculateTotal(tempCartState.cart, tempCartState.discount, state.settings.taxRate);

        const salePayload = {
            ...quote,
            cart: quote.items,
            type: 'sale',
            document: { number: `F-${Date.now()}`, pdf_url: null, id: null },
            total: total,
            profit: calculateProfit(quote.items)
        };
        
        const nextState = posReducer(state, { type: 'PROCESS_SALE', payload: salePayload });

        return { ...nextState, sales: nextState.sales.map(s => s.id === quote.id ? {...s, type: 'converted_quote'} : s) };
    }
    default:
      return state;
  }
}

const calculateSubtotal = (cart) => (cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
const calculateTotal = (cart, discount, taxRate) => {
    const subtotal = calculateSubtotal(cart);
    const itemDiscounts = (cart || []).reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
    const totalWithItemDiscounts = subtotal - itemDiscounts;
    const tax = totalWithItemDiscounts * taxRate;
    return totalWithItemDiscounts + tax - discount;
};
const calculateProfit = (cart) => (cart || []).reduce((sum, item) => sum + ((item.price - item.cost) * item.quantity - (item.itemDiscount || 0)), 0);

export function POSProvider({ children }) {
  const [state, dispatch] = useReducer(posReducer, initialState);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('ferrePOS_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const mergedSettings = { ...initialState.settings, ...parsedData.settings, document: { ...initialState.settings.document, ...parsedData.settings?.document, watermark: { ...initialState.settings.document.watermark, ...parsedData.settings?.document?.watermark } } };
        const dataToLoad = {
          ...initialState,
          ...parsedData,
          settings: mergedSettings,
          products: (parsedData.products && parsedData.products.length > 0) ? parsedData.products : sampleProducts,
          customers: (parsedData.customers && parsedData.customers.length > 0) ? parsedData.customers : sampleCustomers,
          providers: (parsedData.providers && parsedData.providers.length > 0) ? parsedData.providers : sampleProviders,
          providerRestock: parsedData.providerRestock || {},
          cashRegister: parsedData.cashRegister ? {...initialState.cashRegister, ...parsedData.cashRegister} : initialState.cashRegister
        };
        dispatch({ type: 'LOAD_DATA', payload: dataToLoad });
      } else {
        dispatch({ type: 'LOAD_DATA', payload: { ...initialState, products: sampleProducts, customers: sampleCustomers, providers: sampleProviders }});
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      dispatch({ type: 'LOAD_DATA', payload: { ...initialState, products: sampleProducts, customers: sampleCustomers, providers: sampleProviders }});
    }
  }, []);

  useEffect(() => {
    const dataToSave = { ...state, cart: undefined };
    localStorage.setItem('ferrePOS_data', JSON.stringify(dataToSave));
    const channel = new BroadcastChannel('ferrePOS');
    channel.postMessage({ type: 'STATE_UPDATE', cart: state.cart, currentCustomer: state.currentCustomer, paymentMethod: state.paymentMethod, paymentAmount: state.paymentAmount, discount: state.discount, total: calculateTotal(state.cart, state.discount, state.settings.taxRate) });
    channel.close();
  }, [state]);

  const addToCart = (product, quantity = 1, customPrice = null, note = '') => {
    if (quantity <= 0) { toast({ title: "Error", description: "La cantidad debe ser mayor a 0", variant: "destructive" }); return; }
    if (quantity > product.stock && product.unit === 'unidad') { toast({ title: "Stock insuficiente", description: `Solo hay ${product.stock} ${product.unit}(s) disponibles`, variant: "destructive" }); return; }
    dispatch({ type: 'ADD_TO_CART', payload: { ...product, quantity, price: customPrice ?? product.price, note } });
    toast({ title: "Producto agregado", description: `${product.name} x${quantity}` });
  };

  const processSale = async (type = 'sale') => {
    if (state.cart.length === 0) { toast({ title: "Error", description: "El carrito está vacío", variant: "destructive" }); return; }
    const total = calculateTotal(state.cart, state.discount, state.settings.taxRate);
    const profit = calculateProfit(state.cart);
    const change = state.paymentMethod === 'cash' ? Math.max(0, state.paymentAmount - total) : 0;
    if (type !== 'quote' && type !== 'credit' && state.paymentMethod === 'cash' && state.paymentAmount < total) { toast({ title: "Error", description: "El monto pagado es insuficiente", variant: "destructive" }); return; }
    if (type === 'credit' && !state.currentCustomer) { toast({ title: "Error", description: "Debe seleccionar un cliente para venta a cuenta", variant: "destructive" }); return; }
    
    let document = { number: `TEMP-${Date.now()}`, pdf_url: null, id: null };
    try {
        toast({ title: "🚧 API no implementada, usando numeración temporal." });
    } catch (error) { console.log('API not available, using training mode'); }

    dispatch({ type: 'PROCESS_SALE', payload: { cart: state.cart, subtotal: calculateSubtotal(state.cart), tax: calculateSubtotal(state.cart) * state.settings.taxRate, total, change, type, document, profit } });
    toast({ title: "Operación procesada", description: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${document.number}` });
  };

  const addCustomer = (customerData) => {
    if (!customerData.name?.trim() || !customerData.phone?.trim()) {
      toast({ title: "Error", description: "Nombre y teléfono son requeridos", variant: "destructive" });
      return null;
    }
    const newCustomer = { ...customerData, id: Date.now().toString(), balance: 0, creditLimit: customerData.creditLimit || 0 };
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    toast({ title: "Cliente agregado", description: `${newCustomer.name} ha sido agregado.` });
    return newCustomer;
  };
  
  const addProvider = (providerData) => {
      if (!providerData.name?.trim()) {
          toast({ title: "Error", description: "El nombre del proveedor es requerido.", variant: "destructive" });
          return null;
      }
      const newProvider = { ...providerData, id: Date.now().toString() };
      dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
      toast({ title: "Proveedor agregado", description: `${newProvider.name} ha sido agregado.`});
      return newProvider;
  };

  const value = { state, dispatch, addToCart, calculateSubtotal: () => calculateSubtotal(state.cart), calculateTax: () => calculateSubtotal(state.cart) * state.settings.taxRate, calculateTotal: () => calculateTotal(state.cart, state.discount, state.settings.taxRate), calculateProfit: () => calculateProfit(state.cart), processSale, addCustomer, addProvider };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOS must be used within a POSProvider');
  return context;
};
