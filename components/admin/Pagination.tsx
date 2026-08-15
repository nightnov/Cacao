import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const windowSize = 5
  let firstPage = Math.max(1, page - Math.floor(windowSize / 2))
  const lastPage = Math.min(totalPages, firstPage + windowSize - 1)
  firstPage = Math.max(1, lastPage - windowSize + 1)
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, i) => firstPage + i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E4DDCF]">
      <p className="text-sm text-[#8A8579]">
        Affichage {start}-{end} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg text-[#56534C] hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
              p === page ? 'bg-[#FF6600] text-white' : 'text-[#56534C] hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg text-[#56534C] hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
