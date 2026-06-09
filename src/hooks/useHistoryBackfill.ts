import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'

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
      })
      .catch(() => setBackfillData(null))
      .finally(() => setLoading(false))
  }, [historyId])

  return { backfillData, calcType, loading, historyId }
}