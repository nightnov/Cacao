export interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: string
  price_fcfa: number
  compare_at_price_fcfa: number | null
  availability: string
  specs: Record<string, unknown>
  tags: string[]
  image_urls: string[]
  video_url: string | null
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
