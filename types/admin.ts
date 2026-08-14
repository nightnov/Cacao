export interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price_fcfa: number
  availability: string
  specs: Record<string, unknown>
  tags: string[]
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
  shipping_address?: {
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
}
