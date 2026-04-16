export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
  image_url?: string;
}

export type OrderStatus = 'Verified' | 'Accepted' | 'Paid' | 'Shipped' | 'Delivered';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
console.log('API Base URL:', BASE_URL || '(relative)');

export const api = {
  fetchCatalog: async (): Promise<Product[]> => {
    const response = await fetch(`${BASE_URL}/api/public/catalog`);
    if (!response.ok) throw new Error('Failed to fetch catalog');
    return response.json();
  },
  
  fetchProduct: async (id: string): Promise<{ product: Product | null, related: Product[] }> => {
    const response = await fetch(`${BASE_URL}/api/public/catalog/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },
  
  placeOrder: async (data: any): Promise<{ orderRef: string, success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to place order');
    return response.json();
  },
  
  verifyOTP: async (otp: string, orderRef: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderRef, otp })
    });
    if (!response.ok) throw new Error('Failed to verify OTP');
    return response.json();
  },
  
  resendOTP: async (orderRef: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderRef })
    });
    if (!response.ok) throw new Error('Failed to resend OTP');
    return response.json();
  },
  
  trackOrder: async (ref: string): Promise<{ status: OrderStatus, payment_url?: string }> => {
    const response = await fetch(`${BASE_URL}/api/orders/${ref}/status`);
    if (!response.ok) throw new Error('Failed to track order');
    return response.json();
  }
};
