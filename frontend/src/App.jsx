import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AssetList from "./pages/AssetList";
import AssetForm from "./pages/AssetForm";
import Employees from "./pages/Employees";
import Allocations from "./pages/Allocations";
import Returns from "./pages/Returns";
import DamageReports from "./pages/DamageReports";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import ProfileSettings from "./pages/ProfileSettings";


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#111827",
              color: "#E5E7EB",
              border: "1px solid #374151",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#111827" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#111827" },
            },
          }}
        />


        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes wrapped in Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<AssetList />} />
              <Route path="/assets/new" element={<AssetForm />} />
              <Route path="/assets/:id/edit" element={<AssetForm />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/allocations" element={<Allocations />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/damages" element={<DamageReports />} />
              <Route path="/history" element={<History />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<ProfileSettings />} />

            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}