import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Star, ThumbsDown, TrendingUp, DollarSign,
  ShoppingCart, Percent, Upload, Download, ChevronDown, ChevronUp,
  Info, AlertTriangle, CheckCircle2, Layers, FileDown,
  Save, Camera, Clock, X,
} from 'lucide-react'
import { saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { DecimalInput } from '../components/DecimalInput'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import type { ListingROIInput, ListingSku, SkuCostBreakdown } from '../types'

const STORAGE_KEY = 'multi_sku_roi_v2'

function SectionTitle({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <p className="text-[11px] text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

export default function MultiSkuROI() {
  const { settings } = useGlobalSettings()
  const { backfillData } = useHistoryBackfill()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showStepDetail, setShowStepDetail] = useState(true)

  const defaultCostBreakdown: SkuCostBreakdown = {
    purchasePrice: 25,
    shipping: 3.5,
    packaging: 0.8,
    giftCost: 0,
    lossCost: 0.5,
  }

  const [input, setInput] = useState<ListingROIInput>(() => {
    const saved = loadFromStorage(STORAGE_KEY) as ListingROIInput | null
    return saved || {
      linkName: '示例链接',
      skus: [
        {
          id: '1', name: 'S码', price: 50,
          costBreakdown: { ...defaultCostBreakdown, purchasePrice: 25 },
          plannedRatio: 30, actualRatio: 38, monthlySales: 320, adSpend: 800,
        },
        {
          id: '2', name: 'M码', price: 55,
          costBreakdown: { ...defaultCostBreakdown, purchasePrice: 27 },
          plannedRatio: 40, actualRatio: 45, monthlySales: 480, adSpend: 1200,
        },
        {
          id: '3', name: 'L码', price: 60,
          costBreakdown: { ...defaultCostBreakdown, purchasePrice: 30, shipping: 4 },
          plannedRatio: 20, actualRatio: 12, monthlySales: 200, adSpend: 500,
        },
        {
          id: '4', name: 'XL码', price: 65,
          costBreakdown: { ...defaultCostBreakdown, purchasePrice: 33, shipping: 4.5 },
          plannedRatio: 10, actualRatio: 5, monthlySales: 85, adSpend: 300,
        },
      ],
      returnRate: settings.defaultReturnRate,
      platformFeeRate: settings.defaultPlatformFeeRate,
      miscFeeRate: settings.defaultMiscFeeRate,
      monthlyFixedCost: 0,
    }
  })

  useEffect(() => { saveToStorage(STORAGE_KEY, input) }, [input])

  // 历史记录回填
  useEffect(() => {
    if (backfillData && backfillData.skus) {
      setInput(backfillData as ListingROIInput)
      saveToStorage(STORAGE_KEY, backfillData)
    }
  }, [backfillData])

  const update = useCallback((patch: Partial<ListingROIInput>) => {
    setInput(prev => ({ ...prev, ...patch }))
  }, [])

  const addSku = () => {
    const id = String(Date.now())
    setInput(prev => ({
      ...prev,
      skus: [...prev.skus, {
        id, name: `SKU${prev.skus.length + 1}`, price: 50,
        costBreakdown: { ...defaultCostBreakdown },
        plannedRatio: 0, actualRatio: 0, monthlySales: 100, adSpend: 200,
      }],
    }))
  }

  const updateSku = (id: string, patch: Partial<ListingSku>) => {
    setInput(prev => ({
      ...prev,
      skus: prev.skus.map(s => s.id === id ? { ...s, ...patch } : s),
    }))
  }

  const updateSkuCost = (id: string, patch: Partial<SkuCostBreakdown>) => {
    setInput(prev => ({
      ...prev,
      skus: prev.skus.map(s =>
        s.id === id ? { ...s, costBreakdown: { ...s.costBreakdown, ...patch } } : s
      ),
    }))
  }

  const removeSku = (id: string) => {
    setInput(prev => ({ ...prev, skus: prev.skus.filter(s => s.id !== id) }))
  }

  // ============ 7步计算引擎 ============

  const skus = input.skus
  const { returnRate, platformFeeRate, miscFeeRate, monthlyFixedCost } = input
  const feeSum = (returnRate + platformFeeRate + miscFeeRate) / 100

  // Step 1: 每个SKU真实成本拆解
  const step1 = skus.map(sku => {
    const { purchasePrice, shipping, packaging, giftCost, lossCost } = sku.costBreakdown
    const total = purchasePrice + shipping + packaging + giftCost + lossCost
    return { name: sku.name, total, purchasePrice, shipping, packaging, giftCost, lossCost }
  })

  // Step 2: 真实销售占比（非计划占比），加权平均毛利率
  const totalActualSales = skus.reduce((s, sku) => s + sku.monthlySales, 0)
  const step2_skus = skus.map(sku => {
    const cost = step1.find(c => c.name === sku.name)!.total
    const margin = sku.price > 0 ? (sku.price - cost) / sku.price : 0
    const actualWeight = totalActualSales > 0 ? sku.monthlySales / totalActualSales : 0
    return { ...sku, cost, margin, actualWeight }
  })
  const weightedAvgMargin = step2_skus.reduce((s, sku) => s + sku.margin * sku.actualWeight, 0)

  // Step 3: 基础保本投产比
  const basicROI = weightedAvgMargin > 0 ? 1 / weightedAvgMargin : 999999

  // Step 4: 真实保本投产比（扣费率）
  const realROI = feeSum < 1 ? basicROI / (1 - feeSum) : 999999

  // Step 5: 分SKU单独算保本投产比
  const step5 = skus.map(sku => {
    const cost = step1.find(c => c.name === sku.name)!.total
    const margin = sku.price > 0 ? (sku.price - cost) / sku.price : 0
    const skuBasicROI = margin > 0 ? 1 / margin : 999999
    const skuRealROI = feeSum < 1 ? skuBasicROI / (1 - feeSum) : 999999
    let status = 'normal'
    if (skuRealROI < realROI * 0.9) status = 'star'
    else if (skuRealROI > realROI * 1.2) status = 'drag'
    return { name: sku.name, roi: skuRealROI, status }
  })

  // 汇总指标
  const totalSales = totalActualSales
  const totalGMV = skus.reduce((s, sku) => s + sku.price * sku.monthlySales, 0)
  const totalAdSpend = skus.reduce((s, sku) => s + sku.adSpend, 0)
  const totalCostGoods = step2_skus.reduce((s, sku) => s + sku.cost * sku.monthlySales, 0)
  const feeLoss = totalGMV * feeSum
  const totalCost = totalCostGoods + totalAdSpend + feeLoss + monthlyFixedCost
  const totalProfit = totalGMV - totalCost
  const netMargin = totalGMV > 0 ? (totalProfit / totalGMV) * 100 : 0
  const weightedAvgPrice = totalSales > 0 ? totalGMV / totalSales : 0
  const actualROI_val = totalCost > 0 ? totalGMV / totalCost : 0

  // SKU明细结果
  const skuResults = step2_skus.map(sku => {
    const totalRev = sku.price * sku.monthlySales
    const costTotal = sku.cost * sku.monthlySales
    const feeL = totalRev * feeSum
    const profit = totalRev - costTotal - sku.adSpend - feeL
    const unitProfit = sku.price - sku.cost
    const unitMargin = sku.price > 0 ? (unitProfit / sku.price) * 100 : 0
    const actualWeight = totalSales > 0 ? (sku.monthlySales / totalSales) * 100 : 0
    const skuBasicROI = unitMargin > 0 ? (1 / (unitMargin / 100)) : 999999
    const skuRealROI = feeSum < 1 ? skuBasicROI / (1 - feeSum) : 999999

    let status: 'star' | 'normal' | 'drag' = 'normal'
    let suggestion = ''
    if (profit > 0 && sku.monthlySales > 0) {
      status = 'star'
      suggestion = sku.actualRatio > sku.plannedRatio ? '实际占比超预期，主力盈利SKU，建议加大推广' : '利润贡献主力，建议提升占比至计划水平'
    } else if (profit < 0 && sku.monthlySales > 0) {
      status = 'drag'
      const gap = Math.abs(unitProfit)
      if (unitProfit < 0) {
        const needPrice = sku.cost / (1 - feeSum) * 1.1
        suggestion = `单件亏损¥${gap.toFixed(2)}，建议提价≥¥${needPrice.toFixed(0)}或降低成本`
      } else {
        suggestion = '月销量太低导致广告费摊薄亏损，建议砍掉或促销冲量'
      }
    }
    return {
      id: sku.id, name: sku.name,
      costDetail: sku.costBreakdown,
      totalCost: sku.cost,
      unitProfit,
      unitMargin,
      plannedRatio: sku.plannedRatio,
      actualRatio: sku.actualRatio,
      totalRevenueActual: totalRev,
      totalProfitActual: profit,
      salesWeight: actualWeight,
      profitContribution: totalProfit !== 0 ? (profit / totalProfit) * 100 : 0,
      skuBreakevenROI: skuRealROI,
      status, suggestion,
    }
  })

  const starCount = skuResults.filter(r => r.status === 'star').length
  const dragCount = skuResults.filter(r => r.status === 'drag').length

  let summary = ''
  if (totalProfit > 0) {
    summary = `链接整体盈利 ¥${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}，${starCount}个明星SKU贡献主力利润`
    if (dragCount > 0) summary += `，${dragCount}个拖后腿SKU需优化`
  } else if (totalProfit < 0) {
    summary = `链接整体亏损 ¥${Math.abs(totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}，${dragCount}个SKU在亏损，需立即调整`
  } else {
    summary = '链接处于盈亏平衡点，需提升利润率'
  }

  const adjustments: string[] = []
  if (netMargin < 5) adjustments.push('净利率低于5%，建议优先优化成本结构或提价')
  if (actualROI_val < realROI * 0.8) adjustments.push('实际投产比远低于保本线，广告投放严重亏损，建议立即缩减预算')
  else if (actualROI_val < realROI) adjustments.push('实际投产比低于保本线，建议降低出价或优化广告素材')
  else adjustments.push('投产比在安全线以上，可持续放量')
  if (dragCount > 0) adjustments.push(`${dragCount}个拖后腿SKU建议执行"砍-提-促"三步走：砍无销量SKU、提价微利SKU、促销激活沉睡SKU`)

  // ============ CSV批量导入 ============

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return
      const incoming: ListingSku[] = []
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim())
        if (vals.length < 3) continue
        incoming.push({
          id: String(Date.now() + i),
          name: vals[0] || `SKU${i}`,
          price: parseFloat(vals[1]) || 0,
          costBreakdown: {
            purchasePrice: parseFloat(vals[2]) || 0,
            shipping: parseFloat(vals[3]) || 0,
            packaging: parseFloat(vals[4]) || 0,
            giftCost: parseFloat(vals[5]) || 0,
            lossCost: parseFloat(vals[6]) || 0,
          },
          plannedRatio: parseFloat(vals[7]) || 0,
          actualRatio: parseFloat(vals[8]) || 0,
          monthlySales: parseInt(vals[9]) || 0,
          adSpend: parseFloat(vals[10]) || 0,
        })
      }
      if (incoming.length > 0) {
        setInput(prev => ({ ...prev, skus: incoming }))
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const csv = '规格名,售价,进货价,快递费,包装费,赠品成本,损耗成本,计划占比%,真实占比%,月销量,广告费\nS码,50,25,3.5,0.8,0,0.5,30,38,320,800\nM码,55,27,3.5,0.8,0,0.5,40,45,480,1200'
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = '链接投产_SKU模板.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = { ...input, _exportTime: new Date().toISOString(), _results: { totalProfit, netMargin, realROI, actualROI_val } }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${input.linkName || '链接投产'}_数据备份.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.skus && Array.isArray(data.skus)) {
          setInput(prev => ({
            ...prev,
            linkName: data.linkName || prev.linkName,
            skus: data.skus,
            returnRate: typeof data.returnRate === 'number' ? data.returnRate : prev.returnRate,
            platformFeeRate: typeof data.platformFeeRate === 'number' ? data.platformFeeRate : prev.platformFeeRate,
            miscFeeRate: typeof data.miscFeeRate === 'number' ? data.miscFeeRate : prev.miscFeeRate,
            monthlyFixedCost: typeof data.monthlyFixedCost === 'number' ? data.monthlyFixedCost : prev.monthlyFixedCost,
          }))
        }
      } catch { /* 文件格式不合法 */ }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const jsonInputRef = useRef<HTMLInputElement>(null)

  const [expandCost, setExpandCost] = useState<Record<string, boolean>>({})
  const toggleCost = (id: string) => setExpandCost(prev => ({ ...prev, [id]: !prev[id] }))

  // 历史快照功能
  const [snapshots, setSnapshots] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('multi_sku_roi_snapshots')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [showSnapshots, setShowSnapshots] = useState(false)

  const saveSnapshot = () => {
    if (skus.length === 0) return
    const snapshot = {
      timestamp: new Date().toISOString(),
      linkName: input.linkName,
      skus: [...input.skus],
      returnRate: input.returnRate,
      platformFeeRate: input.platformFeeRate,
      miscFeeRate: input.miscFeeRate,
      monthlyFixedCost: input.monthlyFixedCost,
      totalProfit,
      netMargin,
      realROI,
      actualROI_val,
    }
    const newSnapshots = [snapshot, ...snapshots].slice(0, 10)
    setSnapshots(newSnapshots)
    localStorage.setItem('multi_sku_roi_snapshots', JSON.stringify(newSnapshots))
  }

  const loadSnapshot = (snapshot: any) => {
    setInput({
      linkName: snapshot.linkName,
      skus: snapshot.skus,
      returnRate: snapshot.returnRate,
      platformFeeRate: snapshot.platformFeeRate,
      miscFeeRate: snapshot.miscFeeRate,
      monthlyFixedCost: snapshot.monthlyFixedCost,
    })
  }

  const deleteSnapshot = (timestamp: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSnapshots = snapshots.filter(s => s.timestamp !== timestamp)
    setSnapshots(newSnapshots)
    localStorage.setItem('multi_sku_roi_snapshots', JSON.stringify(newSnapshots))
  }

  // 导出CSV
  const exportResultsCSV = () => {
    if (!skuResults.length) return
    const headers = [
      '规格名', '售价', '总成本', '单件毛利', '利润率%',
      '月销量', '真实占比%', '贡献利润', '贡献度%',
      '保本ROI', '评级'
    ]
    const rows = skuResults.map(sr => [
      sr.name,
      skus.find(s => s.id === sr.id)?.price.toFixed(2),
      sr.totalCost.toFixed(2),
      sr.unitProfit.toFixed(2),
      sr.unitMargin.toFixed(1),
      skus.find(s => s.id === sr.id)?.monthlySales,
      sr.actualRatio.toFixed(1),
      sr.totalProfitActual.toFixed(2),
      sr.profitContribution.toFixed(1),
      sr.skuBreakevenROI.toFixed(2),
      sr.status === 'star' ? '明星' : sr.status === 'drag' ? '拖后腿' : '普通'
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${input.linkName || '链接'}_计算结果.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-card">
      {/* 历史快照区域 */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800">历史快照 ({snapshots.length})</span>
            </div>
            {showSnapshots ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showSnapshots && (
            <div className="px-5 pb-5 space-y-3">
              {snapshots.map(s => (
                <div
                  key={s.timestamp}
                  onClick={() => loadSnapshot(s)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-800 truncate">{s.linkName}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                      <span>SKU数: {s.skus.length}</span>
                      <span className={`font-medium ${s.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        净利润: ¥{s.totalProfit.toFixed(2)}
                      </span>
                      <span>净利率: {s.netMargin.toFixed(1)}%</span>
                      <span>保本ROI: {s.realROI.toFixed(2)}</span>
                      <span>实际ROI: {s.actualROI_val.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSnapshot(s.timestamp, e)}
                    className="ml-2 p-1 text-gray-300 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">多规格链接投产计算</h2>
          <p className="text-xs text-gray-400 mt-0.5">7步实战计算法 · 成本拆解 · 批量导入</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />下载模板
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />批量导入CSV
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
            <FileDown className="w-3.5 h-3.5" />导出备份
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />导入备份
            <input ref={jsonInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
          </label>
          <button onClick={saveSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
            <Camera className="w-3.5 h-3.5" />保存快照
          </button>
          <button onClick={exportResultsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors">
            <Save className="w-3.5 h-3.5" />导出结果CSV
          </button>
        </div>
      </div>

      {/* Step 1: 链接参数 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <SectionTitle step={1} title="链接基础参数" desc="费率将影响所有后续计算步骤" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] text-gray-500 mb-0.5 font-medium">链接名称</label>
            <input
              type="text" value={input.linkName}
              onChange={e => update({ linkName: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
            />
          </div>
          <DecimalInput label="退货率" value={input.returnRate} onChange={v => update({ returnRate: v })} suffix="%" hint="含仅退款+退货退款" />
          <DecimalInput label="平台费率" value={input.platformFeeRate} onChange={v => update({ platformFeeRate: v })} suffix="%" hint="技术服务费+万三" />
          <DecimalInput label="杂费费率" value={input.miscFeeRate} onChange={v => update({ miscFeeRate: v })} suffix="%" />
          <DecimalInput label="月固定成本" value={input.monthlyFixedCost} onChange={v => update({ monthlyFixedCost: v })} suffix="元" hint="房租/工资等固定支出" />
        </div>
      </div>

      {/* Step 2: SKU编辑 + 5项成本拆解 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle step={2} title="SKU数据录入" desc={`共${skus.length}个SKU · 月总销量${totalSales}件`} />
          <button onClick={addSku}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />添加SKU
          </button>
        </div>

        {/* Table header */}
        <div className="hidden xl:grid grid-cols-12 gap-2 px-2 text-[11px] text-gray-400 font-medium">
          <span className="col-span-2">规格名</span>
          <span>售价</span>
          <span>占比(计划/真实)</span>
          <span>月销量</span>
          <span>广告费</span>
          <span className="text-center">总成本</span>
          <span className="text-center">单件毛利</span>
          <span className="text-center">利润率</span>
          <span className="text-center">保本ROI</span>
          <span />
        </div>

        {skus.map(sku => {
          const total = sku.costBreakdown.purchasePrice + sku.costBreakdown.shipping +
            sku.costBreakdown.packaging + sku.costBreakdown.giftCost + sku.costBreakdown.lossCost
          const unitProfit = sku.price - total
          const unitMargin = sku.price > 0 ? (unitProfit / sku.price) * 100 : 0
          const skuBasicROI = unitMargin > 0 ? (1 / (unitMargin / 100)) : 999999
          const skuRealROI = feeSum < 1 ? skuBasicROI / (1 - feeSum) : 999999

          return (
            <div key={sku.id} className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 space-y-2">
              {/* 第一行：基本信息 */}
              <div className="grid grid-cols-2 xl:grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-2 xl:col-span-2 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-medium"
                  value={sku.name}
                  onChange={e => updateSku(sku.id, { name: e.target.value })}
                  placeholder="规格名"
                />
                <DecimalInput label="售价" value={sku.price} onChange={v => updateSku(sku.id, { price: v })} suffix="元" />
                <div className="flex gap-1">
                  <DecimalInput label="计划比%" value={sku.plannedRatio} onChange={v => updateSku(sku.id, { plannedRatio: v })} />
                  <DecimalInput label="真实比%" value={sku.actualRatio} onChange={v => updateSku(sku.id, { actualRatio: v })} />
                </div>
                <DecimalInput label="月销量" value={sku.monthlySales} onChange={v => updateSku(sku.id, { monthlySales: v })} suffix="件" />
                <DecimalInput label="广告费" value={sku.adSpend} onChange={v => updateSku(sku.id, { adSpend: v })} suffix="元" />
                <div className="text-center text-xs font-medium text-gray-700">
                  ¥{total.toFixed(2)}
                </div>
                <div className={`text-center text-xs font-bold ${unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  ¥{unitProfit.toFixed(2)}
                </div>
                <div className={`text-center text-xs font-medium ${unitMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {unitMargin.toFixed(1)}%
                </div>
                <div className={`text-center text-xs font-medium ${skuRealROI < realROI ? 'text-emerald-600' : skuRealROI > realROI * 1.2 ? 'text-rose-500' : 'text-amber-600'}`}>
                  {skuRealROI.toFixed(2)}
                </div>
                <button onClick={() => removeSku(sku.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex justify-center">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 成本结构可视化条 */}
              {total > 0 && (
                <div className="flex items-center gap-1.5 h-3.5 px-0.5">
                  <span className="text-[10px] text-gray-400 w-8 shrink-0">成本</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-100 flex">
                    {(() => {
                      const items = [
                        { v: sku.costBreakdown.purchasePrice, c: 'bg-indigo-400', l: '进货' },
                        { v: sku.costBreakdown.shipping, c: 'bg-cyan-400', l: '快递' },
                        { v: sku.costBreakdown.packaging, c: 'bg-amber-400', l: '包装' },
                        { v: sku.costBreakdown.giftCost, c: 'bg-pink-400', l: '赠品' },
                        { v: sku.costBreakdown.lossCost, c: 'bg-rose-400', l: '损耗' },
                      ]
                      return items.filter(i => i.v > 0).map(i => (
                        <div key={i.l} className={`${i.c} h-full transition-all`}
                          style={{ width: `${(i.v / total) * 100}%` }}
                          title={`${i.l}: ¥${i.v.toFixed(2)} (${((i.v / total) * 100).toFixed(0)}%)`} />
                      ))
                    })()}
                  </div>
                  <span className="text-[10px] text-gray-400 w-14 shrink-0 text-right">¥{total.toFixed(1)}</span>
                </div>
              )}

              {/* 成本拆解：可折叠 */}
              <button
                onClick={() => toggleCost(sku.id)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors ml-1"
              >
                {expandCost[sku.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                5项成本拆解
              </button>
              {expandCost[sku.id] && (
                <div className="grid grid-cols-5 gap-2 p-2 bg-white rounded-lg border border-gray-100">
                  <DecimalInput label="进货价" value={sku.costBreakdown.purchasePrice}
                    onChange={v => updateSkuCost(sku.id, { purchasePrice: v })} />
                  <DecimalInput label="快递费" value={sku.costBreakdown.shipping}
                    onChange={v => updateSkuCost(sku.id, { shipping: v })} />
                  <DecimalInput label="包装耗材" value={sku.costBreakdown.packaging}
                    onChange={v => updateSkuCost(sku.id, { packaging: v })} />
                  <DecimalInput label="赠品成本" value={sku.costBreakdown.giftCost}
                    onChange={v => updateSkuCost(sku.id, { giftCost: v })} />
                  <DecimalInput label="损耗平摊" value={sku.costBreakdown.lossCost}
                    onChange={v => updateSkuCost(sku.id, { lossCost: v })} hint="退货+仓储损耗" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {skus.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <Layers className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">暂无SKU数据</p>
          <p className="text-gray-300 text-xs mt-1">点击"添加SKU"或"批量导入CSV"开始</p>
        </div>
      )}

      {/* ============ 7步计算结果区 ============ */}
      {skus.length > 0 && (
        <div className="space-y-5">
          {/* 整体结论横幅 */}
          <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
            totalProfit > 0 ? 'bg-emerald-50 border-emerald-200' :
            totalProfit < 0 ? 'bg-rose-50 border-rose-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            {totalProfit > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" /> :
             totalProfit < 0 ? <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" /> :
             <Info className="w-5 h-5 text-amber-600 mt-0.5" />}
            <div>
              <p className={`text-sm font-semibold ${
                totalProfit > 0 ? 'text-emerald-800' : totalProfit < 0 ? 'text-rose-800' : 'text-amber-800'
              }`}>{summary}</p>
              <p className="text-xs text-gray-500 mt-1">加权平均毛利率 {weightedAvgMargin.toFixed(1)}% · 保本投产比 {realROI.toFixed(2)} · 实际投产比 {actualROI_val.toFixed(2)}</p>
            </div>
          </div>

          {/* 7步流程图 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowStepDetail(!showStepDetail)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-800">7步计算过程</span>
              {showStepDetail ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showStepDetail && (
              <div className="px-5 pb-5 space-y-3">
                {[
                  { step: 1, title: '真实成本拆解', content: skus.length > 0 ? step1.map(s => `${s.name}: 合计¥${s.total.toFixed(2)} (进货¥${s.purchasePrice}+快递¥${s.shipping}+包装¥${s.packaging}+赠品¥${s.giftCost}+损耗¥${s.lossCost})`).join('；') : '-' },
                  { step: 2, title: '真实销售占比', content: skus.length > 0 ? step2_skus.map(s => `${s.name}: 真实占比${(s.actualWeight*100).toFixed(1)}% (计划${s.plannedRatio}%)`).join('；') : '-' },
                  { step: 3, title: '加权平均毛利率', content: `${(weightedAvgMargin*100).toFixed(2)}%` },
                  { step: 4, title: '基础保本投产比', content: `1 / ${(weightedAvgMargin*100).toFixed(2)}% = ${basicROI.toFixed(2)}` },
                  { step: 5, title: '真实保本投产比', content: !isFinite(realROI) ? '计算无效' : `${basicROI.toFixed(2)} / (1 - ${(feeSum*100).toFixed(1)}%) = ${realROI.toFixed(2)}` },
                  { step: 6, title: '分SKU单独算保本', content: step5.map(s => `${s.name}: ${s.roi.toFixed(2)} ${s.status==='star'?'⭐':s.status==='drag'?'⚠️':''}`).join('；') },
                  { step: 7, title: '动态调整提醒', content: adjustments.join(' | ') },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-lg">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">{item.title}</span>
                      <span className="text-gray-500 ml-1.5">{item.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 核心指标 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="月GMV" value={`¥${totalGMV.toLocaleString()}`} />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="月净利润" value={`¥${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color={totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
            <MetricCard icon={<Percent className="w-4 h-4" />} label="净利润率" value={`${netMargin.toFixed(1)}%`}
              color={netMargin >= 10 ? 'text-emerald-600' : netMargin >= 0 ? 'text-amber-600' : 'text-rose-500'} />
            <MetricCard icon={<ShoppingCart className="w-4 h-4" />} label="月总销量" value={`${totalSales}件`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="实际投产比" value={`${actualROI_val.toFixed(2)}`}
              color={actualROI_val >= realROI ? 'text-emerald-600' : 'text-rose-500'} />
            <MetricCard label="保本投产比" value={`${!isFinite(realROI) ? '-' : realROI.toFixed(2)}`} color="text-amber-600" />
            <MetricCard label="加权均价" value={`¥${weightedAvgPrice.toFixed(2)}`} />
            <MetricCard label="总广告费" value={`¥${totalAdSpend.toLocaleString()}`} color="text-violet-600" />
          </div>

          {/* SKU明细表 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <span className="text-sm font-semibold text-gray-700">SKU贡献明细</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">规格</th>
                    <th className="text-right px-3 py-2.5 font-medium">售价</th>
                    <th className="text-right px-3 py-2.5 font-medium">总成本</th>
                    <th className="text-right px-3 py-2.5 font-medium">单件毛利</th>
                    <th className="text-right px-3 py-2.5 font-medium">利润率</th>
                    <th className="text-right px-3 py-2.5 font-medium">月销量</th>
                    <th className="text-right px-3 py-2.5 font-medium">真实占比</th>
                    <th className="text-right px-3 py-2.5 font-medium">贡献利润</th>
                    <th className="text-right px-3 py-2.5 font-medium">贡献度</th>
                    <th className="text-right px-3 py-2.5 font-medium">保本ROI</th>
                    <th className="text-center px-3 py-2.5 font-medium">评级</th>
                  </tr>
                </thead>
                <tbody>
                  {skuResults.map(sr => (
                    <tr key={sr.id} className="border-t border-gray-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{sr.name}</td>
                      <td className="px-3 py-2.5 text-right">¥{skus.find(s => s.id === sr.id)?.price.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">¥{sr.totalCost.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${sr.unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        ¥{sr.unitProfit.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2.5 text-right ${sr.unitMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {sr.unitMargin.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right">{skus.find(s => s.id === sr.id)?.monthlySales}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-gray-500">{sr.actualRatio}%</span>
                        <span className="text-gray-300 ml-1">({sr.plannedRatio}%)</span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${sr.totalProfitActual >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        ¥{sr.totalProfitActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className={`w-10 h-1.5 rounded-full overflow-hidden ${sr.profitContribution >= 0 ? 'bg-gray-100' : 'bg-rose-100'}`}>
                            <div className={`h-full rounded-full transition-all ${sr.profitContribution >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              style={{ width: `${Math.min(Math.abs(sr.profitContribution), 100)}%` }} />
                          </div>
                          <span className="text-gray-500">{sr.profitContribution.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${
                        sr.skuBreakevenROI < realROI ? 'text-emerald-600' :
                        sr.skuBreakevenROI > realROI * 1.2 ? 'text-rose-500' : 'text-amber-600'
                      }`}>
                        {sr.skuBreakevenROI.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {sr.status === 'star' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-medium">
                            <Star className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />明星
                          </span>
                        ) : sr.status === 'drag' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[10px] font-medium">
                            <ThumbsDown className="w-2.5 h-2.5" />拖后腿
                          </span>
                        ) : (
                          <span className="text-gray-300 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 优化建议 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">优化建议</h4>

            {skuResults.filter(sr => sr.status === 'drag').length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-rose-500 font-medium">拖后腿SKU需立即处理：</p>
                {skuResults.filter(sr => sr.status === 'drag').map(sr => (
                  <div key={sr.id} className="flex items-start gap-2 p-2.5 bg-rose-50 rounded-lg text-xs">
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-rose-700">{sr.name}</span>
                      <span className="text-rose-600 ml-1">{sr.suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {skuResults.filter(sr => sr.status === 'star').length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-emerald-500 font-medium">明星SKU继续加码：</p>
                {skuResults.filter(sr => sr.status === 'star').map(sr => (
                  <div key={sr.id} className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg text-xs">
                    <Star className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 fill-emerald-400" />
                    <div>
                      <span className="font-medium text-emerald-700">{sr.name}</span>
                      <span className="text-emerald-600 ml-1">{sr.suggestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5 mt-2">
              {adjustments.map((adj, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  {adj}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, color }: {
  icon?: React.ReactNode; label: string; value: string; color?: string
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
