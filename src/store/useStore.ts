import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../i18n/translations';
import { Product } from '../utils/api';

export interface CartItem extends Product {
  quantity: number;
}

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  deliveryMethod: 'delivery' | 'pickup';
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void;

  customer: { id: string; name: string; email: string; phone?: string } | null;
  customerToken: string | null;
  setCustomer: (user: any, token: string) => void;
  clearCustomer: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
      
      cart: [],
      addToCart: (product) => set((state) => {
        const existing = state.cart.find(item => item.id === product.id);
        if (existing) {
          return {
            cart: state.cart.map(item =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          };
        }
        return { cart: [...state.cart, { ...product, quantity: 1 }] };
      }),
      
      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== productId)
      })),
      
      updateQuantity: (productId, quantity) => set((state) => ({
        cart: state.cart.map(item =>
          item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        ).filter(item => item.quantity > 0)
      })),
      
      clearCart: () => set({ cart: [] }),
      
      deliveryMethod: 'delivery',
      setDeliveryMethod: (deliveryMethod) => set({ deliveryMethod }),

      customer: null,
      customerToken: null,
      setCustomer: (user, token) => set({ customer: user, customerToken: token }),
      clearCustomer: () => set({ customer: null, customerToken: null }),
    }),
    {
      name: 'e-pharm-store'
    }
  )
);

export const useCartTotal = () => {
  const items = useStore(state => state.cart);
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};
