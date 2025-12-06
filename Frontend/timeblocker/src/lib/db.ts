import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString });

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res;
}

export async function getUserByEmail(email: string) {
  const { rows } = await query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [email]);
  return rows[0];
}

export async function createUser(email: string, passwordHash: string) {
  const { rows } = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  return rows[0];
}

export default pool;
