import { Pool } from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env', import.meta.url) })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL environment variable is missing.')
}

// Create a single, shared pool with strict timeouts
export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000, // Wait max 5 seconds for a new connection
  query_timeout: 10000,          // Wait max 10 seconds for a query to finish
  statement_timeout: 10000       // Wait max 10 seconds for a statement to finish
})

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
})
