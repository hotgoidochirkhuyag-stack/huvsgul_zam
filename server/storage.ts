import { v2 as cloudinary } from 'cloudinary';

// Cloudinary-г тохируулах (Эдгээрийг Replit Secrets дээр оруулна)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const storage = {
  // 1. Projects - "done" хавтаснаас
  async getProjects() {
    const res = await cloudinary.api.resources({ type: 'upload', prefix: 'done', resource_type: 'image' });
    return res.resources.map((r: any) => ({ id: r.public_id, imageUrl: r.secure_url, title: "Төсөл" }));
  },
  // 2. Stats - "stats" хавтаснаас
  async getStats() {
    const res = await cloudinary.api.resources({ type: 'upload', prefix: 'stats', resource_type: 'image' });
    return res.resources.map((r: any) => ({ id: r.public_id, url: r.secure_url }));
  },
  // 3. Featured Videos - "videos" хавтаснаас
  async getFeaturedVideos() {
    const res = await cloudinary.api.resources({ type: 'upload', prefix: 'videos', resource_type: 'video' });
    return res.resources.map((r: any) => ({ id: r.public_id, videoUrl: r.secure_url, title: "Онцлох төсөл" }));
  }
};