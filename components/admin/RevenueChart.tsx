'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatAmount } from '@/lib/format'

interface MonthlyRevenuePoint {
  month: string
  revenus: number
}

interface RevenueChartProps {
  data: MonthlyRevenuePoint[]
  year: number
  onYearChange: (year: number) => void
  years: number[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  const value = (payload[0].value as number) || 0
  return (
    <div className="bg-white rounded-lg border border-[#E8E0D8] shadow-lg px-4 py-3">
      <p className="text-xs text-[#7D6A5D] mb-1">{label}</p>
      <p className="font-semibold text-[#241A14]">{formatAmount(value)} FCFA</p>
    </div>
  )
}

export function RevenueChart({ data, year, onYearChange, years }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif font-semibold text-xl text-[#241A14]">Revenus mensuels</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C]"></span>
            <span className="text-xs text-[#7D6A5D]">Revenus</span>
          </div>
        </div>
        <select
          value={year}
          onChange={e => onYearChange(Number(e.target.value))}
          className="text-sm border border-[#E8E0D8] rounded-lg px-3 py-1.5 text-[#241A14] focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C2410C" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#C2410C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7D6A5D' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#7D6A5D' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenus" stroke="#C2410C" strokeWidth={2.5} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
