CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Sans titre',
  category TEXT NOT NULL DEFAULT 'jeu',
  review_date DATE,
  score NUMERIC(3,1),
  cover TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews (review_date DESC);
