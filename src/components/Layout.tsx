import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Calculator, Tags, TrendingUp, BarChart3, Settings, Home, Target, Layers, Store, User, LogOut, Clock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import SidebarHistoryPanel from './SidebarHistoryPanel'

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/roi', icon: TrendingUp, label: '保本投产比' },
  { to: '/pricing', icon: Tags, label: '商品定价' },
  { to: '/profit', icon: BarChart3, label: '利润分析' },
  { to: '/ad-roi', icon: Calculator, label: '广告ROI' },
  { to: '/strategy', icon: Target, label: '比价策略' },
  { to: '/listing-roi', icon: Layers, label: '链接投产' },
  { to: '/shop-overview', icon: Store, label: '店铺总览' },
  { to: '/settings', icon: Settings, label: '全局设置' },
  { to: '/history', icon: Clock, label: '历史记录' },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // 判断是否为计算器页面（显示历史侧栏）
  const calculatorRoutes = ['/roi', '/pricing', '/profit', '/ad-roi', '/strategy', '/listing-roi']
  const isCalculatorPage = calculatorRoutes.some(r => location.pathname.startsWith(r))

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 - 渐变 */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
            <span className="text-lg font-bold text-white tracking-tight">
              拼多多运营计算器
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-indigo-100 hidden sm:block font-medium">V2.0</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* 桌面侧边栏 */}
        <nav className="hidden lg:block w-56 flex-shrink-0 border-r border-gray-200 bg-white min-h-[calc(100vh-3.5rem)] shadow-sm">
          <div className="p-4 space-y-1">
            {navItems.map(item => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* 移动菜单 */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-14 bottom-0 w-52 bg-white shadow-xl border-r border-gray-200">
              <div className="p-3 space-y-1">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部移动Tab */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex justify-around py-1.5 shadow-lg">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 主内容区 */}
        <main className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6 overflow-auto relative">
          {/* 水印 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
            <div className="flex flex-col items-center gap-4 opacity-[0.03] rotate-[-15deg]">
              <span className="text-8xl font-black text-gray-900 whitespace-nowrap">凯峰Ai</span>
              <span className="text-8xl font-black text-gray-900 whitespace-nowrap">凯峰Ai</span>
              <span className="text-8xl font-black text-gray-900 whitespace-nowrap">凯峰Ai</span>
            </div>
          </div>
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
      {isCalculatorPage && <SidebarHistoryPanel />}
    </div>
  )
}