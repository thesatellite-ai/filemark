-- Sample e-commerce schema rendered as an interactive ER diagram.

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id            BIGSERIAL PRIMARY KEY,
  sku           TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  inventory     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL,
  total_cents   INTEGER NOT NULL,
  placed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id),
  product_id    BIGINT NOT NULL REFERENCES products(id),
  quantity      INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE addresses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  line1         TEXT NOT NULL,
  line2         TEXT,
  city          TEXT NOT NULL,
  country       TEXT NOT NULL
);
