import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string = 'helpfund-gh'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        unique_filename: true,
        overwrite: false,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
};

export const uploadSecureDocument = (
  file: Express.Multer.File,
  folder: string
): Promise<{ publicId: string; resourceType: string; format: string; originalName: string }> => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'auto', type: 'authenticated', unique_filename: true, overwrite: false },
    (error, result) => error ? reject(error) : result && resolve({
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format || file.originalname.split('.').pop() || '',
      originalName: file.originalname,
    })
  );
  streamifier.createReadStream(file.buffer).pipe(stream);
});

export const secureDocumentUrl = (document: any): string => cloudinary.url(document.publicId, {
  secure: true,
  sign_url: true,
  type: 'authenticated',
  resource_type: document.resourceType || 'image',
  format: document.format || undefined,
  expires_at: Math.floor(Date.now() / 1000) + 300,
});
