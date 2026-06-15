-- Sample PostgreSQL schema for a small blogging + commerce app.
-- Drop into Filemark to render as an interactive ER diagram
-- (pan / zoom / fullscreen).

CREATE TABLE users (
  id            SERIAL        PRIMARY KEY,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  display_name  VARCHAR(100)  NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

CREATE TABLE posts (
  id            SERIAL        PRIMARY KEY,
  author_id     INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          VARCHAR(200)  UNIQUE NOT NULL,
  title         TEXT          NOT NULL,
  body          TEXT          NOT NULL,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

CREATE TABLE tags (
  id    SERIAL       PRIMARY KEY,
  name  VARCHAR(64)  UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id  INT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id   INT  NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE comments (
  id          SERIAL        PRIMARY KEY,
  post_id     INT           NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   INT           NOT NULL REFERENCES users(id),
  body        TEXT          NOT NULL,
  parent_id   INT           REFERENCES comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

CREATE TABLE products (
  id           SERIAL         PRIMARY KEY,
  sku          VARCHAR(64)    UNIQUE NOT NULL,
  name         VARCHAR(200)   NOT NULL,
  description  TEXT,
  price_cents  INT            NOT NULL,
  stock        INT            DEFAULT 0 NOT NULL
);

CREATE TABLE orders (
  id           SERIAL        PRIMARY KEY,
  user_id      INT           NOT NULL REFERENCES users(id),
  status       VARCHAR(32)   DEFAULT 'pending' NOT NULL,
  total_cents  INT           NOT NULL,
  created_at   TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

CREATE TABLE order_items (
  id            SERIAL  PRIMARY KEY,
  order_id      INT     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INT     NOT NULL REFERENCES products(id),
  quantity      INT     NOT NULL,
  price_cents   INT     NOT NULL
);
