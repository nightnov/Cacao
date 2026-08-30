'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { TableShell, Column } from '@/components/admin/TableShell'
import { Pagination } from '@/components/admin/Pagination'
import { Avatar } from '@/components/admin/Avatar'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatAmount } from '@/lib/format'

interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  order_count: number
  total_spent_fcfa: number
  created_at: string
}

const PAGE_SIZE = 10

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const fetchCustomers = async () => {
    try {
      const supabase = getSupabaseClient()

      // Récupérer tous les profils avec au moins une commande
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, created_at')

      if (error) throw error

      // Pour chaque profil, compter les commandes et le total dépensé
      const customersData: Customer[] = []
      for (const profile of profiles || []) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_fcfa')
          .eq('user_id', profile.id)

        if (!ordersError && orders && orders.length > 0) {
          const total = orders.reduce((sum: number, order: any) => sum + order.total_fcfa, 0)
          customersData.push({
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name || '-',
            last_name: profile.last_name || '-',
            phone: profile.phone || '-',
            order_count: orders.length,
            total_spent_fcfa: total,
            created_at: profile.created_at
          })
        }
      }

      setCustomers(customersData)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: c => {
        const name = `${c.first_name} ${c.last_name}`.trim()
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} size="sm" />
            <span className="font-medium text-ink">{name}</span>
          </div>
        )
      }
    },
    { key: 'email', header: 'Email', render: c => <span className="text-ink-dim">{c.email}</span> },
    { key: 'phone', header: 'Téléphone', render: c => <span className="text-ink-dim">{c.phone}</span> },
    { key: 'orders', header: 'Commandes', align: 'center', render: c => <StatusBadge label={String(c.order_count)} tone="info" /> },
    { key: 'total', header: 'Total dépensé', align: 'right', render: c => `${formatAmount(c.total_spent_fcfa)} FCFA` }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-4xl text-ink mb-6">Clients</h1>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher par email, nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </div>

      <TableShell
        columns={columns}
        rows={pagedCustomers}
        rowKey={c => c.id}
        loading={loading}
        emptyMessage="Aucun client trouvé"
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={filteredCustomers.length} onPageChange={setPage} />}
      />
    </div>
  )
}
