import { useState } from 'react'
import { tradeMetrics } from '../lib/stats'
import type { Trade } from '../types'

export function TradeTable({
  trades,
  onClose,
  onRemove,
}: {
  trades: Trade[]
  onClose: (id: string, exitPrice: number, closedAt: number) => void
  onRemove: (id: string) => void
}) {
  const sorted = [...trades].sort((a, b) => b.openedAt - a.openedAt)

  return (
    <div className="border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3 text-xs tracking-widest text-neutral-500">
        İŞLEM GEÇMİŞİ
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-500">
              <th className="px-3 py-2 font-normal">Sembol</th>
              <th className="px-3 py-2 font-normal">Yön</th>
              <th className="px-3 py-2 font-normal">Miktar</th>
              <th className="px-3 py-2 font-normal">Giriş</th>
              <th className="px-3 py-2 font-normal">Çıkış</th>
              <th className="px-3 py-2 font-normal">PnL</th>
              <th className="px-3 py-2 font-normal">R</th>
              <th className="px-3 py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-600">
                  Henüz işlem yok. Yukarıdan ilk işlemini ekle.
                </td>
              </tr>
            )}
            {sorted.map((trade) => (
              <Row key={trade.id} trade={trade} onClose={onClose} onRemove={onRemove} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({
  trade,
  onClose,
  onRemove,
}: {
  trade: Trade
  onClose: (id: string, exitPrice: number, closedAt: number) => void
  onRemove: (id: string) => void
}) {
  const [exitInput, setExitInput] = useState('')
  const metrics = tradeMetrics(trade)

  return (
    <tr className="border-b border-neutral-900 text-neutral-300">
      <td className="px-3 py-2 font-semibold text-neutral-100">{trade.symbol}</td>
      <td className={`px-3 py-2 ${trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.side}</td>
      <td className="px-3 py-2">{trade.quantity}</td>
      <td className="px-3 py-2">${trade.entryPrice.toLocaleString('en-US')}</td>
      <td className="px-3 py-2">
        {trade.exitPrice !== null ? (
          `$${trade.exitPrice.toLocaleString('en-US')}`
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              className="w-20 border border-neutral-800 bg-neutral-900 px-1.5 py-1 text-neutral-100 outline-none focus:border-neutral-600"
              type="number"
              step="any"
              placeholder="fiyat"
              value={exitInput}
              onChange={(e) => setExitInput(e.target.value)}
            />
            <button
              className="border border-neutral-700 px-1.5 py-1 text-neutral-400 hover:bg-neutral-800"
              onClick={() => {
                const price = Number(exitInput)
                if (!price) return
                onClose(trade.id, price, Date.now())
              }}
            >
              Kapat
            </button>
          </div>
        )}
      </td>
      <td className={`px-3 py-2 font-semibold ${metrics ? (metrics.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-neutral-600'}`}>
        {metrics ? `${metrics.pnl >= 0 ? '+' : ''}$${metrics.pnl.toFixed(2)}` : '—'}
      </td>
      <td className="px-3 py-2">{metrics?.rMultiple !== null && metrics?.rMultiple !== undefined ? `${metrics.rMultiple.toFixed(2)}R` : '—'}</td>
      <td className="px-3 py-2 text-right">
        <button className="text-neutral-600 hover:text-rose-400" onClick={() => onRemove(trade.id)}>
          sil
        </button>
      </td>
    </tr>
  )
}
