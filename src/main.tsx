// build-version: efb1be5
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

// CRITICAL: Import Leaflet config FIRST to disable VML before any map code loads
import "./lib/leafletConfig";

import App from "./routes/App";
import Login from "./routes/Login";
import AdminNewClaim from "./routes/admin/NewClaim";
import AdminClaims from "./routes/admin/Claims";
import AdminVendors from "./routes/admin/Vendors";
import PayoutDashboard from "./routes/admin/PayoutDashboard";
import KPIDashboard from "./routes/admin/KPIDashboard";
import ContractorManagement from "./components/admin/ContractorManagement";
import NewSupplement from "./routes/admin/NewSupplement";
import MyClaims from "./routes/appraiser/MyClaims";
import MyRoutes from "./routes/appraiser/MyRoutes";
import ClaimDetail from "./routes/appraiser/ClaimDetail";
import PhotoCapture from "./routes/appraiser/PhotoCapture";
import ConfirmAppointment from "./routes/public/ConfirmAppointment";
import ClientPortal from "./routes/public/ClientPortal";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "leaflet/dist/leaflet.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
    window.location.reload();
  },
});

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <ErrorBoundary label="Home">
          <App />
        </ErrorBoundary>
      ),
    },
    {
      path: "/login",
      element: (
        <ErrorBoundary label="Login">
          <Login />
        </ErrorBoundary>
      ),
    },
    {
      path: "/admin/claims",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="Claims">
            <AdminClaims />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/claims/new",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="New Claim">
            <AdminNewClaim />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/vendors",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="Vendors">
            <AdminVendors />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/payouts",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="Payouts">
            <PayoutDashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/kpi",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="KPI">
            <KPIDashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/contractors",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="Contractors">
            <ContractorManagement />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/my-claims",
      element: (
        <ProtectedRoute>
          <ErrorBoundary label="My Claims">
            <MyClaims />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/my-routes",
      element: (
        <ProtectedRoute>
          <ErrorBoundary label="My Routes">
            <MyRoutes />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/claim/:id",
      element: (
        <ProtectedRoute>
          <ErrorBoundary label="Claim Detail">
            <ClaimDetail />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/appraiser/claim/:id",
      element: (
        <ProtectedRoute>
          <ErrorBoundary label="Claim Detail">
            <ClaimDetail />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/claims/:id/supplement",
      element: (
        <ProtectedRoute requiredRole="admin">
          <ErrorBoundary label="New Supplement">
            <NewSupplement />
          </ErrorBoundary>
        </ProtectedRoute>
      ),
    },
    {
      path: "/confirm",
      element: (
        <ErrorBoundary label="Confirm Appointment">
          <ConfirmAppointment />
        </ErrorBoundary>
      ),
    },
    {
      path: "/portal",
      element: (
        <ErrorBoundary label="Client Portal">
          <ClientPortal />
        </ErrorBoundary>
      ),
    },
    {
      path: "/appraiser/claim/:id/photos",
      element: (
        <ProtectedRoute>
          <ErrorBoundary label="Photo Capture">
            <PhotoCapture />
          </ErrorBoundary>
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
    <ErrorBoundary label="Application">
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);
