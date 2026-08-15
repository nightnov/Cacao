import { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
}

interface TableShellProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading: boolean
  emptyMessage: string
  emptyAction?: ReactNode
  footer?: ReactNode
}

export function TableShell<T>({ columns, rows, rowKey, loading, emptyMessage, emptyAction, footer }: TableShellProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="bg-white rounded-2xl border border-[#E4DDCF] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-6 py-3 text-xs font-semibold text-[#8A8579] uppercase tracking-wide ${alignClass(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4DDCF]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 bg-[#E4DDCF] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <p className="text-[#8A8579] mb-3">{emptyMessage}</p>
                  {emptyAction}
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={rowKey(row)} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className={`px-6 py-4 text-sm text-[#1A1A1A] ${alignClass(col.align)}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && rows.length > 0 && footer}
    </div>
  )
}
