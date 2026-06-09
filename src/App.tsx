import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HistoryProvider } from './context/HistoryContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import BaoBenROI from './pages/BaoBenROI'
import Pricing from './pages/Pricing'
import ProfitAnalysis from './pages/ProfitAnalysis'
import AdROI from './pages/AdROI'
import PriceStrategy from './pages/PriceStrategy'
import MultiSkuROI from './pages/MultiSkuROI'
import ShopOverview from './pages/ShopOverview'
import Settings from './pages/Settings'
import History from './pages/History'
import Login from './pages/Login'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="roi" element={<BaoBenROI />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="profit" element={<ProfitAnalysis />} />
        <Route path="ad-roi" element={<AdROI />} />
        <Route path="strategy" element={<PriceStrategy />} />
        <Route path="listing-roi" element={<MultiSkuROI />} />
        <Route path="shop-overview" element={<ShopOverview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <HistoryProvider>
            <ProtectedRoutes />
          </HistoryProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
