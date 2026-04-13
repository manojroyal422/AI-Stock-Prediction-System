import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate  = useNavigate()
  const setUser   = useStore(s => s.setUser)
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [pw, setPw]           = useState('')
  const [user, setUsername]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data } = await authApi.login(email, pw)
        const me = await authApi.me()
        setUser(me.data, data.access_token)
        toast.success('Welcome back!')
        navigate('/')
      } else {
        await authApi.register({ email, username: user, password: pw })
        toast.success('Account created! Please log in.')
        setMode('login')
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">📈</p>
          <h1 className="text-2xl font-bold text-gray-100">StockAnalyzer Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Indian market analysis platform</p>
        </div>

        <div className="card">
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            {['login','register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
                  ${mode === m ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
              >{m === 'login' ? 'Sign In' : 'Register'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="stat-label">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="stat-label">Username</label>
                <input required value={user} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label className="stat-label">Password</label>
              <input type="password" required value={pw} onChange={e => setPw(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              Demo: skip login — just click <a href="/" className="text-indigo-400 hover:underline">Dashboard</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
