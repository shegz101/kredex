import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './components/RequireAuth'
import Landing from './Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardPage from './components/dashboard/DashboardPage'
import ChatPage from './components/dashboard/ChatPage'
import AutopilotPage from './components/dashboard/AutopilotPage'
import PnlPage from './components/dashboard/PnlPage'
import StubPage from './components/dashboard/StubPage'

function Protected({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/dashboard/chat" element={<Protected><ChatPage /></Protected>} />
          <Route path="/dashboard/autopilot" element={<Protected><AutopilotPage /></Protected>} />
          <Route path="/dashboard/pnl" element={<Protected><PnlPage /></Protected>} />
          <Route
            path="/dashboard/invoices"
            element={
              <Protected>
                <StubPage
                  title="Invoices"
                  icon="solar:bill-list-linear"
                  blurb="Generate branded PDF invoices from a sentence, track paid and unpaid, and mark them paid by chatting."
                />
              </Protected>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <Protected>
                <StubPage
                  title="Settings"
                  icon="solar:settings-linear"
                  blurb="Manage your shop profile, staff, languages, and notification preferences."
                />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
