import { useEffect, useRef } from 'react'

export default function TradingViewChart({ symbol, height = 420 }) {
  const containerRef = useRef(null)
  const widgetRef    = useRef(null)

  // Convert NS/BO suffix to TradingView exchange prefix
  const tvSymbol = symbol.endsWith('.NS')
    ? `NSE:${symbol.replace('.NS', '')}`
    : symbol.endsWith('.BO')
    ? `BSE:${symbol.replace('.BO', '')}`
    : symbol

  useEffect(() => {
    if (!containerRef.current || typeof window.TradingView === 'undefined') return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    widgetRef.current = new window.TradingView.widget({
      container_id: containerRef.current.id,
      symbol:       tvSymbol,
      interval:     'D',
      timezone:     'Asia/Kolkata',
      theme:        'dark',
      style:        '1',
      locale:       'en',
      toolbar_bg:   '#111827',
      enable_publishing: false,
      allow_symbol_change: false,
      save_image:   false,
      height:       height,
      width:        '100%',
      studies:      ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
      show_popup_button: false,
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [tvSymbol])

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
      <div id={`tv_chart_${symbol}`} ref={containerRef} style={{ height }} />
    </div>
  )
}
