import { useState, useEffect } from 'react'
import {
  DollarSign, TrendingUp, Percent, Layers,
  Star, ThumbsDown, Store, AlertCircle,
} from 'lucide-react'
import type { ListingSku } from '../types'

const STORAGE_KEY = 'multi_sku_roi_snapshots'

interface Snapshot {
  timestamp: string
  linkName: string
  skus: ListingSku[]
  returnRate: number
  platformFeeRate: number
  miscFeeRate: number
  monthlyFixedCost: number
  totalProfit: number
  netMargin: number
  realROI: number
  actualROI_val: number
}

interface LinkSummary {
  linkName: string
  timestamp: string
  skuCount: number
  totalGMV: number
  totalProfit: number
  netMargin: number
  breakevenROI: number
  actualROI: number
  totalSales: number
  totalAdSpend: number
}

function computeSummaries(snapshots: Snapshot[]): LinkSummary[] {
  const latestMap = new Map<string, Snapshot>()
  for (const s of snapshots) {
    const existing = latestMap.get(s.linkName)
    if (!existing || new Date(s.timestamp) > new Date(existing.timestamp)) {
      latestMap.set(s.linkName, s)
    }
  }

  return Array.from(latestMap.values()).map(s => {
    const totalGMV = s.skus.reduce((sum, sku) => sum + sku.price * sku.monthlySales, 0)
    const totalSales = s.skus.reduce((sum, sku) => sum + sku.monthlySales, 0)
    const totalAdSpend = s.skus.reduce((sum, sku) => sum + sku.adSpend, 0)
    return {
      linkName: s.linkName,
      timestamp: s.timestamp,
      skuCount: s.skus.length,
      totalGMV,
      totalProfit: s.totalProfit,
      netMargin: s.netMargin,
      breakevenROI: s.realROI,
      actualROI: s.actualROI_val,
      totalSales,
      totalAdSpend,
    }
  })
}

export default function ShopOverview() {
  const [summaries, setSummaries] = useState<LinkSummary[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const snapshots: Snapshot[] = JSON.parse(raw)
        if (Array.isArray(snapshots)) {
          setSummaries(computeSummaries(snapshots))
        }
      }
    } catch { /* ignore */ }
  }, [])

  const totalGMV = summaries.reduce((s, l) => s + l.totalGMV, 0)
  const totalProfit = summaries.reduce((s, l) => s + l.totalProfit, 0)
  const weightedNetMargin = totalGMV > 0
    ? summaries.reduce((s, l) => s + l.netMargin * l.totalGMV, 0) / totalGMV
    : 0
  const activeLinks = summaries.length

  const formatCurrency = (v: number) =>
    `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (summaries.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 animate-card">
        <div>
          <h2 className="text-xl font-bold text-gray-900">店铺总览</h2>
          <p className="text-xs text-gray-400 mt-0.5">聚合所有链接快照数据，一屏掌握全局</p>
        </div>
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Store className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-sm font-medium">暂无快照数据</p>
          <p className="text-gray-300 text-xs mt-1">请先在链接投产页保存快照</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-card">
      <div>
        <h2 className="text-xl font-bold text-gray-900">店铺总览</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {activeLinks} 个活跃链接 · 数据来源于链接投产页快照
        </p>
      </div>

      {/* 汇总指标 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="w-4 h-4" />}
          label="总GMV"
          value={formatCurrency(totalGMV)}
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="总净利润"
          value={formatCurrency(totalProfit)}
          color={totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}
        />
        <MetricCard
          icon={<Percent className="w-4 h-4" />}
          label="加权净利润率"
          value={`${weightedNetMargin.toFixed(1)}%`}
          color={weightedNetMargin >= 10 ? 'text-emerald-600' : weightedNetMargin >= 0 ? 'text-amber-600' : 'text-rose-500'}
        />
        <MetricCard
          icon={<Layers className="w-4 h-4" />}
          label="活跃链接数"
          value={`${activeLinks}`}
          color="text-indigo-600"
        />
      </div>

      {/* 链接明细表格 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-700">链接明细</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500">
                <th className="text-left px-4 py-2.5 font-medium">链接名</th>
                <th className="text-right px-3 py-2.5 font-medium">SKU数</th>
                <th className="text-right px-3 py-2.5 font-medium">月GMV</th>
                <th className="text-right px-3 py-2.5 font-medium">净利润</th>
                <th className="text-right px-3 py-2.5 font-medium">净利率</th>
                <th className="text-right px-3 py-2.5 font-medium">保本ROI</th>
                <th className="text-right px-3 py-2.5 font-medium">实际ROI</th>
                <th className="text-center px-3 py-2.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(s => (
                <tr key={s.linkName} className="border-t border-gray-50 hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.linkName}</td>
                  <td className="px-3 py-2.5 text-right">{s.skuCount}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(s.totalGMV)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${s.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {formatCurrency(s.totalProfit)}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${s.netMargin >= 10 ? 'text-emerald-600' : s.netMargin >= 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {s.netMargin.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-600 font-medium">
                    {isFinite(s.breakevenROI) ? s.breakevenROI.toFixed(2) : '-'}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${s.actualROI >= s.breakevenROI ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {s.actualROI.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {s.totalProfit > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-medium">
                        <Star className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />盈利
                      </span>
                    ) : s.totalProfit < 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[10px] font-medium">
                        <ThumbsDown className="w-2.5 h-2.5" />亏损
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-medium">
                        <AlertCircle className="w-2.5 h-2.5" />持平
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 快照时间提示 */}
      <p className="text-center text-xs text-gray-400">
        快照时间：{summaries.map(s => new Date(s.timestamp).toLocaleString()).join(' / ')}
      </p>
    </div>
  )
}

function MetricCard({ icon, label, value, color }: {
  icon?: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1.5">
        {icon} {label}
      </div>
      <div className={`text-lg font-bold tracking-tight ${color || 'text-gray-900'}`}>{value}</div>
    </div>
  )
}