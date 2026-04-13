import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { optionsApi, stockApi } from '../services/api'
import Spinner from '../components/Spinner'
import clsx from 'clsx'

export default function Options() {
  const [symbol, setSymbol] = useState('NIFTY')
  const [input,  setInput]  = useState('NIFTY')

  const { data, isLoading, error } = useQuery({
    queryKey: ['options', symbol],
    queryFn:  () => optionsApi.chain(symbol + '.NS').then(r => r.data).catch(() => optionsApi.chain(symbol).then(r => r.data)),
    enabled:  !!symbol,
  })

  const { data: pcr } = useQuery({
    queryKey: ['pcr', symbol],
    queryFn:  () => optionsApi.pcr(symbol + '.NS').then(r => r.data),
    enabled:  !!symbol,
  })

  const spot = data?.spot_price || 0
  const calls = (data?.calls || []).filter(c => c.strike).slice(0, 20)
  const puts  = (data?.puts  || []).filter(p => p.strike).slice(0, 20)

  const maxCallOI = Math.max(...calls.map(c => c.oi || 0), 1)
  const maxPutOI  = Math.max(...puts.map(p  => p.oi || 0), 1)

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-gray-100">Options Chain</h1>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="RELIANCE / NIFTY"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 w-40 font-mono"
          />
          <button onClick={() => setSymbol(input)} className="btn-primary px-4">Load</button>
        </div>

        {pcr && (
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-center">
              <p className="text-xs text-gray-500">PCR</p>
              <p className="text-lg font-bold font-mono text-gray-100">{pcr.pcr}</p>
            </div>
            <span className={clsx('badge-blue text-sm font-semibold',
              pcr.signal==='BEARISH'?'badge-red':pcr.signal==='BULLISH'?'badge-green':''
            )}>{pcr.signal}</span>
          </div>
        )}
      </div>

      {data?.expiry && (
        <div className="flex gap-3 flex-wrap">
          <span className="text-xs text-gray-500">Expiry: <strong className="text-gray-300">{data.expiry}</strong></span>
          <span className="text-xs text-gray-500">Spot: <strong className="text-gray-100 font-mono">₹{spot?.toLocaleString('en-IN')}</strong></span>
          {data.all_expiries && <span className="text-xs text-gray-600">All expiries: {data.all_expiries.join(' · ')}</span>}
        </div>
      )}

      {isLoading ? <Spinner text="Loading options chain…" /> : error ? (
        <div className="card text-center py-12 text-gray-500 text-sm">Options data unavailable for this symbol</div>
      ) : data ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th colSpan={5} className="py-2 text-center text-emerald-400 font-semibold bg-emerald-900/10">CALLS (CE)</th>
                <th className="py-2 text-center text-gray-400 font-bold bg-gray-800">STRIKE</th>
                <th colSpan={5} className="py-2 text-center text-red-400 font-semibold bg-red-900/10">PUTS (PE)</th>
              </tr>
              <tr className="border-b border-gray-800 text-gray-500">
                {['OI Bar','OI','Vol','LTP','Chg%',null,'Chg%','LTP','Vol','OI','OI Bar'].map((h,i) => (
                  <th key={i} className={clsx('px-2 py-2 text-center font-medium whitespace-nowrap',
                    i === 5 ? 'bg-gray-800 text-gray-300' : i < 5 ? 'bg-emerald-900/5' : 'bg-red-900/5'
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => {
                const put = puts.find(p => p.strike === call.strike) || {}
                const atm = Math.abs(call.strike - spot) < spot * 0.005
                return (
                  <tr key={i} className={clsx('border-b border-gray-800/30 hover:bg-gray-800/20',
                    atm && 'bg-indigo-900/20 border-indigo-800/50'
                  )}>
                    {/* Call OI bar */}
                    <td className="px-2 py-1.5 bg-emerald-900/5">
                      <div className="flex justify-end">
                        <div className="h-2 bg-emerald-600/50 rounded-sm" style={{width:`${((call.oi||0)/maxCallOI)*80}px`}} />
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-300 bg-emerald-900/5">{((call.oi||0)/1000).toFixed(1)}k</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-400 bg-emerald-900/5">{((call.volume||0)/1000).toFixed(1)}k</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-100 bg-emerald-900/5 font-medium">₹{call.ltp?.toFixed(2)}</td>
                    <td className={clsx('px-2 py-1.5 text-right font-mono bg-emerald-900/5',
                      (call.change_pct||0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>{(call.change_pct||0).toFixed(1)}%</td>
                    {/* Strike */}
                    <td className={clsx('px-3 py-1.5 text-center font-mono font-bold bg-gray-800',
                      atm ? 'text-indigo-300' : 'text-gray-200'
                    )}>{call.strike?.toLocaleString('en-IN')}</td>
                    {/* Put */}
                    <td className={clsx('px-2 py-1.5 text-left font-mono bg-red-900/5',
                      (put.change_pct||0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>{(put.change_pct||0).toFixed(1)}%</td>
                    <td className="px-2 py-1.5 text-left font-mono text-gray-100 bg-red-900/5 font-medium">₹{put.ltp?.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-left font-mono text-gray-400 bg-red-900/5">{((put.volume||0)/1000).toFixed(1)}k</td>
                    <td className="px-2 py-1.5 text-left font-mono text-gray-300 bg-red-900/5">{((put.oi||0)/1000).toFixed(1)}k</td>
                    {/* Put OI bar */}
                    <td className="px-2 py-1.5 bg-red-900/5">
                      <div className="h-2 bg-red-600/50 rounded-sm" style={{width:`${((put.oi||0)/maxPutOI)*80}px`}} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-500 text-sm">Enter a symbol and click Load to view options chain</div>
      )}
    </div>
  )
}
