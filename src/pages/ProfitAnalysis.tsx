import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { calcProfit, saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { useDecimalInput } from '../components/DecimalInput'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import { useAutoSaveHistory } from '../hooks/useAutoSaveHistory'
import type { ProfitInput, ProfitLevel } from '../types'

const STORAGE_KEY = 'profit'
const COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#ef4444', '#6b7280', '#10b981']

export default function ProfitAnalysis() {
  const { settings } = useGlobalSettings()
  const { backfillData } = useHistoryBackfill()

  const [input, setInput] = useState<ProfitInput>(() => {
    const saved = loadFromStorage(STORAGE_KEY) as ProfitInput | null
    return saved || {
      level: 'link',
      gmv: 50000,
      refundAmount: 5000,
      discountAmount: 3000,
      unitCost: 30,
      salesVolume: 500,
      shippedVolume: 520,
      shippingFee: settings.defaultShippingFee,
      platformFeeRate: settings.defaultPlatformFeeRate,
      adSpend: 7500,
      returnRate: settings.defaultReturnRate,
      lossFactor: settings.defaultLossFactor,
      miscFeeRate: settings.defaultMiscFeeRate,
    }
  })

  // 历史记录回填
  useEffect(() => {
    if (backfillData && backfillData.level) {
      setInput(backfillData as ProfitInput)
      saveToStorage(STORAGE_KEY, backfillData)
    }
  }, [backfillData])

  const result = calcProfit(input)

  // 自动保存历史记录到服务端
  useAutoSaveHistory('profit', input, result)

  useEffect(() => { saveToStorage(STORAGE_KEY, input) }, [input])
  const update = useCallback((patch: Partial<ProfitInput>) => setInput(prev => ({ ...prev, ...patch })), [])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-gray-900">全维度利润分析</h2>

      {/* 层级切换 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          ['sku', '单品'],
          ['link', '链接'],
          ['shop', '店铺'],
        ] as [ProfitLevel, string][]).map(([level, label]) => (
          <button
            key={level}
            onClick={() => update({ level })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              input.level === level ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="前台成交额 (元)" value={input.gmv} onChange={v => update({ gmv: v })} />
          <InputField label="退款金额 (元)" value={input.refundAmount} onChange={v => update({ refundAmount: v })} />
          <InputField label="优惠分摊金额 (元)" value={input.discountAmount} onChange={v => update({ discountAmount: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="单件采购成本 (元)" value={input.unitCost} onChange={v => update({ unitCost: v })} />
          <InputField label="销量 (件)" value={input.salesVolume} onChange={v => update({ salesVolume: v })} />
          <InputField label="发货件数" value={input.shippedVolume} onChange={v => update({ shippedVolume: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="单件快递费 (元)" value={input.shippingFee} onChange={v => update({ shippingFee: v })} />
          <InputField label="广告花费 (元)" value={input.adSpend} onChange={v => update({ adSpend: v })} />
          <InputField label="损耗系数" value={input.lossFactor} onChange={v => update({ lossFactor: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <InputField label="退货率 (%)" value={+(input.returnRate * 100).toFixed(1)} onChange={v => update({ returnRate: v / 100 })} />
          <InputField label="平台费率 (%)" value={+(input.platformFeeRate * 100).toFixed(2)} onChange={v => update({ platformFeeRate: v / 100 })} />
          <InputField label="杂费费率 (%)" value={+(input.miscFeeRate * 100).toFixed(1)} onChange={v => update({ miscFeeRate: v / 100 })} />
        </div>
        {input.level === 'shop' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <InputField label="月固定成本总额 (元)" value={input.monthlyFixedCost ?? 0} onChange={v => update({ monthlyFixedCost: v })} />
            <InputField label="该链接销售额占比 (%)" value={input.linkSalesRatio ?? 0} onChange={v => update({ linkSalesRatio: v })} />
          </div>
        )}
      </div>

      {/* 结果区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">利润结果</h3>

        <div className={`p-4 rounded-lg text-center mb-4 ${result.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-500 mb-1">净利润</div>
          <div className={`text-3xl font-bold ${result.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{result.netProfit}
          </div>
          <div className="text-sm text-gray-500 mt-1">净利率 {result.netMargin}%</div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <InfoKV label="有效销售额" value={`¥${result.effectiveSales}`} />
          <InfoKV label="商品直接成本" value={`¥${result.directCost}`} />
          <InfoKV label="毛利" value={`¥${result.grossProfit}`} />
          <InfoKV label="毛利率" value={`${result.grossMargin}%`} />
          <InfoKV label="平台服务费" value={`¥${result.platformFee}`} />
          <InfoKV label="推广费用" value={`¥${result.adFee}`} />
          <InfoKV label="退货损耗" value={`¥${result.returnLoss}`} />
          <InfoKV label="固定成本分摊" value={`¥${result.fixedCostShare}`} />
          <InfoKV label="杂费" value={`¥${result.miscFee}`} />
        </div>

        {/* 饼图 */}
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={result.costBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {result.costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `¥${v}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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

function InfoKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}