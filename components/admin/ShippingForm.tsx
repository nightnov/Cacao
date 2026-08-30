'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'

interface ShippingFee {
  id: string
  city: string
  price_fcfa: number
  created_at: string
}

interface ShippingFormProps {
  fee?: ShippingFee | null
  onClose: () => void
}

export default function ShippingForm({ fee, onClose }: ShippingFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    city: '',
    price_fcfa: 0
  })

  useEffect(() => {
    if (fee) {
      setFormData({
        city: fee.city,
        price_fcfa: fee.price_fcfa
      })
    }
  }, [fee])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      if (fee) {
        // Update
        const { error: updateError } = await supabase
          .from('shipping_fees')
          .update({
            city: formData.city,
            price_fcfa: formData.price_fcfa
          })
          .eq('id', fee.id)

        if (updateError) throw updateError
        alert('Tarif mis à jour')
      } else {
        // Create
        const { error: createError } = await supabase.from('shipping_fees').insert([
          {
            city: formData.city,
            price_fcfa: formData.price_fcfa
          }
        ])

        if (createError) throw createError
        alert('Tarif créé')
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
      <div className="bg-bg-panel rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-2xl text-ink">
            {fee ? 'Modifier tarif' : 'Ajouter tarif'}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-dimmer hover:text-ink text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Ville *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Ex: Abidjan"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Tarif (FCFA) *</label>
            <input
              type="number"
              name="price_fcfa"
              value={formData.price_fcfa}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="5000"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
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
