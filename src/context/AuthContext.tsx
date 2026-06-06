import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../services/api'

interface User { userId: number; username: string }
interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.me().then(u => {
        setUser({ userId: u.id, username: u.username })
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(username: string, password: string) {
    const res = await api.login(username, password)
    localStorage.setItem('token', res.token)
    localStorage.setItem('userId', String(res.userId))
    localStorage.setItem('username', res.username)
    setUser({ userId: res.userId, username: res.username })
  }

  async function register(username: string, password: string) {
    const res = await api.register(username, password)
    localStorage.setItem('token', res.token)
    localStorage.setItem('userId', String(res.userId))
    localStorage.setItem('username', res.username)
    setUser({ userId: res.userId, username: res.username })
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
