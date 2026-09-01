export type Side = 'LONG' | 'SHORT'

export interface Trade {
  id: string
  symbol: string
  side: Side
  quantity: number
  entryPrice: number
  exitPrice: number | null
  stopLoss: number | null
  openedAt: number
  closedAt: number | null
  notes: string
}

export interface ClosedTradeMetrics {
  trade: Trade
  pnl: number
  pnlPct: number
  rMultiple: number | null
}

export interface JournalStats {
  closedCount: number
  openCount: number
  totalPnl: number
  winRate: number | null
  avgWin: number | null
  avgLoss: number | null
  avgRMultiple: number | null
  sharpe: number | null
  bestTrade: ClosedTradeMetrics | null
  worstTrade: ClosedTradeMetrics | null
}

export interface EquityPoint {
  time: number
  equity: number
}
