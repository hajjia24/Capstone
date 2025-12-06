-- PostgreSQL schema for users table

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Note: gen_random_uuid() requires the pgcrypto extension or use gen_uuid from uuid-ossp.
-- To enable pgcrypto: CREATE EXTENSION IF NOT EXISTS pgcrypto;
