import { useQuery } from '@tanstack/react-query'
import { stockApi } from '../services/api'

export default function MarketTicker() {
  const { data } = useQuery({
    queryKey: ['market-summary'],
    queryFn:  () => stockApi.marketSummary().then(r => r.data),
    refetchInterval: 30_000,
  })

  if (!data) return null

  const items = Object.entries(data)

  return (
    <div className="flex items-center gap-6 overflow-hidden">
      {items.map(([name, q]) => (
        <div key={name} className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-gray-400">{name}</span>
          <span className="text-xs font-mono font-medium text-gray-100">
            {q?.price?.toLocaleString('en-IN')}
          </span>
          <span className={`text-xs font-mono ${(q?.change_pct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(q?.change_pct || 0) >= 0 ? '+' : ''}{q?.change_pct?.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  )
}
