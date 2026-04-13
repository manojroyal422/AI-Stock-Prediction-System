import clsx from 'clsx'

const CONFIG = {
  positive: { cls: 'badge-green', label: 'Positive' },
  negative: { cls: 'badge-red',   label: 'Negative' },
  neutral:  { cls: 'badge-blue',  label: 'Neutral'  },
}

export default function SentimentBadge({ label = 'neutral', score }) {
  const cfg = CONFIG[label] || CONFIG.neutral
  return (
    <span className={cfg.cls}>
      {cfg.label}{score !== undefined ? ` · ${(score * 100).toFixed(0)}%` : ''}
    </span>
  )
}
