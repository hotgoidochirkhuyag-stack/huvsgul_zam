import { v2 as cloudinary } from "cloudinary";
import { db } from "./db.js";
import * as schema from "../shared/schema.js";

// Cloudinary-г тохируулах
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const storage = {
  // 1. Projects - 'road', 'bridge', 'construction' хавтаснуудаас нэгтгэж авах
  async getProjects() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) return [];

      const categoryMap: Record<string, string> = {
        road: "Авто зам",
        bridge: "Гүүр",
        construction: "Дэд бүтэц",
      };

      // Cloudinary-с зургуудыг татах
      const res = await cloudinary.search
        .expression("folder:road/* OR folder:bridge/* OR folder:construction/*")
        .sort_by("created_at", "desc")
        .max_results(50)
        .execute();

      // DB-с metadata татах (publicId-аар индексэд оруулах)
      const metaRows = await db.select().from(schema.projectMetadata);
      const metaMap: Record<string, typeof metaRows[0]> = {};
      for (const m of metaRows) metaMap[m.publicId] = m;

      return res.resources.map((r: any) => {
        const folder = r.public_id.split("/")[0];
        const meta = metaMap[r.public_id];
        return {
          id: r.public_id,
          imageUrl: r.secure_url,
          title:         meta?.title         ?? r.public_id.split("/").pop() ?? "Төсөл",
          description:   meta?.description   ?? "Бүтээн байгуулалт",
          category:      categoryMap[folder] ?? "Бусад",
          location:      meta?.location      ?? null,
          length:        meta?.length        ?? null,
          year:          meta?.year          ?? null,
          clientName:    meta?.clientName    ?? null,
          contractValue: meta?.contractValue ?? null,
          progress:      meta?.progress      ?? null,
        };
      });
    } catch (e) {
      console.error("Cloudinary Projects алдаа:", e);
      return [];
    }
  },

  // 2. Stats Images - "stats" хавтаснаас авах
  async getStats() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) return [];

      const res = await cloudinary.search
        .expression("folder:stats/*")
        .sort_by("created_at", "desc")
        .max_results(20)
        .execute();

      return res.resources.map((r: any) => ({
        id: r.public_id,
        imageUrl: r.secure_url,
        description: r.public_id.split("/").pop() || "Статистикийн зураг",
      }));
    } catch (e) {
      console.error("Cloudinary Stats алдаа:", e);
      return [];
    }
  },

  // 3. Featured Videos - "videos" хавтаснаас авах
  async getFeaturedVideos() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) return [];

      const res = await cloudinary.search
        .expression("folder:videos/*")
        .sort_by("created_at", "desc")
        .max_results(50)
        .execute();

      return res.resources.map((r: any) => ({
        id: r.public_id,
        videoUrl: r.secure_url,
        title: r.public_id.split("/").pop() || "Төслийн бичлэг",
      }));
    } catch (e) {
      console.error("Cloudinary Videos алдаа:", e);
      return [];
    }
  },

  // Cloudinary руу файл upload хийх
  async uploadFile(fileBuffer: Buffer, fileName: string, folder: string) {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME)
        throw new Error("Cloudinary тохируулагдаагүй");
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "auto",
            folder: folder,
            public_id: fileName.split(".")[0],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(fileBuffer);
      });
    } catch (e) {
      console.error("Cloudinary Upload алдаа:", e);
      throw e;
    }
  },

  // Cloudinary-аас файл устгах
  async deleteFile(publicId: string) {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME)
        throw new Error("Cloudinary тохируулагдаагүй");
      return await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error("Cloudinary Delete алдаа:", e);
      throw e;
    }
  },
};
