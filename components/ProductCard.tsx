import Link from 'next/link'

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price_fcfa: number
  category: string
  availability: 'in_stock' | 'on_order' | 'discontinued'
  image_urls?: string[]
}

export function ProductCard({ id, name, slug, price_fcfa, category, availability, image_urls }: ProductCardProps) {
  const categoryLabel: Record<string, string> = {
    portable: 'Portable',
    bureau: 'Bureau',
    accessoire: 'Accessoire'
  }

  const availabilityLabel: Record<string, { text: string; color: string }> = {
    in_stock: { text: 'En stock', color: 'bg-[#1E7A46] text-white' },
    on_order: { text: 'En commande', color: 'bg-[#E85D25] text-white' },
    discontinued: { text: 'Rupture', color: 'bg-[#8A8579] text-white' }
  }

  const availInfo = availabilityLabel[availability]

  return (
    <Link href={`/products/${slug}`}>
      <div className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Image */}
        <div className="bg-[#FBF6EE] aspect-square flex items-center justify-center overflow-hidden">
          {image_urls && image_urls.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image_urls[0]} alt={name} className="w-full h-full object-cover" />
          ) : (
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#E85D25" strokeWidth="1">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category */}
          <div className="text-xs font-semibold text-[#E85D25] uppercase mb-2">
            {categoryLabel[category] || category}
          </div>

          {/* Name */}
          <h3 className="font-semibold text-[#1A1A1A] mb-3 line-clamp-2 text-sm">
            {name}
          </h3>

          {/* Price */}
          <div className="mb-3 pb-3 border-t border-[#E4DDCF]">
            <div className="text-xl font-bold text-[#1A1A1A]">
              {price_fcfa.toLocaleString('fr-CI')} FCFA
            </div>
          </div>

          {/* Availability Badge */}
          <div className={`text-xs font-semibold px-3 py-1.5 rounded-full text-center ${availInfo.color}`}>
            {availInfo.text}
          </div>
        </div>
      </div>
    </Link>
  )
}
