import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  const variants = {
    primary: 'bg-gold text-ink-invert',
    secondary: 'bg-green text-white'
  }

  return (
    <span className={`inline-block ${variants[variant]} text-xs font-bold px-4 py-1.5 rounded-full`}>
      {children}
    </span>
  )
}
