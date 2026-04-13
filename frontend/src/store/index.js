import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      user:     null,
      token:    null,
      setUser:  (user, token) => {
        set({ user, token })
        if (token) localStorage.setItem('token', token)
      },
      logout:   () => {
        set({ user: null, token: null })
        localStorage.removeItem('token')
      },

      // Theme
      theme:      'dark',
      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // Watchlist (local, synced to server when logged in)
      watchlist:       [],
      addToWatchlist:  sym => set(s => ({ watchlist: [...new Set([...s.watchlist, sym])] })),
      removeFromWatchlist: sym => set(s => ({ watchlist: s.watchlist.filter(x => x !== sym) })),
      isWatched:       sym => get().watchlist.includes(sym),
    }),
    { name: 'stockanalyzer-store', partialize: s => ({ theme: s.theme, watchlist: s.watchlist }) }
  )
)
