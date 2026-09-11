import fs from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'

import * as dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env.local', import.meta.url) })

const migrationDir = path.resolve('..', 'database', 'migrations')
const migrations = [
  '20260804_create_branches.sql',
  '20260804_create_users.sql',
  '20260804_create_settings.sql',
  '20260804_create_menu.sql',
  '20260804_create_branch_tables.sql',
  '20260804_create_inventory.sql',
  '20260804_create_recipes.sql',
  '20260804_create_orders.sql',
  '20260804_create_order_items.sql',
  '20260804_create_bills.sql',
  '20260805_add_bill_checkout_fields.sql',
  '20260806_allow_checkout_approved_update.sql',
  '20260806_add_table_manual_occupancy.sql',
  '20260806_add_table_customer_occupied.sql',
  '20260806_add_order_customer_visible.sql',
  '20260806_add_cafe_branding.sql',
  '20260804_create_payments.sql',
  '20260813_allow_custom_staff_roles.sql',
  '20260909_create_demo_tables.sql',
  '20260909_add_is_demo_to_branches.sql',
  '20260909_clean_and_flag_demo_branches.sql',
  '20260909_staff_login_separation.sql',
  '20260909_fix_staff_role_constraints.sql',
  '20260910_cashier_and_inventory_idempotency.sql',
]

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString) throw new Error('DATABASE_URL_UNPOOLED is required for migrations')

const appClient = new Client({ connectionString })
await appClient.connect()

await appClient.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

const applied = new Set(
  (await appClient.query('SELECT filename FROM schema_migrations')).rows.map(({ filename }) => filename)
)

// This project predates migration tracking. If its complete baseline schema is
// already present, register it once instead of trying to replay ALTER TABLEs.
const baselinePresent = await appClient.query(
  "SELECT to_regclass('public.branches') IS NOT NULL AND to_regclass('public.users') IS NOT NULL AND to_regclass('public.orders') IS NOT NULL AS present"
)
if (applied.size === 0 && baselinePresent.rows[0].present) {
  for (const migration of migrations) {
    await appClient.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [migration])
    applied.add(migration)
  }
  console.log('Registered existing baseline migrations')
}

for (const migration of migrations) {
  if (applied.has(migration)) continue
  const sql = await fs.readFile(path.join(migrationDir, migration), 'utf8')
  await appClient.query('BEGIN')
  try {
    await appClient.query(sql)
    await appClient.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migration])
    await appClient.query('COMMIT')
  } catch (error) {
    await appClient.query('ROLLBACK')
    throw error
  }
  console.log(`Applied ${migration}`)
}
await appClient.end()
