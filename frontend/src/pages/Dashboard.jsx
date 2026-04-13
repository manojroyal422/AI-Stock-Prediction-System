import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { stockApi } from '../services/api'
import StockCard from '../components/StockCard'
import MiniChart from '../components/MiniChart'
import Spinner from '../components/Spinner'
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</h2>
}

function MarketIndexCard({ name, data }) {
  if (!data) return <div className="card-sm animate-pulse h-16" />
  const pos = (data.change_pct || 0) >= 0
  return (
    <div className="card-sm">
      <p className="text-xs text-gray-500 mb-1">{name}</p>
      <p className="text-base font-bold text-gray-100 font-mono">
        {data.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </p>
      <p className={clsx('text-xs font-medium', pos ? 'text-emerald-400' : 'text-red-400')}>
        {pos ? '▲' : '▼'} {Math.abs(data.change_pct || 0).toFixed(2)}%
      </p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { watchlist } = useStore()

  const { data: summary } = useQuery({
    queryKey: ['market-summary'],
    queryFn:  () => stockApi.marketSummary().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: movers, isLoading: moversLoading } = useQuery({
    queryKey: ['top-movers'],
    queryFn:  () => stockApi.topMovers().then(r => r.data),
    refetchInterval: 60_000,
  })

  const watchlistQueries = useQuery({
    queryKey: ['watchlist-quotes', watchlist],
    queryFn:  async () => {
      const results = await Promise.all(watchlist.map(sym => stockApi.quote(sym).then(r => r.data).catch(() => null)))
      return results.filter(Boolean)
    },
    enabled: watchlist.length > 0,
  })

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Market Summary */}
      <section>
        <SectionTitle>Market Overview</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['NIFTY50', 'SENSEX', 'BANKNIFTY', 'IT'].map(k => (
            <MarketIndexCard key={k} name={k} data={summary?.[k]} />
          ))}
        </div>
      </section>

      {/* Gainers & Losers */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gainers */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-400" /> Top Gainers</span>
            </SectionTitle>
            {moversLoading ? <Spinner size="sm" /> : (
              <div className="space-y-2">
                {(movers?.gainers || []).map(s => (
                  <div
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="card-sm flex items-center justify-between cursor-pointer hover:border-gray-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">{s.symbol?.replace('.NS','')}</p>
                      <p className="text-xs text-gray-500">Vol: {(s.volume/1e5).toFixed(1)}L</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-gray-100">₹{s.price?.toFixed(2)}</p>
                      <p className="text-xs text-emerald-400 font-medium">+{s.change_pct?.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Losers */}
          <div>
            <SectionTitle>
              <span className="flex items-center gap-1.5"><TrendingDown size={13} className="text-red-400" /> Top Losers</span>
            </SectionTitle>
            {moversLoading ? <Spinner size="sm" /> : (
              <div className="space-y-2">
                {(movers?.losers || []).map(s => (
                  <div
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="card-sm flex items-center justify-between cursor-pointer hover:border-gray-600 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">{s.symbol?.replace('.NS','')}</p>
                      <p className="text-xs text-gray-500">Vol: {(s.volume/1e5).toFixed(1)}L</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-gray-100">₹{s.price?.toFixed(2)}</p>
                      <p className="text-xs text-red-400 font-medium">{s.change_pct?.toFixed(2)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <section>
          <SectionTitle>Your Watchlist</SectionTitle>
          {watchlistQueries.isLoading ? <Spinner size="sm" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {(watchlistQueries.data || []).map(s => (
                <StockCard key={s.symbol} stock={s} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Default Universe */}
      <section>
        <SectionTitle>Nifty 50 — Large Cap Universe</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(movers ? [...(movers.gainers||[]), ...(movers.losers||[])] : []).map(s => (
            <StockCard key={s.symbol} stock={s} />
          ))}
        </div>
      </section>
    </div>
  )
}
