'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import ProductForm from '@/components/admin/ProductForm'
import { TableShell, Column } from '@/components/admin/TableShell'
import { StatusBadge, StatusTone } from '@/components/admin/StatusBadge'
import { IconButton } from '@/components/admin/IconButton'
import { Pagination } from '@/components/admin/Pagination'
import { Product } from '@/types/admin'
import { categoryLabel as categoryLabels } from '@/lib/categories'
import { formatAmount } from '@/lib/format'

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
  /**
   * Les produits retirés forment une liste à part, comme les commandes rangées.
   *
   * Mélangés aux autres, ils encombraient l'écran et se rouvraient par erreur.
   * Séparés, la liste courante ne montre que ce qui est réellement en vente.
   */
  const [voirRetires, setVoirRetires] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [voirRetires])

  const fetchProducts = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('products')
        /**
         * Cette liste alimente aussi le formulaire d'édition.
         *
         * Toute colonne absente ici arrivait au formulaire à `undefined`, et le
         * formulaire la réécrivait à `null` en enregistrant : ouvrir un produit
         * pour corriger son prix effaçait au passage sa taille de colis, son
         * poids, son résumé, ses composants, son contenu de boîte et son état.
         * Silencieusement, sans erreur.
         *
         * Toute colonne que le formulaire lit doit donc figurer ici.
         */
        .select('id, name, slug, description, short_description, category, price_fcfa, compare_at_price_fcfa, availability, specs, tags, image_urls, video_url, status, variant_options, parcel_size, weight_kg, components, included_items, item_condition')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Retire un produit de la vente sans toucher à l'historique.
   *
   * Un produit déjà commandé ne peut pas être effacé : ses lignes de commande
   * le référencent, et ces lignes sont des pièces comptables. Le passer en
   * brouillon le fait disparaître de la boutique tout en laissant lisibles les
   * commandes qui le contiennent.
   */
  const retirerDeLaVente = async (id: string) => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'draft' })
      .eq('id', id)
      .select('id')

    if (error || !data?.length) {
      alert('Le retrait a échoué. ' + (error?.message || 'Aucune ligne modifiée.'))
      return
    }
    setProducts(products.map(p => (p.id === id ? { ...p, status: 'draft' } : p)))
  }

  /** Remet en vente un produit retiré. */
  const remettreEnVente = async (id: string) => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'active' })
      .eq('id', id)
      .select('id')

    if (error || !data?.length) {
      alert('La remise en vente a échoué. ' + (error?.message || 'Aucune ligne modifiée.'))
      return
    }
    setProducts(products.map(p => (p.id === id ? { ...p, status: 'active' } : p)))
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabaseClient()

    /**
     * On regarde d'abord si le produit a déjà été commandé.
     *
     * Sans cette vérification, la base refusait la suppression avec un message
     * technique sur une contrainte de clé étrangère, incompréhensible et qui
     * donnait l'impression que la suppression était cassée. Elle ne l'est pas :
     * elle est interdite, pour une bonne raison.
     */
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)

    if (count && count > 0) {
      const retirer = confirm(
        `Ce produit apparaît dans ${count} ligne${count > 1 ? 's' : ''} de commande. ` +
          'Le supprimer effacerait ces commandes de votre comptabilité, ce qui n est pas possible.\n\n' +
          'Voulez vous plutôt le retirer de la vente ? Il disparaîtra de la boutique et vos commandes resteront intactes.'
      )
      if (retirer) await retirerDeLaVente(id)
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return

    try {
      // `select()` est indispensable : une suppression refusée par les droits
      // en base ne remonte aucune erreur, elle supprime zéro ligne en silence.
      // Sans lui, la ligne disparaissait de l'écran et revenait au rechargement.
      const { data: deleted, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .select('id')

      if (error) throw error
      if (!deleted || deleted.length === 0) {
        const { data: { user } } = await supabase.auth.getUser()
        alert(
          'Suppression refusée par la base : votre compte n\'est pas reconnu comme administrateur.\n\n' +
            `Identifiant de votre compte : ${user?.id || 'inconnu'}`
        )
        return
      }
      setProducts(products.filter(p => p.id !== id))
      alert('Produit supprimé')
    } catch (error) {
      // 23503 : une autre table référence encore ce produit. Le message brut de
      // Postgres parle de contrainte de clé étrangère et n'apprend rien.
      const code = (error as { code?: string })?.code
      if (code === '23503') {
        const retirer = confirm(
          'Ce produit est rattaché à une commande et ne peut donc pas être effacé.\n\n' +
            'Voulez vous le retirer de la vente ?'
        )
        if (retirer) await retirerDeLaVente(id)
        return
      }
      alert(
        'Erreur lors de la suppression : ' +
          (error instanceof Error ? error.message : 'cause inconnue')
      )
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

  const enVente = products.filter(p => p.status !== 'draft')
  const retires = products.filter(p => p.status === 'draft')
  const visibles = voirRetires ? retires : enVente
  const pagedProducts = visibles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Product>[] = [
    {
      key: 'photo',
      header: '',
      render: p => (
        <div className="w-10 h-10 rounded-lg bg-bg-raised border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
          {p.image_urls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(var(--c-gold))"
              strokeWidth="1.5"
            >
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
          <span className="font-medium text-ink">{p.name}</span>
          {p.status === 'draft' && <StatusBadge label="Brouillon" tone="neutral" />}
          {!!p.variant_options?.length && <StatusBadge label={`${p.variant_options.length} option(s)`} tone="info" />}
        </div>
      )
    },
    { key: 'category', header: 'Catégorie', render: p => <span className="text-ink-dim">{categoryLabels[p.category] || p.category}</span> },
    { key: 'price', header: 'Prix', render: p => `${formatAmount(p.price_fcfa)} FCFA` },
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
          {p.status === 'draft' ? (
            <IconButton
              icon={ArchiveRestore}
              label="Remettre en vente"
              onClick={() => remettreEnVente(p.id)}
            />
          ) : (
            <IconButton
              icon={Archive}
              label="Retirer de la vente"
              onClick={() => retirerDeLaVente(p.id)}
            />
          )}
          {/* La suppression définitive reste possible, mais elle n'est plus le
              geste par défaut : elle échoue sur un produit déjà commandé, et
              retirer de la vente répond au besoin dans presque tous les cas. */}
          <IconButton icon={Trash2} label="Supprimer définitivement" tone="danger" onClick={() => handleDelete(p.id)} />
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <h1 className="font-serif font-semibold text-4xl text-ink">
          {voirRetires ? 'Produits retirés' : 'Produits'}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Le compte figure sur le bouton : sans lui, rien n'indique qu'il y
              a quelque chose à aller voir, et le second bloc reste ignoré. */}
          {(voirRetires || retires.length > 0) && (
            <button
              onClick={() => setVoirRetires(v => !v)}
              className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-ink text-ink hover:bg-ink hover:text-ink-invert transition-colors"
            >
              {voirRetires
                ? `Revenir aux produits en vente (${enVente.length})`
                : `Voir les produits retirés (${retires.length})`}
            </button>
          )}
          {!voirRetires && (
            <Button
              variant="primary"
              onClick={() => {
                setSelectedProduct(null)
                setShowForm(true)
              }}
            >
              <Plus size={16} /> Ajouter produit
            </Button>
          )}
        </div>
      </div>

      <TableShell
        columns={columns}
        rows={pagedProducts}
        rowKey={p => p.id}
        loading={loading}
        emptyMessage={voirRetires ? 'Aucun produit retiré' : 'Aucun produit trouvé'}
        emptyAction={
          voirRetires ? undefined : (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Créer le premier produit
            </Button>
          )
        }
        footer={<Pagination page={page} pageSize={PAGE_SIZE} total={visibles.length} onPageChange={setPage} />}
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
