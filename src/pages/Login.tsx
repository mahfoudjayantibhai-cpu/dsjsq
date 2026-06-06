import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Calculator } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username || !password) return setError('请填写用户名和密码')
    if (password.length < 4) return setError('密码至少4位')
    setLoading(true)
    try {
      if (isRegister) await register(username, password)
      else await login(username, password)
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[140px] font-black text-indigo-500/5 rotate-[-30deg] whitespace-nowrap">凯峰Ai</span>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 mb-4 shadow-lg shadow-indigo-500/25">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">拼多多运营计算器</h1>
          <p className="text-indigo-300/60 text-sm mt-1">凯峰Ai · 一站式运营工具</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">
            {isRegister ? '创建账号' : '登录'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1">用户名</label>
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-indigo-400 focus:outline-none transition-colors"
                placeholder="输入用户名"
              />
            </div>
            <div>
              <label className="block text-xs text-indigo-300/70 mb-1">密码</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:border-indigo-400 focus:outline-none transition-colors"
                placeholder="输入密码"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>

          <p className="text-center text-xs text-indigo-300/40 mt-4">
            {isRegister ? '已有账号？' : '没有账号？'}
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-indigo-400 hover:text-indigo-300 ml-1 transition-colors"
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
