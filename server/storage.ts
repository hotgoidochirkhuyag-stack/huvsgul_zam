import { db } from "./db";
import {
  projects,
  contacts,
  type InsertProject,
  type InsertContact,
  type ProjectResponse,
  type ContactResponse
} from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<ProjectResponse[]>;
  createProject(project: InsertProject): Promise<ProjectResponse>;
  createContact(contact: InsertContact): Promise<ContactResponse>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<ProjectResponse[]> {
    return await db.select().from(projects);
  }

  async createProject(project: InsertProject): Promise<ProjectResponse> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async createContact(contact: InsertContact): Promise<ContactResponse> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }
}

export const storage = new DatabaseStorage();
