export interface CartItem {
  id: string
  name: string
  slug: string
  price_fcfa: number
  image_url: string | null
  quantity: number
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
  product: { id: string; name: string; slug: string; price_fcfa: number; image_url: string | null },
  quantity: number = 1
) {
  const items = readCart()
  const existing = items.find(i => i.id === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({ ...product, quantity })
  }
  writeCart(items)
}

export function updateCartItemQuantity(id: string, quantity: number) {
  const items = readCart()
  const item = items.find(i => i.id === id)
  if (!item) return
  if (quantity <= 0) {
    writeCart(items.filter(i => i.id !== id))
  } else {
    item.quantity = quantity
    writeCart(items)
  }
}

export function removeFromCart(id: string) {
  writeCart(readCart().filter(i => i.id !== id))
}

export function clearCart() {
  writeCart([])
}
