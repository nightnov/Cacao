'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import ProductForm from '@/components/admin/ProductForm'
import { TableShell, Column } from '@/components/admin/TableShell'
import { StatusBadge, StatusTone } from '@/components/admin/StatusBadge'
import { IconButton } from '@/components/admin/IconButton'
import { Pagination } from '@/components/admin/Pagination'
import { Product } from '@/types/admin'
import { categoryLabel as categoryLabels } from '@/lib/categories'

const availabilityLabels: Record<string, { label: string; tone: StatusTone }> = {
  in_stock: { label: 'En stock', tone: 'success' },
  on_order: { label: 'En commande', tone: 'pending' },
  discontinued: { label: 'Rupture', tone: 'neutral' }
}

const PAGE_SIZE = 10

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, status, variant_options, supplier_name')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('products').delete().eq('id', id)

      if (error) throw error
      setProducts(products.filter(p => p.id !== id))
      alert('Produit supprimé')
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedProduct(null)
    fetchProducts()
  }

  const pagedProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Product>[] = [
    {
      key: 'photo',
      header: '',
      render: p => (
        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-[#E4DDCF] overflow-hidden flex items-center justify-center flex-shrink-0">
          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6600" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )}
        </div>
      )
    },
    {
      key: 'name',
      header: 'Nom',
      render: p => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#1A1A1A]">{p.name}</span>
          {p.status === 'draft' && <StatusBadge label="Brouillon" tone="neutral" />}
          {!!p.variant_options?.length && <StatusBadge label={`${p.variant_options.length} option(s)`} tone="info" />}
        </div>
      )
    },
    { key: 'category', header: 'Catégorie', render: p => <span className="text-[#56534C]">{categoryLabels[p.category] || p.category}</span> },
    { key: 'price', header: 'Prix', render: p => `${p.price_fcfa.toLocaleString('fr-CI')} FCFA` },
    {
      key: 'availability',
      header: 'Disponibilité',
      render: p => {
        const avail = availabilityLabels[p.availability] || { label: p.availability, tone: 'neutral' as StatusTone }
        return <StatusBadge label={avail.label} tone={avail.tone} />
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: p => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label="Modifier" onClick={() => handleEdit(p)} />
          <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => handleDelete(p.id)} />
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-semibold text-4xl text-[#1A1A1A]">Produits</h1>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedProduct(null)
            setShowForm(true)
          }}
        >
          <Plus size={16} /> Ajouter produit
        </Button>
      </div>

      <TableShell
        columns={columns}
        rows={pagedProducts}
        rowKey={p => p.id}
        loading={loading}
        emptyMessage="Aucun produit trouvé"
        emptyAction={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Créer le premier produit
          </Button>
        }
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={products.length} onPageChange={setPage} />}
      />

      {/* Form Modal */}
      {showForm && (
        <ProductForm
          product={selectedProduct}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
