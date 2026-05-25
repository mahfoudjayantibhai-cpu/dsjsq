import { useState, useCallback } from 'react'
import { TrendingUp, Tag, Zap, AlertTriangle, CheckCircle, Percent, ArrowUpRight, Shield, Gauge, X, Plus, DollarSign, Users } from 'lucide-react'
import { calcPriceCompare, calcInflatedPrice, saveToStorage, loadFromStorage } from '../utils/calculations'
import { useGlobalSettings } from '../context/GlobalSettings'
import { useDecimalInput } from '../components/DecimalInput'
import type { CompetitorPrice, PriceCompareResult, InflatedPriceResult, StrategyType, Aggressiveness } from '../types'

const STORAGE_KEY_COMPARE = 'price_compare_input'
const STORAGE_KEY_INFLATED = 'inflated_price_input'

type TabId = 'compare' | 'inflated'

export default function PriceStrategy() {
  const [tab, setTab] = useState<TabId>('compare')
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('compare')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-[2px] ${
            tab === 'compare'
              ? 'bg-white border border-b-white border-gray-200 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          比价算法分析
        </button>
        <button
          onClick={() => setTab('inflated')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-[2px] ${
            tab === 'inflated'
              ? 'bg-white border border-b-white border-gray-200 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          虚高价策略
        </button>
      </div>

      {tab === 'compare' ? <ComparePanel /> : <InflatedPanel />}
    </div>
  )
}

// ==================== 比价分析面板 ====================

function ComparePanel() {
  const { settings } = useGlobalSettings()

  const saved = loadFromStorage(STORAGE_KEY_COMPARE) as Record<string, unknown> | null
  const [myPrice, setMyPrice] = useState<number>((saved?.myPrice as number) || 0)
  const [myCost, setMyCost] = useState<number>((saved?.myCost as number) || 0)
  const [competitors, setCompetitors] = useState<CompetitorPrice[]>(
    (saved?.competitors as CompetitorPrice[]) || [
      { id: '1', name: '竞品A', price: 0 },
      { id: '2', name: '竞品B', price: 0 },
      { id: '3', name: '竞品C', price: 0 },
    ]
  )

  const update = useCallback(() => {
    saveToStorage(STORAGE_KEY_COMPARE, { myPrice, myCost, competitors })
  }, [myPrice, myCost, competitors])

  const updateCompetitor = useCallback((id: string, field: 'name' | 'price', value: string | number) => {
    setCompetitors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }, [])

  const addCompetitor = useCallback(() => {
    if (competitors.length >= 8) return
    setCompetitors(prev => [...prev, { id: String(Date.now()), name: `竞品${String.fromCharCode(65 + prev.length)}`, price: 0 }])
  }, [competitors.length])

  const removeCompetitor = useCallback((id: string) => {
    if (competitors.length <= 1) return
    setCompetitors(prev => prev.filter(c => c.id !== id))
  }, [competitors.length])

  const validCompetitors = competitors.filter(c => c.price > 0)
  const result: PriceCompareResult | null = myPrice > 0 && myCost > 0
    ? calcPriceCompare({ myPrice, myCost, competitors: validCompetitors, platformFeeRate: settings.defaultPlatformFeeRate, returnRate: settings.defaultReturnRate })
    : null

  const trafficLabel = result
    ? result.trafficMultiplier >= 1.2 ? '流量加权' : result.trafficMultiplier >= 0.7 ? '基准流量' : '流量受限'
    : '—'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" onChange={update}>
      {/* 输入区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-500" />竞品价格录入
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="我的售价（元）" value={myPrice} onChange={setMyPrice} />
          <InputField label="我的成本（元）" value={myCost} onChange={setMyCost} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">竞品价格（至少1个，最多8个）</span>
            <button onClick={addCompetitor} disabled={competitors.length >= 8}
              className="text-xs text-orange-600 hover:text-orange-700 disabled:text-gray-300 flex items-center gap-0.5">
              <Plus className="w-3 h-3" />添加竞品
            </button>
          </div>
          {competitors.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="text"
                value={c.name}
                onChange={e => updateCompetitor(c.id, 'name', e.target.value)}
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-200"
                placeholder="名称"
              />
              <input
                type="text"
                inputMode="decimal"
                value={c.price === 0 ? '' : c.price}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') { updateCompetitor(c.id, 'price', 0); return }
                  const v = parseFloat(raw)
                  if (!isNaN(v)) updateCompetitor(c.id, 'price', v)
                }}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-200"
                placeholder={`竞品价格 ${c.name}`}
              />
              {competitors.length > 1 && (
                <button onClick={() => removeCompetitor(c.id)} className="text-gray-300 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 结果区 */}
      <div className="space-y-4">
        {!result ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            输入我的价格、成本和至少1个竞品价格后查看分析结果
          </div>
        ) : (
          <>
            {/* 竞争力分 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-500" />价格竞争力
                </h3>
                <span className="text-xs text-gray-400">排名 #{result.rank}/{result.totalCount}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none"
                      stroke={result.competitivenessScore >= 80 ? '#22c55e' : result.competitivenessScore >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(result.competitivenessScore / 100) * 213.6} 213.6`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">
                    {result.competitivenessScore}
                  </span>
                </div>
                <div className="flex-1 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">流量系数</span>
                    <span className={`font-semibold ${result.trafficMultiplier >= 1.2 ? 'text-green-600' : result.trafficMultiplier >= 0.7 ? 'text-gray-700' : 'text-red-600'}`}>
                      {trafficLabel}（×{result.trafficMultiplier}）
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">超过</span>
                    <span className="font-semibold">{result.percentile}% 竞品</span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">竞品中位价</span>
                    <span className="font-semibold">¥{result.medianPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 竞品对比表 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />竞品价格分布
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="text-left py-2 pr-2">位置</th>
                      <th className="text-right py-2 px-2">最低价</th>
                      <th className="text-right py-2 px-2">P25</th>
                      <th className="text-right py-2 px-2">中位数</th>
                      <th className="text-right py-2 px-2">P75</th>
                      <th className="text-right py-2 px-2">最高价</th>
                      <th className="text-right py-2 pl-2">平均</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-medium">
                      <td className="py-2 pr-2 text-gray-500">价格</td>
                      <td className="py-2 px-2 text-right">¥{result.minPrice}</td>
                      <td className="py-2 px-2 text-right">¥{result.quartile25}</td>
                      <td className="py-2 px-2 text-right">¥{result.medianPrice}</td>
                      <td className="py-2 px-2 text-right">¥{result.quartile75}</td>
                      <td className="py-2 px-2 text-right">¥{result.maxPrice}</td>
                      <td className="py-2 pl-2 text-right">¥{result.avgPrice}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">最优价格区间：</span>
                  <span className="font-bold text-green-600">¥{result.optimalPriceLow} — ¥{result.optimalPriceHigh}</span>
                  <span className="text-xs text-gray-400">（低于竞品中位价 5%-15%）</span>
                </div>
              </div>
            </div>

            {/* 标记与建议 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />算法标记与建议
              </h3>
              {result.flags.map((f, i) => (
                <div key={i} className={`flex items-start gap-2 text-sm p-2.5 rounded-lg ${
                  f.type === 'low_price_bonus' ? 'bg-green-50 text-green-800' :
                  f.type === 'low_price_warning' ? 'bg-red-50 text-red-800' :
                  f.type === 'high_price_warning' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}>
                  {f.type === 'low_price_bonus' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {(f.type === 'low_price_warning' || f.type === 'high_price_warning') && <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {f.type === 'optimal' && <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>{f.message}</span>
                </div>
              ))}
              <div className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-orange-50 text-orange-800">
                <ArrowUpRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{result.suggestion}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ==================== 虚高价策略面板 ====================

const STRATEGY_OPTIONS: { key: StrategyType; label: string; desc: string; icon: typeof Tag }[] = [
  { key: 'flash_sale', label: '限时折扣', desc: '设定倒计时折扣价，营造紧迫感', icon: Zap },
  { key: 'limited_coupon', label: '限量优惠券', desc: '限量发放大额券，制造稀缺感', icon: Tag },
  { key: 'tiered_coupon', label: '阶梯满减券', desc: '多档满减促客单价，一单多件', icon: TrendingUp },
]

const AGGRESSIVE_OPTIONS: { key: Aggressiveness; label: string; desc: string; color: string }[] = [
  { key: 'conservative', label: '保守', desc: '加价 30%', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'moderate', label: '适中', desc: '加价 60%', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'aggressive', label: '激进', desc: '加价 105%', color: 'bg-red-100 text-red-700 border-red-300' },
]

function InflatedPanel() {
  const { settings } = useGlobalSettings()

  const saved = loadFromStorage(STORAGE_KEY_INFLATED) as Record<string, unknown> | null
  const [targetRealPrice, setTargetRealPrice] = useState<number>((saved?.targetRealPrice as number) || 0)
  const [cost, setCost] = useState<number>((saved?.cost as number) || 0)
  const [strategyType, setStrategyType] = useState<StrategyType>((saved?.strategyType as StrategyType) || 'flash_sale')
  const [aggressiveness, setAggressiveness] = useState<Aggressiveness>((saved?.aggressiveness as Aggressiveness) || 'moderate')

  const update = useCallback(() => {
    saveToStorage(STORAGE_KEY_INFLATED, { targetRealPrice, cost, strategyType, aggressiveness })
  }, [targetRealPrice, cost, strategyType, aggressiveness])

  const result: InflatedPriceResult | null = targetRealPrice > 0 && cost > 0
    ? calcInflatedPrice({
        targetRealPrice, cost, strategyType, aggressiveness,
        returnRate: settings.defaultReturnRate,
        platformFeeRate: settings.defaultPlatformFeeRate,
        miscFeeRate: settings.defaultMiscFeeRate,
      })
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" onChange={update}>
      {/* 输入区 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-orange-500" />策略参数设置
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="目标实收价（元）" value={targetRealPrice} onChange={setTargetRealPrice} />
          <InputField label="商品成本（元）" value={cost} onChange={setCost} />
        </div>

        <div>
          <span className="text-xs text-gray-500 block mb-2">加价力度</span>
          <div className="grid grid-cols-3 gap-2">
            {AGGRESSIVE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setAggressiveness(opt.key)}
                className={`p-2.5 rounded-lg text-center border transition-all text-sm ${
                  aggressiveness === opt.key
                    ? `${opt.color} border-2`
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-gray-500 block mb-2">优惠形式</span>
          <div className="space-y-2">
            {STRATEGY_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setStrategyType(opt.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  strategyType === opt.key
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <opt.icon className={`w-5 h-5 ${strategyType === opt.key ? 'text-orange-500' : 'text-gray-400'}`} />
                <div>
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-400">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 结果区 */}
      <div className="space-y-4">
        {!result ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            输入目标实收价和成本后查看策略方案
          </div>
        ) : (
          <>
            {/* 价格对比 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">虚高价方案</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="text-center flex-1">
                  <div className="text-xs text-gray-500 mb-1">页面标价</div>
                  <div className="text-2xl font-bold text-gray-900">¥{result.nominalPrice}</div>
                </div>
                <div className="flex flex-col items-center px-4">
                  <ArrowUpRight className="w-5 h-5 text-orange-400 mb-1" />
                  <span className="text-xs font-semibold text-orange-600">-¥{result.discountAmount}</span>
                  <span className="text-xs text-gray-400">(-{result.discountRate}%)</span>
                </div>
                <div className="text-center flex-1">
                  <div className="text-xs text-gray-500 mb-1">实收价</div>
                  <div className="text-2xl font-bold text-green-600">¥{result.effectiveFinalPrice}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs text-orange-600">消费者感知折扣</div>
                  <div className="text-lg font-bold text-orange-700">{result.perceivedDiscount}%</div>
                  <div className="text-xs text-orange-500">比实际折扣高出约{Math.round(result.perceivedDiscount - result.discountRate)}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600">预估转化提升</div>
                  <div className="text-lg font-bold text-green-700">+{result.conversionBoost}%</div>
                  <div className="text-xs text-green-500">基于折扣力度的转化预估</div>
                </div>
              </div>
            </div>

            {/* 策略配置详情 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4 text-orange-500" />优惠配置详情
              </h3>

              {strategyType === 'flash_sale' && result.flashSaleConfig && (
                <div className="space-y-2 text-sm">
                  <ConfigRow label="折扣力度" value={`${result.flashSaleConfig.discountPercent}% OFF`} />
                  <ConfigRow label="建议时长" value={result.flashSaleConfig.suggestedDuration} />
                  <ConfigRow label="建议时段" value={result.flashSaleConfig.suggestedStartTime} />
                  <ConfigRow label="显示样式" value={`「限时${result.flashSaleConfig.discountPercent}%OFF」倒计时标签`} />
                </div>
              )}

              {strategyType === 'limited_coupon' && result.limitedCouponConfig && (
                <div className="space-y-2 text-sm">
                  <ConfigRow label="券面额" value={`¥${result.limitedCouponConfig.faceValue}`} />
                  <ConfigRow label="发放数量" value={`${result.limitedCouponConfig.quantity} 张`} />
                  <ConfigRow label="使用门槛" value={`满 ¥${result.limitedCouponConfig.minOrderAmount} 可用`} />
                  <ConfigRow label="显示样式" value={`「限量${result.limitedCouponConfig.quantity}张」¥${result.limitedCouponConfig.faceValue}券`} />
                </div>
              )}

              {strategyType === 'tiered_coupon' && result.tieredCouponConfig && (
                <div className="space-y-3">
                  {result.tieredCouponConfig.tiers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-500">满 ¥{t.threshold}</span>
                      <span className="font-semibold text-orange-600">减 ¥{t.discount}</span>
                      <span className="text-xs text-gray-400">≈ {Math.round(t.discount / t.threshold * 100)}% OFF</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 利润与风险 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />利润核算与风险评估
              </h3>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">单笔利润</div>
                  <div className="font-bold text-gray-900">¥{result.profitPerOrder}</div>
                </div>
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">利润率</div>
                  <div className="font-bold text-gray-900">{result.marginRate}%</div>
                </div>
                <div className="text-center p-2">
                  <div className="text-xs text-gray-500">保本投产比</div>
                  <div className="font-bold text-gray-900">{result.breakevenROI}</div>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
                result.riskLevel === 'low' ? 'bg-green-50 text-green-800' :
                result.riskLevel === 'medium' ? 'bg-orange-50 text-orange-800' :
                'bg-red-50 text-red-800'
              }`}>
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">风险等级：{result.riskLevel === 'low' ? '低' : result.riskLevel === 'medium' ? '中' : '高'}</span>
              </div>

              {result.riskWarnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-orange-400" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
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