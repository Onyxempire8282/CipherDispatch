import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./routes/App";
import Login from "./routes/Login";
import AdminNewClaim from "./routes/admin/NewClaim";
import AdminClaims from "./routes/admin/Claims";
import MyClaims from "./routes/appraiser/MyClaims";
import ClaimDetail from "./routes/appraiser/ClaimDetail";
import "./index.css";
import "leaflet/dist/leaflet.css";

registerSW();

const router = createBrowserRouter(
  [
    { path: "/", element: <App /> },
    { path: "/login", element: <Login /> },
    { path: "/admin/claims", element: <AdminClaims /> },
    { path: "/admin/claims/new", element: <AdminNewClaim /> },
    { path: "/my-claims", element: <MyClaims /> },
    { path: "/claim/:id", element: <ClaimDetail /> },
  ],
  {
    basename: "/CipherDispatch",
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
