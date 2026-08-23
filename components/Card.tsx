import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[#1C2021] border border-[#35383C] rounded-lg p-6 ${className}`}>
      {children}
    </div>
  )
}
