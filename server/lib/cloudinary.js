import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage instead of the cloudinary storage engine to avoid version conflicts
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max size globally for profile & license uploads
  }
});

// Extract Cloudinary public ID from a secure URL
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  // URL format: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<folder>/<name>.<ext>
  const parts = url.split('/image/upload/');
  if (parts.length < 2) return null;
  
  // Remove version segment (e.g. 'v1624849303/') if present, and remove file extension
  const path = parts[1].replace(/^v\d+\//, '');
  const dotIndex = path.lastIndexOf('.');
  return dotIndex !== -1 ? path.substring(0, dotIndex) : path;
}

// Delete asset from Cloudinary
async function deleteCloudinaryAsset(url) {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return false;
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary asset deleted: ${publicId}`, result);
    return result.result === 'ok';
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset for url ${url}:`, err);
    return false;
  }
}

export { cloudinary, upload, deleteCloudinaryAsset };

