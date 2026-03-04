import { db } from "./db";
import {
  projects,
  contacts,
  content,
  type InsertProject,
  type InsertContact,
  type InsertContent,
  type ProjectResponse,
  type ContactResponse,
  type ContentResponse
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getProjects(): Promise<ProjectResponse[]>;
  createProject(project: InsertProject): Promise<ProjectResponse>;
  deleteProject(id: number): Promise<void>;
  createContact(contact: InsertContact): Promise<ContactResponse>;
  getContent(): Promise<ContentResponse[]>;
  getContentBySection(section: string): Promise<ContentResponse | undefined>;
  updateContent(section: string, updates: Partial<InsertContent>): Promise<ContentResponse>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<ProjectResponse[]> {
    return await db.select().from(projects);
  }

  async createProject(project: InsertProject): Promise<ProjectResponse> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async createContact(contact: InsertContact): Promise<ContactResponse> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async getContent(): Promise<ContentResponse[]> {
    return await db.select().from(content);
  }

  async getContentBySection(section: string): Promise<ContentResponse | undefined> {
    const [result] = await db.select().from(content).where(eq(content.section, section));
    return result;
  }

  async updateContent(section: string, updates: Partial<InsertContent>): Promise<ContentResponse> {
    const [updated] = await db
      .update(content)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(content.section, section))
      .returning();
    
    if (!updated) {
      // If it doesn't exist, create it (upsert pattern for content)
      const [newContent] = await db.insert(content).values({
        section,
        title: updates.title || "",
        description: updates.description || "",
        ctaText: updates.ctaText || "",
        secondaryCtaText: updates.secondaryCtaText || "",
      }).returning();
      return newContent;
    }
    return updated;
  }
}

export const storage = new DatabaseStorage();
