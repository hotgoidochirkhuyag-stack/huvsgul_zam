import { db } from "./db";
import {
  projects,
  contacts,
  content,
  successGallery,
  media,
  type InsertProject,
  type InsertContact,
  type InsertContent,
  type InsertSuccessGallery,
  type InsertMedia,
  type ProjectResponse,
  type ContactResponse,
  type ContentResponse,
  type SuccessGalleryResponse,
  type MediaResponse
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
  getGallery(): Promise<SuccessGalleryResponse[]>;
  createGallery(item: InsertSuccessGallery): Promise<SuccessGalleryResponse>;
  deleteGallery(id: number): Promise<void>;
  getMedia(): Promise<MediaResponse[]>;
  createMedia(item: InsertMedia): Promise<MediaResponse>;
  deleteMedia(id: number): Promise<void>;
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

  async getGallery(): Promise<SuccessGalleryResponse[]> {
    return await db.select().from(successGallery);
  }

  async createGallery(item: InsertSuccessGallery): Promise<SuccessGalleryResponse> {
    const [newItem] = await db.insert(successGallery).values(item).returning();
    return newItem;
  }

  async deleteGallery(id: number): Promise<void> {
    await db.delete(successGallery).where(eq(successGallery.id, id));
  }

  async getMedia(): Promise<MediaResponse[]> {
    return await db.select().from(media);
  }

  async createMedia(item: InsertMedia): Promise<MediaResponse> {
    const [newMedia] = await db.insert(media).values(item).returning();
    return newMedia;
  }

  async deleteMedia(id: number): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }
}

export const storage = new DatabaseStorage();
