import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'
import Comparison from './pages/Comparison'
import Screener from './pages/Screener'
import Backtest from './pages/Backtest'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/stock/:sym"  element={<StockDetail />} />
        <Route path="/compare"     element={<Comparison />} />
        <Route path="/screener"    element={<Screener />} />
        <Route path="/backtest"    element={<Backtest />} />
      </Route>
    </Routes>
  )
}
