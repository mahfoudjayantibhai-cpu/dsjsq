import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { useToast } from '../context/ToastContext'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

/**
 * 检查 URL 中是否有 historyId 参数，如果有则从后端获取历史记录并解析 input_data。
 * 返回解析后的输入数据和计算类型，供各计算器页面回填使用。
 */
export function useHistoryBackfill() {
  const [searchParams] = useSearchParams()
  const historyId = searchParams.get('historyId')
  const [backfillData, setBackfillData] = useState<any>(null)
  const [calcType, setCalcType] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!historyId)
  const { showToast } = useToast()

  useEffect(() => {
    if (!historyId) {
      setLoading(false)
      return
    }
    const id = parseInt(historyId)
    if (isNaN(id)) {
      setLoading(false)
      return
    }
    setLoading(true)
    api.getHistoryById(id)
      .then(record => {
        setCalcType(record.calc_type || null)
        try {
          setBackfillData(JSON.parse(record.input_data))
        } catch {
          setBackfillData(null)
        }
        // 回填成功后 toast 提示
        if (record.created_at) {
          showToast(`已恢复 ${formatTime(record.created_at)} 的记录`)
        } else {
          showToast('已恢复历史记录')
        }
      })
      .catch(() => setBackfillData(null))
      .finally(() => setLoading(false))
  }, [historyId, showToast])

  return { backfillData, calcType, loading, historyId }
}