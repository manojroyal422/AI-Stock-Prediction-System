import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { stockApi, analysisApi } from '../services/api'
import MiniChart from '../components/MiniChart'
import SearchBar from '../components/SearchBar'
import Spinner from '../components/Spinner'
import clsx from 'clsx'

const METRICS = [
  { key: 'pe_ratio',        label: 'P/E Ratio',      higher: false },
  { key: 'pb_ratio',        label: 'P/B Ratio',      higher: false },
  { key: 'roe',             label: 'ROE (%)',         higher: true,  pct: true  },
  { key: 'debt_to_equity',  label: 'Debt/Equity',    higher: false },
  { key: 'profit_margins',  label: 'Net Margin (%)', higher: true,  pct: true  },
  { key: 'revenue_growth',  label: 'Revenue Growth', higher: true,  pct: true  },
  { key: 'beta',            label: 'Beta',            higher: false },
  { key: 'dividend_yield',  label: 'Dividend Yield', higher: true,  pct: true  },
]

function useStockData(symbols) {
  return useQuery({
    queryKey: ['compare', symbols],
    queryFn: async () => {
      const results = await Promise.all(symbols.map(async sym => {
        const [fund, tech, hist] = await Promise.all([
          stockApi.fundamentals(sym).then(r => r.data).catch(() => null),
          analysisApi.score(sym).then(r => r.data).catch(() => null),
          stockApi.history(sym, '3mo', '1d').then(r => r.data).catch(() => []),
        ])
        return { symbol: sym, fund, tech, hist }
      }))
      return results
    },
    enabled: symbols.length > 0,
  })
}

export default function Comparison() {
  const [symbols, setSymbols] = useState(['RELIANCE.NS', 'TCS.NS'])
  const { data, isLoading } = useStockData(symbols)

  const addSymbol = sym => {
    if (symbols.length < 3 && !symbols.includes(sym)) {
      setSymbols(s => [...s, sym])
    }
  }
  const removeSymbol = sym => setSymbols(s => s.filter(x => x !== sym))

  const getBest = (key, higherIsBetter) => {
    if (!data) return null
    const values = data.map(d => ({ sym: d.symbol, v: d.fund?.[key] })).filter(x => x.v != null)
    if (!values.length) return null
    return higherIsBetter
      ? values.reduce((a, b) => a.v > b.v ? a : b).sym
      : values.reduce((a, b) => a.v < b.v ? a : b).sym
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b']

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-100">Stock Comparison</h1>
        {symbols.length < 3 && (
          <div className="w-64">
            <SearchBar onSelect={addSymbol} />
          </div>
        )}
      </div>

      {/* Symbol chips */}
      <div className="flex flex-wrap gap-2">
        {symbols.map((sym, i) => (
          <div key={sym} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
            <span className="text-sm font-mono font-medium text-gray-200">{sym.replace('.NS','')}</span>
            <button onClick={() => removeSymbol(sym)} className="text-gray-600 hover:text-gray-400 ml-1">
              <X size={13} />
            </button>
          </div>
        ))}
        {symbols.length < 3 && (
          <div className="flex items-center gap-1 px-3 py-1.5 text-gray-600 text-sm">
            <Plus size={14} /> Add stock
          </div>
        )}
      </div>

      {isLoading && <Spinner text="Fetching comparison data…" />}

      {data && !isLoading && (
        <>
          {/* Price charts */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">3-Month Price (Normalised to 100)</p>
            <div className="h-48">
              <MiniChart
                data={data[0]?.hist || []}
                color={COLORS[0]}
              />
            </div>
          </div>

          {/* Score comparison */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
            {data.map((d, i) => (
              <div key={d.symbol} className="card text-center">
                <p className="text-xs font-mono text-gray-500 mb-1">{d.symbol.replace('.NS','')}</p>
                <p className="text-3xl font-bold" style={{ color: COLORS[i] }}>{d.tech?.score || '—'}</p>
                <p className="text-xs text-gray-600 mt-1">Composite Score</p>
                <p className="text-sm font-medium text-gray-300 mt-2">
                  ₹{d.fund?.market_cap ? `${(d.fund.market_cap/1e7).toFixed(0)} Cr` : '—'}
                </p>
                <p className="text-xs text-gray-500">Market Cap</p>
              </div>
            ))}
          </div>

          {/* Metrics table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Metric</th>
                    {data.map((d, i) => (
                      <th key={d.symbol} className="px-4 py-3 text-center text-xs font-medium whitespace-nowrap" style={{ color: COLORS[i] }}>
                        {d.symbol.replace('.NS','')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(({ key, label, higher, pct }) => {
                    const best = getBest(key, higher)
                    return (
                      <tr key={key} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{label}</td>
                        {data.map(d => {
                          const raw = d.fund?.[key]
                          const val = raw != null ? (pct ? (raw * 100).toFixed(2) + '%' : raw.toFixed(2)) : '—'
                          const isBest = d.symbol === best
                          return (
                            <td key={d.symbol} className={clsx('px-4 py-3 text-center font-mono text-sm',
                              isBest ? 'text-emerald-400 font-semibold' : 'text-gray-300'
                            )}>
                              {val}
                              {isBest && raw != null && <span className="ml-1 text-xs">★</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
