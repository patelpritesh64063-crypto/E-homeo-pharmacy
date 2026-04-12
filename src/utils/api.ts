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
  
  placeOrder: async (data: any): Promise<{ orderId: string, success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to place order');
    return response.json();
  },
  
  verifyOTP: async (otp: string, orderId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    if (!response.ok) throw new Error('Failed to verify OTP');
    return response.json();
  },
  
  resendOTP: async (orderId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}/resend-otp`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to resend OTP');
    return response.json();
  },
  
  trackOrder: async (ref: string): Promise<{ status: OrderStatus }> => {
    const response = await fetch(`${BASE_URL}/api/orders/${ref}/status`);
    if (!response.ok) throw new Error('Failed to track order');
    return response.json();
  }
};
