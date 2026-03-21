import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Rewards from "./pages/Rewards";
import Points from "./pages/Points";
import Events from "./pages/Events";
import AdminDashboard from "./pages/AdminDashboard/index.jsx";
import AdminActivity from "./pages/AdminActivity";
import Gallery from "./pages/Gallery";
import Location from "./pages/Location";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/common/ErrorBoundary";

const withRouteBoundary = (element) => <ErrorBoundary>{element}</ErrorBoundary>;

function App() {
  return (
    <Routes>
      <Route element={withRouteBoundary(<MainLayout />)}>
        <Route path="/" element={withRouteBoundary(<Home />)} />
        <Route path="/menu" element={withRouteBoundary(<Menu />)} />
        <Route path="/menu/:id" element={withRouteBoundary(<ProductDetail />)} />
        <Route path="/cart" element={withRouteBoundary(<Cart />)} />
        <Route path="/checkout" element={withRouteBoundary(<Checkout />)} />
        <Route path="/orders/:id" element={withRouteBoundary(<OrderStatus />)} />
        <Route path="/sign-in" element={withRouteBoundary(<Auth />)} />
        <Route path="/orders" element={withRouteBoundary(<Profile />)} />
        <Route path="/profile" element={<Navigate to="/orders" replace />} />
        <Route path="/rewards" element={withRouteBoundary(<Rewards />)} />
        <Route path="/events" element={withRouteBoundary(<Events />)} />
        <Route path="/gallery" element={withRouteBoundary(<Gallery />)} />
        <Route path="/location" element={withRouteBoundary(<Location />)} />
        <Route path="/admin" element={withRouteBoundary(<AdminDashboard />)} />
        <Route path="/admin/activity" element={withRouteBoundary(<AdminActivity />)} />
        <Route path="/points" element={withRouteBoundary(<Points />)} />
        <Route path="*" element={withRouteBoundary(<NotFound />)} />
      </Route>
    </Routes>
  );
}

export default App;
