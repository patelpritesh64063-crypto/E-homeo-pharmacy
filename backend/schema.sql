DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS daily_summaries;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  cost_price REAL NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 0,
  max_daily_qty INTEGER,
  supplier_info TEXT, -- JSON
  active_flag BOOLEAN NOT NULL DEFAULT 1,
  emoji TEXT,
  description TEXT
);

CREATE TABLE orders (
  order_ref TEXT PRIMARY KEY, -- e.g. ORD-12345
  customer_info TEXT NOT NULL, -- JSON { name, email, phone }
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, accepted, paid, shipped, delivered
  delivery_type TEXT NOT NULL, -- delivery or pickup
  payment_fields TEXT, -- JSON { razorpay_order_id, razorpay_payment_id, amount }
  ai_decision_fields TEXT, -- JSON
  shipping_fields TEXT, -- JSON { address, city, zip, tracking_url }
  notes TEXT,
  rejected_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_ref TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_time REAL NOT NULL,
  FOREIGN KEY(order_ref) REFERENCES orders(order_ref),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE purchase_orders (
  po_number TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, received
  items TEXT NOT NULL, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_summaries (
  date TEXT PRIMARY KEY, -- YYYY-MM-DD
  stats TEXT NOT NULL, -- JSON { total_sales, total_orders }
  ai_insights TEXT, -- JSON
  low_stock_data TEXT -- JSON
);
