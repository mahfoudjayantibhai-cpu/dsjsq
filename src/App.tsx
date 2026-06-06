import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter basename="/dsjsq">
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
