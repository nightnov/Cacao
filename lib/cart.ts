export interface CartItem {
  id: string
  name: string
  slug: string
  price_fcfa: number
  image_url: string | null
  quantity: number
  variant_id?: string
  variant_label?: string
}

const CART_KEY = 'cart'
export const CART_EVENT = 'cart-updated'

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

function sameLine(item: CartItem, id: string, variantId?: string): boolean {
  return item.id === id && item.variant_id === variantId
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

export function addToCart(
  product: {
    id: string
    name: string
    slug: string
    price_fcfa: number
    image_url: string | null
    variant_id?: string
    variant_label?: string
  },
  quantity: number = 1
) {
  const items = readCart()
  const existing = items.find(i => sameLine(i, product.id, product.variant_id))
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({ ...product, quantity })
  }
  writeCart(items)
}

export function updateCartItemQuantity(id: string, quantity: number, variantId?: string) {
  const items = readCart()
  const item = items.find(i => sameLine(i, id, variantId))
  if (!item) return
  if (quantity <= 0) {
    writeCart(items.filter(i => !sameLine(i, id, variantId)))
  } else {
    item.quantity = quantity
    writeCart(items)
  }
}

export function removeFromCart(id: string, variantId?: string) {
  writeCart(readCart().filter(i => !sameLine(i, id, variantId)))
}

export function clearCart() {
  writeCart([])
}
