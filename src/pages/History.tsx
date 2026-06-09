import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Trash2, Search, Calendar, RotateCcw } from 'lucide-react'
import { api } from '../services/api'
import type { CalculationHistory } from '../types'
import { CALC_TYPE_LABELS, CALC_TYPE_ROUTES } from '../types'

type DateRange = 'today' | 'week' | 'month' | 'custom'

function getRange(range: DateRange): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()

  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { start: start.toISOString(), end }
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { start: start.toISOString(), end }
    }
    case 'month': {
      const start = new Date(now)
      start.setMonth(start.getMonth() - 1)
      return { start: start.toISOString(), end }
    }
    default:
      return { start: '', end: '' }
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const date = `${d.getMonth() + 1}/${d.getDate()}`
  if (isToday) return `今天 ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return `${date} ${time}`
}

function getResultSummary(calcType: string, resultData: string): string {
  try {
    const r = JSON.parse(resultData)
    switch (calcType) {
      case 'roi':
        return `保本投产比 ${r.realROI?.toFixed(2) || '-'}`
      case 'pricing':
        return `建议售价 ¥${r.suggestedPrice?.toFixed(2) || '-'}`
      case 'profit':
        return `净利润 ¥${r.netProfit?.toFixed(2) || '-'}，净利率 ${r.netMargin?.toFixed(1) || '-'}%`
      case 'ad-roi':
        return `${r.plans?.length || 0} 个计划，加权ROI ${r.weightedAvgROI?.toFixed(2) || '-'}`
      case 'strategy':
        return r.nominalPrice
          ? `标价 ¥${r.nominalPrice?.toFixed(2) || '-'}，折后 ¥${r.effectiveFinalPrice?.toFixed(2) || '-'}`
          : `竞争力 ${r.competitivenessScore || '-'} 分，排名 #${r.rank || '-'}/${r.totalCount || '-'}`
      case 'listing-roi':
        return `${r.totalSales || 0} 件，净利润 ¥${r.totalProfit?.toFixed(2) || '-'}`
      default:
        return '-'
    }
  } catch {
    return '-'
  }
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'roi': 'bg-blue-100 text-blue-700',
    'pricing': 'bg-emerald-100 text-emerald-700',
    'profit': 'bg-violet-100 text-violet-700',
    'ad-roi': 'bg-amber-100 text-amber-700',
    'strategy': 'bg-rose-100 text-rose-700',
    'listing-roi': 'bg-indigo-100 text-indigo-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export default function History() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<CalculationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRange>('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      if (range === 'custom') {
        const data = await api.getHistory({
          start: customStart ? new Date(customStart).toISOString() : undefined,
          end: customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : undefined,
        })
        setRecords(data)
      } else {
        const { start, end } = getRange(range)
        const data = await api.getHistory({ start, end })
        setRecords(data)
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [range, customStart, customEnd])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  async function handleDelete(id: number) {
    try {
      await api.deleteHistory(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch { /* ignore */ }
  }

  async function handleClearAll() {
    if (!window.confirm('确认清空全部历史记录？此操作不可恢复。')) return
    try {
      await api.deleteAllHistory()
      setRecords([])
    } catch { /* ignore */ }
  }

  function handleJump(record: CalculationHistory) {
    const route = CALC_TYPE_ROUTES[record.calc_type]
    if (route) {
      navigate(`${route}?historyId=${record.id}`)
    }
  }

  const rangeTabs: { key: DateRange; label: string }[] = [
    { key: 'today', label: '今天' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
    { key: 'custom', label: '自定义' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          历史记录
        </h2>
        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空全部
          </button>
        )}
      </div>

      {/* 时间筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {rangeTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setRange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === tab.key
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <span className="text-gray-400 text-sm">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              查询
            </button>
          </div>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无历史记录</p>
          <p className="text-gray-300 text-xs mt-1">完成计算后会自动出现在这里</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(record => (
            <div
              key={record.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getTypeColor(record.calc_type)}`}>
                      {CALC_TYPE_LABELS[record.calc_type] || record.calc_type}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(record.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {getResultSummary(record.calc_type, record.result_data)}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleJump(record)}
                    className="p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors flex items-center gap-1 text-sm"
                    title="跳转回填"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">回填</span>
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          共 {records.length} 条记录，点击「回填」可跳转到计算器并自动填充参数
        </p>
      )}
    </div>
  )
}