export interface CartItem {
  id: string
  name: string
  slug: string
  /**
   * Prix unitaire, configuration comprise — pour l'affichage seulement.
   *
   * Il n'a aucune valeur contractuelle : le montant facturé est recalculé côté
   * serveur à partir de `option_value_ids` (voir `lib/pricing.server.ts`). Ce
   * champ vit dans le navigateur, donc le visiteur peut le modifier.
   */
  price_fcfa: number
  image_url: string | null
  quantity: number
  variant_id?: string
  variant_label?: string
  /** Valeurs de configuration retenues. Seule donnée qui fait foi au paiement. */
  option_value_ids?: string[]
  /** Résumé lisible de la configuration, par exemple « Noir · 1 To · 16 Go ». */
  config_label?: string
}

const CART_KEY = 'cart'
export const CART_EVENT = 'cart-updated'

/**
 * Identifie une ligne de panier.
 *
 * Deux fois le même ordinateur dans deux configurations différentes font deux
 * lignes distinctes. Sans la configuration dans la clé, ajouter le modèle 2 To
 * après le 512 Go aurait simplement incrémenté la première ligne, et le second
 * choix aurait disparu sans avertissement.
 *
 * Les identifiants sont triés pour que l'ordre de sélection ne crée pas deux
 * lignes là où la configuration est en réalité identique.
 */
export function cartLineKey(item: {
  id: string
  variant_id?: string
  option_value_ids?: string[]
}): string {
  const options = [...(item.option_value_ids || [])].sort().join(',')
  return `${item.id}|${item.variant_id || ''}|${options}`
}

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_EVENT))
}

export function getCart(): CartItem[] {
  return readCart()
}

export function getCartCount(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0)
}

export function getCartTotal(): number {
  return readCart().reduce((sum, item) => sum + item.price_fcfa * item.quantity, 0)
}

export function addToCart(product: Omit<CartItem, 'quantity'>, quantity: number = 1) {
  const items = readCart()
  const key = cartLineKey(product)
  const existing = items.find(i => cartLineKey(i) === key)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({ ...product, quantity })
  }
  writeCart(items)
}

export function updateCartItemQuantity(key: string, quantity: number) {
  const items = readCart()
  const item = items.find(i => cartLineKey(i) === key)
  if (!item) return
  if (quantity <= 0) {
    writeCart(items.filter(i => cartLineKey(i) !== key))
  } else {
    item.quantity = quantity
    writeCart(items)
  }
}

export function removeFromCart(key: string) {
  writeCart(readCart().filter(i => cartLineKey(i) !== key))
}

export function clearCart() {
  writeCart([])
}
