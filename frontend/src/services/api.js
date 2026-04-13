import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30_000,
})

// Attach JWT if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Stock endpoints ─────────────────────────────────────
export const stockApi = {
  search:        q          => api.get(`/api/v1/stocks/search?q=${q}`),
  quote:         sym        => api.get(`/api/v1/stocks/${sym}/quote`),
  history:       (sym,p,i)  => api.get(`/api/v1/stocks/${sym}/history?period=${p}&interval=${i}`),
  fundamentals:  sym        => api.get(`/api/v1/stocks/${sym}/fundamentals`),
  financials:    sym        => api.get(`/api/v1/stocks/${sym}/financials`),
  marketSummary: ()         => api.get('/api/v1/stocks/market-summary'),
  topMovers:     ()         => api.get('/api/v1/stocks/top-movers'),
}

// ─── Analysis endpoints ──────────────────────────────────
export const analysisApi = {
  technical:  sym => api.get(`/api/v1/analysis/${sym}/technical`),
  sentiment:  sym => api.get(`/api/v1/analysis/${sym}/sentiment`),
  patterns:   sym => api.get(`/api/v1/analysis/${sym}/patterns`),
  score:      sym => api.get(`/api/v1/analysis/${sym}/score`),
  full:       sym => api.get(`/api/v1/analysis/${sym}/full`),
}

// ─── Prediction endpoints ────────────────────────────────
export const predictApi = {
  direction: sym        => api.get(`/api/v1/predict/${sym}/direction`),
  forecast:  (sym,days) => api.get(`/api/v1/predict/${sym}/forecast?days=${days}`),
}

// ─── Screener ────────────────────────────────────────────
export const screenerApi = {
  screen: params => api.get('/api/v1/screener/', { params }),
}

// ─── News ────────────────────────────────────────────────
export const newsApi = {
  forStock: sym => api.get(`/api/v1/news/${sym}`),
}

// ─── Watchlist ───────────────────────────────────────────
export const watchlistApi = {
  get:    ()   => api.get('/api/v1/watchlist/'),
  add:    sym  => api.post('/api/v1/watchlist/', { symbol: sym }),
  remove: sym  => api.delete(`/api/v1/watchlist/${sym}`),
}

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  login:    (email,pw) => api.post('/api/v1/auth/login', new URLSearchParams({ username: email, password: pw })),
  register: d          => api.post('/api/v1/auth/register', d),
  me:       ()         => api.get('/api/v1/auth/me'),
}

// ─── Backtest ────────────────────────────────────────────
export const backtestApi = {
  run: payload => api.post('/api/v1/backtest/run', payload),
}

export default api
