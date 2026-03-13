import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
// @shared/schema.js нь Render-т заримдаа харагддаггүй.
// Тиймээс ../shared/schema.js гэж өөрчлөх нь 100% аюулгүй.
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Render-ийн Postgres холболтод SSL тохиргоо нэмэх нь зүйтэй
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Render Postgres-т ихэвчлэн хэрэгтэй байдаг
  },
});

export const db = drizzle(pool, { schema });
