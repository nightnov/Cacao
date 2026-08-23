import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-[#E8E0D8] rounded-lg p-6 ${className}`}>
      {children}
    </div>
  )
}
