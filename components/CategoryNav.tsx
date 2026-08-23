'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'

/**
 * Bande des rayons de la navbar.
 *
 * `useSearchParams` est le seul moyen fiable de connaître le rayon actif :
 * il se met à jour à chaque navigation client, contrairement à une lecture
 * de `window.location` qui ne réagit ni au `pushState` de Next.js ni à la
 * fin réelle de la navigation.
 *
 * Le hook est isolé ici et enveloppé dans un Suspense pour que les pages
 * statiques affichant la navbar ne basculent pas en rendu dynamique.
 */
function CategoryNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = pathname === '/products' ? searchParams.get('category') : null

  return (
    <>
      {CATEGORIES.slice(0, 5).map(cat => (
        <Link
          key={cat.value}
          href={`/products?category=${cat.value}`}
          aria-current={active === cat.value ? 'page' : undefined}
          className={
            active === cat.value
              ? 'text-[#FDC700] font-bold'
              : 'text-[#B3B8BE] hover:text-[#EEF2F7] transition-colors'
          }
        >
          {cat.label}
        </Link>
      ))}
    </>
  )
}

/** Repli rendu côté serveur : mêmes libellés, sans état actif. */
function CategoryNavFallback() {
  return (
    <>
      {CATEGORIES.slice(0, 5).map(cat => (
        <Link key={cat.value} href={`/products?category=${cat.value}`} className="text-[#B3B8BE]">
          {cat.label}
        </Link>
      ))}
    </>
  )
}

export function CategoryNav() {
  return (
    <div className="hidden lg:flex gap-5 text-[13.5px] font-medium">
      <Suspense fallback={<CategoryNavFallback />}>
        <CategoryNavInner />
      </Suspense>
    </div>
  )
}
