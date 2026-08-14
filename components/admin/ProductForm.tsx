'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Product } from '@/types/admin'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'portable',
    price_fcfa: 0,
    availability: 'in_stock',
    specs_cpu: '',
    specs_ram: '',
    specs_storage: '',
    specs_screen: '',
    tags: ''
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        price_fcfa: product.price_fcfa,
        availability: product.availability,
        specs_cpu: (product.specs?.cpu as string) || '',
        specs_ram: (product.specs?.ram as string) || '',
        specs_storage: (product.specs?.storage as string) || '',
        specs_screen: (product.specs?.screen as string) || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : ''
      })
    }
  }, [product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price_fcfa' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const specs = {
        cpu: formData.specs_cpu,
        ram: formData.specs_ram,
        storage: formData.specs_storage,
        screen: formData.specs_screen
      }
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)

      if (product) {
        // Update
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            category: formData.category,
            price_fcfa: formData.price_fcfa,
            availability: formData.availability,
            specs,
            tags
          })
          .eq('id', product.id)

        if (updateError) throw updateError
        alert('Produit mis à jour')
      } else {
        // Create
        const { error: createError } = await supabase.from('products').insert([
          {
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            category: formData.category,
            price_fcfa: formData.price_fcfa,
            availability: formData.availability,
            specs,
            tags
          }
        ])

        if (createError) throw createError
        alert('Produit créé')
      }

      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E4DDCF] px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-2xl text-[#1A1A1A]">
            {product ? 'Modifier produit' : 'Ajouter produit'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#8A8579] hover:text-[#1A1A1A] text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Nom *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              placeholder="Ex: CacaoBook 14"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Slug *</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              placeholder="Ex: cacaobook-14"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              placeholder="Description du produit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              >
                <option value="portable">Portable</option>
                <option value="bureau">Bureau</option>
                <option value="accessoire">Accessoire</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Prix (FCFA)</label>
              <input
                type="number"
                name="price_fcfa"
                value={formData.price_fcfa}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Availability */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Disponibilité</label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              >
                <option value="in_stock">En stock</option>
                <option value="on_order">En commande</option>
                <option value="discontinued">Rupture</option>
              </select>
            </div>
          </div>

          {/* Specs */}
          <div className="border-t border-[#E4DDCF] pt-4">
            <h3 className="font-semibold text-[#1A1A1A] mb-3">Spécifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">CPU</label>
                <input
                  type="text"
                  name="specs_cpu"
                  value={formData.specs_cpu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  placeholder="Ex: Intel i5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">RAM</label>
                <input
                  type="text"
                  name="specs_ram"
                  value={formData.specs_ram}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  placeholder="Ex: 16 Go"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Stockage</label>
                <input
                  type="text"
                  name="specs_storage"
                  value={formData.specs_storage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  placeholder="Ex: 512 Go SSD"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Écran</label>
                <input
                  type="text"
                  name="specs_screen"
                  value={formData.specs_screen}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
                  placeholder='Ex: 14"'
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Tags (séparés par virgules)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
              placeholder="Ex: portable, gaming, professionnel"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E4DDCF]">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
