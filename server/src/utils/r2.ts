import { randomUUID } from 'crypto';
import path from 'path';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, r2PublicBucket, r2PrivateBucket, r2PublicBaseUrl } from '../config/r2';

const imageTypes = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'],
  ['image/webp', 'webp'], ['image/gif', 'gif'],
]);
const documentTypes = new Map([...imageTypes, ['application/pdf', 'pdf']]);

const hasExpectedSignature = (file: Express.Multer.File): boolean => {
  const b = file.buffer;
  switch (file.mimetype) {
    case 'image/jpeg': return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png': return b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/gif': return ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii'));
    case 'image/webp': return b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf': return b.subarray(0, 5).toString('ascii') === '%PDF-';
    default: return false;
  }
};

export interface StoredDocument {
  publicId: string;
  resourceType: 'r2';
  format: string;
  originalName: string;
}

export const uploadPublicImage = async (file: Express.Multer.File, folder = 'posts') => {
  const extension = imageTypes.get(file.mimetype);
  if (!extension || !hasExpectedSignature(file)) throw new Error('Unsupported or invalid image');
  const key = `public/${folder}/${randomUUID()}.${extension}`;
  await r2.send(new PutObjectCommand({
    Bucket: r2PublicBucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return { url: `${r2PublicBaseUrl}/${key}`, publicId: key };
};

export const uploadPrivateDocument = async (file: Express.Multer.File, folder: string): Promise<StoredDocument> => {
  const extension = documentTypes.get(file.mimetype);
  if (!extension || !hasExpectedSignature(file)) throw new Error('Unsupported or invalid document');
  const key = `private/${folder}/${randomUUID()}.${extension}`;
  await r2.send(new PutObjectCommand({
    Bucket: r2PrivateBucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));
  return { publicId: key, resourceType: 'r2', format: extension, originalName: path.basename(file.originalname) };
};

export const getPrivateDocument = async (document: { publicId: string; resourceType: string; format: string; originalName: string }) => {
  if (document.resourceType !== 'r2' || !document.publicId.startsWith('private/')) {
    throw new Error('Invalid R2 document');
  }
  const safeName = path.basename(document.originalName || `document.${document.format}`).replace(/[\r\n"\\]/g, '_');
  const object = await r2.send(new GetObjectCommand({
    Bucket: r2PrivateBucket,
    Key: document.publicId,
  }));
  if (!object.Body) throw new Error('Document body missing');
  return {
    body: Buffer.from(await object.Body.transformToByteArray()),
    name: safeName,
    contentType: document.format === 'pdf' ? 'application/pdf' : `image/${document.format === 'jpg' ? 'jpeg' : document.format}`,
  };
};
