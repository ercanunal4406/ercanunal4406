import { useEffect, useRef, useState } from 'react'
import {
  fetchKlines,
  klineStreamUrl,
  parseKlineMessage,
  type Candle,
  type Interval,
} from '../lib/binance'

export function useKlines(symbol: string, interval: Interval) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const candlesRef = useRef<Candle[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchKlines(symbol, interval)
      .then((data) => {
        if (cancelled) return
        candlesRef.current = data
        setCandles(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Fiyat verisi alınamadı')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [symbol, interval])

  useEffect(() => {
    const socket = new WebSocket(klineStreamUrl(symbol, interval))

    socket.onmessage = (event) => {
      const update = parseKlineMessage(event.data)
      if (!update) return

      const current = candlesRef.current
      const last = current[current.length - 1]
      let next: Candle[]

      if (last && last.time === update.candle.time) {
        next = [...current.slice(0, -1), update.candle]
      } else {
        next = [...current, update.candle]
      }

      candlesRef.current = next
      setCandles(next)
    }

    return () => socket.close()
  }, [symbol, interval])

  return { candles, loading, error }
}
