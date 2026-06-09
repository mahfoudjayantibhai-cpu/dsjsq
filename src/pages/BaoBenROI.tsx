import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { calcBaoBenROI, saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { useDecimalInput } from '../components/DecimalInput'
import { useHistoryBackfill } from '../hooks/useHistoryBackfill'
import { useAutoSaveHistory } from '../hooks/useAutoSaveHistory'
import type { BaoBenROIInput, SkuItem } from '../types'

const STORAGE_KEY = 'bao_ben_roi'

export default function BaoBenROI() {
  const { settings } = useGlobalSettings()
  const { backfillData } = useHistoryBackfill()

  const [input, setInput] = useState<BaoBenROIInput>(() => {
    const saved = loadFromStorage(STORAGE_KEY) as BaoBenROIInput | null
    return saved || {
      mode: 'single',
      price: 50,
      cost: 25,
      shipping: 3.5,
      skus: [
        { id: '1', name: 'S码', price: 50, cost: 25, shipping: 3.5, salesRatio: 40 },
        { id: '2', name: 'M码', price: 55, cost: 27, shipping: 3.5, salesRatio: 35 },
        { id: '3', name: 'L码', price: 60, cost: 30, shipping: 4, salesRatio: 25 },
      ],
      returnRate: settings.defaultReturnRate,
      platformFeeRate: settings.defaultPlatformFeeRate,
      miscFeeRate: settings.defaultMiscFeeRate,
    }
  })

  // 历史记录回填
  useEffect(() => {
    if (backfillData && backfillData.mode) {
      setInput(backfillData as BaoBenROIInput)
      saveToStorage(STORAGE_KEY, backfillData)
    }
  }, [backfillData])

  const result = calcBaoBenROI(input)

  // 自动保存历史记录到服务端
  useAutoSaveHistory('roi', input, result)

  useEffect(() => {
    saveToStorage(STORAGE_KEY, input)
  }, [input])

  const update = useCallback((patch: Partial<BaoBenROIInput>) => {
    setInput(prev => ({ ...prev, ...patch }))
  }, [])

  const addSku = () => {
    const id = String(Date.now())
    setInput(prev => ({
      ...prev,
      skus: [...prev.skus, { id, name: `SKU${prev.skus.length + 1}`, price: 50, cost: 25, shipping: 3.5, salesRatio: 0 }],
    }))
  }

  const updateSku = (id: string, patch: Partial<SkuItem>) => {
    setInput(prev => ({
      ...prev,
      skus: prev.skus.map(s => s.id === id ? { ...s, ...patch } : s),
    }))
  }

  const removeSku = (id: string) => {
    setInput(prev => ({ ...prev, skus: prev.skus.filter(s => s.id !== id) }))
  }

  const totalRatio = input.skus.reduce((s, sku) => s + sku.salesRatio, 0)
  const ratioWarning = Math.abs(totalRatio - 100) > 1

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-gray-900">保本投产比计算</h2>

      {/* 模式切换 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['single', 'multi'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => update({ mode })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              input.mode === mode ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {mode === 'single' ? '单SKU' : '多SKU加权'}
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {input.mode === 'single' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField label="商品售价 (元)" value={input.price} onChange={v => update({ price: v })} />
            <InputField label="采购成本 (元)" value={input.cost} onChange={v => update({ cost: v })} />
            <InputField label="单件快递费 (元)" value={input.shipping} onChange={v => update({ shipping: v })} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SKU列表</span>
              <button onClick={addSku} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
                <Plus className="w-3 h-3" />添加SKU
              </button>
            </div>
            {input.skus.map(sku => (
              <div key={sku.id} className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <input
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
                  value={sku.name}
                  onChange={e => updateSku(sku.id, { name: e.target.value })}
                  placeholder="名称"
                />
                <InputFieldSm label="售价" value={sku.price} onChange={v => updateSku(sku.id, { price: v })} />
                <InputFieldSm label="成本" value={sku.cost} onChange={v => updateSku(sku.id, { cost: v })} />
                <InputFieldSm label="快递" value={sku.shipping} onChange={v => updateSku(sku.id, { shipping: v })} />
                <InputFieldSm label="占比%" value={sku.salesRatio} onChange={v => updateSku(sku.id, { salesRatio: v })} />
                <button
                  onClick={() => removeSku(sku.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {ratioWarning && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                <AlertTriangle className="w-3 h-3" />
                SKU占比合计为 {totalRatio}%，建议调整为 100%
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <InputField label="退货率 (%)" value={+(input.returnRate * 100).toFixed(1)} onChange={v => update({ returnRate: v / 100 })} />
          <InputField label="平台费率 (%)" value={+(input.platformFeeRate * 100).toFixed(2)} onChange={v => update({ platformFeeRate: v / 100 })} />
          <InputField label="杂费费率 (%)" value={+(input.miscFeeRate * 100).toFixed(1)} onChange={v => update({ miscFeeRate: v / 100 })} />
        </div>

        <div className="max-w-xs">
          <InputField label="当前实际投产比 (可选)" value={input.actualROI ?? 0} onChange={v => update({ actualROI: v || undefined })} />
        </div>
      </div>

      {/* 结果区 */}
      <div className={`bg-white rounded-xl border p-5 ${result.riskStatus === 'loss' ? 'border-red-300 ring-2 ring-red-100' : 'border-green-200'}`}>
        <h3 className="font-semibold text-gray-900 mb-4">计算结果</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ResultItem label="单件毛利" value={`¥${result.unitProfit}`} />
          <ResultItem label="毛利率" value={`${result.grossMargin}%`} />
          <ResultItem label="基础保本投产比" value={result.baseROI.toFixed(2)} />
          {result.weightedGrossMargin !== undefined && (
            <ResultItem label="加权毛利率" value={`${result.weightedGrossMargin}%`} />
          )}
          <ResultItem
            label="真实保本投产比"
            value={result.realROI.toFixed(2)}
            highlight
            danger={result.riskStatus === 'loss'}
          />
        </div>

        {/* 风险提示 */}
        {input.actualROI && input.actualROI > 0 && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.riskStatus === 'profit' ? 'bg-green-50 text-green-700' :
            result.riskStatus === 'loss' ? 'bg-red-50 text-red-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            {result.riskStatus === 'profit' && '✅ 当前推广盈利，可继续放量'}
            {result.riskStatus === 'break_even' && '⚠️ 当前处于盈亏平衡，建议优化素材和出价'}
            {result.riskStatus === 'loss' && `❌ 当前推广亏损！投产比低于保本线，预估每百元销售额亏损约 ¥${result.estimatedLoss}`}
          </div>
        )}
        {!input.actualROI && (
          <p className="mt-3 text-xs text-gray-400">输入「当前实际投产比」可查看盈亏风险提示</p>
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

function ResultItem({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${
        danger ? 'text-red-600' : highlight ? 'text-orange-600' : 'text-gray-900'
      }`}>{value}</div>
    </div>
  )
}
