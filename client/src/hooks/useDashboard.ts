import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { DashboardData } from '../lib/api'

/** Fetches the live dashboard snapshot from the backend. */
export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .dashboard()
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
