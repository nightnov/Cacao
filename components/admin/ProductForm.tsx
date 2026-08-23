'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Product, ProductVariant, VariantOption } from '@/types/admin'
import { generateVariantCombinations, variantLabel } from '@/lib/variants'
import { CATEGORIES } from '@/lib/categories'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
}

interface VariantOptionRow {
  name: string
  valuesText: string
}

interface VariantRow {
  option_values: Record<string, string>
  sku: string
  price_fcfa: string | number
  supplier_cost_fcfa: string | number
  stock: string | number
  image_url: string
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

function optionsToRows(options: VariantOption[]): VariantOptionRow[] {
  if (!options || options.length === 0) return [{ name: '', valuesText: '' }]
  return options.map(o => ({ name: o.name, valuesText: o.values.join(', ') }))
}

function parseOptionRows(rows: VariantOptionRow[]): VariantOption[] {
  return rows
    .map(row => ({ name: row.name.trim(), values: row.valuesText.split(',').map(v => v.trim()).filter(Boolean) }))
    .filter(o => o.name && o.values.length > 0)
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
    compare_at_price_fcfa: '' as string | number,
    availability: 'in_stock',
    specs_cpu: '',
    specs_ram: '',
    specs_storage: '',
    specs_screen: '',
    tags: '',
    image_urls: [] as string[],
    video_url: '',
    supplier_name: '',
    supplier_url: '',
    supplier_product_id: '',
    supplier_cost_fcfa: '' as string | number,
    status: 'active' as 'draft' | 'active',
    meta_title: '',
    meta_description: ''
  })

  const [hasVariants, setHasVariants] = useState(false)
  const [variantOptionRows, setVariantOptionRows] = useState<VariantOptionRow[]>([{ name: '', valuesText: '' }])
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        price_fcfa: product.price_fcfa,
        compare_at_price_fcfa: product.compare_at_price_fcfa ?? '',
        availability: product.availability,
        specs_cpu: (product.specs?.cpu as string) || '',
        specs_ram: (product.specs?.ram as string) || '',
        specs_storage: (product.specs?.storage as string) || '',
        specs_screen: (product.specs?.screen as string) || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        image_urls: product.image_urls || [],
        video_url: product.video_url || '',
        supplier_name: product.supplier_name || '',
        supplier_url: product.supplier_url || '',
        supplier_product_id: product.supplier_product_id || '',
        supplier_cost_fcfa: product.supplier_cost_fcfa ?? '',
        status: product.status || 'active',
        meta_title: product.meta_title || '',
        meta_description: product.meta_description || ''
      })

      const options = product.variant_options || []
      const productHasVariants = options.length > 0
      setHasVariants(productHasVariants)
      setVariantOptionRows(optionsToRows(options))

      if (productHasVariants) {
        const fetchVariants = async () => {
          const supabase = getSupabaseClient()
          const { data } = await supabase
            .from('product_variants')
            .select('id, option_values, sku, price_fcfa, supplier_cost_fcfa, stock, image_url')
            .eq('product_id', product.id)

          setVariantRows(
            ((data as unknown as ProductVariant[]) || []).map(v => ({
              option_values: v.option_values,
              sku: v.sku || '',
              price_fcfa: v.price_fcfa,
              supplier_cost_fcfa: v.supplier_cost_fcfa ?? '',
              stock: v.stock,
              image_url: v.image_url || ''
            }))
          )
        }
        fetchVariants()
      }
    }
  }, [product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const numericFields = ['price_fcfa', 'compare_at_price_fcfa', 'supplier_cost_fcfa']
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price_fcfa'
        ? parseInt(value) || 0
        : numericFields.includes(name)
        ? (value === '' ? '' : parseInt(value) || 0)
        : value
    }))
  }

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const handleImportFromUrl = async () => {
    if (!formData.supplier_url.trim()) {
      setImportError('Collez d\'abord une URL dans le champ ci-dessus.')
      return
    }
    setImporting(true)
    setImportError('')
    setImportSuccess(false)
    try {
      const res = await fetch('/api/admin/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.supplier_url.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'import')

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        price_fcfa: data.price_fcfa || prev.price_fcfa,
        image_urls: data.image_urls?.length ? data.image_urls : prev.image_urls,
        supplier_name: data.supplier_name || prev.supplier_name
      }))
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 3000)
    } catch (err: any) {
      setImportError(err.message || 'Impossible d\'importer depuis cette URL. Remplissez le formulaire manuellement.')
    } finally {
      setImporting(false)
    }
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

  const handleOptionRowChange = (index: number, field: keyof VariantOptionRow, value: string) => {
    setVariantOptionRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const handleAddOptionRow = () => {
    setVariantOptionRows(prev => [...prev, { name: '', valuesText: '' }])
  }

  const handleRemoveOptionRow = (index: number) => {
    setVariantOptionRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerateCombinations = () => {
    const options = parseOptionRows(variantOptionRows)
    const combos = generateVariantCombinations(options)

    setVariantRows(prev =>
      combos.map(combo => {
        const existing = prev.find(r => JSON.stringify(r.option_values) === JSON.stringify(combo))
        return (
          existing || {
            option_values: combo,
            sku: '',
            price_fcfa: formData.price_fcfa || '',
            supplier_cost_fcfa: '',
            stock: 0,
            image_url: ''
          }
        )
      })
    )
  }

  const handleVariantRowChange = (index: number, field: keyof VariantRow, value: string) => {
    setVariantRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const handleRemoveVariantRow = (index: number) => {
    setVariantRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (hasVariants && variantRows.length === 0) {
      setError('Générez au moins une combinaison de variantes, ou décochez "Ce produit a des variantes".')
      return
    }

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

      let finalPriceFcfa = formData.price_fcfa
      let finalAvailability = formData.availability
      const finalVariantOptions = hasVariants ? parseOptionRows(variantOptionRows) : []

      if (hasVariants && variantRows.length > 0) {
        const prices = variantRows.map(r => Number(r.price_fcfa) || 0).filter(p => p > 0)
        if (prices.length > 0) finalPriceFcfa = Math.min(...prices)
        const totalStock = variantRows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0)
        finalAvailability = totalStock > 0 ? 'in_stock' : 'discontinued'
      }

      const payload = {
        name: formData.name.trim(),
        slug: slugify(formData.slug),
        description: formData.description,
        category: formData.category,
        price_fcfa: finalPriceFcfa,
        compare_at_price_fcfa: formData.compare_at_price_fcfa === '' ? null : Number(formData.compare_at_price_fcfa),
        availability: finalAvailability,
        specs,
        tags,
        image_urls: formData.image_urls,
        video_url: formData.video_url || null,
        supplier_name: formData.supplier_name || null,
        supplier_url: formData.supplier_url || null,
        supplier_product_id: formData.supplier_product_id || null,
        supplier_cost_fcfa: formData.supplier_cost_fcfa === '' ? null : Number(formData.supplier_cost_fcfa),
        status: formData.status,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        variant_options: finalVariantOptions
      }

      let productId = product?.id

      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)

        if (updateError) throw updateError
      } else {
        const { data: created, error: createError } = await supabase
          .from('products')
          .insert([payload])
          .select('id')
          .single()

        if (createError) throw createError
        productId = created.id
      }

      if (productId) {
        const { error: deleteVariantsError } = await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId)
        if (deleteVariantsError) throw deleteVariantsError

        if (hasVariants && variantRows.length > 0) {
          const variantPayload = variantRows.map(r => ({
            product_id: productId,
            option_values: r.option_values,
            sku: r.sku || null,
            price_fcfa: Number(r.price_fcfa) || 0,
            supplier_cost_fcfa: r.supplier_cost_fcfa === '' ? null : Number(r.supplier_cost_fcfa),
            stock: Number(r.stock) || 0,
            image_url: r.image_url || null
          }))
          const { error: insertVariantsError } = await supabase.from('product_variants').insert(variantPayload)
          if (insertVariantsError) throw insertVariantsError
        }
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
        <div className="sticky top-0 bg-white border-b border-[#E8E0D8] px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-2xl text-[#241A14]">
            {product ? 'Modifier produit' : 'Ajouter produit'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#7D6A5D] hover:text-[#241A14] text-2xl"
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

          {/* Fournisseur */}
          <div className="border border-[#E8E0D8] rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-[#241A14] mb-1">Fournisseur (optionnel)</h3>
            <p className="text-xs text-[#7D6A5D] mb-3">
              Si ce produit vient d&apos;une plateforme comme Jumia : collez son URL puis cliquez sur « Importer » pour pré-remplir automatiquement le nom, la description, le prix et les photos. Vérifiez toujours les informations importées avant d&apos;enregistrer.
            </p>

            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-3">{importError}</div>
            )}
            {importSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs mb-3 font-semibold">
                ✓ Informations importées — vérifiez-les avant d&apos;enregistrer.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#241A14] mb-1">URL du produit fournisseur</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="supplier_url"
                    value={formData.supplier_url}
                    onChange={handleChange}
                    placeholder="https://www.jumia.ci/..."
                    className="flex-1 px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] bg-white"
                  />
                  <Button type="button" variant="outline" onClick={handleImportFromUrl} disabled={importing}>
                    {importing ? 'Import...' : 'Importer'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">Nom du fournisseur</label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  placeholder="Ex: Jumia"
                  className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">Référence fournisseur</label>
                <input
                  type="text"
                  name="supplier_product_id"
                  value={formData.supplier_product_id}
                  onChange={handleChange}
                  placeholder="Ex: référence produit"
                  className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">Coût fournisseur (FCFA)</label>
                <input
                  type="number"
                  name="supplier_cost_fcfa"
                  value={formData.supplier_cost_fcfa}
                  onChange={handleChange}
                  placeholder="Prix d'achat"
                  className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Photos</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {formData.image_urls.map(url => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E0D8] group">
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
                className="aspect-square rounded-lg border-2 border-dashed border-[#E8E0D8] flex flex-col items-center justify-center text-[#7D6A5D] hover:border-[#C2410C] hover:text-[#C2410C] transition-colors text-xs gap-1 disabled:opacity-50"
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
            <p className="text-xs text-[#7D6A5D]">
              La première photo sera l&apos;image principale. Utilisez des images <strong>carrées</strong> (ratio 1:1, ex. 800×800 px) pour un affichage uniforme dans le catalogue. 5 Mo max par photo.
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Vidéo (lien YouTube ou Vimeo)</label>
            <input
              type="url"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Nom *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              placeholder="Ex: CacaoBook 14"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Slug *</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              placeholder="Ex: cacaobook-14"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              placeholder="Description du produit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">
                Prix (FCFA) {hasVariants && <span className="font-normal text-[#7D6A5D]">— calculé depuis les variantes</span>}
              </label>
              <input
                type="number"
                name="price_fcfa"
                value={formData.price_fcfa}
                onChange={handleChange}
                disabled={hasVariants}
                className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] disabled:bg-gray-100 disabled:text-[#7D6A5D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Compare-at price */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">Ancien prix (barré, optionnel)</label>
              <input
                type="number"
                name="compare_at_price_fcfa"
                value={formData.compare_at_price_fcfa}
                onChange={handleChange}
                placeholder="Laisser vide si pas de promo"
                className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              />
              <p className="text-xs text-[#7D6A5D] mt-1">Doit être supérieur au prix actuel pour s&apos;afficher comme promo.</p>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-semibold text-[#241A14] mb-2">
                Disponibilité {hasVariants && <span className="font-normal text-[#7D6A5D]">— calculée depuis le stock</span>}
              </label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                disabled={hasVariants}
                className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C] disabled:bg-gray-100 disabled:text-[#7D6A5D]"
              >
                <option value="in_stock">En stock</option>
                <option value="on_order">En commande</option>
                <option value="discontinued">Rupture</option>
              </select>
            </div>
          </div>

          {/* Variantes */}
          <div className="border-t border-[#E8E0D8] pt-4">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={e => setHasVariants(e.target.checked)}
                className="w-4 h-4 accent-[#C2410C]"
              />
              <span className="font-semibold text-[#241A14]">Ce produit a des variantes (couleur, taille...)</span>
            </label>

            {hasVariants && (
              <div className="space-y-4 pl-1">
                {/* Options */}
                <div className="space-y-2">
                  {variantOptionRows.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={e => handleOptionRowChange(i, 'name', e.target.value)}
                        placeholder="Nom (ex: Couleur)"
                        className="w-1/3 px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                      />
                      <input
                        type="text"
                        value={row.valuesText}
                        onChange={e => handleOptionRowChange(i, 'valuesText', e.target.value)}
                        placeholder="Valeurs séparées par virgules (ex: Noir, Rouge, Bleu)"
                        className="flex-1 px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                      />
                      {variantOptionRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionRow(i)}
                          className="px-2 text-[#7D6A5D] hover:text-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddOptionRow}
                      className="text-sm text-[#C2410C] font-semibold hover:underline"
                    >
                      + Ajouter une option
                    </button>
                    <span className="text-[#E8E0D8]">•</span>
                    <button
                      type="button"
                      onClick={handleGenerateCombinations}
                      className="text-sm text-[#C2410C] font-semibold hover:underline"
                    >
                      Générer les combinaisons
                    </button>
                  </div>
                </div>

                {/* Variant rows table */}
                {variantRows.length > 0 && (
                  <div className="border border-[#E8E0D8] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">Combinaison</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">SKU</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">Prix</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">Coût</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">Stock</th>
                            <th className="px-3 py-2 text-left font-semibold text-[#241A14]">Image</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E0D8]">
                          {variantRows.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-[#241A14] whitespace-nowrap">{variantLabel(row.option_values)}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.sku}
                                  onChange={e => handleVariantRowChange(i, 'sku', e.target.value)}
                                  className="w-20 px-2 py-1 border border-[#E8E0D8] rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.price_fcfa}
                                  onChange={e => handleVariantRowChange(i, 'price_fcfa', e.target.value)}
                                  className="w-24 px-2 py-1 border border-[#E8E0D8] rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.supplier_cost_fcfa}
                                  onChange={e => handleVariantRowChange(i, 'supplier_cost_fcfa', e.target.value)}
                                  className="w-24 px-2 py-1 border border-[#E8E0D8] rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.stock}
                                  onChange={e => handleVariantRowChange(i, 'stock', e.target.value)}
                                  className="w-16 px-2 py-1 border border-[#E8E0D8] rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={row.image_url}
                                  onChange={e => handleVariantRowChange(i, 'image_url', e.target.value)}
                                  className="px-2 py-1 border border-[#E8E0D8] rounded max-w-[110px]"
                                >
                                  <option value="">(image principale)</option>
                                  {formData.image_urls.map((url, idx) => (
                                    <option key={url} value={url}>Photo {idx + 1}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantRow(i)}
                                  className="text-[#7D6A5D] hover:text-red-600"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="border-t border-[#E8E0D8] pt-4">
            <h3 className="font-semibold text-[#241A14] mb-3">Spécifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">CPU</label>
                <input
                  type="text"
                  name="specs_cpu"
                  value={formData.specs_cpu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Ex: Intel i5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">RAM</label>
                <input
                  type="text"
                  name="specs_ram"
                  value={formData.specs_ram}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Ex: 16 Go"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Stockage</label>
                <input
                  type="text"
                  name="specs_storage"
                  value={formData.specs_storage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder="Ex: 512 Go SSD"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#241A14] mb-2">Écran</label>
                <input
                  type="text"
                  name="specs_screen"
                  value={formData.specs_screen}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  placeholder='Ex: 14"'
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Tags (séparés par virgules)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              placeholder="Ex: portable, gaming, professionnel"
            />
          </div>

          {/* Statut */}
          <div className="border-t border-[#E8E0D8] pt-4">
            <label className="block text-sm font-semibold text-[#241A14] mb-2">Statut</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'draft'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                  className="accent-[#C2410C]"
                />
                <span className="text-sm text-[#241A14]">Brouillon (invisible sur le site)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'active'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                  className="accent-[#C2410C]"
                />
                <span className="text-sm text-[#241A14]">Actif (visible sur le site)</span>
              </label>
            </div>
          </div>

          {/* SEO */}
          <div className="border-t border-[#E8E0D8] pt-4">
            <h3 className="font-semibold text-[#241A14] mb-1">Référencement (SEO)</h3>
            <p className="text-xs text-[#7D6A5D] mb-3">Optionnel — sans ça, le nom et la description du produit sont utilisés.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">Titre SEO</label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleChange}
                  placeholder={formData.name || 'Titre affiché dans les résultats Google'}
                  className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#241A14] mb-1">Meta description</label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Résumé affiché sous le titre dans les résultats Google"
                  className="w-full px-3 py-2 text-sm border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E8E0D8]">
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
