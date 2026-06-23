import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken } from '../lib/api'
import type { AuthResponse, LoginInput, RegisterInput, Shop, User } from '../lib/api'

interface AuthContextValue {
  user: User | null
  shop: Shop | null
  loading: boolean
  login: (credentials: LoginInput) => Promise<void>
  register: (details: RegisterInput) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  // On first load, if we have a token, fetch the profile to confirm it's valid.
  useEffect(() => {
    let active = true
    async function load() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await api.me()
        if (!active) return
        setUser(me.user)
        setShop(me.shop)
      } catch {
        setToken(null) // bad/expired token
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  function adopt({ token, user, shop }: AuthResponse) {
    setToken(token)
    setUser(user)
    setShop(shop)
  }

  async function login(credentials: LoginInput) {
    adopt(await api.login(credentials))
  }
  async function register(details: RegisterInput) {
    adopt(await api.register(details))
  }
  function logout() {
    setToken(null)
    setUser(null)
    setShop(null)
  }

  // re-pull the profile (e.g. after the shop name/currency changes in Settings)
  async function refresh() {
    try {
      const me = await api.me()
      setUser(me.user)
      setShop(me.shop)
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthContext.Provider value={{ user, shop, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
