export interface VariantOption {
  name: string
  values: string[]
}

export interface ProductVariant {
  id: string
  product_id: string
  option_values: Record<string, string>
  sku: string | null
  price_fcfa: number
  supplier_cost_fcfa: number | null
  stock: number
  image_url: string | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price_fcfa: number
  compare_at_price_fcfa: number | null
  /** Taille de colis. Détermine le tarif de livraison appliqué. */
  parcel_size?: 'petit' | 'moyen' | 'grand' | null
  /** Poids emballé en kg. Sert à proposer la taille, sans la remplacer. */
  weight_kg?: number | null
  /** Pièces de la machine, affichées en grille sur la fiche produit. */
  components?: unknown
  availability: string
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
  video_url: string | null
  supplier_name?: string | null
  supplier_url?: string | null
  supplier_product_id?: string | null
  supplier_cost_fcfa?: number | null
  status?: 'draft' | 'active'
  meta_title?: string | null
  meta_description?: string | null
  variant_options?: VariantOption[]
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_fcfa: number
  total_products_fcfa: number
  shipping_cost_fcfa: number
  payment_method: string
  created_at: string
  delivery_code?: string | null
  /** Identifiant du lien remis au livreur. À ne jamais montrer au client. */
  delivery_token?: string | null
  /** Horodatage écrit uniquement quand le bon code a été saisi : c'est la preuve de remise. */
  delivered_at?: string | null
  notes?: string | null
  /** Position partagée par le client au moment de commander. Absente s'il a refusé. */
  delivery_lat?: number | null
  delivery_lng?: number | null
  /** Précision annoncée par le navigateur, en mètres. */
  delivery_accuracy_m?: number | null
  /** Distance retenue par le serveur pour calculer les frais. */
  delivery_distance_km?: number | null
  delivery_method?: 'distance' | 'commune' | 'defaut' | null
  shipping_address?: {
    full_name: string
    phone: string
    city: string
    address: string
  }
  profiles?: {
    email: string
    first_name: string
    last_name: string
    phone?: string
  }
}

export interface OrderItem {
  id: string
  product_name: string
  quantity: number
  unit_price_fcfa: number
  subtotal_fcfa: number
  variant_label?: string | null
}

export interface Message {
  id: string
  user_id: string
  product_id: string | null
  product_name: string | null
  sender: 'customer' | 'admin'
  body: string
  read_by_admin: boolean
  read_by_customer: boolean
  created_at: string
  profiles?: {
    email: string
    first_name: string
    last_name: string
  }
}
