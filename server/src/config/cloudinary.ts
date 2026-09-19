import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
const missingCloudinaryKeys = cloudinaryKeys.filter((key) => !process.env[key]);
if (missingCloudinaryKeys.length && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing Cloudinary configuration: ${missingCloudinaryKeys.join(', ')}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;
