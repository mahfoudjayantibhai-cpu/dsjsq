import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'
import type { CalculationHistory } from '../types'

interface HistoryContextType {
  records: CalculationHistory[]
  loading: boolean
  refreshHistory: () => Promise<void>
  deleteRecord: (id: number) => Promise<void>
  clearAll: () => Promise<void>
}

const HistoryContext = createContext<HistoryContextType>(null!)

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<CalculationHistory[]>([])
  const [loading, setLoading] = useState(false)

  const refreshHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getHistory()
      setRecords(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRecord = useCallback(async (id: number) => {
    try {
      await api.deleteHistory(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch {
      // silent
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      await api.deleteAllHistory()
      setRecords([])
    } catch {
      // silent
    }
  }, [])

  return (
    <HistoryContext.Provider value={{ records, loading, refreshHistory, deleteRecord, clearAll }}>
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  return useContext(HistoryContext)
}