'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { Product, ProductVariant, VariantOption } from '@/types/admin'
import { generateVariantCombinations, variantLabel } from '@/lib/variants'
import { useCategories } from '@/hooks/useCategories'
import { ProductOptionsPanel } from '@/components/admin/ProductOptionsPanel'
import { sizeFromWeight, SIZE_LABELS } from '@/lib/delivery'
import { ITEM_CONDITIONS } from '@/lib/condition'
import {
  COMPONENT_TYPES,
  componentIcon,
  sanitizeComponents,
  type ProductComponent,
} from '@/lib/components'

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
  // `false` : l'administration doit pouvoir classer un produit dans un rayon
  // masqué. Le masquage ne retire le rayon que des menus de la boutique.
  const categories = useCategories(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    category: 'portable',
    price_fcfa: 0,
    compare_at_price_fcfa: '' as string | number,
    parcel_size: '' as string,
    weight_kg: '' as string | number,
    availability: 'in_stock',
    specs_cpu: '',
    specs_ram: '',
    specs_storage: '',
    specs_screen: '',
    specs_gpu: '',
    specs_battery: '',
    specs_os: '',
    specs_ports: '',
    tags: '',
    included_items: '',
    item_condition: '',
    image_urls: [] as string[],
    video_url: '',
    supplier_name: '',
    supplier_url: '',
    supplier_product_id: '',
    supplier_cost_fcfa: '' as string | number,
    status: 'active' as 'draft' | 'active'
  })

  /**
   * Taille que le poids suggère. N'est affichée que si elle diffère du choix
   * en place : signaler un accord n'apprendrait rien et ajouterait du bruit.
   */
  const suggestedSize = sizeFromWeight(
    typeof formData.weight_kg === 'number' ? formData.weight_kg : null
  )

  const [componentRows, setComponentRows] = useState<ProductComponent[]>([])

  const addComponent = () =>
    setComponentRows(rows => [...rows, { type: 'gpu', label: '' }])

  const updateComponent = (index: number, patch: Partial<ProductComponent>) =>
    setComponentRows(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const removeComponent = (index: number) =>
    setComponentRows(rows => rows.filter((_, i) => i !== index))

  const [hasVariants, setHasVariants] = useState(false)
  const [variantOptionRows, setVariantOptionRows] = useState<VariantOptionRow[]>([{ name: '', valuesText: '' }])
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: (product as any).short_description || '',
        category: product.category,
        price_fcfa: product.price_fcfa,
        compare_at_price_fcfa: product.compare_at_price_fcfa ?? '',
        parcel_size: product.parcel_size ?? '',
        weight_kg: product.weight_kg ?? '',
        availability: product.availability,
        specs_cpu: (product.specs?.cpu as string) || '',
        specs_ram: (product.specs?.ram as string) || '',
        specs_storage: (product.specs?.storage as string) || '',
        specs_screen: (product.specs?.screen as string) || '',
        specs_gpu: (product.specs?.gpu as string) || '',
        specs_battery: (product.specs?.battery as string) || '',
        specs_os: (product.specs?.os as string) || '',
        specs_ports: (product.specs?.ports as string) || '',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        included_items: Array.isArray(product.included_items)
          ? product.included_items.join(', ')
          : '',
        item_condition: product.item_condition || '',
        image_urls: product.image_urls || [],
        video_url: product.video_url || '',
        supplier_name: product.supplier_name || '',
        supplier_url: product.supplier_url || '',
        supplier_product_id: product.supplier_product_id || '',
        supplier_cost_fcfa: product.supplier_cost_fcfa ?? '',
        status: product.status || 'active'
      })

      setComponentRows(sanitizeComponents(product.components))

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

    // Saisir un poids remplit la taille de colis dans la foulée : c'est elle
    // qui fixe le prix, et personne n'a à retenir les seuils du transporteur.
    // Le choix reste modifiable ensuite — un poids ne dit rien de
    // l'encombrement.
    if (name === 'weight_kg') {
      // `parseFloat` et non `parseInt` : un portable de 2,5 kg deviendrait
      // 2 kg et pourrait changer de tranche.
      const kg = value === '' ? '' : parseFloat(value) || 0
      const suggestion = sizeFromWeight(typeof kg === 'number' ? kg : null)
      setFormData(prev => ({
        ...prev,
        weight_kg: kg,
        parcel_size: suggestion ?? prev.parcel_size
      }))
      return
    }

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
      // La route d'import est réservée à l'administrateur : sans ce jeton, le
      // serveur répond « Accès refusé » et rien n'est lu.
      const { data: { session } } = await getSupabaseClient().auth.getSession()
      if (!session) throw new Error('Session expirée. Reconnectez-vous et réessayez.')

      const res = await fetch('/api/admin/scrape-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
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
        screen: formData.specs_screen,
        gpu: formData.specs_gpu,
        battery: formData.specs_battery,
        os: formData.specs_os,
        ports: formData.specs_ports
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
        short_description: formData.short_description.trim() || null,
        category: formData.category,
        price_fcfa: finalPriceFcfa,
        compare_at_price_fcfa: formData.compare_at_price_fcfa === '' ? null : Number(formData.compare_at_price_fcfa),
        parcel_size: formData.parcel_size || null,
        components: sanitizeComponents(componentRows),
        weight_kg: formData.weight_kg === '' ? null : Number(formData.weight_kg),
        availability: finalAvailability,
        specs,
        tags,
        item_condition: formData.item_condition || null,
        included_items: formData.included_items
          .split(',')
          .map(i => i.trim())
          .filter(Boolean),
        image_urls: formData.image_urls,
        video_url: formData.video_url || null,
        supplier_name: formData.supplier_name || null,
        supplier_url: formData.supplier_url || null,
        supplier_product_id: formData.supplier_product_id || null,
        supplier_cost_fcfa: formData.supplier_cost_fcfa === '' ? null : Number(formData.supplier_cost_fcfa),
        status: formData.status,
        // meta_title et meta_description ne sont plus envoyés : le formulaire
        // ne les saisit plus. Les écrire à null aurait effacé sans prévenir ce
        // qui pouvait déjà s'y trouver.
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

      /**
       * Purge du cache de la vitrine.
       *
       * L'accueil est pré-rendu et régénéré au plus toutes les cinq minutes :
       * sans cet appel, un prix corrigé ici continuait de s'y afficher à
       * l'ancien montant, ce qui donnait l'impression que l'enregistrement
       * n'avait pas fonctionné.
       *
       * L'échec n'interrompt pas l'enregistrement, qui a déjà réussi : au pire
       * le changement met les cinq minutes habituelles à apparaître.
       */
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await fetch('/api/admin/revalidate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
        }
      } catch (err) {
        console.warn('Purge du cache impossible, le site se mettra à jour dans quelques minutes.', err)
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
      <div className="bg-bg-panel rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-panel border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-2xl text-ink">
            {product ? 'Modifier produit' : 'Ajouter produit'}
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
          {/* Success Message */}
          {success && (
            <div className="bg-green/10 border border-green/30 text-green-bright px-4 py-3 rounded font-semibold">
              ✓ Produit enregistré avec succès
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded whitespace-pre-wrap break-words">
              {error}
            </div>
          )}

          {/* Fournisseur */}
          <div className="border border-border rounded-lg p-4 bg-bg-raised">
            <h3 className="font-semibold text-ink mb-1">Fournisseur (optionnel)</h3>
            <p className="text-xs text-ink-dimmer mb-3">
              Si ce produit vient d&apos;une plateforme comme Jumia : collez son URL puis cliquez sur « Importer » pour pré-remplir automatiquement le nom, la description, le prix et les photos. Vérifiez toujours les informations importées avant d&apos;enregistrer.
            </p>

            {importError && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-3 py-2 rounded text-xs mb-3">{importError}</div>
            )}
            {importSuccess && (
              <div className="bg-green/10 border border-green/30 text-green-bright px-3 py-2 rounded text-xs mb-3 font-semibold">
                ✓ Informations importées — vérifiez-les avant d&apos;enregistrer.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1">URL du produit fournisseur</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="supplier_url"
                    value={formData.supplier_url}
                    onChange={handleChange}
                    placeholder="https://www.jumia.ci/..."
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold bg-bg-panel"
                  />
                  <Button type="button" variant="outline" onClick={handleImportFromUrl} disabled={importing}>
                    {importing ? 'Import...' : 'Importer'}
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Nom du fournisseur</label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  placeholder="Ex: Jumia"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold bg-bg-panel"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Référence fournisseur</label>
                <input
                  type="text"
                  name="supplier_product_id"
                  value={formData.supplier_product_id}
                  onChange={handleChange}
                  placeholder="Ex: référence produit"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold bg-bg-panel"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Coût fournisseur (FCFA)</label>
                <input
                  type="number"
                  name="supplier_cost_fcfa"
                  value={formData.supplier_cost_fcfa}
                  onChange={handleChange}
                  placeholder="Prix d'achat"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold bg-bg-panel"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Photos</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {formData.image_urls.map(url => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
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
                className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-ink-dimmer hover:border-gold hover:text-gold transition-colors text-xs gap-1 disabled:opacity-50"
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
            <p className="text-xs text-ink-dimmer">
              La première photo sera l&apos;image principale. Utilisez des images <strong>carrées</strong> (ratio 1:1, ex. 800×800 px) pour un affichage uniforme dans le catalogue. 5 Mo max par photo.
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Vidéo (lien YouTube ou Vimeo)</label>
            <input
              type="url"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Nom *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Ex: CacaoBook 14"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Slug *</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Ex: cacaobook-14"
            />
          </div>

          {/* Accroche commerciale : une ou deux phrases sous le nom du produit,
              distincte de la description longue de la section repliable. */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Accroche courte
            </label>
            <input
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Une ou deux phrases affichées sous le nom sur la fiche"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Description du produit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Prix (FCFA) {hasVariants && <span className="font-normal text-ink-dimmer">— calculé depuis les variantes</span>}
              </label>
              <input
                type="number"
                name="price_fcfa"
                value={formData.price_fcfa}
                onChange={handleChange}
                disabled={hasVariants}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-bg-raised disabled:text-ink-dimmer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Compare-at price */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Ancien prix (barré, optionnel)</label>
              <input
                type="number"
                name="compare_at_price_fcfa"
                value={formData.compare_at_price_fcfa}
                onChange={handleChange}
                placeholder="Laisser vide si pas de promo"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <p className="text-xs text-ink-dimmer mt-1">Doit être supérieur au prix actuel pour s&apos;afficher comme promo.</p>
            </div>

            {/* Poids : sert uniquement à proposer la taille ci-dessous. */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Poids emballé (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                placeholder="Ex. 2.3"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <p className="text-xs text-ink-dimmer mt-1">
                Renseignez-le et la taille de colis se remplit toute seule : jusqu&apos;à 5 kg petit
                colis, jusqu&apos;à 15 kg moyen, au-delà grand.
              </p>
            </div>

            {/* Taille de colis : c'est elle qui détermine le tarif. */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Taille de colis
              </label>
              <select
                name="parcel_size"
                value={formData.parcel_size}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Non renseignée</option>
                <option value="petit">Petit colis — 0 à 5 kg · 40 × 20 × 13 cm</option>
                <option value="moyen">Moyen colis — 5 à 15 kg · 70 × 30 × 20 cm</option>
                <option value="grand">Grand colis — 15 kg et + · 100 × 100 × 62 cm</option>
              </select>

              {suggestedSize && suggestedSize !== formData.parcel_size && (
                <p className="text-xs text-gold mt-1">
                  D&apos;après le poids saisi, ce serait plutôt un{' '}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, parcel_size: suggestedSize }))}
                    className="font-semibold underline"
                  >
                    {SIZE_LABELS[suggestedSize].toLowerCase()}
                  </button>
                  .
                </p>
              )}

              <p className="text-xs text-ink-dimmer mt-1">
                C&apos;est elle qui fixe le prix de la livraison. Le poids ne suffit pas toujours :
                un écran de 27 pouces pèse 5 kg mais ne rentre dans aucune boîte de moyen colis —
                corrigez à la main dans ce cas.
              </p>
            </div>

            {/* Composants : la liste que l'acheteur compare avant de décider. */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-ink mb-2">Composants</label>
              <p className="text-xs text-ink-dimmer mb-3">
                Les pièces de la machine, affichées en grille sur la fiche produit. Chaque ligne
                reçoit l&apos;icône de son type. Laissez vide pour un produit qui n&apos;en a pas —
                un accessoire, par exemple.
              </p>

              {componentRows.length > 0 && (
                <div className="space-y-2 mb-3">
                  {componentRows.map((row, i) => {
                    const Icon = componentIcon(row.type)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-lg bg-gold/10 text-gold grid place-items-center flex-shrink-0">
                          <Icon size={16} />
                        </span>
                        <select
                          value={row.type}
                          onChange={e => updateComponent(i, { type: e.target.value })}
                          className="w-44 px-2.5 py-2 border border-border rounded-lg text-sm text-ink flex-shrink-0"
                        >
                          {COMPONENT_TYPES.map(t => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={row.label}
                          onChange={e => updateComponent(i, { label: e.target.value })}
                          placeholder="Ex. NVIDIA GeForce RTX 5080 16 Go"
                          className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg text-sm text-ink"
                        />
                        <button
                          type="button"
                          onClick={() => removeComponent(i)}
                          aria-label="Retirer ce composant"
                          className="w-9 h-9 grid place-items-center text-ink-dimmer hover:text-danger hover:bg-danger/10 rounded-lg flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={addComponent}
                className="px-4 py-2 border border-border hover:bg-bg-raised text-ink rounded-lg font-semibold text-sm"
              >
                + Ajouter un composant
              </button>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Disponibilité {hasVariants && <span className="font-normal text-ink-dimmer">— calculée depuis le stock</span>}
              </label>
              <select
                name="availability"
                value={formData.availability}
                onChange={handleChange}
                disabled={hasVariants}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold disabled:bg-bg-raised disabled:text-ink-dimmer"
              >
                <option value="in_stock">En stock</option>
                <option value="on_order">En commande</option>
                <option value="discontinued">Rupture</option>
              </select>
            </div>
          </div>

          {/* Variantes */}
          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={e => setHasVariants(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              <span className="font-semibold text-ink">Ce produit a des variantes (couleur, taille...)</span>
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
                        className="w-1/3 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      <input
                        type="text"
                        value={row.valuesText}
                        onChange={e => handleOptionRowChange(i, 'valuesText', e.target.value)}
                        placeholder="Valeurs séparées par virgules (ex: Noir, Rouge, Bleu)"
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                      {variantOptionRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionRow(i)}
                          className="px-2 text-ink-dimmer hover:text-danger"
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
                      className="text-sm text-gold font-semibold hover:underline"
                    >
                      + Ajouter une option
                    </button>
                    <span className="text-border">•</span>
                    <button
                      type="button"
                      onClick={handleGenerateCombinations}
                      className="text-sm text-gold font-semibold hover:underline"
                    >
                      Générer les combinaisons
                    </button>
                  </div>
                </div>

                {/* Variant rows table */}
                {variantRows.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-bg-raised">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-ink">Combinaison</th>
                            <th className="px-3 py-2 text-left font-semibold text-ink">SKU</th>
                            <th className="px-3 py-2 text-left font-semibold text-ink">Prix</th>
                            <th className="px-3 py-2 text-left font-semibold text-ink">Coût</th>
                            <th className="px-3 py-2 text-left font-semibold text-ink">Stock</th>
                            <th className="px-3 py-2 text-left font-semibold text-ink">Image</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {variantRows.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 text-ink whitespace-nowrap">{variantLabel(row.option_values)}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.sku}
                                  onChange={e => handleVariantRowChange(i, 'sku', e.target.value)}
                                  className="w-20 px-2 py-1 border border-border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.price_fcfa}
                                  onChange={e => handleVariantRowChange(i, 'price_fcfa', e.target.value)}
                                  className="w-24 px-2 py-1 border border-border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.supplier_cost_fcfa}
                                  onChange={e => handleVariantRowChange(i, 'supplier_cost_fcfa', e.target.value)}
                                  className="w-24 px-2 py-1 border border-border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={row.stock}
                                  onChange={e => handleVariantRowChange(i, 'stock', e.target.value)}
                                  className="w-16 px-2 py-1 border border-border rounded"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={row.image_url}
                                  onChange={e => handleVariantRowChange(i, 'image_url', e.target.value)}
                                  className="px-2 py-1 border border-border rounded max-w-[110px]"
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
                                  className="text-ink-dimmer hover:text-danger"
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
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-ink mb-3">Spécifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">CPU</label>
                <input
                  type="text"
                  name="specs_cpu"
                  value={formData.specs_cpu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex: Intel i5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">RAM</label>
                <input
                  type="text"
                  name="specs_ram"
                  value={formData.specs_ram}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex: 16 Go"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Stockage</label>
                <input
                  type="text"
                  name="specs_storage"
                  value={formData.specs_storage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex: 512 Go SSD"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Écran</label>
                <input
                  type="text"
                  name="specs_screen"
                  value={formData.specs_screen}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder='Ex: 14"'
                />
              </div>
              {/* Ces quatre là manquaient. Le glossaire savait déjà expliquer
                  la carte graphique et la batterie, mais aucun champ ne
                  permettait de renseigner la valeur du produit : les blocs ne
                  pouvaient donc jamais apparaître sur une fiche. */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Carte graphique</label>
                <input
                  type="text"
                  name="specs_gpu"
                  value={formData.specs_gpu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex : RTX 4060, ou intégrée"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Batterie</label>
                <input
                  type="text"
                  name="specs_battery"
                  value={formData.specs_battery}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex : 3 cellules, 41 Wh"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Système</label>
                <input
                  type="text"
                  name="specs_os"
                  value={formData.specs_os}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex : Windows 11"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Connectique</label>
                <input
                  type="text"
                  name="specs_ports"
                  value={formData.specs_ports}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Ex : 2 USB, HDMI, Wi Fi, Bluetooth"
                />
              </div>
            </div>
            <p className="text-xs text-ink-dimmer mt-3">
              Chaque champ rempli fait apparaître son explication dans la section
              Description de la fiche, avec le texte du glossaire. Laissé vide, il
              n&apos;affiche rien.
            </p>
          </div>

          {/* État de l'appareil */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">État de l&apos;appareil</label>
            <select
              name="item_condition"
              value={formData.item_condition}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {/* Le vide est un choix valide : ne rien dire vaut mieux
                  qu'affirmer « neuf » par défaut sur du matériel qui ne l'est
                  pas forcément. */}
              <option value="">Non précisé</option>
              {Object.entries(ITEM_CONDITIONS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Livré avec */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">
              Livré avec (séparés par virgules)
            </label>
            <input
              type="text"
              name="included_items"
              value={formData.included_items}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Ex: Chargeur, Souris, Sacoche, Carton d'origine"
            />
            <p className="text-xs text-ink-dim mt-1.5">
              Ce qui accompagne l&apos;appareil. Laissé vide, rien n&apos;est affiché et rien
              n&apos;est promis au client.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Tags (séparés par virgules)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Ex: portable, gaming, professionnel"
            />
          </div>

          {/* Statut */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-semibold text-ink mb-2">Statut</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'draft'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                  className="accent-gold"
                />
                <span className="text-sm text-ink">Brouillon (invisible sur le site)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.status === 'active'}
                  onChange={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                  className="accent-gold"
                />
                <span className="text-sm text-ink">Actif (visible sur le site)</span>
              </label>
            </div>
          </div>

          {/* La section Référencement (SEO) a été retirée.
              Ses deux champs étaient écrits en base mais relus nulle part : la
              fiche produit est un composant client, qui ne peut pas exporter de
              métadonnées. Ils ne changeaient donc rien à ce que Google affiche,
              tout en réclamant une saisie sur chaque produit.
              Les colonnes meta_title et meta_description restent en base, vides,
              pour le jour où les fiches seront rendues sur le serveur. */}

          {/*
            Configuration du produit.

            Visible seulement à la modification : les options sont rattachées à
            un identifiant de produit, qui n'existe pas tant que la fiche n'a pas
            été enregistrée une première fois. L'afficher à la création aurait
            donné un panneau dont chaque enregistrement échouait.

            Le panneau écrit directement en base, indépendamment du bouton
            « Enregistrer » de ce formulaire : chaque modification est prise en
            compte immédiatement.
          */}
          {product?.id ? (
            <div className="pt-4 border-t border-border">
              <ProductOptionsPanel productId={product.id} />
            </div>
          ) : (
            <p className="pt-4 border-t border-border text-sm text-ink-dimmer">
              Enregistrez d&apos;abord le produit pour pouvoir définir sa configuration
              (couleur, stockage, mémoire, processeur).
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
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
