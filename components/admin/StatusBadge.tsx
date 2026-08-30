export type StatusTone = 'success' | 'pending' | 'danger' | 'neutral' | 'info'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
}

const toneStyles: Record<StatusTone, string> = {
  success: 'bg-green/10 text-green-bright',
  pending: 'bg-gold/10 text-gold',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-bg-raised text-ink-dimmer',
  info: 'bg-info/10 text-info'
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${toneStyles[tone]}`}>
      {label}
    </span>
  )
}
