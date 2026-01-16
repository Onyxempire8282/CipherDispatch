import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./routes/App";
import Login from "./routes/Login";
import AdminNewClaim from "./routes/admin/NewClaim";
import AdminClaims from "./routes/admin/Claims";
import AdminVendors from "./routes/admin/Vendors";
import PayoutDashboard from "./routes/admin/PayoutDashboard";
import MyClaims from "./routes/appraiser/MyClaims";
import ClaimDetail from "./routes/appraiser/ClaimDetail";
import PhotoCapture from "./routes/appraiser/PhotoCapture";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import "./index.css";
import "leaflet/dist/leaflet.css";

registerSW();

const router = createBrowserRouter(
  [
    { path: "/", element: <App /> },
    { path: "/login", element: <Login /> },
    {
      path: "/admin/claims",
      element: (
        <ProtectedRoute requiredRole="admin">
          <AdminClaims />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/claims/new",
      element: (
        <ProtectedRoute requiredRole="admin">
          <AdminNewClaim />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/vendors",
      element: (
        <ProtectedRoute requiredRole="admin">
          <AdminVendors />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/payouts",
      element: (
        <ProtectedRoute requiredRole="admin">
          <PayoutDashboard />
        </ProtectedRoute>
      ),
    },
    {
      path: "/my-claims",
      element: (
        <ProtectedRoute>
          <MyClaims />
        </ProtectedRoute>
      ),
    },
    {
      path: "/claim/:id",
      element: (
        <ProtectedRoute>
          <ClaimDetail />
        </ProtectedRoute>
      ),
    },
    {
      path: "/appraiser/claim/:id",
      element: (
        <ProtectedRoute>
          <ClaimDetail />
        </ProtectedRoute>
      ),
    },
    {
      path: "/appraiser/claim/:id/photos",
      element: (
        <ProtectedRoute>
          <PhotoCapture />
        </ProtectedRoute>
      ),
    },
  ],
  {
    basename: "/CipherDispatch/",
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
