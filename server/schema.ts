import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Төслүүдийн хүснэгт
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// И-мэйл бүртгэлийн хүснэгт
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Контентын хүснэгт (Hero, About гэх мэт)
export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  ctaText: text("cta_text"),
  secondaryCtaText: text("secondary_cta_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Холбоо барих мэдээллийн хүснэгт
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema-нууд (Drizzle-zod)
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);

export const insertContentSchema = createInsertSchema(content);
export const selectContentSchema = createSelectSchema(content);

export const insertContactSchema = createInsertSchema(contacts);
export const selectContactSchema = createSelectSchema(contacts);
