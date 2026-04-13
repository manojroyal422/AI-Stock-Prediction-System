import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal, Download } from 'lucide-react'
import { screenerApi } from '../services/api'
import Spinner from '../components/Spinner'
import clsx from 'clsx'

const PRESETS = [
  { id: null,          label: 'All Stocks'   },
  { id: 'hidden_gems', label: '💎 Hidden Gems' },
  { id: 'breakouts',   label: '🚀 Breakouts'   },
  { id: 'value',       label: '📊 Value Picks'  },
]

function RangeInput({ label, min, max, setMin, setMax, unit = '' }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input type="number" placeholder="Min" value={min}
          onChange={e => setMin(e.target.value || '')}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
        />
        <input type="number" placeholder="Max" value={max}
          onChange={e => setMax(e.target.value || '')}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-sm font-bold font-mono ${color}`}>{score}</span>
}

export default function Screener() {
  const navigate = useNavigate()
  const [preset, setPreset] = useState(null)
  const [minPE, setMinPE]   = useState('')
  const [maxPE, setMaxPE]   = useState('')
  const [minRSI, setMinRSI] = useState('')
  const [maxRSI, setMaxRSI] = useState('')
  const [minROE, setMinROE] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [params, setParams] = useState({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screener', params],
    queryFn:  () => screenerApi.screen(params).then(r => r.data),
    enabled:  false,
  })

  const handleRun = () => {
    const p = { preset: preset || undefined }
    if (minPE)  p.min_pe  = Number(minPE)
    if (maxPE)  p.max_pe  = Number(maxPE)
    if (minRSI) p.min_rsi = Number(minRSI)
    if (maxRSI) p.max_rsi = Number(maxRSI)
    if (minROE) p.min_roe = Number(minROE) / 100
    setParams(p)
    setTimeout(refetch, 50)
  }

  const exportCSV = () => {
    if (!data?.length) return
    const headers = ['Symbol','Name','Sector','Price','Change%','PE','ROE%','RSI','Score','Signal']
    const rows = data.map(s => [s.symbol,s.name,s.sector,s.price,s.change_pct,s.pe_ratio,s.roe,s.rsi,s.score,s.signal])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'screener.csv'; a.click()
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-100">Stock Screener</h1>
        <div className="flex gap-2">
          {data?.length > 0 && (
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-1.5">
              <Download size={15} /> Export CSV
            </button>
          )}
          <button onClick={() => setFiltersOpen(f => !f)} className="btn-ghost flex items-center gap-1.5">
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>
      </div>

      {/* Preset pills */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={String(p.id)}
            onClick={() => setPreset(p.id)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              preset === p.id
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50'
                : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
            )}
          >{p.label}</button>
        ))}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="card grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <RangeInput label="P/E Ratio"   min={minPE}  max={maxPE}  setMin={setMinPE}  setMax={setMaxPE} />
          <RangeInput label="RSI"         min={minRSI} max={maxRSI} setMin={setMinRSI} setMax={setMaxRSI} />
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Min ROE (%)</label>
            <input type="number" placeholder="e.g. 15" value={minROE} onChange={e => setMinROE(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end">
            <button onClick={handleRun} className="btn-primary w-full">
              {isLoading ? 'Scanning…' : 'Run Screener'}
            </button>
          </div>
        </div>
      )}

      {/* Results table */}
      {isLoading && <Spinner text="Scanning universe…" />}

      {data && !isLoading && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm text-gray-400">{data.length} stocks found</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Symbol','Name','Sector','Price','Change','P/E','ROE%','RSI','Score','Signal'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(s => (
                  <tr
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-indigo-400 font-medium whitespace-nowrap">{s.symbol?.replace('.NS','')}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.sector}</td>
                    <td className="px-4 py-3 font-mono text-gray-100 whitespace-nowrap">₹{s.price?.toFixed(2)}</td>
                    <td className={clsx('px-4 py-3 font-mono whitespace-nowrap', (s.change_pct||0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {(s.change_pct||0) >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{s.pe_ratio || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{s.roe || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{s.rsi?.toFixed(1)}</td>
                    <td className="px-4 py-3"><ScoreBadge score={s.score} /></td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded',
                        s.signal === 'BUY' ? 'bg-emerald-900/50 text-emerald-400' :
                        s.signal === 'SELL' ? 'bg-red-900/50 text-red-400' :
                        'bg-gray-800 text-gray-400'
                      )}>{s.signal}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 text-sm">Set your filters above and click <strong className="text-gray-300">Run Screener</strong></p>
        </div>
      )}
    </div>
  )
}
