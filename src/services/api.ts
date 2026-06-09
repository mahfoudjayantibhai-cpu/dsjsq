const API_BASE = import.meta.env.VITE_API_URL || ''

interface AuthResponse {
  token: string
  userId: number
  username: string
}

function headers(includeAuth = true): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const token = localStorage.getItem('token')
    if (token) h['Authorization'] = `Bearer ${token}`
  }
  return h
}

export const api = {
  // Auth
  async register(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ username, password })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST', headers: headers(false),
      body: JSON.stringify({ username, password })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },
  async me() {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: headers() })
    if (!res.ok) throw new Error('未登录')
    return res.json()
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/api/settings`, { headers: headers() })
    return res.json()
  },
  async updateSettings(data: any) {
    await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data)
    })
  },

  // Calculations
  async calculate(type: string, data: any) {
    const res = await fetch(`${API_BASE}/api/calculate/${type}`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    })
    return res.json()
  },

  // Snapshots
  async getSnapshots() {
    const res = await fetch(`${API_BASE}/api/snapshots`, { headers: headers() })
    return res.json()
  },
  async saveSnapshot(data: any) {
    await fetch(`${API_BASE}/api/snapshots`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    })
  },
  async deleteSnapshot(id: number) {
    await fetch(`${API_BASE}/api/snapshots/${id}`, {
      method: 'DELETE', headers: headers()
    })
  },

  // Tasks
  async getTasks() {
    const res = await fetch(`${API_BASE}/api/tasks`, { headers: headers() })
    return res.json()
  },
  async createTask(data: any) {
    await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST', headers: headers(), body: JSON.stringify(data)
    })
  },
  async updateTask(id: number, data: any) {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(data)
    })
  },
  async deleteTask(id: number) {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE', headers: headers()
    })
  },

  // History
  async getHistory(params?: { start?: string; end?: string }) {
    const query = new URLSearchParams()
    if (params?.start) query.set('start', params.start)
    if (params?.end) query.set('end', params.end)
    const qs = query.toString()
    const res = await fetch(`${API_BASE}/api/history${qs ? '?' + qs : ''}`, { headers: headers() })
    return res.json()
  },
  async getHistoryById(id: number) {
    const res = await fetch(`${API_BASE}/api/history/${id}`, { headers: headers() })
    if (!res.ok) throw new Error('记录不存在')
    return res.json()
  },
  async deleteHistory(id: number) {
    await fetch(`${API_BASE}/api/history/${id}`, {
      method: 'DELETE', headers: headers()
    })
  },
  async deleteAllHistory() {
    await fetch(`${API_BASE}/api/history`, {
      method: 'DELETE', headers: headers()
    })
  }
}
