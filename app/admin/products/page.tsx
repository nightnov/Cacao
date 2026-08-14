'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import ProductForm from '@/components/admin/ProductForm'
import { Product } from '@/types/admin'

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price_fcfa, category, availability')
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
          ➕ Ajouter produit
        </Button>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E4DDCF] p-4 animate-pulse">
              <div className="h-6 bg-[#E4DDCF] rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-[#E4DDCF] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="bg-white rounded-lg border border-[#E4DDCF] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#FBF6EE] border-b border-[#E4DDCF]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Nom</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Catégorie</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Prix</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-[#1A1A1A]">Disponibilité</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-t border-[#E4DDCF] hover:bg-[#FBF6EE] transition-colors">
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-[#56534C]">
                    {product.category === 'portable' && 'Portable'}
                    {product.category === 'bureau' && 'Bureau'}
                    {product.category === 'accessoire' && 'Accessoire'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">
                    {product.price_fcfa.toLocaleString('fr-CI')} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.availability === 'in_stock' ? 'bg-green-100 text-green-700' :
                      product.availability === 'on_order' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {product.availability === 'in_stock' && 'En stock'}
                      {product.availability === 'on_order' && 'En commande'}
                      {product.availability === 'discontinued' && 'Rupture'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1 text-sm bg-[#E85D25] text-white rounded hover:bg-[#d04a1a] transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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
          <p className="text-[#56534C] mb-4">Aucun produit trouvé</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            ➕ Créer le premier produit
          </Button>
        </div>
      )}

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
