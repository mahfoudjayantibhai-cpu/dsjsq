import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { calcPricing, saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { useDecimalInput } from '../components/DecimalInput'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import { useAutoSaveHistory } from '../hooks/useAutoSaveHistory'
import type { PricingInput, PricingMode } from '../types'

const STORAGE_KEY = 'pricing'

export default function Pricing() {
  const { settings } = useGlobalSettings()
  const { backfillData } = useHistoryBackfill()

  const [input, setInput] = useState<PricingInput>(() => {
    const saved = loadFromStorage(STORAGE_KEY) as PricingInput | null
    return saved || {
      mode: 'cost_plus',
      cost: 25,
      shipping: settings.defaultShippingFee,
      targetMargin: 30,
      targetPrice: 50,
      returnRate: settings.defaultReturnRate,
      platformFeeRate: settings.defaultPlatformFeeRate,
      miscFeeRate: settings.defaultMiscFeeRate,
    }
  })

  // 历史记录回填
  useEffect(() => {
    if (backfillData && backfillData.mode) {
      setInput(backfillData as PricingInput)
      saveToStorage(STORAGE_KEY, backfillData)
    }
  }, [backfillData])

  const result = calcPricing(input)

  // 自动保存历史记录到服务端
  useAutoSaveHistory('pricing', input, result)

  useEffect(() => { saveToStorage(STORAGE_KEY, input) }, [input])

  const update = useCallback((patch: Partial<PricingInput>) => setInput(prev => ({ ...prev, ...patch })), [])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-gray-900">商品定价计算</h2>

      {/* 模式切换 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          ['cost_plus', '成本加成定价'],
          ['competitive', '竞争导向反推'],
        ] as [PricingMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => update({ mode })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              input.mode === mode ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField label="商品采购成本 (元)" value={input.cost} onChange={v => update({ cost: v })} />
          <InputField label="单件快递费 (元)" value={input.shipping} onChange={v => update({ shipping: v })} />
          {input.mode === 'cost_plus' ? (
            <InputField label="目标毛利率 (%)" value={input.targetMargin} onChange={v => update({ targetMargin: v })} />
          ) : (
            <InputField label="目标售价 (元)" value={input.targetPrice} onChange={v => update({ targetPrice: v })} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <InputField label="退货率 (%)" value={+(input.returnRate * 100).toFixed(1)} onChange={v => update({ returnRate: v / 100 })} />
          <InputField label="平台费率 (%)" value={+(input.platformFeeRate * 100).toFixed(2)} onChange={v => update({ platformFeeRate: v / 100 })} />
          <InputField label="杂费费率 (%)" value={+(input.miscFeeRate * 100).toFixed(1)} onChange={v => update({ miscFeeRate: v / 100 })} />
        </div>
      </div>

      {/* 结果区 */}
      <div className="bg-white rounded-xl border border-green-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">定价结果</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {input.mode === 'cost_plus' && (
            <ResultItem label="建议售价" value={`¥${result.suggestedPrice}`} highlight />
          )}
          {input.mode === 'competitive' && (
            <ResultItem label="可承受最大成本" value={`¥${result.maxCost}`} highlight />
          )}
          <ResultItem label="保本售价" value={`¥${result.breakevenPrice}`} />
          <ResultItem label="售价区间" value={`¥${result.priceRangeLow} ~ ¥${result.priceRangeHigh}`} />
          <ResultItem label="对应保本投产比" value={result.correspondingROI.toFixed(2)} />
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
          {input.mode === 'cost_plus'
            ? `建议售价 ¥${result.suggestedPrice}，可在 ¥${result.priceRangeLow} ~ ¥${result.priceRangeHigh} 区间灵活调整`
            : `目标售价 ¥${input.targetPrice} 下，采购成本需控制在 ¥${result.maxCost} 以内才能保本`
          }
        </div>

        {/* 价格敏感度分析 */}
        {result.suggestedPrice > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              价格敏感度分析（±20%）
            </h4>
            <div className="grid grid-cols-5 gap-3">
              {[0.8, 0.9, 1.0, 1.1, 1.2].map(ratio => {
                const testPrice = +(result.suggestedPrice * ratio).toFixed(2)
                const unitProfit = testPrice - input.cost - input.shipping
                const margin = testPrice > 0 ? (unitProfit / testPrice) * 100 : 0
                const roi = margin > 0 ? 1 / (margin / 100) / (1 - input.returnRate - input.platformFeeRate - input.miscFeeRate) : 999999
                const isCurrent = ratio === 1.0
                return (
                  <div key={ratio} className={`rounded-lg p-3 text-center border ${
                    isCurrent ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="text-[10px] text-gray-400 mb-1">
                      {ratio < 1 ? <TrendingDown className="w-3 h-3 inline text-rose-400" /> : 
                       ratio > 1 ? <TrendingUp className="w-3 h-3 inline text-emerald-400" /> : null}
                      {ratio < 1 ? `-${(100 - ratio*100)}%` : ratio > 1 ? `+${(ratio*100 - 100)}%` : '基准'}
                    </div>
                    <div className={`text-sm font-bold ${margin >= 0 ? 'text-gray-800' : 'text-rose-600'}`}>
                      ¥{testPrice}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      利润 ¥{unitProfit.toFixed(1)} · ROI {roi < 999 ? roi.toFixed(2) : '--'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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

function ResultItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
