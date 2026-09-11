import 'dotenv/config'
import { Client } from 'pg'

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:Biratnagar-8@localhost:5432/cafe_central'

async function seed() {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  console.log('Connected to PostgreSQL for seeding demo data...')

  // 1. Get or create branches
  let branchRes = await client.query('SELECT id, name FROM branches LIMIT 2')
  let branches = branchRes.rows

  if (branches.length === 0) {
    const b1 = await client.query(`
      INSERT INTO branches (name, address, contact_phone, contact_email, tax_rate, opening_hours)
      VALUES ('Biratnagar Main Branch', 'Main Road, Biratnagar', '9801234567', 'main@cafecentral.np', 13.00, '08:00 AM - 10:00 PM')
      RETURNING id, name
    `)
    const b2 = await client.query(`
      INSERT INTO branches (name, address, contact_phone, contact_email, tax_rate, opening_hours)
      VALUES ('Itahari Hub', 'Station Chowk, Itahari', '9807654321', 'itahari@cafecentral.np', 13.00, '08:00 AM - 10:00 PM')
      RETURNING id, name
    `)
    branches = [b1.rows[0], b2.rows[0]]
    console.log('Created 2 default branches.')
  }

  for (const branch of branches) {
    const branchId = branch.id
    console.log(`Seeding menu for branch: ${branch.name} (${branchId})...`)

    // Create Categories
    const categoriesData = [
      { name: 'Hot Beverages', sortOrder: 1 },
      { name: 'Cold Beverages', sortOrder: 2 },
      { name: 'Mo:Mo & Dumplings', sortOrder: 3 },
      { name: 'Bakery & Desserts', sortOrder: 4 },
      { name: 'Burgers & Fast Food', sortOrder: 5 }
    ]

    const categoryMap = {}
    for (const cat of categoriesData) {
      let res = await client.query(
        'SELECT id FROM menu_categories WHERE branch_id = $1 AND name = $2',
        [branchId, cat.name]
      )
      if (res.rows.length === 0) {
        res = await client.query(
          'INSERT INTO menu_categories (branch_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [branchId, cat.name, cat.sortOrder]
        )
      }
      categoryMap[cat.name] = res.rows[0].id
    }

    // Create Items
    const itemsData = [
      // Hot Beverages
      {
        category: 'Hot Beverages',
        name: 'Caramel Cappuccino',
        price: 220,
        description: 'Rich espresso with steamed milk foam and creamy caramel drizzle.',
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 5
      },
      {
        category: 'Hot Beverages',
        name: 'Himalayan Organic Green Tea',
        price: 120,
        description: 'Handpicked Ilam tea leaves steeped to perfection with honey and lemon.',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 3
      },

      // Cold Beverages
      {
        category: 'Cold Beverages',
        name: 'Iced Vanilla Latte',
        price: 250,
        description: 'Chilled espresso over milk and French vanilla syrup topped with ice.',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 4
      },
      {
        category: 'Cold Beverages',
        name: 'Fresh Mango Mint Smoothie',
        price: 280,
        description: 'Real mango pulp blended with yogurt, crushed ice and fresh mint leaves.',
        imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 5
      },

      // Mo:Mo & Dumplings
      {
        category: 'Mo:Mo & Dumplings',
        name: 'Steamed Chicken Mo:Mo',
        price: 220,
        description: '10 pcs juicy chicken dumplings served with spicy tomato and sesame chutney.',
        imageUrl: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 12
      },
      {
        category: 'Mo:Mo & Dumplings',
        name: 'Kothey Veg Mo:Mo (Pan Fried)',
        price: 190,
        description: 'Pan-seared crispy bottom dumplings stuffed with fresh vegetables & cottage cheese.',
        imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 15
      },

      // Bakery & Desserts
      {
        category: 'Bakery & Desserts',
        name: 'Chocolate Lava Cake',
        price: 260,
        description: 'Warm chocolate fudge cake with a melting gooey center, served with vanilla cream.',
        imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 8
      },
      {
        category: 'Bakery & Desserts',
        name: 'New York Cheesecake',
        price: 320,
        description: 'Classic rich cream cheese slice on a graham cracker crust with berry compote.',
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 2
      },

      // Burgers & Fast Food
      {
        category: 'Burgers & Fast Food',
        name: 'Crispy Chicken Cheese Burger',
        price: 350,
        description: 'Crispy fried chicken breast, melted cheddar cheese, lettuce, mayo on toasted brioche bun.',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 10
      },
      {
        category: 'Burgers & Fast Food',
        name: 'Peri Peri Loaded Fries',
        price: 210,
        description: 'Golden potato fries tossed in spicy peri-peri seasoning and topped with cheese sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
        prepTimeMinutes: 7
      }
    ]

    for (const item of itemsData) {
      const catId = categoryMap[item.category]
      const existing = await client.query(
        'SELECT id FROM menu_items WHERE branch_id = $1 AND name = $2',
        [branchId, item.name]
      )
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO menu_items (branch_id, category_id, name, price, description, image_url, prep_time_minutes, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [branchId, catId, item.name, item.price, item.description, item.imageUrl, item.prepTimeMinutes]
        )
      } else {
        await client.query(
          `UPDATE menu_items SET category_id = $2, price = $3, description = $4, image_url = $5, prep_time_minutes = $6, is_available = TRUE, updated_at = NOW()
           WHERE id = $1`,
          [existing.rows[0].id, catId, item.price, item.description, item.imageUrl, item.prepTimeMinutes]
        )
      }
    }
  }

  console.log('Demo menu seeding completed successfully!')
  await client.end()
}

seed().catch((err) => {
  console.error('Failed to seed menu:', err)
  process.exit(1)
})
