import { useEffect, useRef, useState } from 'react'
import { parseTickerMessage, tickerStreamUrl, WATCHED_SYMBOLS } from '../lib/binance'
import type { TickerUpdate } from '../lib/binance'

export type ConnectionStatus = 'connecting' | 'open' | 'error' | 'closed'

const RECONNECT_DELAY_MS = 4000

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, TickerUpdate>>({})
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const reconnectTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let socket: WebSocket | null = null
    let cancelled = false

    function connect() {
      setStatus('connecting')
      socket = new WebSocket(tickerStreamUrl(WATCHED_SYMBOLS))

      socket.onopen = () => {
        if (!cancelled) setStatus('open')
      }

      socket.onmessage = (event) => {
        const update = parseTickerMessage(event.data)
        if (!update) return
        setPrices((prev) => ({ ...prev, [update.symbol]: update }))
      }

      socket.onerror = () => {
        if (!cancelled) setStatus('error')
      }

      socket.onclose = () => {
        if (cancelled) return
        setStatus('closed')
        reconnectTimer.current = window.setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      cancelled = true
      window.clearTimeout(reconnectTimer.current)
      socket?.close()
    }
  }, [])

  return { prices, status }
}
