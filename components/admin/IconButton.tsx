import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  tone?: 'default' | 'danger'
}

export function IconButton({ icon: Icon, label, onClick, href, tone = 'default' }: IconButtonProps) {
  const className = `p-2 rounded-lg transition-colors ${
    tone === 'danger' ? 'text-[#56534C] hover:bg-red-50 hover:text-red-600' : 'text-[#56534C] hover:bg-gray-100 hover:text-[#1A1A1A]'
  }`

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={className}>
        <Icon size={16} />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      <Icon size={16} />
    </button>
  )
}
