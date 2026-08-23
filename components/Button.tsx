import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const baseStyles = [
    'font-semibold rounded-full transition-all duration-150',
    'flex items-center justify-center gap-2 whitespace-nowrap',
    // Retour tactile : le bouton s'enfonce légèrement au clic
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] focus-visible:ring-offset-2',
    // État désactivé lisible : sans ça, un bouton bloqué (rupture de stock,
    // variante indisponible) est visuellement identique à un bouton actif.
    'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100'
  ].join(' ')

  const variants = {
    primary: 'bg-[#C2410C] text-white hover:bg-[#9A3412] disabled:hover:bg-[#C2410C]',
    secondary: 'bg-[#2E1D14] text-white hover:bg-[#1A0F0A] disabled:hover:bg-[#2E1D14]',
    outline: 'border-2 border-[#241A14] text-[#241A14] hover:bg-[#241A14] hover:text-white disabled:hover:bg-transparent disabled:hover:text-[#241A14]'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-7 py-3 text-base'
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
