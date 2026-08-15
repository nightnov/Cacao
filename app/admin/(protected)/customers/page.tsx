'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

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

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A] mb-6">Clients</h1>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher par email, nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-4 animate-pulse">
              <div className="h-6 bg-[#E4DDCF] rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-[#E4DDCF] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FBF6EE] border-b border-[#E4DDCF]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Nom</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Téléphone</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-[#1A1A1A]">Commandes</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#1A1A1A]">Total dépensé</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="border-t border-[#E4DDCF] hover:bg-[#FBF6EE] transition-colors">
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#56534C]">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-[#56534C]">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {customer.order_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium text-right">
                    {customer.total_spent_fcfa.toLocaleString('fr-CI')} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-12 text-center">
          <p className="text-[#56534C]">Aucun client trouvé</p>
        </div>
      )}
    </div>
  )
}
