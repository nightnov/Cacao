import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconBg: string
  iconColor: string
  trend?: { value: number; direction: 'up' | 'down' }
  href?: string
  /**
   * Précision facultative sous le libellé. Elle sert à porter un second
   * chiffre qui ne méritait pas une carte à lui seul — le panier moyen sous
   * les revenus, par exemple, qui n'a de sens qu'à côté d'eux.
   */
  note?: string
}

export function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend, href, note }: StatCardProps) {
  const content = (
    <div className="bg-bg-panel rounded-2xl border border-border p-6 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
              trend.direction === 'up' ? 'bg-green/10 text-green-bright' : 'bg-danger/10 text-danger'
            }`}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="font-serif font-bold text-3xl text-ink mb-1">{value}</p>
      <p className="text-sm text-ink-dimmer">{label}</p>
      {note && <p className="text-[12.5px] text-ink-faint mt-1.5 tabular-nums">{note}</p>}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
