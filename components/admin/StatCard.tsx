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
}

export function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend, href }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-2xl border border-[#E4DDCF] p-6 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
              trend.direction === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="font-serif font-bold text-3xl text-[#1A1A1A] mb-1">{value}</p>
      <p className="text-sm text-[#8A8579]">{label}</p>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
