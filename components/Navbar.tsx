'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export function Navbar() {
  return (
    <nav className="flex items-center gap-6 px-10 py-5 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1 cursor-pointer flex-shrink-0">
        <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
        <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
        <span className="w-5 h-0.5 bg-[#1A1A1A]"></span>
      </div>

      <Link href="/" className="font-serif font-bold text-3xl text-[#1A1A1A] flex-shrink-0 hover:opacity-80">
        Cacao
      </Link>

      <div className="flex-1 bg-[#FBF6EE] border-2 border-[#1A1A1A] rounded-full px-6 py-1.5 flex items-center gap-2 text-sm text-[#8A8579]">
        Que cherchez-vous ?
        <button className="bg-[#E85D25] w-10 h-10 rounded-full flex items-center justify-center text-white ml-auto flex-shrink-0 hover:bg-[#d04a1a]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-5 flex-shrink-0">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="cursor-pointer hover:opacity-70">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
    </nav>
  )
}
