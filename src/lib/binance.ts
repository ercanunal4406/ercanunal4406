export const WATCHED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const
export type WatchedSymbol = (typeof WATCHED_SYMBOLS)[number]

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Interval = (typeof INTERVALS)[number]

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export async function fetchKlines(
  symbol: string,
  interval: Interval,
  limit = 200,
): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance klines request failed: ${res.status}`)
  const raw: unknown[] = await res.json()
  return raw.map((row) => {
    const r = row as [number, string, string, string, string, ...unknown[]]
    return {
      time: Math.floor(r[0] / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
    }
  })
}

export function tickerStreamUrl(symbols: readonly string[]): string {
  const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join('/')
  return `wss://stream.binance.com:9443/stream?streams=${streams}`
}

export function klineStreamUrl(symbol: string, interval: Interval): string {
  return `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
}

export interface TickerUpdate {
  symbol: string
  lastPrice: number
  priceChangePercent: number
}

export function parseTickerMessage(data: string): TickerUpdate | null {
  try {
    const parsed = JSON.parse(data)
    const payload = parsed.data ?? parsed
    if (!payload || payload.e !== '24hrTicker') return null
    return {
      symbol: payload.s,
      lastPrice: Number(payload.c),
      priceChangePercent: Number(payload.P),
    }
  } catch {
    return null
  }
}

export interface KlineUpdate {
  candle: Candle
  isFinal: boolean
}

export function parseKlineMessage(data: string): KlineUpdate | null {
  try {
    const parsed = JSON.parse(data)
    const k = parsed.k
    if (!k) return null
    return {
      candle: {
        time: Math.floor(k.t / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
      },
      isFinal: Boolean(k.x),
    }
  } catch {
    return null
  }
}
