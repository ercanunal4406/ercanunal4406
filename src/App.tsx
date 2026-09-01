import { useMemo, useState } from 'react'
import { CandleChart } from './components/CandleChart'
import { EquityCurve } from './components/EquityCurve'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PriceTicker } from './components/PriceTicker'
import { StatsPanel } from './components/StatsPanel'
import { TradeForm } from './components/TradeForm'
import { TradeTable } from './components/TradeTable'
import { useKlines } from './hooks/useKlines'
import { useLivePrices } from './hooks/useLivePrices'
import { useTradeJournal } from './hooks/useTradeJournal'
import { INTERVALS, WATCHED_SYMBOLS, type Interval } from './lib/binance'
import { computeStats, equityCurve } from './lib/stats'

export default function App() {
  const { prices, status } = useLivePrices()
  const { trades, addTrade, closeTrade, removeTrade } = useTradeJournal()

  const [symbol, setSymbol] = useState<string>(WATCHED_SYMBOLS[0])
  const [interval, setInterval_] = useState<Interval>('5m')
  const { candles, loading, error } = useKlines(symbol, interval)

  const stats = useMemo(() => computeStats(trades), [trades])
  const curve = useMemo(() => equityCurve(trades), [trades])

  return (
    <div className="min-h-screen bg-neutral-950 pb-16 text-neutral-200">
      <header className="border-b border-neutral-800 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-widest text-neutral-100">TRADE JOURNAL</div>
            <div className="text-[11px] text-neutral-600">Gerçek zamanlı fiyat · Manuel işlem kaydı · Gerçek istatistikler</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-4">
        <PriceTicker prices={prices} status={status} />
      </div>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pt-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {WATCHED_SYMBOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`border px-2.5 py-1 text-xs ${
                    symbol === s
                      ? 'border-neutral-500 bg-neutral-800 text-neutral-100'
                      : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {INTERVALS.map((i) => (
                <button
                  key={i}
                  onClick={() => setInterval_(i)}
                  className={`border px-2 py-1 text-xs ${
                    interval === i
                      ? 'border-neutral-500 bg-neutral-800 text-neutral-100'
                      : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <ErrorBoundary label="Fiyat grafiği">
            <CandleChart candles={candles} loading={loading} error={error} />
          </ErrorBoundary>
          <ErrorBoundary label="Equity eğrisi">
            <EquityCurve points={curve} />
          </ErrorBoundary>
          <TradeTable trades={trades} onClose={closeTrade} onRemove={removeTrade} />
        </div>

        <div className="flex flex-col gap-4">
          <StatsPanel stats={stats} />
          <TradeForm onAdd={addTrade} />
        </div>
      </main>
    </div>
  )
}
