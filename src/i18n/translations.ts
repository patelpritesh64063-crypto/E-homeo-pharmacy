export const translations = {
  en: {
    appTitle: 'E-Pharm',
    tagline: 'All types of homeopathy medicines are available',
    searchPlaceholder: 'Search medicines...',
    categories: 'Categories',
    addToCart: 'Add to Cart',
    cart: 'Cart',
    checkout: 'Checkout',
    items: 'items',
    total: 'Total',
    delivery: 'Delivery',
    pickup: 'Self Pickup',
    flatRate: '₹40 Flat Rate',
    free: 'Free',
    name: 'Full Name',
    email: 'Email',
    phone: 'Phone Number',
    notes: 'Order Notes',
    placeOrder: 'Place Order',
    verifyOTP: 'Verify OTP',
    enterOTP: 'Enter 6-digit code sent to your phone',
    verify: 'Verify',
    resendOTP: 'Resend OTP',
    trackingTitle: 'Order Tracking',
    statusVerified: 'Verified',
    statusAccepted: 'Accepted',
    statusPaid: 'Paid',
    statusShipped: 'Shipped',
    statusDelivered: 'Delivered',
    payNow: 'Pay Now',
    relatedProducts: 'Related Products'
  },
  hi: {
    appTitle: 'E-फार्म',
    tagline: 'सभी प्रकार की होम्योपैथी दवाएं उपलब्ध हैं',
    searchPlaceholder: 'दवाएं खोजें...',
    categories: 'श्रेणियाँ',
    addToCart: 'कार्ट में डालें',
    cart: 'कार्ट',
    checkout: 'चेकआउट',
    items: 'आइटम',
    total: 'कुल',
    delivery: 'डिलीवरी',
    pickup: 'स्वयं पिकअप',
    flatRate: '₹40 फ्लैट रेट',
    free: 'मुफ़्त',
    name: 'पूरा नाम',
    email: 'ईमेल',
    phone: 'फ़ोन नंबर',
    notes: 'ऑर्डर नोट',
    placeOrder: 'ऑर्डर करें',
    verifyOTP: 'OTP जांचें',
    enterOTP: 'आपके फोन पर भेजा गया 6-अंकीय कोड दर्ज करें',
    verify: 'जांचें',
    resendOTP: 'OTP पुनः भेजें',
    trackingTitle: 'ऑर्डर ट्रैकिंग',
    statusVerified: 'सत्यापित',
    statusAccepted: 'स्वीकार किया गया',
    statusPaid: 'भुगतान किया गया',
    statusShipped: 'शिप किया गया',
    statusDelivered: 'पहुंचा दिया गया',
    payNow: 'अभी भुगतान करें',
    relatedProducts: 'संबंधित उत्पाद'
  }
};

export type Language = 'en' | 'hi';
export type TranslationKey = keyof typeof translations['en'];

export function useTranslation(lang: Language) {
  return (key: TranslationKey) => translations[lang][key];
}
