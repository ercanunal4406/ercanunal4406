import { useCallback, useEffect, useState } from 'react'
import type { Trade } from '../types'

const STORAGE_KEY = 'trade-journal:trades'

function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Trade[]
  } catch {
    return []
  }
}

export function useTradeJournal() {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
    } catch {
      // storage unavailable (private mode, quota) - state still holds in memory
    }
  }, [trades])

  const addTrade = useCallback((trade: Omit<Trade, 'id'>) => {
    const id = crypto.randomUUID()
    setTrades((prev) => [...prev, { ...trade, id }])
  }, [])

  const closeTrade = useCallback((id: string, exitPrice: number, closedAt: number) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exitPrice, closedAt } : t)),
    )
  }, [])

  const removeTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { trades, addTrade, closeTrade, removeTrade }
}
