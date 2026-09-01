import type { JournalStats } from '../types'

function money(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function pct(n: number | null) {
  return n === null ? '—' : `${n.toFixed(1)}%`
}

function num(n: number | null, digits = 2) {
  return n === null ? '—' : n.toFixed(digits)
}

export function StatsPanel({ stats }: { stats: JournalStats }) {
  const pnlColor = stats.totalPnl > 0 ? 'text-emerald-400' : stats.totalPnl < 0 ? 'text-rose-400' : 'text-neutral-200'

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-3 text-xs tracking-widest text-neutral-500">
        JOURNAL ÖZETİ · {stats.closedCount} KAPALI / {stats.openCount} AÇIK POZİSYON
      </div>
      <div className={`mb-4 text-3xl font-semibold ${pnlColor}`}>{money(stats.totalPnl)}</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
        <Stat label="WIN RATE" value={pct(stats.winRate)} />
        <Stat label="AVG R-MULTIPLE" value={stats.avgRMultiple === null ? '—' : `${num(stats.avgRMultiple)}R`} />
        <Stat label="SHARPE (PER-TRADE)" value={num(stats.sharpe)} />
        <Stat label="AVG WIN" value={stats.avgWin === null ? '—' : money(stats.avgWin)} tone="up" />
        <Stat label="AVG LOSS" value={stats.avgLoss === null ? '—' : money(stats.avgLoss)} tone="down" />
        <Stat
          label="BEST / WORST"
          value={
            stats.bestTrade || stats.worstTrade
              ? `${stats.bestTrade ? money(stats.bestTrade.pnl) : '—'} / ${stats.worstTrade ? money(stats.worstTrade.pnl) : '—'}`
              : '—'
          }
        />
      </div>
      {stats.closedCount === 0 && (
        <p className="mt-4 text-xs text-neutral-600">
          Henüz kapanmış işlem yok. Bu metrikler yalnızca gerçekten girdiğiniz trade'lerden hesaplanır — kurgusal bir değer gösterilmez.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-neutral-100'
  return (
    <div>
      <div className="text-neutral-500">{label}</div>
      <div className={`mt-0.5 font-semibold ${color}`}>{value}</div>
    </div>
  )
}
