import { v2 as cloudinary } from 'cloudinary';

// Cloudinary-г тохируулах
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export const storage = {
  // 1. Projects - "done" хавтаснаас авах
  async getProjects() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.warn("Cloudinary хэнэ тохируулагдаагүй байна");
        return [];
      }

      const res = await cloudinary.api.resources({ 
        type: 'upload', 
        resource_type: 'image',
        prefix: 'done', 
        max_results: 50 
      });

      return res.resources.map((r: any) => ({ 
        id: r.public_id, 
        imageUrl: r.secure_url, 
        title: r.public_id.split('/').pop() || "Төсөл",
        description: "Авто замын бүтээн байгуулалт",
        category: "Авто зам"
      }));
    } catch (e) {
      console.error("Cloudinary Projects алдаа:", e);
      return [];
    }
  },

  // 2. Stats Images - "stats" хавтаснаас авах
  async getStats() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return [];
      }

      const res = await cloudinary.api.resources({ 
        type: 'upload', 
        resource_type: 'image',
        prefix: 'stats', 
        max_results: 20 
      });

      return res.resources.map((r: any) => ({ 
        id: r.public_id, 
        imageUrl: r.secure_url,
        description: r.public_id.split('/').pop() || "Статистикийн зураг"
      }));
    } catch (e) {
      console.error("Cloudinary Stats алдаа:", e);
      return [];
    }
  },

  // 3. Featured Videos - "videos" хавтаснаас авах
  async getFeaturedVideos() {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return [];
      }

      const res = await cloudinary.api.resources({ 
        type: 'upload', 
        resource_type: 'video',
        prefix: 'videos', 
        max_results: 20 
      });

      return res.resources.map((r: any) => ({ 
        id: r.public_id, 
        videoUrl: r.secure_url,
        title: r.public_id.split('/').pop() || "Төслийн бичлэг"
      }));
    } catch (e) {
      console.error("Cloudinary Videos алдаа:", e);
      return [];
    }
  },

  // Cloudinary руу шуу файл upload хийх
  async uploadFile(fileBuffer: Buffer, fileName: string, folder: string) {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error("Cloudinary хэнэ тохируулагдаагүй байна");
      }

      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            resource_type: 'auto',
            folder: folder,
            public_id: fileName.split('.')[0]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(fileBuffer);
      });
    } catch (e) {
      console.error("Cloudinary Upload алдаа:", e);
      throw e;
    }
  },

  // Cloudinary аас файл устгах
  async deleteFile(publicId: string) {
    try {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error("Cloudinary хэнэ тохируулагдаагүй байна");
      }

      return await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.error("Cloudinary Delete алдаа:", e);
      throw e;
    }
  }
};
