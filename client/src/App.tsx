import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './components/RequireAuth'
import Landing from './Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import DashboardPage from './components/dashboard/DashboardPage'
import ChatPage from './components/dashboard/ChatPage'
import AutopilotPage from './components/dashboard/AutopilotPage'
import PnlPage from './components/dashboard/PnlPage'
import InvoicesPage from './components/dashboard/InvoicesPage'
import SettingsPage from './components/dashboard/SettingsPage'
import RemindersPage from './components/dashboard/RemindersPage'
import OpportunitiesPage from './components/dashboard/OpportunitiesPage'

function Protected({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/dashboard/chat" element={<Protected><ChatPage /></Protected>} />
          <Route path="/dashboard/autopilot" element={<Protected><AutopilotPage /></Protected>} />
          <Route path="/dashboard/pnl" element={<Protected><PnlPage /></Protected>} />
          <Route path="/dashboard/reminders" element={<Protected><RemindersPage /></Protected>} />
          <Route path="/dashboard/opportunities" element={<Protected><OpportunitiesPage /></Protected>} />
          <Route path="/dashboard/invoices" element={<Protected><InvoicesPage /></Protected>} />
          <Route path="/dashboard/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
