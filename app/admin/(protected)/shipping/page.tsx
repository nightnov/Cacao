'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import ShippingForm from '@/components/admin/ShippingForm'

interface ShippingFee {
  id: string
  city: string
  price_fcfa: number
  created_at: string
}

export default function AdminShipping() {
  const [fees, setFees] = useState<ShippingFee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedFee, setSelectedFee] = useState<ShippingFee | null>(null)

  useEffect(() => {
    fetchFees()
  }, [])

  const fetchFees = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('shipping_fees')
        .select('id, city, price_fcfa, created_at')
        .order('city', { ascending: true })

      if (error) throw error
      setFees(data || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('shipping_fees').delete().eq('id', id)

      if (error) throw error
      setFees(fees.filter(f => f.id !== id))
      alert('Tarif supprimé')
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleEdit = (fee: ShippingFee) => {
    setSelectedFee(fee)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedFee(null)
    fetchFees()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A]">Frais de livraison</h1>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedFee(null)
            setShowForm(true)
          }}
        >
          ➕ Ajouter tarif
        </Button>
      </div>

      {/* Shipping Fees List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-4 animate-pulse">
              <div className="h-6 bg-[#E4DDCF] rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-[#E4DDCF] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : fees.length > 0 ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FBF6EE] border-b border-[#E4DDCF]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Ville</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Tarif</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee.id} className="border-t border-[#E4DDCF] hover:bg-[#FBF6EE] transition-colors">
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">{fee.city}</td>
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">
                    {fee.price_fcfa.toLocaleString('fr-CI')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(fee)}
                      className="px-3 py-1 text-sm bg-[#FF6600] text-white rounded hover:bg-[#E65C00] transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(fee.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E4DDCF] p-12 text-center">
          <p className="text-[#56534C] mb-4">Aucun tarif de livraison</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            ➕ Ajouter le premier tarif
          </Button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ShippingForm
          fee={selectedFee}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
