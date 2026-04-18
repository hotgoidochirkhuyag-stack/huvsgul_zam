import { sql } from "drizzle-orm";
import { db } from "./db.js";

export async function runMigrations() {
  console.log("[migrate] Schema шинэчлэлт эхэллээ...");

  try {
    // 1. Алдаа зааж байгаа багануудыг ХҮЧЭЭР нэмэх
    // Энэ хэсэг нь лог дээрх бүх 'does not exist' алдааг засна.
    await db.execute(sql`
      -- skills хүснэгтэд багана нэмэх
      ALTER TABLE IF EXISTS skills ADD COLUMN IF NOT EXISTS category text;
      ALTER TABLE IF EXISTS skills ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

      -- price_proposals хүснэгтэд багана нэмэх
      ALTER TABLE IF EXISTS price_proposals ADD COLUMN IF NOT EXISTS unit text DEFAULT 'м³';
      ALTER TABLE IF EXISTS price_proposals ADD COLUMN IF NOT EXISTS deadline timestamp;
      ALTER TABLE IF EXISTS price_proposals ADD COLUMN IF NOT EXISTS barter_price real;

      -- company_products хүснэгтэд багана нэмэх
      ALTER TABLE IF EXISTS company_products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'м³';

      -- vehicles хүснэгтэд багана нэмэх
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'vehicles') THEN
          ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS equipment_type text;
          ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS unit text DEFAULT 'цаг';
        END IF;
      END $$;
    `);

    // 2. Өгөгдлийг цэвэрлэх (Хуучин буруу ангиллуудыг устгаж шинээр оруулах)
    console.log("[migrate] Ангиллуудыг шинэчилж байна...");
    await db.execute(sql`DELETE FROM product_categories`);

    await db.execute(sql`
      INSERT INTO product_categories (key, label, filter_label, is_active, show_filter, sort_order) VALUES
        ('concrete',    'Бетон зуурмаг',        'Бетон',      true, true,  1),
        ('Lego_block',  'Лего блок',            'Лего блок',  true, true,  2),
        ('asphalt',     'Асфальт',              'Асфальт',    true, true,  3),
        ('stone',       'Чулуу / Хайрга',       'Хайрга',     true, true,  4),
        ('sand',        'Элс',                  'Элс',        true, false, 5),
        ('finished',    'Сувгийн бүтээгдэхүүн',  'Сувгийн',    true, false, 6),
        ('other',       'Бусад',                'Бусад',      true, false, 7)
      ON CONFLICT (key) DO UPDATE SET 
        label = EXCLUDED.label, 
        filter_label = EXCLUDED.filter_label;
    `);

    // 3. Бетоны үнийн саналыг ХҮЧЭЭР шинэчилж оруулах
    console.log("[migrate] Үнийн саналыг оруулж байна...");
    await db.execute(sql`DELETE FROM price_proposals WHERE product_type = 'concrete_custom'`);

    const salesNotes = "2026.03-р сар. Налархайжуулагч нэмэлт + 15 км доторхи тээвэрлэлт багтсан.";
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
    }

    console.log("[migrate] Дууслаа. Бүх өгөгдөл амжилттай шинэчлэгдлээ.");
  } catch (error) {
    console.error("[migrate] Алдаа гарлаа:", error);
  }
}