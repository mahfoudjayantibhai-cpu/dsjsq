import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, ArrowUpDown } from 'lucide-react'
import { calcAdROI, saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import type { AdROIInput, AdPlan } from '../types'

const STORAGE_KEY = 'ad_roi'

function useDecimalInput(value: number, onChange: (v: number) => void) {
  const [text, setText] = useState(value === 0 ? '' : String(value))
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value
      setText(value === 0 ? '' : String(value))
    }
  }, [value])

  const handle = (raw: string) => {
    setText(raw)
    if (raw === '' || raw === '-' || raw === '.') { onChange(0); return }
    if (/^\d+\.$/.test(raw)) return
    if (/^-?\d+\.?\d*$/.test(raw)) {
      const n = parseFloat(raw)
      if (!isNaN(n)) onChange(n)
    }
  }
  return { text, handle }
}

export default function AdROI() {
  const { settings } = useGlobalSettings()
  const { backfillData } = useHistoryBackfill()

  const [input, setInput] = useState<AdROIInput>(() => {
    const saved = loadFromStorage(STORAGE_KEY) as AdROIInput | null
    return saved || {
      plans: [
        { id: '1', name: '搜索推广', adGMV: 20000, adSpend: 5000 },
        { id: '2', name: '场景推广', adGMV: 15000, adSpend: 4000 },
        { id: '3', name: '全站推广', adGMV: 30000, adSpend: 8000 },
      ],
      returnRate: settings.defaultReturnRate,
      platformFeeRate: settings.defaultPlatformFeeRate,
      breakevenROI: 3.5,
    }
  })

  // 历史记录回填
  useEffect(() => {
    if (backfillData && backfillData.plans) {
      setInput(backfillData as AdROIInput)
      saveToStorage(STORAGE_KEY, backfillData)
    }
  }, [backfillData])

  const [sortKey, setSortKey] = useState<'realROI' | 'adRatio' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const result = calcAdROI(input)

  useEffect(() => { saveToStorage(STORAGE_KEY, input) }, [input])

  const update = useCallback((patch: Partial<AdROIInput>) => setInput(prev => ({ ...prev, ...patch })), [])

  const addPlan = () => {
    const id = String(Date.now())
    setInput(prev => ({
      ...prev,
      plans: [...prev.plans, { id, name: `新计划 ${prev.plans.length + 1}`, adGMV: 10000, adSpend: 3000 }],
    }))
  }

  const updatePlan = (id: string, patch: Partial<AdPlan>) => {
    setInput(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === id ? { ...p, ...patch } : p),
    }))
  }

  const removePlan = (id: string) => {
    setInput(prev => ({ ...prev, plans: prev.plans.filter(p => p.id !== id) }))
  }

  const toggleSort = (key: 'realROI' | 'adRatio') => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  let plans = [...result.plans]
  if (sortKey) {
    plans.sort((a, b) => sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey])
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-gray-900">广告 ROI 效果分析</h2>

      {/* 全局参数 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="退货率 (%)" value={+(input.returnRate * 100).toFixed(1)} onChange={v => update({ returnRate: v / 100 })} />
          <InputField label="平台费率 (%)" value={+(input.platformFeeRate * 100).toFixed(2)} onChange={v => update({ platformFeeRate: v / 100 })} />
          <InputField label="保本投产比" value={input.breakevenROI} onChange={v => update({ breakevenROI: v })} />
        </div>
      </div>

      {/* 推广计划管理 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">推广计划</h3>
          <button onClick={addPlan} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
            <Plus className="w-3 h-3" />添加计划
          </button>
        </div>

        {input.plans.map(plan => (
          <div key={plan.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <input
              className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
              value={plan.name}
              onChange={e => updatePlan(plan.id, { name: e.target.value })}
              placeholder="计划名称"
            />
            <InputFieldSm label="成交额" value={plan.adGMV} onChange={v => updatePlan(plan.id, { adGMV: v })} />
            <InputFieldSm label="广告花费" value={plan.adSpend} onChange={v => updatePlan(plan.id, { adSpend: v })} />
            <button
              onClick={() => removePlan(plan.id)}
              className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 加权平均 */}
      <div className="bg-white rounded-xl border border-blue-200 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">加权平均真实投产比</span>
        <span className="text-2xl font-bold text-blue-600">{result.weightedAvgROI.toFixed(2)}</span>
      </div>

      {/* 多计划对比表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">计划名称</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">成交额</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">广告花费</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">平台ROI</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('realROI')}>
                  <span className="inline-flex items-center gap-1">真实ROI <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('adRatio')}>
                  <span className="inline-flex items-center gap-1">广告占比 <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">建议</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className={`border-b border-gray-50 ${p.status === 'loss' ? 'bg-red-50/50' : p.status === 'profit' ? 'bg-green-50/50' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">¥{p.adGMV.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">¥{p.adSpend.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{p.platformROI.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-900">{p.realROI.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{p.adRatio}%</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'profit' ? 'bg-green-100 text-green-700' :
                      p.status === 'loss' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status === 'profit' ? '盈利' : p.status === 'loss' ? `亏损 ¥${p.lossAmount}` : '持平'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[180px]">{p.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { text, handle } = useDecimalInput(value, onChange)
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <input type="text" inputMode="decimal" value={text}
        onChange={e => handle(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
      />
    </label>
  )
}

function InputFieldSm({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { text, handle } = useDecimalInput(value, onChange)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400">{label}</span>
      <input type="text" inputMode="decimal" value={text}
        onChange={e => handle(e.target.value)}
        className="px-1.5 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-200"
      />
    </div>
  )
}