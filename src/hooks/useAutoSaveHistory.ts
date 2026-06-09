import { useEffect, useRef } from 'react'
import { api } from '../services/api'
import { useHistory } from '../context/HistoryContext'

/**
 * 当计算结果变化时，自动调用服务端保存历史记录并刷新前端历史列表。
 * 用法：在每个计算器页面中调用 useAutoSaveHistory(calcType, input, result)
 */
export function useAutoSaveHistory(calcType: string, input: any, result: any) {
  const { refreshHistory } = useHistory()
  const lastSavedRef = useRef<string>('')
  const inputRef = useRef(input)
  inputRef.current = input

  useEffect(() => {
    if (!result) return
    // 用 JSON 序列化比较避免重复保存
    const key = JSON.stringify(inputRef.current)
    if (key === lastSavedRef.current) return
    lastSavedRef.current = key

    api.calculate(calcType, inputRef.current)
      .then(() => refreshHistory())
      .catch(() => {})
  }, [result, calcType, refreshHistory])

  // 首次加载后初始化历史列表
  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])
}