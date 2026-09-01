import type { ConnectionStatus } from '../hooks/useLivePrices'
import { WATCHED_SYMBOLS } from '../lib/binance'
import type { TickerUpdate } from '../lib/binance'

const LABELS: Record<string, string> = {
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  SOLUSDT: 'SOL/USDT',
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 4 : 2 })
}

export function PriceTicker({
  prices,
  status,
}: {
  prices: Record<string, TickerUpdate>
  status: ConnectionStatus
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs">
      <StatusDot status={status} />
      {WATCHED_SYMBOLS.map((symbol) => {
        const t = prices[symbol]
        const up = (t?.priceChangePercent ?? 0) >= 0
        return (
          <div key={symbol} className="flex items-baseline gap-2">
            <span className="text-neutral-400">{LABELS[symbol]}</span>
            {t ? (
              <>
                <span className="font-semibold text-neutral-100">${fmtPrice(t.lastPrice)}</span>
                <span className={up ? 'text-emerald-400' : 'text-rose-400'}>
                  {up ? '▲' : '▼'} {t.priceChangePercent.toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-neutral-600">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const color =
    status === 'open'
      ? 'bg-emerald-400'
      : status === 'connecting'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-rose-500'
  const label =
    status === 'open'
      ? 'CANLI'
      : status === 'connecting'
        ? 'BAĞLANIYOR'
        : 'BAĞLANTI YOK'
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-neutral-500">{label}</span>
    </div>
  )
}
