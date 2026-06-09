import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Clock, Trash2, X } from 'lucide-react'
import { useHistory } from '../context/HistoryContext'
import type { CalculationHistory } from '../types'
import { CALC_TYPE_LABELS, CALC_TYPE_ROUTES } from '../types'

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24 && dDay.getTime() === today.getTime()) return `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  if (dDay.getTime() === yesterday.getTime()) return `昨天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isYesterday(iso: string): boolean {
  const d = new Date(iso)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()
}

function getResultSummary(calcType: string, resultData: string): string {
  try {
    const r = JSON.parse(resultData)
    switch (calcType) {
      case 'roi':
        return `保本ROI ${r.realROI?.toFixed(2) || '-'}`
      case 'pricing':
        return `建议售价 ¥${r.suggestedPrice?.toFixed(2) || '-'}`
      case 'profit':
        return `净利润 ¥${r.netProfit?.toFixed(2) || '-'}`
      case 'ad-roi':
        return `加权ROI ${r.weightedAvgROI?.toFixed(2) || '-'}`
      case 'strategy':
        return r.nominalPrice
          ? `虚高价 ¥${r.nominalPrice?.toFixed(2) || '-'}`
          : `排名 #${r.rank || '-'}/${r.totalCount || '-'}`
      case 'listing-roi':
        return `净利润 ¥${r.totalProfit?.toFixed(2) || '-'}`
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

type TimeGroup = 'today' | 'yesterday' | 'earlier'
type GroupedRecords = { key: TimeGroup; label: string; items: CalculationHistory[] }[]

function groupByTime(records: CalculationHistory[]): GroupedRecords {
  const groups: Record<TimeGroup, CalculationHistory[]> = { today: [], yesterday: [], earlier: [] }
  for (const r of records) {
    if (isToday(r.created_at)) groups.today.push(r)
    else if (isYesterday(r.created_at)) groups.yesterday.push(r)
    else groups.earlier.push(r)
  }
  const result: GroupedRecords = []
  if (groups.today.length) result.push({ key: 'today', label: '今天', items: groups.today })
  if (groups.yesterday.length) result.push({ key: 'yesterday', label: '昨天', items: groups.yesterday })
  if (groups.earlier.length) result.push({ key: 'earlier', label: '更早', items: groups.earlier })
  return result
}

export default function SidebarHistoryPanel() {
  const [open, setOpen] = useState(false)
  const { records, loading, refreshHistory, deleteRecord, clearAll } = useHistory()
  const navigate = useNavigate()
  const location = useLocation()

  // 自动刷新：面板打开时加载历史
  useEffect(() => {
    if (open) {
      refreshHistory()
    }
  }, [open, refreshHistory])

  // 路由变化时关闭面板（在小屏上）
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  function handleClickRecord(record: CalculationHistory) {
    const route = CALC_TYPE_ROUTES[record.calc_type]
    if (route) {
      navigate(`${route}?historyId=${record.id}`)
    }
  }

  const grouped = groupByTime(records)

  return (
    <>
      {/* 折叠按钮 - 固定在右侧 */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 px-1.5 py-3
          bg-indigo-500 text-white rounded-l-lg shadow-lg hover:bg-indigo-600 transition-all duration-200
          ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="历史记录"
      >
        <Clock className="w-4 h-4" />
        {records.length > 0 && (
          <span className="text-[10px] font-bold min-w-[16px] h-4 rounded-full bg-white text-indigo-600 flex items-center justify-center">
            {records.length > 99 ? '99+' : records.length}
          </span>
        )}
      </button>

      {/* 侧栏面板 */}
      <div
        className={`fixed right-0 top-0 h-full z-40 w-72 bg-white shadow-2xl border-l border-gray-200
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 面板头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-sm text-gray-900">历史记录</h3>
            {records.length > 0 && (
              <span className="text-xs text-gray-400">({records.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {records.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="清空全部"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 面板内容 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Clock className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">暂无历史记录</p>
              <p className="text-xs text-gray-300 mt-1">完成计算后会自动出现在这里</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(group => (
                <div key={group.key} className="mb-1">
                  <div className="px-4 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                    {group.label}
                  </div>
                  {group.items.map(record => (
                    <div
                      key={record.id}
                      onClick={() => handleClickRecord(record)}
                      className="mx-2 mb-0.5 p-2.5 rounded-lg hover:bg-indigo-50 cursor-pointer
                        transition-colors duration-150 group/item border border-transparent hover:border-indigo-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTypeColor(record.calc_type)}`}>
                          {CALC_TYPE_LABELS[record.calc_type] || record.calc_type}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">
                            {formatRelativeTime(record.created_at)}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              deleteRecord(record.id)
                            }}
                            className="p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 font-medium truncate">
                        {getResultSummary(record.calc_type, record.result_data)}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 面板底部 */}
        <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400 text-center">
            点击记录可回填参数到计算器
          </p>
        </div>
      </div>

      {/* 遮罩层 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}