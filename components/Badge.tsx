import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  const variants = {
    primary: 'bg-[#C2410C] text-white',
    secondary: 'bg-[#1E7A46] text-white'
  }

  return (
    <span className={`inline-block ${variants[variant]} text-xs font-bold px-4 py-1.5 rounded-full`}>
      {children}
    </span>
  )
}
