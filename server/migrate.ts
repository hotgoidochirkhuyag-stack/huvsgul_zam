import { sql } from "drizzle-orm";
import { db } from "./db.js";

export async function runMigrations() {
  console.log("[migrate] Schema шинэчлэлт эхэллээ...");

  // 1. price_proposals.barter_price column
  await db.execute(sql`
    ALTER TABLE price_proposals ADD COLUMN IF NOT EXISTS barter_price real
  `);

  // 2. product_categories table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS product_categories (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      label text NOT NULL,
      filter_label text NOT NULL,
      is_active boolean DEFAULT true,
      show_filter boolean DEFAULT true,
      sort_order integer DEFAULT 0,
      created_at timestamp DEFAULT NOW()
    )
  `);

  // 3. Seed product categories if empty
  const catCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM product_categories`);
  const cnt = Number((catCount.rows[0] as any).cnt);
  if (cnt === 0) {
    console.log("[migrate] Бүтээгдэхүүний ангиллыг seed хийж байна...");
    await db.execute(sql`
      INSERT INTO product_categories (key, label, filter_label, is_active, show_filter, sort_order) VALUES
        ('concrete',   'Бетон зуурмаг',         'Бетон',      true, true,  1),
        ('foam_block', 'Хөөс блок',              'Хөөс блок',  true, true,  2),
        ('asphalt',    'Асфальт',                'Асфальт',    true, true,  3),
        ('stone',      'Чулуу / Хайрга',         'Чулуу',      true, true,  4),
        ('sand',       'Элс',                    'Элс',        true, false, 5),
        ('finished',   'Эцсийн бүтээгдэхүүн',   'Бусад',      true, false, 6),
        ('other',      'Бусад',                  'Бусад',      true, false, 7)
      ON CONFLICT (key) DO NOTHING
    `);
  }

  // 4. Seed M150–M550 price proposals if no completed proposals exist
  const propCount = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM price_proposals WHERE status = 'completed'
  `);
  const propCnt = Number((propCount.rows[0] as any).cnt);

  if (propCnt === 0) {
    console.log("[migrate] Бетоны үнийн саналыг seed хийж байна...");
    const salesNotes = "2026.03-р сар. Налархайжуулагч нэмэлт + 15 км доторхи тээвэрлэлт багтсан. Авто помп: 50м3 хүртэл 1,200,000₮/зогсолт, 50м3-ээс дээш 25,000₮/м3.";
    const grades = [
      { name: "М150 Бетон зуурмаг", price: 294000, barter: 305000 },
      { name: "М200 Бетон зуурмаг", price: 316000, barter: 324000 },
      { name: "М250 Бетон зуурмаг", price: 341000, barter: 350000 },
      { name: "М300 Бетон зуурмаг", price: 363000, barter: 371000 },
      { name: "М350 Бетон зуурмаг", price: 370500, barter: 378000 },
      { name: "М400 Бетон зуурмаг", price: 387700, barter: 392000 },
      { name: "М450 Бетон зуурмаг", price: 400000, barter: 405000 },
      { name: "М500 Бетон зуурмаг", price: 408000, barter: 415000 },
      { name: "М550 Бетон зуурмаг", price: 426000, barter: 432000 },
    ];
    for (const g of grades) {
      const finalCost = Math.round(g.price / 1.15);
      await db.execute(sql`
        INSERT INTO price_proposals
          (product_type, product_name, unit, requested_by, status,
           final_unit_cost, markup_pct, suggested_price, barter_price,
           sales_notes, lab_approved_by, lab_approved_at, created_at, updated_at)
        VALUES
          ('concrete_custom', ${g.name}, 'м³', 'ADMIN', 'completed',
           ${finalCost}, 15, ${g.price}, ${g.barter},
           ${salesNotes}, 'Лаборатори', NOW(), '2026-03-01', '2026-03-01')
      `);
      console.log(`  ✓ ${g.name}: ${g.price.toLocaleString()}₮`);
    }
  }

  console.log("[migrate] Дууслаа.");
}
