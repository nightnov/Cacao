export type StatusTone = 'success' | 'pending' | 'danger' | 'neutral' | 'info'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
}

const toneStyles: Record<StatusTone, string> = {
  success: 'bg-green-50 text-green-700',
  pending: 'bg-orange-50 text-[#C2410C]',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-50 text-blue-700'
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${toneStyles[tone]}`}>
      {label}
    </span>
  )
}
