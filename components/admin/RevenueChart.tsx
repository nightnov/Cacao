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
    <div className="bg-bg-panel rounded-lg border border-border shadow-lg px-4 py-3">
      <p className="text-xs text-ink-dimmer mb-1">{label}</p>
      <p className="font-semibold text-ink">{formatAmount(value)} FCFA</p>
    </div>
  )
}

export function RevenueChart({ data, year, onYearChange, years }: RevenueChartProps) {
  return (
    <div className="bg-bg-panel rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif font-semibold text-xl text-ink">Revenus mensuels</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gold"></span>
            <span className="text-xs text-ink-dimmer">Revenus</span>
          </div>
        </div>
        <select
          value={year}
          onChange={e => onYearChange(Number(e.target.value))}
          className="text-sm border border-border rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-gold"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          {/* Recharts pose ces couleurs en attributs SVG, hors de portée des
              classes Tailwind. Elles pointent donc directement sur les
              variables du thème : le graphique suit un changement d'habillage
              saisonnier comme le reste du site. */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--c-gold))" stopOpacity={0.28} />
              <stop offset="95%" stopColor="rgb(var(--c-gold))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'rgb(var(--c-ink-dimmer))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'rgb(var(--c-ink-dimmer))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenus"
            stroke="rgb(var(--c-gold))"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
