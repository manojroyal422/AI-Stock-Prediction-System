import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '../services/api'
import { Bell, BellOff, Plus, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const ALERT_TYPES = [
  { id:'PRICE_ABOVE',    label:'Price Above ₹',    desc:'Triggers when price rises above threshold' },
  { id:'PRICE_BELOW',    label:'Price Below ₹',    desc:'Triggers when price falls below threshold' },
  { id:'PERCENT_CHANGE', label:'% Change ≥',        desc:'Triggers on absolute % move (up or down)' },
  { id:'RSI_OVERBOUGHT', label:'RSI Overbought >',  desc:'Triggers when RSI exceeds threshold' },
  { id:'RSI_OVERSOLD',   label:'RSI Oversold <',    desc:'Triggers when RSI falls below threshold' },
  { id:'VOLUME_SPIKE',   label:'Volume Spike ×',    desc:'Triggers on unusual volume (× avg)' },
  { id:'MACD_CROSS',     label:'MACD Cross',        desc:'Triggers on bullish/bearish MACD signal' },
]

const STATUS_COLOR = { ACTIVE:'text-emerald-400', TRIGGERED:'text-amber-400', PAUSED:'text-gray-500' }

export default function Alerts() {
  const qc = useQueryClient()
  const [sym,       setSym]       = useState('RELIANCE.NS')
  const [alertType, setAlertType] = useState('PRICE_ABOVE')
  const [threshold, setThreshold] = useState('')
  const [showForm,  setShowForm]  = useState(false)

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn:  () => alertsApi.list().then(r => r.data),
  })

  const createAlert = useMutation({
    mutationFn: () => alertsApi.create({ symbol: sym.toUpperCase(), type: alertType, threshold: Number(threshold) }),
    onSuccess:  () => { qc.invalidateQueries(['alerts']); setShowForm(false); toast.success('Alert created!') },
    onError:    () => toast.error('Failed to create alert'),
  })

  const deleteAlert = useMutation({
    mutationFn: id => alertsApi.delete(id),
    onSuccess:  () => { qc.invalidateQueries(['alerts']); toast.success('Alert deleted') },
  })

  const activeCount    = alerts?.filter(a => a.status === 'ACTIVE').length || 0
  const triggeredCount = alerts?.filter(a => a.status === 'TRIGGERED').length || 0

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Price Alerts</h1>
          <p className="text-xs text-gray-500 mt-0.5">{activeCount} active · {triggeredCount} triggered</p>
        </div>
        <button onClick={() => setShowForm(f=>!f)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> New Alert
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">Create Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="stat-label">Symbol</label>
              <input value={sym} onChange={e=>setSym(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500 font-mono"
                placeholder="RELIANCE.NS"
              />
            </div>
            <div>
              <label className="stat-label">Threshold value</label>
              <input type="number" value={threshold} onChange={e=>setThreshold(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                placeholder="e.g. 3000"
              />
            </div>
          </div>
          <div>
            <label className="stat-label mb-2 block">Alert Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALERT_TYPES.map(at => (
                <button key={at.id} onClick={() => setAlertType(at.id)}
                  className={clsx('text-left p-3 rounded-lg border transition-colors',
                    alertType === at.id
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-gray-700 hover:border-gray-600'
                  )}>
                  <p className={clsx('text-xs font-semibold', alertType===at.id ? 'text-indigo-400' : 'text-gray-300')}>{at.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{at.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => createAlert.mutate()} disabled={!threshold || createAlert.isPending} className="btn-primary">
            {createAlert.isPending ? 'Creating…' : 'Create Alert'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="card-sm h-16 animate-pulse bg-gray-800" />)}</div>
      ) : alerts?.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <BellOff size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">No alerts yet. Create one to get notified on price moves.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts?.map(alert => (
            <div key={alert.id} className={clsx('card-sm flex items-center justify-between',
              alert.status === 'TRIGGERED' && 'border-amber-800/50 bg-amber-900/10'
            )}>
              <div className="flex items-center gap-3">
                <div className={clsx('w-2 h-2 rounded-full', alert.status==='ACTIVE'?'bg-emerald-400':alert.status==='TRIGGERED'?'bg-amber-400':'bg-gray-600')} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-indigo-400">{alert.symbol.replace('.NS','')}</span>
                    <span className="text-xs text-gray-500">{alert.type?.replace('_',' ')}</span>
                    <span className="text-sm font-mono text-gray-200">₹{alert.threshold?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={clsx('text-xs font-medium', STATUS_COLOR[alert.status] || 'text-gray-500')}>{alert.status}</span>
                    {alert.triggered_at && (
                      <span className="text-xs text-gray-600">· Triggered {alert.triggered_at?.slice(0,10)}</span>
                    )}
                    <span className="text-xs text-gray-700">Created {alert.created_at?.slice(0,10)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteAlert.mutate(alert.id)}
                className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card bg-gray-800/30">
        <p className="text-xs text-gray-500">
          Alerts are checked every <strong className="text-gray-400">60 seconds</strong> via Celery background tasks.
          Triggered alerts will show as notifications in the top bar.
        </p>
      </div>
    </div>
  )
}
