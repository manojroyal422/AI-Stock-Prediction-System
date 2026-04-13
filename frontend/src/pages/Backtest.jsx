import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { backtestApi } from '../services/api'
import Spinner from '../components/Spinner'
import clsx from 'clsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const STRATEGIES = [
  { id: 'rsi_oversold', label: 'RSI Oversold/Overbought', desc: 'Buy when RSI < 30, Sell when RSI > 70' },
  { id: 'macd_cross',   label: 'MACD Crossover',          desc: 'Buy on bullish MACD crossover, Sell on bearish' },
  { id: 'ema_cross',    label: 'EMA 9/21 Cross',          desc: 'Buy when EMA 9 crosses above EMA 21' },
]

function StatCard({ label, value, sub, positive }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={clsx('text-xl font-bold font-mono', positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-gray-100')}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Backtest() {
  const [symbol,    setSymbol]    = useState('RELIANCE.NS')
  const [strategy,  setStrategy]  = useState('rsi_oversold')
  const [startDate, setStartDate] = useState('2022-01-01')
  const [endDate,   setEndDate]   = useState('2024-12-31')
  const [capital,   setCapital]   = useState(100000)

  const { mutate, data, isPending, error } = useMutation({
    mutationFn: () => backtestApi.run({ symbol, strategy, start_date: startDate, end_date: endDate, initial_capital: Number(capital) }).then(r => r.data),
  })

  const returns_positive = data ? data.total_return >= 0 : null

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-100">Strategy Backtester</h1>

      {/* Config panel */}
      <div className="card grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="stat-label">Symbol</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 font-mono"
          />
        </div>
        <div>
          <label className="stat-label">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="stat-label">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="stat-label">Initial Capital (₹)</label>
          <input type="number" value={capital} onChange={e => setCapital(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Strategy selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STRATEGIES.map(s => (
          <button
            key={s.id}
            onClick={() => setStrategy(s.id)}
            className={clsx('p-4 rounded-xl border text-left transition-all',
              strategy === s.id
                ? 'border-indigo-500 bg-indigo-600/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            )}
          >
            <p className={clsx('text-sm font-semibold mb-1', strategy === s.id ? 'text-indigo-400' : 'text-gray-200')}>{s.label}</p>
            <p className="text-xs text-gray-500">{s.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => mutate()}
        disabled={isPending}
        className="btn-primary w-full md:w-auto px-8"
      >
        {isPending ? 'Running Backtest…' : '▶ Run Backtest'}
      </button>

      {isPending && <Spinner text="Simulating trades…" />}
      {error && <p className="text-red-400 text-sm">{error?.response?.data?.detail || 'Error running backtest'}</p>}

      {data && !isPending && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Total Return"   value={`${data.total_return >= 0 ? '+' : ''}${data.total_return}%`} positive={data.total_return >= 0} />
            <StatCard label="Final Equity"   value={`₹${data.final_equity?.toLocaleString('en-IN')}`} />
            <StatCard label="Total Trades"   value={data.total_trades} />
            <StatCard label="Win Rate"       value={`${data.win_rate}%`} positive={data.win_rate > 50} />
            <StatCard label="Max Drawdown"   value={`${data.max_drawdown}%`} positive={false} />
            <StatCard label="Strategy"       value={strategy.replace('_',' ')} />
            <StatCard label="Period"         value={`${startDate.slice(0,7)} → ${endDate.slice(0,7)}`} />
          </div>

          {/* Equity curve */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Equity Curve</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.equity_curve} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill:'#6b7280', fontSize:10 }} tickFormatter={d => d?.slice(2,7)} />
                <YAxis tick={{ fill:'#6b7280', fontSize:10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8, fontSize:11 }}
                  formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Equity']}
                />
                <ReferenceLine y={data.initial_capital} stroke="#374151" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="equity" stroke={returns_positive ? '#10b981' : '#ef4444'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trade log */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-300">Trade Log (last 50)</p>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="border-b border-gray-800">
                    {['Date','Action','Price','Shares','P&L'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.trades?.map((t, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono">{t.date}</td>
                      <td className="px-4 py-2">
                        <span className={clsx('text-xs font-medium', t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400')}>{t.action}</span>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-300">₹{t.price?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-300">{t.shares}</td>
                      <td className={clsx('px-4 py-2 text-xs font-mono', t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}₹${t.pnl?.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
