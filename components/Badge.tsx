import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  const variants = {
    primary: 'bg-[#FDC700] text-[#1A1A1A]',
    secondary: 'bg-[#00A63E] text-white'
  }

  return (
    <span className={`inline-block ${variants[variant]} text-xs font-bold px-4 py-1.5 rounded-full`}>
      {children}
    </span>
  )
}
