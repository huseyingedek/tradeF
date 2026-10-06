import { useEffect, useRef } from 'react'
import { CandlestickSeries, HistogramSeries, createChart, CrosshairMode } from 'lightweight-charts'
import { marketService } from '../../api/services'
import { realtime } from '../../api/realtime'
import { useApp } from '../../context/AppContext'

const TZ = -new Date().getTimezoneOffset() * 60 // grafiği yerel saatte göstermek için kaydırma
const UP = '#1bd084'
const DOWN = '#f6465d'

/**
 * Mum grafiği (TradingView lightweight-charts).
 * lines: [{ price, color, title, style }] – giriş / SL / TP / emir seviyeleri
 */
export default function PriceChart({ symbol, interval = '1h', height = 440, lines = [], precision = 2 }) {
  const box = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const linesRef = useRef([])
  const { theme } = useApp()

  // grafik oluştur / tema değişince yeniden oluştur
  useEffect(() => {
    const dark = theme === 'dark'
    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: dark ? '#9a98ab' : '#7e7e8f', fontFamily: 'Poppins, sans-serif', attributionLogo: true },
      grid: { vertLines: { color: dark ? '#26242f' : '#f0eff5' }, horzLines: { color: dark ? '#26242f' : '#f0eff5' } },
      rightPriceScale: { borderColor: dark ? '#2f2d3b' : '#ececf3' },
      timeScale: { borderColor: dark ? '#2f2d3b' : '#ececf3', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: 'tr-TR' },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP, downColor: DOWN, borderVisible: false, wickUpColor: UP, wickDownColor: DOWN,
      priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision },
    })
    const volume = chart.addSeries(HistogramSeries, { priceScaleId: '', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false })
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    chartRef.current = chart
    seriesRef.current = { series, volume }
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      linesRef.current = []
    }
  }, [theme, precision])

  // veri yükle + canlı güncelle
  useEffect(() => {
    let alive = true
    const toBar = (b) => ({ time: b.time + TZ, open: b.open, high: b.high, low: b.low, close: b.close })
    const toVol = (b) => ({ time: b.time + TZ, value: b.volume, color: b.close >= b.open ? 'rgba(27,208,132,0.35)' : 'rgba(246,70,93,0.35)' })
    marketService.candles(symbol, interval, 300).then((bars) => {
      if (!alive || !seriesRef.current) return
      seriesRef.current.series.setData(bars.map(toBar))
      seriesRef.current.volume.setData(bars.map(toVol))
      chartRef.current?.timeScale().fitContent()
    })
    const off = realtime.subscribe(`candles:${symbol}:${interval}`, (bar) => {
      if (!alive || !seriesRef.current) return
      try {
        seriesRef.current.series.update(toBar(bar))
        seriesRef.current.volume.update(toVol(bar))
      } catch {
        /* veri henüz yüklenmedi */
      }
    })
    return () => {
      alive = false
      off()
    }
  }, [symbol, interval, theme, precision])

  // fiyat çizgileri
  const linesKey = JSON.stringify(lines)
  useEffect(() => {
    const s = seriesRef.current?.series
    if (!s) return
    linesRef.current.forEach((l) => s.removePriceLine(l))
    linesRef.current = lines.filter((l) => l.price).map((l) => s.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: l.style ?? 2, axisLabelVisible: true, title: l.title }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, theme, symbol])

  return <div ref={box} style={{ height, width: '100%' }} />
}
