import Link from 'next/link'

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price_fcfa: number
  compare_at_price_fcfa?: number | null
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
  image_urls?: string[]
}

export function ProductCard({ id, name, slug, price_fcfa, compare_at_price_fcfa, image_urls }: ProductCardProps) {
  const hasPromo = !!compare_at_price_fcfa && compare_at_price_fcfa > price_fcfa

  return (
    <Link href={`/products/${slug}`} className="group block">
      {/* Image */}
      <div className="bg-[#FBF6EE] aspect-square rounded-xl overflow-hidden flex items-center justify-center">
        {image_urls && image_urls.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_urls[0]}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="pt-2.5">
        <h3 className="text-sm text-[#1A1A1A] truncate group-hover:text-[#FF6600] transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-sm font-bold ${hasPromo ? 'text-[#1E7A46]' : 'text-[#1A1A1A]'}`}>
            {price_fcfa.toLocaleString('fr-CI')} FCFA
          </span>
          {hasPromo && (
            <span className="text-xs text-[#8A8579] line-through">
              {compare_at_price_fcfa!.toLocaleString('fr-CI')} FCFA
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
