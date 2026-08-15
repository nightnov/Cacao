'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
    <div className="bg-white rounded-lg border border-[#E4DDCF] shadow-lg px-4 py-3">
      <p className="text-xs text-[#8A8579] mb-1">{label}</p>
      <p className="font-semibold text-[#1A1A1A]">{value.toLocaleString('fr-CI')} FCFA</p>
    </div>
  )
}

export function RevenueChart({ data, year, onYearChange, years }: RevenueChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4DDCF] p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif font-semibold text-xl text-[#1A1A1A]">Revenus mensuels</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6600]"></span>
            <span className="text-xs text-[#8A8579]">Revenus</span>
          </div>
        </div>
        <select
          value={year}
          onChange={e => onYearChange(Number(e.target.value))}
          className="text-sm border border-[#E4DDCF] rounded-lg px-3 py-1.5 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
              <stop offset="5%" stopColor="#FF6600" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#FF6600" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCF" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8A8579' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#8A8579' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenus" stroke="#FF6600" strokeWidth={2.5} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
