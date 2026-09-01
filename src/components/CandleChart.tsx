import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { Candle } from '../lib/binance'

export function CandleChart({ candles, loading, error }: { candles: Candle[]; loading: boolean; error: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0b0f' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1c23' },
        horzLines: { color: '#1a1c23' },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#27272a' },
      rightPriceScale: { borderColor: '#27272a' },
      width: containerRef.current.clientWidth,
      height: 360,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#fb7185',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#fb7185',
    })

    chartRef.current = chart
    seriesRef.current = series

    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return
    seriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as unknown as never,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    )
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  return (
    <div className="relative border border-neutral-800 bg-neutral-950 p-4">
      <div ref={containerRef} className="w-full" />
      {loading && candles.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-neutral-600">
          Grafik yükleniyor…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/90 px-6 text-center text-xs text-rose-400">
          Fiyat verisine ulaşılamadı: {error}
          <br />
          (Bu ortamda dış ağ erişimi kısıtlı olabilir — kendi bilgisayarınızda çalıştırdığınızda Binance API'sine doğrudan bağlanır.)
        </div>
      )}
    </div>
  )
}
