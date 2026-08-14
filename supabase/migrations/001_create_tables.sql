-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT CHECK (category IN ('portable', 'bureau', 'accessoire')),
  price_fcfa INTEGER NOT NULL,
  availability TEXT CHECK (availability IN ('in_stock', 'on_order', 'discontinued')) DEFAULT 'in_stock',
  specs JSONB DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')) DEFAULT 'pending',
  total_products_fcfa INTEGER NOT NULL,
  shipping_cost_fcfa INTEGER NOT NULL,
  total_fcfa INTEGER NOT NULL,
  payment_method TEXT,
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price_fcfa INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal_fcfa INTEGER NOT NULL
);

-- Payment logs table
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  moneyfusion_transaction_id TEXT,
  status TEXT CHECK (status IN ('initiated', 'successful', 'failed', 'refunded')) DEFAULT 'initiated',
  amount_fcfa INTEGER NOT NULL,
  payment_method TEXT,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipping fees table
CREATE TABLE IF NOT EXISTS shipping_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city TEXT NOT NULL UNIQUE,
  fee_fcfa INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payment_logs_order_id ON payment_logs(order_id);

-- RLS Policies

-- Products: public read, admin write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_admin_write" ON products FOR INSERT WITH CHECK (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');
CREATE POLICY "products_admin_update" ON products FOR UPDATE USING (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');
CREATE POLICY "products_admin_delete" ON products FOR DELETE USING (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');

-- Profiles: users see own, public see public
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_user_view_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_user_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_user_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Orders: users see own, admin sees all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_user_view_own" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_user_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');

-- Order items: users see own orders items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_user_view" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

-- Payment logs: users see own, admin sees all
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_logs_user_view" ON payment_logs FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);
CREATE POLICY "payment_logs_admin_all" ON payment_logs FOR ALL USING (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');

-- Shipping fees: public read, admin write
ALTER TABLE shipping_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipping_fees_public_read" ON shipping_fees FOR SELECT USING (true);
CREATE POLICY "shipping_fees_admin_write" ON shipping_fees FOR INSERT WITH CHECK (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');
CREATE POLICY "shipping_fees_admin_update" ON shipping_fees FOR UPDATE USING (auth.uid() = '22d10b78-cfae-4d7d-b9bb-871e1510b856');
