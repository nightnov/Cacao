'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Product } from '@/types/admin'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    tags: '',
    image_urls: [] as string[],
    video_url: ''
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
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        image_urls: product.image_urls || [],
        video_url: product.video_url || ''
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" dépasse 5 Mo`)
        }

        const ext = file.name.split('.').pop()
        const path = `products/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }

      setFormData(prev => ({ ...prev, image_urls: [...prev.image_urls, ...uploadedUrls] }))
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload de l'image")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = async (url: string) => {
    setFormData(prev => ({ ...prev, image_urls: prev.image_urls.filter(u => u !== url) }))

    try {
      const supabase = getSupabaseClient()
      const path = url.split('/product-images/')[1]
      if (path) {
        await supabase.storage.from('product-images').remove([path])
      }
    } catch {
      // Suppression silencieuse: le retrait de l'affichage prime, un fichier
      // orphelin dans le stockage n'a pas d'impact utilisateur.
    }
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
      const payload = {
        name: formData.name.trim(),
        slug: slugify(formData.slug),
        description: formData.description,
        category: formData.category,
        price_fcfa: formData.price_fcfa,
        availability: formData.availability,
        specs,
        tags,
        image_urls: formData.image_urls,
        video_url: formData.video_url || null
      }

      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)

        if (updateError) throw updateError
      } else {
        const { error: createError } = await supabase.from('products').insert([payload])

        if (createError) throw createError
      }

      setSuccess(true)
      setTimeout(onClose, 900)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[ProductForm] save failed', err)
      const details = [err.message, err.code, err.details, err.hint].filter(Boolean).join(' — ')
      setError(details || 'Erreur inconnue lors de l\'enregistrement (voir la console)')
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
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded font-semibold">
              ✓ Produit enregistré avec succès
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-wrap break-words">
              {error}
            </div>
          )}

          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Photos</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {formData.image_urls.map(url => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[#E4DDCF] group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black bg-opacity-60 text-white text-xs flex items-center justify-center hover:bg-opacity-80"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-[#E4DDCF] flex flex-col items-center justify-center text-[#8A8579] hover:border-[#FF6600] hover:text-[#FF6600] transition-colors text-xs gap-1 disabled:opacity-50"
              >
                {uploading ? (
                  <span>Envoi...</span>
                ) : (
                  <>
                    <span className="text-xl leading-none">+</span>
                    <span>Ajouter</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="text-xs text-[#8A8579]">
              La première photo sera l&apos;image principale. Utilisez des images <strong>carrées</strong> (ratio 1:1, ex. 800×800 px) pour un affichage uniforme dans le catalogue. 5 Mo max par photo.
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Vidéo (lien YouTube ou Vimeo)</label>
            <input
              type="url"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Nom *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
                  className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
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
              className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6600]"
              placeholder="Ex: portable, gaming, professionnel"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E4DDCF]">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || uploading || success}
              className="flex-1"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || success}
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
