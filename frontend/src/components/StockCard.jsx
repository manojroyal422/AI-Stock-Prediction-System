import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useStore } from '../store'
import clsx from 'clsx'

export default function StockCard({ stock, showSparkline = false }) {
  const navigate = useNavigate()
  const { addToWatchlist, removeFromWatchlist, isWatched } = useStore()
  const watched  = isWatched(stock.symbol)
  const positive = (stock.change_pct || 0) >= 0

  return (
    <div
      onClick={() => navigate(`/stock/${stock.symbol}`)}
      className="card-sm cursor-pointer hover:border-gray-600 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-mono text-indigo-400 font-medium">{stock.symbol?.replace('.NS','').replace('.BO','')}</p>
          <p className="text-xs text-gray-500 truncate max-w-[120px]">{stock.name}</p>
        </div>
        <button
          onClick={e => {
            e.stopPropagation()
            watched ? removeFromWatchlist(stock.symbol) : addToWatchlist(stock.symbol)
          }}
          className={clsx('p-1 rounded transition-colors', watched ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400')}
        >
          <Star size={13} fill={watched ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-base font-semibold text-gray-100">
          ₹{stock.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <span className={clsx('text-xs font-medium', positive ? 'text-emerald-400' : 'text-red-400')}>
          {positive ? '+' : ''}{stock.change_pct?.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}
