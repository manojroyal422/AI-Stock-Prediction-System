import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Star, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { stockApi, analysisApi, predictApi, newsApi } from '../services/api'
import Chart from '../components/Chart'
import ScoreMeter from '../components/ScoreMeter'
import SentimentBadge from '../components/SentimentBadge'
import MiniChart from '../components/MiniChart'
import Spinner from '../components/Spinner'
import { useStore } from '../store'
import clsx from 'clsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'

const TABS = ['Overview', 'Technical', 'Fundamentals', 'News', 'Prediction']

function Metric({ label, value, suffix = '', highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={clsx('text-sm font-medium font-mono', highlight ? 'text-indigo-400' : 'text-gray-200')}>
        {value !== null && value !== undefined ? `${value}${suffix}` : '—'}
      </span>
    </div>
  )
}

function SignalBadge({ signal }) {
  const cfg = {
    BUY:     'badge-green',
    SELL:    'badge-red',
    NEUTRAL: 'badge-blue',
    STRONG:  'badge-green',
    WEAK:    'badge-yellow',
  }
  return <span className={cfg[signal] || 'badge-blue'}>{signal}</span>
}

function TrendArrow({ dir }) {
  if (dir === 'BULLISH') return <TrendingUp size={14} className="text-emerald-400" />
  if (dir === 'BEARISH') return <TrendingDown size={14} className="text-red-400" />
  return <Minus size={14} className="text-gray-500" />
}

export default function StockDetail() {
  const { sym } = useParams()
  const symbol  = sym.toUpperCase()
  const [tab, setTab] = useState('Overview')
  const [period, setPeriod] = useState('1y')
  const { addToWatchlist, removeFromWatchlist, isWatched } = useStore()
  const watched = isWatched(symbol)

  const { data: quote }   = useQuery({ queryKey: ['quote', symbol], queryFn: () => stockApi.quote(symbol).then(r=>r.data), refetchInterval: 15_000 })
  const { data: history } = useQuery({ queryKey: ['history', symbol, period], queryFn: () => stockApi.history(symbol, period, '1d').then(r=>r.data) })
  const { data: analysis, isLoading: aLoading } = useQuery({ queryKey: ['analysis', symbol], queryFn: () => analysisApi.full(symbol).then(r=>r.data) })
  const { data: fund }    = useQuery({ queryKey: ['fund', symbol], queryFn: () => stockApi.fundamentals(symbol).then(r=>r.data) })
  const { data: news }    = useQuery({ queryKey: ['news', symbol], queryFn: () => newsApi.forStock(symbol).then(r=>r.data), enabled: tab === 'News' })
  const { data: forecast, isLoading: fLoading } = useQuery({ queryKey: ['forecast', symbol], queryFn: () => predictApi.forecast(symbol, 7).then(r=>r.data), enabled: tab === 'Prediction' })
  const { data: direction } = useQuery({ queryKey: ['direction', symbol], queryFn: () => predictApi.direction(symbol).then(r=>r.data), enabled: tab === 'Prediction' })

  const pos = (quote?.change_pct || 0) >= 0

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-100">{symbol.replace('.NS','').replace('.BO','')}</h1>
            <button
              onClick={() => watched ? removeFromWatchlist(symbol) : addToWatchlist(symbol)}
              className={clsx('p-1.5 rounded-lg transition-colors', watched ? 'text-amber-400 bg-amber-900/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800')}
            >
              <Star size={16} fill={watched ? 'currentColor' : 'none'} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{fund?.name || symbol}</p>
          {fund?.sector && <span className="badge-blue mt-1 inline-block">{fund.sector}</span>}
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold font-mono text-gray-100">
            ₹{quote?.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}
          </p>
          <p className={clsx('text-sm font-medium', pos ? 'text-emerald-400' : 'text-red-400')}>
            {pos ? '+' : ''}{quote?.change?.toFixed(2)} ({pos ? '+' : ''}{quote?.change_pct?.toFixed(2)}%)
          </p>
          <p className="text-xs text-gray-600 mt-0.5">NSE · Live</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Chart — takes 2/3 */}
        <div className="xl:col-span-2 space-y-3">
          {/* Period selector */}
          <div className="flex gap-1">
            {['1mo','3mo','6mo','1y','2y','5y'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx('px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                  period === p ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                )}
              >{p}</button>
            ))}
          </div>
          <Chart symbol={symbol} height={420} />
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Score */}
          <div className="card flex flex-col items-center py-5">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Stock Score</p>
            <ScoreMeter score={analysis?.score || 50} />
          </div>

          {/* Trend */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trend</p>
            {['short_term','medium_term','long_term'].map(k => (
              <div key={k} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-400 capitalize">{k.replace('_',' ')}</span>
                <div className="flex items-center gap-1.5">
                  <TrendArrow dir={analysis?.technical?.trend?.[k]} />
                  <span className={clsx('text-xs font-medium',
                    analysis?.technical?.trend?.[k] === 'BULLISH' ? 'text-emerald-400' :
                    analysis?.technical?.trend?.[k] === 'BEARISH' ? 'text-red-400' : 'text-gray-500'
                  )}>
                    {analysis?.technical?.trend?.[k] || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Risk */}
          <div className="card">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Risk Meter</p>
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-400" />
              <div>
                <p className="text-sm font-medium text-gray-100">
                  ATR: {analysis?.technical?.indicators?.atr || '—'}
                </p>
                <p className="text-xs text-gray-500">Beta: {fund?.beta?.toFixed(2) || '—'}</p>
              </div>
            </div>
          </div>

          {/* Quick metrics */}
          <div className="card">
            <Metric label="P/E Ratio"    value={fund?.pe_ratio?.toFixed(1)} />
            <Metric label="ROE"          value={fund?.roe ? (fund.roe*100).toFixed(1) : null} suffix="%" />
            <Metric label="Market Cap"   value={fund?.market_cap ? `₹${(fund.market_cap/1e7).toFixed(0)}Cr` : null} />
            <Metric label="52W High"     value={fund?.['52_week_high']?.toFixed(2)} suffix="" highlight />
            <Metric label="52W Low"      value={fund?.['52_week_low']?.toFixed(2)} />
            <Metric label="Div. Yield"   value={fund?.dividend_yield ? (fund.dividend_yield*100).toFixed(2) : null} suffix="%" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="flex gap-0 border-b border-gray-800 px-4 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx('px-4 py-3 text-sm font-medium shrink-0 transition-colors border-b-2',
                tab === t
                  ? 'text-indigo-400 border-indigo-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              )}
            >{t}</button>
          ))}
        </div>

        <div className="p-4">
          {/* Overview Tab */}
          {tab === 'Overview' && (
            <div className="space-y-4">
              {fund?.description && (
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{fund.description}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['P/B Ratio',   fund?.pb_ratio?.toFixed(2)],
                  ['Debt/Equity', fund?.debt_to_equity?.toFixed(2)],
                  ['Current Ratio', fund?.current_ratio?.toFixed(2)],
                  ['Profit Margin', fund?.profit_margins ? (fund.profit_margins*100).toFixed(1)+'%' : null],
                  ['Revenue Growth', fund?.revenue_growth ? (fund.revenue_growth*100).toFixed(1)+'%' : null],
                  ['Earnings Growth', fund?.earnings_growth ? (fund.earnings_growth*100).toFixed(1)+'%' : null],
                  ['EPS',          fund?.eps?.toFixed(2)],
                  ['Employees',    fund?.employees?.toLocaleString('en-IN')],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{l}</p>
                    <p className="text-sm font-semibold text-gray-100 font-mono">{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Tab */}
          {tab === 'Technical' && (
            aLoading ? <Spinner /> : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(analysis?.technical?.signals || {}).filter(([k]) => k !== 'composite_score' && k !== 'overall').map(([k, v]) => (
                    <div key={k} className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase mb-2">{k.replace('_',' ')}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-200">{v?.value}</span>
                        <SignalBadge signal={v?.signal} />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{v?.reason}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-3">Moving Averages</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[['EMA 9', analysis?.technical?.indicators?.ema_9], ['EMA 21', analysis?.technical?.indicators?.ema_21], ['EMA 50', analysis?.technical?.indicators?.ema_50], ['EMA 200', analysis?.technical?.indicators?.ema_200]].map(([l,v]) => (
                      <div key={l} className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{l}</p>
                        <p className="text-sm font-mono font-medium text-indigo-400">₹{v?.toFixed(2) || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {(analysis?.patterns?.length > 0) && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-3">Chart Patterns</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.patterns.map((p, i) => (
                        <div key={i} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border',
                          p.type === 'BULLISH' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
                          p.type === 'BEARISH' ? 'bg-red-900/30 text-red-400 border-red-800/50' :
                          'bg-gray-800 text-gray-400 border-gray-700'
                        )}>
                          {p.name} · {p.strength}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Fundamentals Tab */}
          {tab === 'Fundamentals' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Historical financial data (in ₹ Cr)</p>
              <div className="h-48 bg-gray-800/30 rounded-lg flex items-center justify-center">
                <p className="text-xs text-gray-600">Revenue chart — connects to /api/v1/stocks/:sym/financials</p>
              </div>
            </div>
          )}

          {/* News Tab */}
          {tab === 'News' && (
            <div className="space-y-3">
              {!news ? <Spinner /> : news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="block card-sm hover:border-gray-600 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 group-hover:text-indigo-400 transition-colors line-clamp-2">{n.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-600">{n.source}</span>
                        <span className="text-xs text-gray-700">·</span>
                        <span className="text-xs text-gray-600">{n.published_at?.slice(0,10)}</span>
                        {n.sentiment && <SentimentBadge label={n.sentiment.label} />}
                      </div>
                    </div>
                    {n.image && <img src={n.image} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0 opacity-70" />}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Prediction Tab */}
          {tab === 'Prediction' && (
            <div className="space-y-5">
              {direction && (
                <div className="card bg-gray-800/50">
                  <p className="text-xs text-gray-500 uppercase mb-3">Tomorrow's Direction</p>
                  <div className="flex items-center gap-4">
                    <div className={clsx('text-3xl font-bold', direction.direction === 'UP' ? 'text-emerald-400' : 'text-red-400')}>
                      {direction.direction === 'UP' ? '▲ UP' : '▼ DOWN'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Confidence: <span className="font-semibold text-indigo-400">{(direction.confidence*100).toFixed(1)}%</span></p>
                      <p className="text-xs text-gray-500">Model: {direction.model}</p>
                    </div>
                  </div>
                </div>
              )}

              {fLoading ? <Spinner text="Running LSTM forecast…" /> : forecast && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-3">7-Day Price Forecast</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={forecast.forecast}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis domain={['auto','auto']} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background:'#1f2937', border:'1px solid #374151', borderRadius:8, fontSize:12 }} />
                      <ReferenceLine y={forecast.current_price} stroke="#374151" strokeDasharray="4 4" label={{ value:'Now', fill:'#6b7280', fontSize:10 }} />
                      <Area type="monotone" dataKey="price" stroke="#6366f1" fill="url(#grad)" strokeWidth={2} dot={{ r:3, fill:'#6366f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className={clsx('text-sm font-medium mt-2', forecast.predicted_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    Predicted 7-day: {forecast.predicted_change_pct >= 0 ? '+' : ''}{forecast.predicted_change_pct}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
