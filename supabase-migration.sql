-- ============================================
-- PRANA Order Management - Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'Pending'
    CHECK (status IN ('Pending','Processing','Shipped','Delivered','Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status change history
CREATE TABLE status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Public can INSERT orders (customers placing orders - anon + authenticated)
CREATE POLICY "Anyone can create orders" ON orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins can read orders
CREATE POLICY "Admins can read orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated admins can update orders
CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE TO authenticated
  USING (true);

-- Status history policies
CREATE POLICY "Admins can read history" ON status_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert history" ON status_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for common queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
