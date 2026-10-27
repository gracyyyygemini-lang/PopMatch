import { Pool } from "pg";

let _pool: Pool | null = null;

/**
 * Supabase requires TLS; a local Postgres started for development usually has
 * it switched off, and asking for TLS there fails the connection outright.
 */
function needsSsl(connectionString: string | undefined): boolean {
  if (!connectionString) return false;
  if (/[?&]sslmode=disable/i.test(connectionString)) return false;
  return !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(connectionString);
}

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env and fill it in " +
          "from Supabase -> Project Settings -> Database."
      );
    }

    _pool = new Pool({
      connectionString,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    _pool.on("error", (err: Error) => {
      console.error("PostgreSQL pool error:", err);
    });
  }
  return _pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export default getPool;
