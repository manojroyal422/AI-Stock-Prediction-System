import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { stockApi } from '../services/api'

export default function SearchBar({ onSelect }) {
  const [q, setQ]           = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const ref   = useRef(null)

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = val => {
    setQ(val)
    clearTimeout(timer.current)
    if (!val.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await stockApi.search(val)
        setResults(data)
        setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }

  const handleSelect = sym => {
    setQ(''); setOpen(false); setResults([])
    onSelect(sym)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
        <Search size={15} className="text-gray-500 shrink-0" />
        <input
          value={q}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search stocks… e.g. RELIANCE"
          className="bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none w-full"
        />
        {loading && <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map(r => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-700 text-left transition-colors"
            >
              <span className="text-sm font-medium text-gray-100">{r.name}</span>
              <span className="text-xs font-mono text-indigo-400">{r.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
