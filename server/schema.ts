import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Төслүүдийн хүснэгт (Одоо байгаа хэсэг)
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// И-мэйл бүртгэлийн хүснэгт (Шинээр нэмэгдсэн)
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  type: text("type").notNull(), // 'Ажлын байр' эсвэл 'Төслийн мэдээ'
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema-нууд (Drizzle-zod)
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);