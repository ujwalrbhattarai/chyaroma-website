import fs from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'

const databaseName = process.env.CAFE_CENTRAL_DB_NAME ?? 'cafe_central'
const databasePassword = process.env.POSTGRES_PASSWORD ?? 'admin123'
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

const adminClient = new Client({ connectionString: `postgresql://postgres:${databasePassword}@localhost:5432/postgres` })
await adminClient.connect()
const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])
if (exists.rowCount === 0) {
  await adminClient.query(`CREATE DATABASE ${databaseName}`)
  console.log(`Created database ${databaseName}`)
} else {
  console.log(`Database already exists ${databaseName}`)
}
await adminClient.end()

const appClient = new Client({ connectionString: `postgresql://postgres:${databasePassword}@localhost:5432/${databaseName}` })
await appClient.connect()
for (const migration of migrations) {
  const sql = await fs.readFile(path.join(migrationDir, migration), 'utf8')
  await appClient.query(sql)
  console.log(`Applied ${migration}`)
}
await appClient.end()
