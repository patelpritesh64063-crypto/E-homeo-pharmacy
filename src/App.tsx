import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import OTPVerification from './pages/OTPVerification';
import OrderTracking from './pages/OrderTracking';
import Header from './components/Header';
import AdminLogin from './pages/AdminLogin';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/otp" element={<OTPVerification />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
