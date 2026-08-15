'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import ShippingForm from '@/components/admin/ShippingForm'
import { TableShell, Column } from '@/components/admin/TableShell'
import { IconButton } from '@/components/admin/IconButton'
import { Pagination } from '@/components/admin/Pagination'

interface ShippingFee {
  id: string
  city: string
  price_fcfa: number
  created_at: string
}

const PAGE_SIZE = 10

export default function AdminShipping() {
  const [fees, setFees] = useState<ShippingFee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedFee, setSelectedFee] = useState<ShippingFee | null>(null)
  const [page, setPage] = useState(1)

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

  const pagedFees = fees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<ShippingFee>[] = [
    { key: 'city', header: 'Ville', render: f => <span className="font-medium text-[#1A1A1A]">{f.city}</span> },
    { key: 'price', header: 'Tarif', render: f => `${f.price_fcfa.toLocaleString('fr-CI')} FCFA` },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: f => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label="Modifier" onClick={() => handleEdit(f)} />
          <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => handleDelete(f.id)} />
        </div>
      )
    }
  ]

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
          <Plus size={16} /> Ajouter tarif
        </Button>
      </div>

      <TableShell
        columns={columns}
        rows={pagedFees}
        rowKey={f => f.id}
        loading={loading}
        emptyMessage="Aucun tarif de livraison"
        emptyAction={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Ajouter le premier tarif
          </Button>
        }
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={fees.length} onPageChange={setPage} />}
      />

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
