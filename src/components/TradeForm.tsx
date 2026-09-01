import { useState } from 'react'
import { WATCHED_SYMBOLS } from '../lib/binance'
import type { Side, Trade } from '../types'

interface FormState {
  symbol: string
  side: Side
  quantity: string
  entryPrice: string
  stopLoss: string
  exitPrice: string
  notes: string
}

const EMPTY: FormState = {
  symbol: WATCHED_SYMBOLS[0],
  side: 'LONG',
  quantity: '',
  entryPrice: '',
  stopLoss: '',
  exitPrice: '',
  notes: '',
}

export function TradeForm({ onAdd }: { onAdd: (trade: Omit<Trade, 'id'>) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const quantity = Number(form.quantity)
    const entryPrice = Number(form.entryPrice)
    if (!quantity || !entryPrice) return

    const exitPrice = form.exitPrice ? Number(form.exitPrice) : null
    const now = Date.now()

    onAdd({
      symbol: form.symbol,
      side: form.side,
      quantity,
      entryPrice,
      stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
      exitPrice,
      openedAt: now,
      closedAt: exitPrice !== null ? now : null,
      notes: form.notes.trim(),
    })
    setForm(EMPTY)
  }

  const inputClass =
    'w-full border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-100 outline-none focus:border-neutral-600'

  return (
    <form onSubmit={handleSubmit} className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-3 text-xs tracking-widest text-neutral-500">YENİ İŞLEM EKLE</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Sembol
          <select className={inputClass} value={form.symbol} onChange={(e) => set('symbol', e.target.value)}>
            {WATCHED_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Yön
          <select className={inputClass} value={form.side} onChange={(e) => set('side', e.target.value as Side)}>
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Miktar
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Giriş Fiyatı
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.entryPrice}
            onChange={(e) => set('entryPrice', e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Stop Loss (opsiyonel)
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.stopLoss}
            onChange={(e) => set('stopLoss', e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
          Çıkış Fiyatı (boşsa açık kalır)
          <input
            className={inputClass}
            type="number"
            step="any"
            value={form.exitPrice}
            onChange={(e) => set('exitPrice', e.target.value)}
          />
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-[11px] text-neutral-500">
        Not
        <input className={inputClass} type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      <button
        type="submit"
        className="mt-3 w-full border border-neutral-700 bg-neutral-900 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
      >
        İŞLEMİ KAYDET
      </button>
    </form>
  )
}
