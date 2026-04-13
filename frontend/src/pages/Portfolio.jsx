import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioApi } from '../services/api'
import { Plus, TrendingUp, TrendingDown, Trash2, PieChart } from 'lucide-react'
import Spinner from '../components/Spinner'
import clsx from 'clsx'
import { PieChart as RPie, Pie, Cell, Tooltip, ResponsiveContainer,
         LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

function TradeForm({ portfolioId, onDone }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ symbol:'RELIANCE.NS', action:'BUY', quantity:'10', price:'', trade_date: new Date().toISOString().slice(0,10) })
  const { mutate, isPending } = useMutation({
    mutationFn: () => portfolioApi.addTrade(portfolioId, {
      ...form, quantity: Number(form.quantity), price: Number(form.price),
      trade_date: new Date(form.trade_date).toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries(['holdings']); qc.invalidateQueries(['trades']); onDone() },
  })

  return (
    <div className="card space-y-3">
      <h3 className="text-sm font-semibold text-gray-200">Add Trade</h3>
      <div className="grid grid-cols-2 gap-3">
        {[['symbol','Symbol'],['price','Price ₹'],['quantity','Quantity'],['trade_date','Date']].map(([k,l]) => (
          <div key={k}>
            <label className="stat-label">{l}</label>
            <input value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))}
              type={k==='trade_date'?'date':k==='price'||k==='quantity'?'number':'text'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {['BUY','SELL'].map(a => (
          <button key={a} onClick={() => setForm(f=>({...f,action:a}))}
            className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              form.action===a ? (a==='BUY'?'bg-emerald-600 text-white':'bg-red-600 text-white') : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}>{a}</button>
        ))}
      </div>
      <button onClick={() => mutate()} disabled={isPending || !form.price} className="btn-primary w-full">
        {isPending ? 'Adding…' : `Add ${form.action} Trade`}
      </button>
    </div>
  )
}

export default function Portfolio() {
  const [selectedPf, setSelectedPf] = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [tab, setTab] = useState('holdings')
  const qc = useQueryClient()

  const { data: portfolios, isLoading: pfLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn:  () => portfolioApi.list().then(r => r.data),
  })

  const activePf = selectedPf || portfolios?.[0]?.id

  const { data: holdings } = useQuery({
    queryKey: ['holdings', activePf],
    queryFn:  () => portfolioApi.holdings(activePf).then(r => r.data),
    enabled:  !!activePf,
  })

  const { data: trades } = useQuery({
    queryKey: ['trades', activePf],
    queryFn:  () => portfolioApi.trades(activePf).then(r => r.data),
    enabled:  !!activePf && tab === 'trades',
  })

  const { data: snapshots } = useQuery({
    queryKey: ['snapshots', activePf],
    queryFn:  () => portfolioApi.snapshots(activePf).then(r => r.data),
    enabled:  !!activePf && tab === 'pnl',
  })

  const createPf = useMutation({
    mutationFn: () => portfolioApi.create({ name: 'My Portfolio' }),
    onSuccess:  () => qc.invalidateQueries(['portfolios']),
  })

  const summary = holdings?.summary || {}
  const holdingsList = holdings?.holdings || []
  const totalPnlPos  = (summary.total_pnl || 0) >= 0

  if (pfLoading) return <Spinner text="Loading portfolios…" />

  if (!portfolios?.length) return (
    <div className="p-6 flex flex-col items-center justify-center py-24 space-y-4">
      <PieChart size={40} className="text-gray-600" />
      <p className="text-gray-400 text-sm">No portfolio yet</p>
      <button onClick={() => createPf.mutate()} className="btn-primary">Create Portfolio</button>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-100">Portfolio</h1>
        <div className="flex gap-2">
          {portfolios.map(pf => (
            <button key={pf.id} onClick={() => setSelectedPf(pf.id)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                activePf === pf.id ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'text-gray-400 border-gray-700 hover:border-gray-600'
              )}>{pf.name}</button>
          ))}
          <button onClick={() => setShowForm(f => !f)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Add Trade
          </button>
        </div>
      </div>

      {showForm && <TradeForm portfolioId={activePf} onDone={() => setShowForm(false)} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Invested',    `₹${(summary.total_invested||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, null],
          ['Current Value',`₹${(summary.total_value||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, null],
          ['Total P&L',   `${totalPnlPos?'+':''}₹${(summary.total_pnl||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, totalPnlPos],
          ['Returns',     `${totalPnlPos?'+':''}${(summary.total_pnl_pct||0).toFixed(2)}%`, totalPnlPos],
        ].map(([label, val, pos]) => (
          <div key={label} className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={clsx('text-lg font-bold font-mono',
              pos === true ? 'text-emerald-400' : pos === false ? 'text-red-400' : 'text-gray-100'
            )}>{val || '₹0'}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800">
        {[['holdings','Holdings'],['pnl','P&L Chart'],['trades','Trade Log'],['allocation','Allocation']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('pb-3 text-sm font-medium transition-colors border-b-2',
              tab===t ? 'text-indigo-400 border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-300'
            )}>{l}</button>
        ))}
      </div>

      {/* Holdings tab */}
      {tab === 'holdings' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {['Stock','Qty','Avg Buy','Current','Value','P&L','Day','Wt%'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {holdingsList.map(h => (
                  <tr key={h.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-indigo-400 font-medium whitespace-nowrap">{h.symbol.replace('.NS','')}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{h.quantity}</td>
                    <td className="px-4 py-3 font-mono text-gray-400">₹{h.avg_buy_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-gray-100">₹{h.current_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-gray-200">₹{h.current_value?.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td className={clsx('px-4 py-3 font-mono font-medium', h.pnl>=0?'text-emerald-400':'text-red-400')}>
                      {h.pnl>=0?'+':''}₹{h.pnl?.toFixed(0)} ({h.pnl_pct>=0?'+':''}{h.pnl_pct?.toFixed(2)}%)
                    </td>
                    <td className={clsx('px-4 py-3 font-mono text-xs', h.day_change_pct>=0?'text-emerald-400':'text-red-400')}>
                      {h.day_change_pct>=0?'+':''}{h.day_change_pct?.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.weight_pct?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P&L Chart tab */}
      {tab === 'pnl' && snapshots && (
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Portfolio Value over Time</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:10}} tickFormatter={d=>d?.slice(5,10)} />
              <YAxis tick={{fill:'#6b7280',fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{background:'#111827',border:'1px solid #374151',borderRadius:8,fontSize:11}}
                formatter={(v,n)=>[`₹${Number(v).toLocaleString('en-IN')}`, n==='total_value'?'Value':'Invested']} />
              <Line type="monotone" dataKey="total_value" stroke="#6366f1" strokeWidth={2} dot={false} name="total_value" />
              <Line type="monotone" dataKey="invested"    stroke="#374151" strokeWidth={1} dot={false} strokeDasharray="4 4" name="invested" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Allocation chart */}
      {tab === 'allocation' && holdingsList.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Portfolio Allocation</p>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <RPie>
                <Pie data={holdingsList} dataKey="current_value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {holdingsList.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:0})}`} />
              </RPie>
            </ResponsiveContainer>
            <div className="space-y-2">
              {holdingsList.map((h, i) => (
                <div key={h.symbol} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{background:COLORS[i%COLORS.length]}} />
                  <span className="text-xs text-gray-300 font-mono">{h.symbol.replace('.NS','')}</span>
                  <span className="text-xs text-gray-500">{h.weight_pct?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade log tab */}
      {tab === 'trades' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-800">
                  {['Date','Symbol','Action','Qty','Price','Cost'].map(h=>(
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(trades||[]).map((t,i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-xs font-mono text-gray-400">{t.trade_date?.slice(0,10)}</td>
                    <td className="px-4 py-2 text-xs font-mono text-indigo-400">{t.symbol.replace('.NS','')}</td>
                    <td className="px-4 py-2"><span className={clsx('text-xs font-medium',t.action==='BUY'?'text-emerald-400':'text-red-400')}>{t.action}</span></td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-300">{t.quantity}</td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-300">₹{t.price?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-200">₹{t.total_cost?.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
