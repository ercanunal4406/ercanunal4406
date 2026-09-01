import { AreaSeries, ColorType, createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { EquityPoint } from '../types'

export function EquityCurve({ points }: { points: EquityPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

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
      height: 220,
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#60a5fa',
      topColor: 'rgba(96, 165, 250, 0.35)',
      bottomColor: 'rgba(96, 165, 250, 0)',
      lineWidth: 2,
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
    if (!seriesRef.current) return
    if (points.length === 0) {
      seriesRef.current.setData([])
      return
    }
    seriesRef.current.setData(
      points.map((p) => ({ time: p.time as unknown as never, value: p.equity })),
    )
    chartRef.current?.timeScale().fitContent()
  }, [points])

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-2 text-xs tracking-widest text-neutral-500">EQUITY EĞRİSİ (KÜMÜLATİF PnL)</div>
      <div ref={containerRef} className="w-full" />
      {points.length === 0 && (
        <p className="mt-2 text-xs text-neutral-600">Kapanmış işlem eklendikçe burada birikimli PnL eğrisi oluşacak.</p>
      )}
    </div>
  )
}
