import { useMemo } from 'react'

const RADIUS = 54
const STROKE = 10
const C      = 2 * Math.PI * RADIUS
const HALF_C = C * 0.6   // 216deg arc

function scoreColor(score) {
  if (score >= 70) return '#10b981'   // emerald
  if (score >= 45) return '#f59e0b'   // amber
  return '#ef4444'                     // red
}

function scoreLabel(score) {
  if (score >= 70) return 'Strong Buy'
  if (score >= 55) return 'Buy'
  if (score >= 45) return 'Neutral'
  if (score >= 30) return 'Weak'
  return 'Sell'
}

export default function ScoreMeter({ score = 50 }) {
  const color   = scoreColor(score)
  const label   = scoreLabel(score)
  const filled  = HALF_C * (score / 100)
  const gap     = C - filled
  const rotation = -108   // start at bottom-left

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="90" viewBox="0 0 140 90">
        {/* Track */}
        <circle
          cx="70" cy="75" r={RADIUS}
          fill="none"
          stroke="#1f2937"
          strokeWidth={STROKE}
          strokeDasharray={`${HALF_C} ${C - HALF_C}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} 70 75)`}
        />
        {/* Fill */}
        <circle
          cx="70" cy="75" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${gap + (C - HALF_C)}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} 70 75)`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
        {/* Score number */}
        <text x="70" y="72" textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="Inter,sans-serif">
          {score}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="Inter,sans-serif">
          out of 100
        </text>
      </svg>
      <span className="text-sm font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  )
}
