import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

/** Wraps protected routes — bounces to /login if there's no valid session. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3F4EF] dark:bg-zinc-950">
        <div className="size-8 animate-spin rounded-full border-2 border-[#EB4A26]/30 border-t-[#EB4A26]" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
