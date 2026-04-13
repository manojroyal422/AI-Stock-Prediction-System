import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'

export default function MiniChart({ data = [], color = '#6366f1', height = 50 }) {
  if (!data.length) return <div style={{ height }} className="bg-gray-800 rounded animate-pulse" />

  const formatted = data.map((d, i) => ({
    i,
    v: typeof d === 'object' ? (d.close || d.price || d.equity || 0) : d,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }}
          itemStyle={{ color: '#d1d5db' }}
          labelFormatter={() => ''}
          formatter={v => [`₹${Number(v).toFixed(2)}`, '']}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
