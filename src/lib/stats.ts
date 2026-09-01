import type { ClosedTradeMetrics, EquityPoint, JournalStats, Trade } from '../types'

export function tradeMetrics(trade: Trade): ClosedTradeMetrics | null {
  if (trade.exitPrice === null || trade.closedAt === null) return null

  const direction = trade.side === 'LONG' ? 1 : -1
  const pnl = direction * (trade.exitPrice - trade.entryPrice) * trade.quantity
  const cost = trade.entryPrice * trade.quantity
  const pnlPct = cost !== 0 ? (pnl / cost) * 100 : 0

  let rMultiple: number | null = null
  if (trade.stopLoss !== null) {
    const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss)
    const risk = riskPerUnit * trade.quantity
    if (risk > 0) rMultiple = pnl / risk
  }

  return { trade, pnl, pnlPct, rMultiple }
}

export function computeStats(trades: Trade[]): JournalStats {
  const closed = trades
    .map(tradeMetrics)
    .filter((m): m is ClosedTradeMetrics => m !== null)
  const openCount = trades.length - closed.length

  if (closed.length === 0) {
    return {
      closedCount: 0,
      openCount,
      totalPnl: 0,
      winRate: null,
      avgWin: null,
      avgLoss: null,
      avgRMultiple: null,
      sharpe: null,
      bestTrade: null,
      worstTrade: null,
    }
  }

  const wins = closed.filter((m) => m.pnl > 0)
  const losses = closed.filter((m) => m.pnl < 0)
  const totalPnl = closed.reduce((sum, m) => sum + m.pnl, 0)
  const winRate = (wins.length / closed.length) * 100
  const avgWin = wins.length ? wins.reduce((s, m) => s + m.pnl, 0) / wins.length : null
  const avgLoss = losses.length ? losses.reduce((s, m) => s + m.pnl, 0) / losses.length : null

  const rTrades = closed.filter((m) => m.rMultiple !== null)
  const avgRMultiple = rTrades.length
    ? rTrades.reduce((s, m) => s + (m.rMultiple ?? 0), 0) / rTrades.length
    : null

  const returns = closed.map((m) => m.pnlPct)
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length
  const variance =
    returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const sharpe = stdDev > 0 ? meanReturn / stdDev : null

  const bestTrade = closed.reduce((best, m) => (m.pnl > best.pnl ? m : best), closed[0])
  const worstTrade = closed.reduce((worst, m) => (m.pnl < worst.pnl ? m : worst), closed[0])

  return {
    closedCount: closed.length,
    openCount,
    totalPnl,
    winRate,
    avgWin,
    avgLoss,
    avgRMultiple,
    sharpe,
    bestTrade,
    worstTrade,
  }
}

export function equityCurve(trades: Trade[]): EquityPoint[] {
  const closed = trades
    .map(tradeMetrics)
    .filter((m): m is ClosedTradeMetrics => m !== null)
    .sort((a, b) => (a.trade.closedAt ?? 0) - (b.trade.closedAt ?? 0))

  // time is in whole seconds (chart-ready); trades closed within the same
  // second are collapsed into one point so the series stays strictly
  // ascending, which lightweight-charts requires.
  let running = 0
  const points: EquityPoint[] = []
  for (const m of closed) {
    running += m.pnl
    const time = Math.floor((m.trade.closedAt ?? 0) / 1000)
    const last = points[points.length - 1]
    if (last && last.time === time) {
      last.equity = running
    } else {
      points.push({ time, equity: running })
    }
  }
  return points
}
