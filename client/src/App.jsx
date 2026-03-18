import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import Profile from "./pages/Profile";
import Rewards from "./pages/Rewards";
import Points from "./pages/Points";
import Events from "./pages/Events";
import AdminDashboard from "./pages/AdminDashboard";
import AdminActivity from "./pages/AdminActivity";
import Gallery from "./pages/Gallery";
import Location from "./pages/Location";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/menu/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders/:id" element={<OrderStatus />} />
        <Route path="/orders" element={<Profile />} />
        <Route path="/profile" element={<Navigate to="/orders" replace />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/events" element={<Events />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/location" element={<Location />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/activity" element={<AdminActivity />} />
        <Route path="/points" element={<Points />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
